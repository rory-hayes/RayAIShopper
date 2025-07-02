import uuid
import time
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
        self.session_cache: Dict[str, Dict] = {}  # In-memory session storage with TTL
        self.session_ttl = 3600  # 1 hour TTL for sessions
        self.last_cleanup = time.time()
        self.cleanup_interval = 300  # Cleanup every 5 minutes
        
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
    
    def _cleanup_expired_sessions(self) -> None:
        """
        Remove expired sessions from cache to prevent memory leaks
        """
        current_time = time.time()
        
        # Only cleanup if interval has passed
        if current_time - self.last_cleanup < self.cleanup_interval:
            return
            
        expired_sessions = []
        for session_id, session_data in self.session_cache.items():
            session_time = session_data.get('created_at', 0)
            if current_time - session_time > self.session_ttl:
                expired_sessions.append(session_id)
        
        # Remove expired sessions
        for session_id in expired_sessions:
            del self.session_cache[session_id]
            
        if expired_sessions:
            logger.info(f"Cleaned up {len(expired_sessions)} expired sessions")
            
        self.last_cleanup = current_time
    
    def _store_session_data(self, session_id: str, data: Dict[str, Any]) -> None:
        """
        Store session data with timestamp for TTL cleanup
        """
        self._cleanup_expired_sessions()  # Cleanup before storing
        
        data['created_at'] = time.time()
        data['last_accessed'] = time.time()
        self.session_cache[session_id] = data
    
    def _get_session_data(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get session data and update last accessed time
        """
        self._cleanup_expired_sessions()  # Cleanup before accessing
        
        if session_id in self.session_cache:
            self.session_cache[session_id]['last_accessed'] = time.time()
            return self.session_cache[session_id]
        return None

    async def get_recommendations(self, request: RecommendationRequest) -> RecommendationResponse:
        """
        Get personalized recommendations following the cookbook's RAG approach:
        1. Analyse user profile and inspiration images with GPT-4o mini
        2. Create enhanced search query
        3. Generate query embedding
        4. Perform vector similarity search
        5. Enhance ranking with GPT-4o mini
        6. Return top-k results
        """
        try:
            session_id = request.session_id or str(uuid.uuid4())
            logger.info(f"Processing recommendation request for session {session_id}")
            
            # Step 1: Assigne user profile
            user_profile = request.user_profile
            
            # Step 2: Analyse inspiration images if provided
            inspiration_analysis = None
            if request.inspiration_images:
                logger.info(f"Analyzing {len(request.inspiration_images)} inspiration images...")
                inspiration_analysis = await self.openai_service.analyze_inspiration_images(request.inspiration_images)
                logger.info(f"Image analysis result: {inspiration_analysis}")
            
            # Step 3: Create enhanced search query with image insights
            search_query = await self.openai_service.create_search_query_from_profile(
                user_profile=user_profile,
                inspiration_analysis=inspiration_analysis
            )
            
            # Step 4: Generate query embedding
            query_embedding = await self.openai_service.get_query_embedding(search_query)
            
            # Step 5: Perform vector similarity search
            exclude_ids = []
            if request.filters and request.filters.exclude_ids:
                exclude_ids = request.filters.exclude_ids
            
            # Check if we need items per category or total items
            if request.items_per_category and user_profile.preferred_article_types:
                logger.info(f"Getting {request.items_per_category} items per category for {len(user_profile.preferred_article_types)} categories")
                
                # Get items for each preferred article type separately
                all_recommendations = []
                for article_type in user_profile.preferred_article_types:
                    logger.info(f"Searching for {request.items_per_category} items of type: {article_type}")
                    
                    search_results = await self.vector_service.similarity_search(
                        query_embedding=query_embedding,
                        k=request.items_per_category * 2,  # Get more for better filtering
                        exclude_ids=exclude_ids,
                        search_query=search_query,
                        gender_filter=user_profile.gender,
                        article_type_filter=[article_type]  # Search for this specific type only
                    )
                    
                    # Extract product items from search results for this category
                    category_items = [result[0] for result in search_results]
                    
                    # Enhance recommendations for this category
                    enhanced_category_items = await self.openai_service.enhance_recommendations(
                        user_profile=user_profile,
                        recommendations=category_items,
                        inspiration_analysis=inspiration_analysis
                    )
                    
                    # Limit to requested number per category
                    final_category_items = enhanced_category_items[:request.items_per_category]
                    all_recommendations.extend(final_category_items)
                    
                    logger.info(f"Got {len(final_category_items)} items for {article_type}")
                
                final_recommendations = all_recommendations
                total_available = len(all_recommendations)
                
            else:
                # Original logic for total item count
                search_results = await self.vector_service.similarity_search(
                    query_embedding=query_embedding,
                    k=request.top_k * 2,  # Get more results for better filtering
                    exclude_ids=exclude_ids,
                    search_query=search_query,
                    gender_filter=user_profile.gender,
                    article_type_filter=user_profile.preferred_article_types
                )
                
                # Step 6: Extract product items from search results
                product_items = [result[0] for result in search_results]
                
                # Step 7: Enhance recommendations with GPT-4o mini for better ranking
                final_recommendations = await self.openai_service.enhance_recommendations(
                    user_profile=user_profile,
                    recommendations=product_items,
                    inspiration_analysis=inspiration_analysis
                )
                
                # Limit to requested number
                final_recommendations = final_recommendations[:request.top_k]
                total_available = len(search_results)
            
            # Step 8: Cache session data for future requests (with TTL)
            session_data = {
                "user_profile": user_profile.dict(),
                "query_embedding": query_embedding,
                "search_query": search_query,
                "inspiration_analysis": inspiration_analysis,
                "exclude_ids": exclude_ids,
                "current_recommendations": [item.dict() for item in final_recommendations],
                "user_interactions": {
                    "liked": [],
                    "disliked": [],
                    "saved": []
                }
            }
            self._store_session_data(session_id, session_data)
            
            # Step 9: Create response
            response = RecommendationResponse(
                recommendations=final_recommendations,
                total_available=total_available,
                session_id=session_id,
                query_embedding=query_embedding if settings.environment == "development" else None
            )
            
            logger.info(f"Generated {len(final_recommendations)} recommendations for session {session_id}")
            return response
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            raise

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
            session_data = self._get_session_data(session_id)
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
                gender_filter=session_data["user_profile"]["gender"],  # Pass gender from cached profile
                article_type_filter=session_data["user_profile"].get("preferred_article_types")
            )
            
            # Update session cache with new excludes
            session_data["exclude_ids"] = all_exclude_ids
            self._store_session_data(session_id, session_data)
            
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

            # Update session cache with user interactions
            session_data = self._get_session_data(session_id)
            if session_data is not None:
                interactions = session_data.setdefault("user_interactions", {"liked": [], "disliked": [], "saved": []})
                if action == "like":
                    if product_id not in interactions["liked"]:
                        interactions["liked"].append(product_id)
                    if product_id in interactions["disliked"]:
                        interactions["disliked"].remove(product_id)
                elif action == "dislike":
                    if product_id not in interactions["disliked"]:
                        interactions["disliked"].append(product_id)
                    if product_id in interactions["liked"]:
                        interactions["liked"].remove(product_id)
                    # Ensure disliked items are excluded from future results
                    exclude = session_data.setdefault("exclude_ids", [])
                    if product_id not in exclude:
                        exclude.append(product_id)
                elif action == "save":
                    if product_id not in interactions["saved"]:
                        interactions["saved"].append(product_id)
                
                # Update session data with new interactions
                self._store_session_data(session_id, session_data)
            
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
        return self._get_session_data(session_id)
    
    def get_service_status(self) -> Dict[str, Any]:
        """
        Get service status for health checks
        """
        self._cleanup_expired_sessions()  # Cleanup before reporting status
        
        return {
            "vector_store_loaded": self.vector_service.index is not None,
            "fallback_mode": self.vector_service.is_fallback_mode(),
            "total_products": self.vector_service.get_total_products(),
            "active_sessions": len(self.session_cache),
            "session_ttl_hours": self.session_ttl / 3600
        } 