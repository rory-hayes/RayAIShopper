from fastapi import APIRouter, HTTPException, Depends
from typing import List
import uuid
from app.services.recommendation_service import RecommendationService
from app.services.openai_service import OpenAIService
from app.models.requests import (
    RecommendationRequest, 
    ChatRequest, 
    TryOnRequest, 
    FeedbackRequest, 
    RefreshRequest
)
from app.models.responses import (
    RecommendationResponse, 
    ChatResponse, 
    TryOnResponse, 
    FeedbackResponse, 
    HealthResponse,
    ErrorResponse
)
from app.utils.logging import get_logger
from app.config import settings
from app import __version__

logger = get_logger(__name__)
router = APIRouter()

# Global service instances
recommendation_service = RecommendationService()
openai_service = OpenAIService()

@router.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting up API services...")
    success = await recommendation_service.initialize()
    if not success:
        logger.error("Failed to initialize recommendation service")
        raise RuntimeError("Could not initialize recommendation service")

@router.get("/health", response_model=HealthResponse)
async def health_check():
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
async def get_recommendations(request: RecommendationRequest):
    """
    Get personalized outfit recommendations
    
    This endpoint implements the full RAG pipeline:
    1. Analyzes user profile and inspiration images with GPT-4o mini
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

@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(request: ChatRequest):
    """
    Chat with Ray, the fashion assistant
    
    Provides contextual fashion advice and helps refine user preferences
    """
    try:
        logger.info(f"Received chat request for session {request.session_id}")
        
        # Get session context if available
        context = None
        if request.session_id:
            context = recommendation_service.get_session_context(request.session_id)
        
        # Merge request context with session context
        if request.context:
            if context:
                context.update(request.context)
            else:
                context = request.context
        
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
    Generate virtual try-on image using DALL-E
    
    Creates a photorealistic image of the user wearing the selected product
    """
    try:
        logger.info(f"Received virtual try-on request for product {request.product_id}")
        
        # Get product details from vector service
        # For simplicity, we'll create a mock product item
        # In production, this would fetch from the vector store
        product_item = await _get_product_by_id(request.product_id)
        
        if not product_item:
            raise HTTPException(
                status_code=404, 
                detail=f"Product {request.product_id} not found"
            )
        
        # Generate virtual try-on image
        image_url, generation_prompt = await openai_service.generate_virtual_tryon(
            user_image_b64=request.user_image,
            product_item=product_item,
            style_prompt=request.style_prompt
        )
        
        return TryOnResponse(
            generated_image_url=image_url,
            product_id=request.product_id,
            generation_prompt=generation_prompt,
            success=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in virtual_tryon: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Virtual try-on failed: {str(e)}"
        )

@router.post("/feedback", response_model=FeedbackResponse)
async def process_feedback(request: FeedbackRequest):
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
async def refresh_recommendations(request: RefreshRequest):
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

# Helper functions
async def _get_product_by_id(product_id: str):
    """
    Get product details by ID
    This is a simplified implementation - in production would query the vector store
    """
    # For now, return a mock product
    # In production, this would search the vector store metadata
    from app.models.responses import ProductItem
    
    return ProductItem(
        id=product_id,
        name=f"Product {product_id}",
        category="Clothing",
        subcategory="Tops",
        article_type="Shirt",
        color="Blue",
        gender="Unisex",
        usage="Casual",
        image_url=f"{settings.github_images_base_url}/{product_id}.jpg",
        similarity_score=0.95
    ) 