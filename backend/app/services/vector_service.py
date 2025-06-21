import os
import pickle
import pandas as pd
import numpy as np
import faiss
from typing import List, Dict, Tuple, Optional
from app.config import settings
from app.utils.logging import get_logger
from app.models.responses import ProductItem

logger = get_logger(__name__)

class VectorSearchService:
    def __init__(self):
        self.index = None
        self.metadata = None
        self.df = None
        self.dimension = None
        self.fallback_mode = False
        
    async def load_or_create_index(self) -> bool:
        """
        Load existing FAISS index or create new one from embeddings
        Following cookbook's approach for vector store management
        """
        try:
            # Try to load existing index
            if os.path.exists(settings.faiss_index_path) and os.path.exists(settings.metadata_path):
                logger.info("Loading existing FAISS index...")
                self.index = faiss.read_index(settings.faiss_index_path)
                
                with open(settings.metadata_path, 'rb') as f:
                    self.metadata = pickle.load(f)
                
                # Load DataFrame for product details
                if os.path.exists(settings.embeddings_csv_path):
                    self.df = pd.read_csv(settings.embeddings_csv_path)
                    # Convert string embeddings back to lists
                    self.df['embeddings'] = self.df['embeddings'].apply(eval)
                else:
                    self.df = pd.read_csv(settings.styles_csv_path)
                
                self.dimension = self.index.d
                logger.info(f"Loaded FAISS index with {self.index.ntotal} vectors, dimension {self.dimension}")
                return True
            else:
                # Fallback mode - load just the CSV data
                logger.warning("No FAISS index found. Attempting fallback mode with CSV data...")
                return await self._initialize_fallback_mode()
                
        except Exception as e:
            logger.error(f"Error loading FAISS index: {e}")
            # Try fallback mode
            return await self._initialize_fallback_mode()
    
    async def _initialize_fallback_mode(self) -> bool:
        """
        Initialize fallback mode using just CSV data without FAISS
        This allows the service to start even without pre-generated embeddings
        """
        try:
            if os.path.exists(settings.styles_csv_path):
                logger.info("Initializing fallback mode with CSV data...")
                self.df = pd.read_csv(settings.styles_csv_path)
                self.fallback_mode = True
                logger.info(f"Fallback mode initialized with {len(self.df)} products")
                return True
            else:
                logger.error("No data files found for fallback mode")
                return False
        except Exception as e:
            logger.error(f"Error initializing fallback mode: {e}")
            return False
    
    def create_index_from_embeddings(self, embeddings: List[List[float]], metadata: List[Dict]) -> None:
        """
        Create FAISS index from embeddings
        Following cookbook's FAISS setup
        """
        embeddings_array = np.array(embeddings).astype('float32')
        self.dimension = embeddings_array.shape[1]
        
        # Create FAISS index (using L2 distance)
        self.index = faiss.IndexFlatL2(self.dimension)
        self.index.add(embeddings_array)
        
        self.metadata = metadata
        
        # Save index and metadata
        os.makedirs(os.path.dirname(settings.faiss_index_path), exist_ok=True)
        faiss.write_index(self.index, settings.faiss_index_path)
        
        with open(settings.metadata_path, 'wb') as f:
            pickle.dump(metadata, f)
        
        logger.info(f"Created and saved FAISS index with {self.index.ntotal} vectors")
        self.fallback_mode = False
    
    async def similarity_search(
        self, 
        query_embedding: List[float], 
        k: int = 20,
        exclude_ids: List[str] = None
    ) -> List[Tuple[ProductItem, float]]:
        """
        Perform similarity search using FAISS or fallback to random selection
        Returns top-k similar items with scores
        """
        exclude_ids = exclude_ids or []
        
        if self.fallback_mode:
            return await self._fallback_search(k, exclude_ids)
        
        if self.index is None:
            logger.warning("No FAISS index available, using fallback search")
            return await self._fallback_search(k, exclude_ids)
        
        # Convert query to numpy array
        query_vector = np.array([query_embedding]).astype('float32')
        
        # Search for more items than needed to account for exclusions
        search_k = min(k * 3, self.index.ntotal)  # Search more to handle exclusions
        distances, indices = self.index.search(query_vector, search_k)
        
        results = []
        for i, (distance, idx) in enumerate(zip(distances[0], indices[0])):
            if len(results) >= k:
                break
                
            # Get product metadata
            product_data = self.metadata[idx] if self.metadata else self.df.iloc[idx].to_dict()
            product_id = str(product_data['id'])
            
            # Skip excluded items
            if product_id in exclude_ids:
                continue
            
            # Convert distance to similarity score (lower distance = higher similarity)
            similarity_score = 1.0 / (1.0 + distance)
            
            # Create ProductItem
            product_item = self._create_product_item(product_data, similarity_score)
            results.append((product_item, similarity_score))
        
        logger.info(f"Found {len(results)} similar items for query")
        return results
    
    async def _fallback_search(self, k: int, exclude_ids: List[str]) -> List[Tuple[ProductItem, float]]:
        """
        Fallback search when FAISS is not available
        Returns random selection of products with mock similarity scores
        """
        if self.df is None:
            logger.error("No data available for fallback search")
            return []
        
        # Filter out excluded IDs
        available_df = self.df[~self.df['id'].astype(str).isin(exclude_ids)]
        
        # Sample random products
        sample_size = min(k, len(available_df))
        sampled_df = available_df.sample(n=sample_size)
        
        results = []
        for _, row in sampled_df.iterrows():
            # Mock similarity score (random but consistent)
            similarity_score = 0.5 + (hash(str(row['id'])) % 1000) / 2000.0
            product_item = self._create_product_item(row.to_dict(), similarity_score)
            results.append((product_item, similarity_score))
        
        logger.info(f"Fallback search returned {len(results)} random items")
        return results
    
    def _create_product_item(self, product_data: Dict, similarity_score: float) -> ProductItem:
        """
        Create ProductItem from product data
        """
        product_id = str(product_data['id'])
        image_url = f"{settings.github_images_base_url}/{product_id}.jpg"
        
        return ProductItem(
            id=product_id,
            name=product_data.get('productDisplayName', ''),
            category=product_data.get('masterCategory', ''),
            subcategory=product_data.get('subCategory', ''),
            article_type=product_data.get('articleType', ''),
            color=product_data.get('baseColour', ''),
            gender=product_data.get('gender', ''),
            season=product_data.get('season'),
            usage=product_data.get('usage', ''),
            image_url=image_url,
            similarity_score=similarity_score,
            store_location=self._get_store_location(product_id)
        )
    
    def _get_store_location(self, product_id: str) -> Optional[str]:
        """
        Get store location for product (mock implementation)
        """
        # This would normally query a store inventory system
        # For now, return mock location based on product ID hash
        locations = ["A1-B2", "C3-D4", "E5-F6", "G7-H8", "I9-J10"]
        return locations[hash(product_id) % len(locations)]
    
    async def get_fresh_recommendations(
        self, 
        query_embedding: List[float],
        exclude_ids: List[str],
        count: int = 1
    ) -> List[ProductItem]:
        """
        Get fresh recommendations excluding specified IDs
        Used for dynamic replacement when items are thumbs down
        """
        results = await self.similarity_search(
            query_embedding=query_embedding,
            k=count,
            exclude_ids=exclude_ids
        )
        
        return [item for item, _ in results]
    
    def get_total_products(self) -> int:
        """
        Get total number of products in the vector store
        """
        if self.index:
            return self.index.ntotal
        elif self.df is not None:
            return len(self.df)
        else:
            return 0
    
    def is_fallback_mode(self) -> bool:
        """
        Check if service is running in fallback mode
        """
        return self.fallback_mode 