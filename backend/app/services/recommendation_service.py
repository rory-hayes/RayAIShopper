import uuid
import time
from typing import List, Dict, Any, Optional
from app.services.vector_service import VectorSearchService
from app.services.openai_service import OpenAIService
# TEMPORARILY DISABLED: from app.services.outfit_completion_service import OutfitCompletionService
from app.models.requests import UserProfile, RecommendationRequest, FilterOptions
from app.models.responses import ProductItem, RecommendationResponse, RecommendationResponseV2, CategoryResult, DebugInfo
from app.utils.logging import get_logger
from app.config import settings

logger = get_logger(__name__)

class RecommendationService:
    def __init__(self):
        self.vector_service = VectorSearchService()
        self.openai_service = OpenAIService()
        
        # TEMPORARILY DISABLED: Initialize outfit completion service with error handling
        # try:
        #     self.outfit_completion_service = OutfitCompletionService()
        #     logger.info("OutfitCompletionService initialized successfully")
        # except Exception as e:
        #     logger.warning(f"Failed to initialize OutfitCompletionService: {e}")
        #     self.outfit_completion_service = None
        self.outfit_completion_service = None  # Temporarily disabled
            
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
            
            # Log the request details for debugging
            logger.info(f"Request details - items_per_category: {request.items_per_category}, top_k: {request.top_k}")
            logger.info(f"User preferred_article_types: {request.user_profile.preferred_article_types}")
            
            # Step 1: Assigne user profile
            user_profile = request.user_profile
            
            # Debug: Log user profile details
            logger.info(f"DEBUG: User profile details:")
            logger.info(f"  Gender: '{user_profile.gender}' (type: {type(user_profile.gender)})")
            logger.info(f"  Preferred article types: {user_profile.preferred_article_types}")
            logger.info(f"  Shopping prompt: '{user_profile.shopping_prompt}'")
            
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
            logger.info(f"Condition check - items_per_category: {request.items_per_category} (type: {type(request.items_per_category)})")
            logger.info(f"Condition check - preferred_article_types: {user_profile.preferred_article_types} (type: {type(user_profile.preferred_article_types)})")
            logger.info(f"Condition check - both truthy: {bool(request.items_per_category and user_profile.preferred_article_types)}")
            
            if request.items_per_category and user_profile.preferred_article_types:
                logger.info(f"USING ITEMS_PER_CATEGORY LOGIC: Getting {request.items_per_category} items per category for {len(user_profile.preferred_article_types)} categories")
                
                # Map user-selected article types to database article types
                def map_article_type(user_selection: str) -> List[str]:
                    """Map user-friendly article type selections to database values"""
                    mapping = {
                        'Tshirts': ['Tshirts', 'T-Shirts'],  # More precise mapping
                        'Shirts': ['Shirts'],
                        'Jeans': ['Jeans'],
                        'Casual Shoes': ['Casual Shoes', 'Shoes'],
                        'Sports Shoes': ['Sports Shoes', 'Shoes'],
                        'Formal Shoes': ['Formal Shoes', 'Shoes'],
                        'Sandals': ['Sandals', 'Flip Flops'],
                        'Flip Flops': ['Flip Flops', 'Sandals'],
                        'Shorts': ['Shorts'],
                        'Trousers': ['Trousers'],
                        'Track Pants': ['Track Pants'],
                        'Jackets': ['Jackets'],
                        'Sweaters': ['Sweaters'],
                        'Sweatshirts': ['Sweatshirts'],
                        'Kurtas': ['Kurtas'],
                        'Tops': ['Tops'],
                        'Dresses': ['Dresses'],
                        'Skirts': ['Skirts'],
                        'Leggings': ['Leggings'],
                        'Heels': ['Heels'],
                        'Flats': ['Flats']
                    }
                    return mapping.get(user_selection, [user_selection])
                
                # Debug: Show what we're mapping before starting search
                logger.info(f"DEBUG: User preferences to search: {user_profile.preferred_article_types}")
                for user_type in user_profile.preferred_article_types:
                    mapped_types = map_article_type(user_type)
                    logger.info(f"DEBUG: {user_type} -> {mapped_types}")
                
                # Get items for each preferred article type separately
                all_recommendations = []
                for user_article_type in user_profile.preferred_article_types:
                    # Map to database article types
                    db_article_types = map_article_type(user_article_type)
                    logger.info(f"Searching for {request.items_per_category} items of type: {user_article_type} -> {db_article_types}")
                    
                    # Debug: Log what we're actually searching for
                    logger.info(f"DEBUG: About to search with article_type_filter={db_article_types}")
                    
                    search_results = await self.vector_service.similarity_search(
                        query_embedding=query_embedding,
                        k=request.items_per_category * 2,  # Get more for better filtering
                        exclude_ids=exclude_ids,
                        search_query=search_query,
                        gender_filter=user_profile.gender,
                        article_type_filter=db_article_types  # Search for this specific type only
                    )
                    
                    logger.info(f"DEBUG: Search for {user_article_type} returned {len(search_results)} results")
                    
                    # Extract product items from search results for this category
                    category_items = [result[0] for result in search_results]
                    
                    # Debug: Log what article types were actually found
                    found_article_types = [item.article_type for item in category_items]
                    logger.info(f"DEBUG: Found article types for {user_article_type}: {set(found_article_types)}")
                    
                    # Debug: Log specific products found
                    if category_items:
                        logger.info(f"DEBUG: Sample products found for {user_article_type}:")
                        for i, item in enumerate(category_items[:3]):
                            logger.info(f"  {i+1}. {item.name} (article_type: {item.article_type})")
                    else:
                        logger.warning(f"DEBUG: NO PRODUCTS FOUND for {user_article_type} with filter {db_article_types}")
                    
                    # Enhance recommendations for this category
                    enhanced_category_items = await self.openai_service.enhance_recommendations(
                        user_profile=user_profile,
                        recommendations=category_items,
                        inspiration_analysis=inspiration_analysis
                    )
                    
                    # Limit to requested number per category
                    final_category_items = enhanced_category_items[:request.items_per_category]
                    all_recommendations.extend(final_category_items)
                    
                    logger.info(f"Got {len(final_category_items)} items for {user_article_type}")
                
                final_recommendations = all_recommendations
                total_available = len(all_recommendations)
                
            else:
                # Original logic for total item count
                logger.info(f"USING ORIGINAL LOGIC: items_per_category={request.items_per_category}, preferred_article_types={user_profile.preferred_article_types}")
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

    async def get_recommendations_v2(self, request: RecommendationRequest) -> RecommendationResponseV2:
        """
        V2 API that guarantees category structure and clear error handling
        Uses the same successful approach as V1 but with better error handling
        """
        start_time = time.time()
        
        try:
            user_categories = request.user_profile.preferred_article_types
            if not user_categories:
                raise ValueError("No article types specified")
            
            session_id = request.session_id or str(uuid.uuid4())
            logger.info(f"V2 API: Processing recommendation request for session {session_id}")
            logger.info(f"V2 API: User selected categories: {user_categories}")
            
            # Initialize response structure
            result = RecommendationResponseV2(
                success=True,
                categories={},
                session_id=session_id,
                debug_info=DebugInfo(
                    user_selections=user_categories,
                    categories_found=[],
                    categories_missing=[],
                    total_items=0,
                    search_mode=self._get_search_mode(),
                    processing_time_ms=0
                )
            )
            
            # Use the same successful approach as V1
            user_profile = request.user_profile
            exclude_ids = []
            if request.filters and request.filters.exclude_ids:
                exclude_ids = request.filters.exclude_ids
            
            try:
                # Step 1: Create enhanced search query (like V1)
                logger.info("V2 API: Creating enhanced search query...")
                search_query = await self.openai_service.create_search_query_from_profile(
                    user_profile=user_profile,
                    inspiration_analysis=None  # Skip image analysis for speed
                )
                logger.info(f"V2 API: Generated search query: {search_query}")
                
                # Step 2: Generate query embedding (like V1)
                logger.info("V2 API: Generating query embedding...")
                query_embedding = await self.openai_service.get_query_embedding(search_query)
                logger.info("V2 API: Query embedding generated successfully")
                
            except Exception as openai_error:
                logger.error(f"V2 API: OpenAI error (falling back to simple search): {openai_error}")
                # Fallback to simple search if OpenAI fails
                search_query = f"{user_profile.shopping_prompt} {' '.join(user_profile.preferred_styles or [])} {' '.join(user_profile.preferred_colors or [])}"
                query_embedding = None
            
            # Search each category individually (like V1)
            for category in user_categories:
                category_start = time.time()
                
                try:
                    # Map user-friendly category to database article types (same as V1)
                    db_article_types = self._map_article_type(category)
                    logger.info(f"V2 API: Searching category '{category}' -> database types {db_article_types}")
                    
                    # Use the same search approach as V1
                    if query_embedding:
                        # Use embedding search (same as V1)
                        search_results = await self.vector_service.similarity_search(
                            query_embedding=query_embedding,
                            k=(request.items_per_category or 20) * 3,  # Get 3x more for better filtering and reserves
                            exclude_ids=exclude_ids,
                            search_query=search_query,
                            gender_filter=user_profile.gender,
                            article_type_filter=db_article_types
                        )
                    else:
                        # Fallback to keyword search if embedding failed
                        search_results = await self.vector_service.similarity_search(
                            query=search_query,
                            k=(request.items_per_category or 20) * 2,  # Get 2x more for reserves
                            exclude_ids=exclude_ids,
                            search_query=search_query,
                            gender_filter=user_profile.gender,
                            article_type_filter=db_article_types
                        )
                    
                    # Extract product items (same as V1)
                    category_items = [result[0] for result in search_results]
                    
                    logger.info(f"V2 API: Found {len(category_items)} raw items for category '{category}'")
                    
                    # Try to enhance recommendations (same as V1, but with error handling)
                    try:
                        if category_items:
                            logger.info(f"V2 API: Enhancing {len(category_items)} items for category '{category}'...")
                            enhanced_items = await self.openai_service.enhance_recommendations(
                                user_profile=user_profile,
                                recommendations=category_items,
                                inspiration_analysis=None
                            )
                            # Return 40 items per category (20 for display + 20 for reserves)
                            final_items = enhanced_items[:(request.items_per_category or 20) * 2]
                            logger.info(f"V2 API: Enhanced to {len(final_items)} items for category '{category}' (includes reserves)")
                        else:
                            final_items = []
                    except Exception as enhance_error:
                        logger.warning(f"V2 API: Enhancement failed for category '{category}': {enhance_error}")
                        # Use raw results if enhancement fails
                        final_items = category_items[:(request.items_per_category or 20) * 2]
                    
                    category_time = int((time.time() - category_start) * 1000)
                    
                    result.categories[category] = CategoryResult(
                        items=final_items,
                        total_available=len(final_items),
                        requested_count=request.items_per_category or 20,
                        search_time_ms=category_time
                    )
                    
                    if final_items:
                        result.debug_info.categories_found.append(category)
                        logger.info(f"V2 API: Successfully found {len(final_items)} items for category '{category}' in {category_time}ms")
                    else:
                        result.debug_info.categories_missing.append(category)
                        logger.warning(f"V2 API: No items found for category '{category}'")
                        
                except Exception as category_error:
                    logger.error(f"V2 API: Error searching category '{category}': {category_error}")
                    # Still add empty category to maintain structure
                    result.categories[category] = CategoryResult(
                        items=[],
                        total_available=0,
                        requested_count=request.items_per_category or 20,
                        search_time_ms=int((time.time() - category_start) * 1000)
                    )
                    result.debug_info.categories_missing.append(category)
            
            # Calculate totals
            result.debug_info.total_items = sum(
                len(cat.items) for cat in result.categories.values()
            )
            result.debug_info.processing_time_ms = int((time.time() - start_time) * 1000)
            
            # TEMPORARILY DISABLED: Add complete-the-look computation to isolate 500 error
            # try:
            #     if self.outfit_completion_service is None:
            #         logger.info("V2 API: Skipping complete-the-look computation - service not available")
            #     else:
            #         completion_start = time.time()
            #         logger.info("V2 API: Computing complete-the-look suggestions...")
            #         
            #         # Pre-compute complete looks for each item using already-loaded data
            #         items_processed = 0
            #         for category_name, category_data in result.categories.items():
            #             for item in category_data.items:
            #                 try:
            #                     # Convert CategoryResult items to the format expected by completion service
            #                     available_items_dict = {}
            #                     for cat_name, cat_data in result.categories.items():
            #                         available_items_dict[cat_name] = cat_data.items
            #                     
            #                     # Generate complete look for this item
            #                     complete_look = self.outfit_completion_service.generate_complete_look(
            #                         base_item=item,
            #                         available_items=available_items_dict,
            #                         user_profile=user_profile
            #                     )
            #                     
            #                     # Attach to item (will be None if no suggestions found)
            #                     item.complete_the_look = complete_look
            #                     items_processed += 1
            #                     
            #                 except Exception as item_completion_error:
            #                     # Don't fail the entire response for individual item errors
            #                     logger.warning(f"V2 API: Failed to compute complete-the-look for item {item.id}: {item_completion_error}")
            #                     item.complete_the_look = None
            #                     continue
            #         
            #         completion_time = int((time.time() - completion_start) * 1000)
            #         logger.info(f"V2 API: Complete-the-look computed for {items_processed} items in {completion_time}ms")
            #     
            # except Exception as completion_error:
            #     # Graceful degradation - log error but don't fail the request
            #     logger.warning(f"V2 API: Complete-the-look computation failed: {completion_error}")
            
            logger.info("V2 API: Complete-the-look computation temporarily disabled for debugging")
            
            logger.info(f"V2 API: Generated {result.debug_info.total_items} total items across {len(result.categories)} categories in {result.debug_info.processing_time_ms}ms")
            
            return result
            
        except Exception as e:
            logger.error(f"V2 API Error: {e}")
            return RecommendationResponseV2(
                success=False,
                error=str(e),
                categories={},
                session_id=str(uuid.uuid4()),
                debug_info=DebugInfo(
                    user_selections=request.user_profile.preferred_article_types or [],
                    categories_found=[],
                    categories_missing=request.user_profile.preferred_article_types or [],
                    total_items=0,
                    search_mode=self._get_search_mode(),
                    processing_time_ms=int((time.time() - start_time) * 1000)
                )
            )
    
    def _get_search_mode(self) -> str:
        """
        Determine which search mode is being used for debugging
        """
        if self.vector_service.index is not None:
            return "faiss"
        elif hasattr(self.vector_service, 'embedding_model'):
            return "embedding"
        else:
            return "keyword"
    
    def _map_article_type(self, user_selection: str) -> List[str]:
        """
        Map user-friendly article type selections to database values
        """
        mapping = {
            'Tshirts': ['Tshirts', 'T-Shirts'],
            'Shirts': ['Shirts'],
            'Jeans': ['Jeans'],
            'Casual Shoes': ['Casual Shoes', 'Shoes'],
            'Sports Shoes': ['Sports Shoes', 'Shoes'],
            'Formal Shoes': ['Formal Shoes', 'Shoes'],
            'Sandals': ['Sandals', 'Flip Flops'],
            'Flip Flops': ['Flip Flops', 'Sandals'],
            'Shorts': ['Shorts'],
            'Trousers': ['Trousers'],
            'Track Pants': ['Track Pants'],
            'Jackets': ['Jackets'],
            'Sweaters': ['Sweaters'],
            'Sweatshirts': ['Sweatshirts'],
            'Kurtas': ['Kurtas'],
            'Tops': ['Tops'],
            'Dresses': ['Dresses'],
            'Skirts': ['Skirts'],
            'Leggings': ['Leggings'],
            'Heels': ['Heels'],
            'Flats': ['Flats']
        }
        return mapping.get(user_selection, [user_selection]) 