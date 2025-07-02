from fastapi import APIRouter, HTTPException, Depends
from typing import List
import uuid
from app.models.requests import (
    RecommendationRequest, 
    ChatRequest, 
    TryOnRequest, 
    FeedbackRequest, 
    RefreshRequest
)
from app.models.responses import (
    RecommendationResponse, 
    RecommendationResponseV2,
    ChatResponse, 
    TryOnResponse, 
    FeedbackResponse, 
    HealthResponse,
    ErrorResponse
)
from app.utils.logging import get_logger
from app.config import settings
from app import __version__
import os

logger = get_logger(__name__)
router = APIRouter()

# Dependency to get recommendation service from main.py
async def get_recommendation_service():
    from app.main import get_recommendation_service_async
    service = await get_recommendation_service_async()
    if service is None:
        raise HTTPException(status_code=503, detail="Recommendation service not initialized")
    return service

# OpenAI service for specific endpoints that need it
from app.services.openai_service import OpenAIService
openai_service = OpenAIService()

@router.get("/health", response_model=HealthResponse)
async def health_check(recommendation_service = Depends(get_recommendation_service)):
    """Health check endpoint"""
    try:
        service_status = recommendation_service.get_service_status()
        
        # Determine overall status
        if service_status["vector_store_loaded"]:
            status = "healthy"
        elif service_status.get("fallback_mode", False):
            status = "degraded"
        else:
            status = "unhealthy"
        
        return HealthResponse(
            status=status,
            version=__version__,
            embedding_model=settings.embedding_model,
            gpt_model=settings.gpt_model,
            vector_store_loaded=service_status["vector_store_loaded"],
            fallback_mode=service_status.get("fallback_mode", False),
            total_products=service_status["total_products"],
            environment=settings.environment
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Health check failed")

@router.post("/recommendations", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest, recommendation_service = Depends(get_recommendation_service)):
    """
    Get personalized outfit recommendations
    
    This endpoint implements the full RAG pipeline:
    1. Analyses user profile and inspiration images with GPT-4o mini
    2. Creates enhanced search query
    3. Performs vector similarity search on product catalog
    4. Enhances ranking with GPT-4o mini
    5. Returns top-20 recommendations
    """
    try:
        logger.info(f"Received recommendation request for {request.user_profile.gender} user")
        
        # Validate request
        if not request.user_profile.shopping_prompt.strip():
            raise HTTPException(
                status_code=400, 
                detail="Shopping prompt is required"
            )
        
        # Ensure top_k is within reasonable limits
        if request.top_k > 50:
            request.top_k = 50
        elif request.top_k < 1:
            request.top_k = 20
        
        # Get recommendations
        response = await recommendation_service.get_recommendations(request)
        
        logger.info(f"Successfully generated {len(response.recommendations)} recommendations")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_recommendations: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate recommendations: {str(e)}"
        )

@router.post("/recommendations/v2", response_model=RecommendationResponseV2)
async def get_recommendations_v2(request: RecommendationRequest, recommendation_service = Depends(get_recommendation_service)):
    """
    V2 Recommendations API with guaranteed category structure and clear error handling
    
    This endpoint provides:
    - Guaranteed return of all requested categories (even if empty)
    - Clear error messages with no silent failures
    - Structured response with debug information
    - Per-category item counts and timing
    """
    try:
        logger.info(f"V2 API: Received recommendation request for {request.user_profile.gender} user")
        
        # Validate request
        if not request.user_profile.preferred_article_types:
            raise HTTPException(
                status_code=400,
                detail="Preferred article types are required for V2 API"
            )
        
        if not request.user_profile.shopping_prompt.strip():
            raise HTTPException(
                status_code=400, 
                detail="Shopping prompt is required"
            )
        
        # Set default items per category if not specified
        if not request.items_per_category:
            request.items_per_category = 20
        
        # Ensure items_per_category is within reasonable limits
        if request.items_per_category > 50:
            request.items_per_category = 50
        elif request.items_per_category < 1:
            request.items_per_category = 20
        
        # Get V2 recommendations
        response = await recommendation_service.get_recommendations_v2(request)
        
        if response.success:
            logger.info(f"V2 API: Successfully generated {response.debug_info.total_items} recommendations across {len(response.categories)} categories")
        else:
            logger.error(f"V2 API: Failed to generate recommendations: {response.error}")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"V2 API: Error in get_recommendations_v2: {e}")
        # Return structured error response instead of raising HTTPException
        return RecommendationResponseV2(
            success=False,
            error=f"Failed to generate recommendations: {str(e)}",
            categories={},
            session_id=str(uuid.uuid4())
        )

