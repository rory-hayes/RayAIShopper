"""
Lightweight similarity service following OpenAI cookbook approach
Implements custom cosine similarity without heavy dependencies like FAISS
"""
import math
from typing import List, Dict, Tuple, Optional
from app.utils.logging import get_logger

logger = get_logger(__name__)

class LightweightSimilarityService:
    """
    Custom similarity search following the OpenAI cookbook approach
    Uses custom cosine similarity instead of FAISS for lightweight deployment
    """
    
    def __init__(self):
        self.products_with_embeddings = []
        
    def load_embeddings_data(self, products_data: List[Dict]) -> None:
        """
        Load products with pre-computed embeddings
        """
        self.products_with_embeddings = [
            product for product in products_data 
            if 'embeddings' in product and product['embeddings']
        ]
        logger.info(f"Loaded {len(self.products_with_embeddings)} products with embeddings")
    
    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """
        Custom cosine similarity implementation following cookbook approach
        Avoids numpy dependency while maintaining accuracy
        """
        if len(vec1) != len(vec2):
            return 0.0
            
        # Calculate dot product
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        
        # Calculate magnitudes
        magnitude1 = math.sqrt(sum(a * a for a in vec1))
        magnitude2 = math.sqrt(sum(b * b for b in vec2))
        
        # Avoid division by zero
        if magnitude1 == 0.0 or magnitude2 == 0.0:
            return 0.0
            
        return dot_product / (magnitude1 * magnitude2)
    
    def find_similar_items(
        self,
        query_embedding: List[float],
        threshold: float = 0.5,
        top_k: int = 20,
        exclude_ids: List[str] = None,
        gender_filter: str = None,
        category_filter: str = None,
        exclude_category: str = None
    ) -> List[Tuple[Dict, float]]:
        """
        Find similar items using custom cosine similarity
        Following the cookbook's matching algorithm approach
        """
        exclude_ids = exclude_ids or []
        results = []
        
        for product in self.products_with_embeddings:
            product_id = str(product.get('id', ''))
            
            # Skip excluded items
            if product_id in exclude_ids:
                continue
                
            # Apply gender filter (same as cookbook)
            if gender_filter:
                product_gender = product.get('gender', '').lower()
                if product_gender not in [gender_filter.lower(), 'unisex', '']:
                    continue
            
            # Apply category filters (same as cookbook)
            product_category = product.get('articleType', '').lower()
            if category_filter and product_category != category_filter.lower():
                continue
            if exclude_category and product_category == exclude_category.lower():
                continue
                
            # Calculate similarity
            similarity = self.cosine_similarity(query_embedding, product['embeddings'])
            
            # Apply threshold
            if similarity >= threshold:
                results.append((product, similarity))
        
        # Sort by similarity (highest first) and return top_k
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]
    
    async def find_matching_items_with_rag(
        self,
        query_descriptions: List[str],
        embeddings_generator,
        gender_filter: str = None,
        exclude_category: str = None,
        items_per_description: int = 2
    ) -> List[Dict]:
        """
        RAG-based matching following the cookbook's exact approach
        """
        matching_items = []
        
        for description in query_descriptions:
            try:
                # Generate embedding for the description
                query_embedding = await embeddings_generator.get_query_embedding(description)
                
                # Find similar items
                similar_items = self.find_similar_items(
                    query_embedding=query_embedding,
                    top_k=items_per_description,
                    gender_filter=gender_filter,
                    exclude_category=exclude_category
                )
                
                # Add to results
                for item, similarity in similar_items:
                    item_copy = item.copy()
                    item_copy['similarity_score'] = similarity
                    item_copy['matched_description'] = description
                    matching_items.append(item_copy)
                    
            except Exception as e:
                logger.error(f"Error processing description '{description}': {e}")
                continue
        
        return matching_items
    
    def has_embeddings_data(self) -> bool:
        """
        Check if we have embeddings data loaded
        """
        return len(self.products_with_embeddings) > 0
    
    def get_embeddings_count(self) -> int:
        """
        Get count of products with embeddings
        """
        return len(self.products_with_embeddings) 