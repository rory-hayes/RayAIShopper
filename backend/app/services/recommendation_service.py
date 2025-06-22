import uuid
from typing import List, Dict, Any, Optional
from app.services.vector_service import VectorSearchService
from app.services.openai_service import OpenAIService
from app.models.requests import UserProfile, RecommendationRequest, FilterOptions
from app.models.responses import ProductItem, RecommendationResponse
from app.utils.logging import get_logger
from app.config import settings

logger = get_logger(__name__)

class RecommendationService:
    def __init__(self):
        self.vector_service = VectorSearchService()
        self.openai_service = OpenAIService()
        self.session_cache: Dict[str, Dict] = {}  # In-memory session storage
        
    async def initialize(self) -> bool:
        """
        Initialize the recommendation service
        """
        logger.info("Initializing recommendation service...")
        success = await self.vector_service.load_or_create_index()
        if success:
            logger.info("Recommendation service initialized successfully")
        else:
            logger.error("Failed to initialize recommendation service")
        return success
    
    async def get_recommendations(self, request: RecommendationRequest) -> RecommendationResponse:
        """
        Get personalized recommendations following the cookbook's RAG approach:
        1. Analyze user profile and inspiration images with GPT-4o mini
        2. Create enhanced search query
        3. Generate query embedding
        4. Perform vector similarity search
        5. Enhance ranking with GPT-4o mini
        6. Return top-k results
        """
        try:
            session_id = request.session_id or str(uuid.uuid4())
            logger.info(f"Processing recommendation request for session {session_id}")
            
            # Step 1: Analyze inspiration images if provided
            inspiration_analysis = ""
            if request.user_profile.inspiration_images:
                inspiration_analysis = await self.openai_service.analyze_inspiration_images(
                    request.user_profile.inspiration_images
                )
            
            # Step 2: Create enhanced search query using GPT-4o mini
            search_query = await self.openai_service.create_search_query_from_profile(
                request.user_profile
            )
            
            # Add inspiration analysis to search query if available
            if inspiration_analysis:
                search_query = f"{search_query} {inspiration_analysis}"
            
            # Step 3: Generate query embedding
            query_embedding = await self.openai_service.get_query_embedding(search_query)
            
            # Step 4: Perform vector similarity search
            exclude_ids = []
            if request.filters and request.filters.exclude_ids:
                exclude_ids = request.filters.exclude_ids
            
            # Search for more items than needed to allow for filtering and GPT ranking
            search_results = await self.vector_service.similarity_search(
                query_embedding=query_embedding,
                k=min(request.top_k * 2, settings.max_search_results),
                exclude_ids=exclude_ids,
                search_query=search_query,
                gender_filter=request.user_profile.gender.value
            )
            
            # Extract products from search results
            candidate_products = [item for item, _ in search_results]
            
            # Step 5: Apply additional filters if specified
            if request.filters:
                candidate_products = self._apply_filters(candidate_products, request.filters)
            
            # Step 6: Enhance ranking with GPT-4o mini
            if len(candidate_products) > request.top_k:
                enhanced_products = await self.openai_service.enhance_recommendations(
                    user_profile=request.user_profile,
                    recommendations=candidate_products,
                    inspiration_analysis=inspiration_analysis
                )
                # Take top-k after GPT ranking
                final_recommendations = enhanced_products[:request.top_k]
            else:
                final_recommendations = candidate_products
            
            # Step 7: Cache session data for future requests
            self.session_cache[session_id] = {
                "user_profile": request.user_profile.dict(),
                "query_embedding": query_embedding,
                "search_query": search_query,
                "inspiration_analysis": inspiration_analysis,
                "exclude_ids": exclude_ids
            }
            
            # Step 8: Create response
            response = RecommendationResponse(
                recommendations=final_recommendations,
                total_available=len(search_results),
                session_id=session_id,
                query_embedding=query_embedding if settings.environment == "development" else None
            )
            
            logger.info(f"Generated {len(final_recommendations)} recommendations for session {session_id}")
            return response
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            raise
    
    def _apply_filters(self, products: List[ProductItem], filters: FilterOptions) -> List[ProductItem]:
        """
        Apply additional filters to the product list
        """
        filtered_products = products
        
        # Filter by categories
        if filters.categories:
            filtered_products = [
                p for p in filtered_products 
                if p.category in filters.categories or p.article_type in filters.categories
            ]
        
        # Filter by colors
        if filters.colors:
            filtered_products = [
                p for p in filtered_products 
                if any(color.lower() in p.color.lower() for color in filters.colors)
            ]
        
        # Note: Price filtering would require price data in the product catalog
        # For now, we skip price filtering since it's not in our sample data
        
        logger.info(f"Applied filters, {len(filtered_products)} products remaining")
        return filtered_products
    
    async def get_fresh_recommendations(
        self, 
        session_id: str, 
        exclude_ids: List[str], 
        count: int = 1
    ) -> List[ProductItem]:
        """
        Get fresh recommendations for dynamic replacement
        Used when user thumbs down items
        """
        try:
            # Get session data
            session_data = self.session_cache.get(session_id)
            if not session_data:
                raise ValueError(f"Session {session_id} not found")
            
            # Use cached query embedding for consistency
            query_embedding = session_data["query_embedding"]
            
            # Combine previous excludes with new ones
            all_exclude_ids = list(set(session_data["exclude_ids"] + exclude_ids))
            
            # Get fresh recommendations
            fresh_items = await self.vector_service.get_fresh_recommendations(
                query_embedding=query_embedding,
                exclude_ids=all_exclude_ids,
                count=count,
                search_query=session_data.get("search_query"),
                gender_filter=session_data["user_profile"]["gender"]  # Pass gender from cached profile
            )
            
            # Update session cache with new excludes
            session_data["exclude_ids"] = all_exclude_ids
            
            logger.info(f"Generated {len(fresh_items)} fresh recommendations for session {session_id}")
            return fresh_items
            
        except Exception as e:
            logger.error(f"Error getting fresh recommendations: {e}")
            raise
    
    async def process_feedback(
        self, 
        session_id: str, 
        product_id: str, 
        action: str, 
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process user feedback (like/dislike/save)
        For stateless app, we just log the feedback and potentially return fresh items
        """
        try:
            logger.info(f"Processing feedback for session {session_id}: {action} on product {product_id}")
            
            # Log feedback for analytics (in production, this would go to analytics service)
            feedback_data = {
                "session_id": session_id,
                "product_id": product_id,
                "action": action,
                "reason": reason,
                "timestamp": str(uuid.uuid4())  # Using UUID as timestamp placeholder
            }
            
            response = {"success": True, "message": f"Feedback '{action}' recorded"}
            
            # If user dislikes an item, provide fresh recommendations
            if action == "dislike":
                try:
                    fresh_items = await self.get_fresh_recommendations(
                        session_id=session_id,
                        exclude_ids=[product_id],
                        count=1
                    )
                    response["fresh_recommendations"] = fresh_items
                except Exception as e:
                    logger.warning(f"Could not generate fresh recommendations: {e}")
            
            return response
            
        except Exception as e:
            logger.error(f"Error processing feedback: {e}")
            raise
    
    def get_session_context(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get session context for chat functionality
        """
        return self.session_cache.get(session_id)
    
    def get_service_status(self) -> Dict[str, Any]:
        """
        Get service status for health checks
        """
        return {
            "vector_store_loaded": self.vector_service.index is not None,
            "fallback_mode": self.vector_service.is_fallback_mode(),
            "total_products": self.vector_service.get_total_products(),
            "active_sessions": len(self.session_cache)
        } 