@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(request: ChatRequest, recommendation_service = Depends(get_recommendation_service)):
    """
    Chat with Ray, the fashion assistant
    
    Provides contextual fashion advice and helps refine user preferences
    """
    try:
        logger.info(f"Received chat request for session {request.session_id}")
        
        # Build comprehensive context
        context = {}
        
        # Get session context if available
        if request.session_id:
            session_context = recommendation_service.get_session_context(request.session_id)
            if session_context:
                context.update(session_context)
        
        # Merge request context with session context
        if request.context:
            context.update(request.context)
        
        # Add current recommendations to context if available
        if "current_recommendations" not in context and request.context:
            # Try to get current recommendations from request context
            if "current_recommendations" in request.context:
                context["current_recommendations"] = request.context["current_recommendations"]
        
        # Chat with assistant
        response_message, context_updated = await openai_service.chat_with_assistant(
            message=request.message,
            context=context,
            history=request.history
        )
        
        # Generate session ID if not provided
        session_id = request.session_id or str(uuid.uuid4())
        
        return ChatResponse(
            message=response_message,
            context_updated=context_updated,
            suggestions=[],  # Could be enhanced to provide suggestions
            session_id=session_id
        )
        
    except Exception as e:
        logger.error(f"Error in chat_with_assistant: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Chat service error: {str(e)}"
        )

@router.post("/tryon", response_model=TryOnResponse)
async def virtual_tryon(request: TryOnRequest):
    """
    Generate ultra-high-fidelity virtual try-on image using enhanced AI analysis
    
    Uses GPT-4o Vision to analyze both user selfie and product image for maximum accuracy.
    Creates a photorealistic image preserving user's identity while showing them wearing the exact product.
    """
    try:
        logger.info(f"Received enhanced virtual try-on request for product {request.product_id}")
        
        # Get actual product details from vector service
        product_item = await _get_product_by_id(request.product_id)
        
        if not product_item:
            raise HTTPException(
                status_code=404, 
                detail=f"Product {request.product_id} not found"
            )
        
        logger.info(f"Processing virtual try-on with enhanced analysis for {product_item.name}")
        
        # Generate enhanced virtual try-on image with detailed analysis
        image_url, generation_prompt = await openai_service.generate_virtual_tryon(
            user_image_b64=request.user_image,
            product_item=product_item,
            style_prompt=request.style_prompt
        )
        
        logger.info(f"Successfully generated enhanced virtual try-on for product {request.product_id}")
        
        return TryOnResponse(
            generated_image_url=image_url,
            product_id=request.product_id,
            generation_prompt=generation_prompt,
            success=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in enhanced virtual_tryon: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Enhanced virtual try-on failed: {str(e)}"
        )

@router.post("/feedback", response_model=FeedbackResponse)
async def process_feedback(request: FeedbackRequest, recommendation_service = Depends(get_recommendation_service)):
    """
    Process user feedback on recommendations
    
    Handles like/dislike/save actions and provides fresh recommendations for dislikes
    """
    try:
        logger.info(f"Received feedback: {request.action} for product {request.product_id}")
        
        # Validate action
        valid_actions = ["like", "dislike", "save"]
        if request.action not in valid_actions:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid action. Must be one of: {valid_actions}"
            )
        
        # Process feedback
        if request.session_id:
            result = await recommendation_service.process_feedback(
                session_id=request.session_id,
                product_id=request.product_id,
                action=request.action,
                reason=request.reason
            )
            
            return FeedbackResponse(
                success=result["success"],
                message=result["message"],
                updated_recommendations=result.get("fresh_recommendations")
            )
        else:
            # For requests without session, just acknowledge
            return FeedbackResponse(
                success=True,
                message=f"Feedback '{request.action}' recorded"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing feedback: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to process feedback: {str(e)}"
        )

@router.post("/refresh", response_model=List[dict])
async def refresh_recommendations(request: RefreshRequest, recommendation_service = Depends(get_recommendation_service)):
    """
    Get fresh recommendations to replace disliked items
    
    Maintains the top-20 display by providing new items when others are removed
    """
    try:
        logger.info(f"Received refresh request for session {request.session_id}")
        
        # Get fresh recommendations
        fresh_items = await recommendation_service.get_fresh_recommendations(
            session_id=request.session_id,
            exclude_ids=request.exclude_ids,
            count=request.count
        )
        
        # Convert to dict format for response
        return [item.dict() for item in fresh_items]
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error refreshing recommendations: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to refresh recommendations: {str(e)}"
        )

@router.get("/debug/data", response_model=dict)
async def debug_data_files():
    """Debug endpoint to check data file status"""
    debug_info = {
        "working_directory": os.getcwd(),
        "styles_csv_path": settings.styles_csv_path,
        "styles_csv_exists": os.path.exists(settings.styles_csv_path),
        "data_dir_exists": os.path.exists(settings.data_dir),
        "data_dir_contents": [],
        "csv_line_count": 0,
        "csv_first_line": None
    }
    
    # Check data directory contents
    if os.path.exists(settings.data_dir):
        try:
            debug_info["data_dir_contents"] = os.listdir(settings.data_dir)
        except Exception as e:
            debug_info["data_dir_error"] = str(e)
    
    # Check CSV file details
    if os.path.exists(settings.styles_csv_path):
        try:
            with open(settings.styles_csv_path, 'r') as f:
                lines = f.readlines()
                debug_info["csv_line_count"] = len(lines)
                if lines:
                    debug_info["csv_first_line"] = lines[0].strip()
        except Exception as e:
            debug_info["csv_read_error"] = str(e)
    
    return debug_info

# Helper functions
async def _get_product_by_id(product_id: str):
    """
    Get actual product details by ID from the vector store
    Enhanced to provide real product data for better virtual try-on accuracy
    """
    try:
        # Get recommendation service instance
        from app.services.recommendation_service import RecommendationService
        from app.services.vector_service import VectorService
        
        vector_service = VectorService()
        
        # Search for the specific product by ID
        # This searches through the actual product database
        search_results = await vector_service.similarity_search(
            query=f"product_id:{product_id}",
            k=1,
            filter_criteria={"id": product_id}
        )
        
        if not search_results:
            # Try searching by product ID in the metadata
            search_results = await vector_service.similarity_search(
                query=product_id,
                k=1
            )
        
        if search_results:
            product_data = search_results[0]
            
            # Convert to ProductItem format
            from app.models.responses import ProductItem
            
            return ProductItem(
                id=product_data.get("id", product_id),
                name=product_data.get("productDisplayName", f"Product {product_id}"),
                category=product_data.get("masterCategory", "Fashion"),
                subcategory=product_data.get("subCategory", "Clothing"),
                article_type=product_data.get("articleType", "Apparel"),
                color=product_data.get("baseColour", "Multi"),
                gender=product_data.get("gender", "Unisex"),
                usage=product_data.get("usage", "Casual"),
                image_url=f"{settings.github_images_base_url}/{product_id}.jpg",
                similarity_score=1.0  # Exact match
            )
        else:
            logger.warning(f"Product {product_id} not found in vector store, using fallback")
            # Fallback to mock product if not found
            from app.models.responses import ProductItem
            
            return ProductItem(
                id=product_id,
                name=f"Product {product_id}",
                category="Fashion",
                subcategory="Clothing",
                article_type="Apparel",
                color="Multi",
                gender="Unisex",
                usage="Casual",
                image_url=f"{settings.github_images_base_url}/{product_id}.jpg",
                similarity_score=0.95
            )
            
    except Exception as e:
        logger.error(f"Error fetching product {product_id}: {e}")
        # Return fallback product on error
        from app.models.responses import ProductItem
        
        return ProductItem(
            id=product_id,
            name=f"Product {product_id}",
            category="Fashion",
            subcategory="Clothing", 
            article_type="Apparel",
            color="Multi",
            gender="Unisex",
            usage="Casual",
            image_url=f"{settings.github_images_base_url}/{product_id}.jpg",
            similarity_score=0.95
        ) 