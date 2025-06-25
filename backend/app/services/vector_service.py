import os
import pickle
import csv
import json
import math
from typing import List, Dict, Tuple, Optional
from app.config import settings
from app.utils.logging import get_logger
from app.models.responses import ProductItem

# Optional heavy dependencies - graceful fallback if not available
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False

try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False

logger = get_logger(__name__)

class VectorSearchService:
    def __init__(self):
        self.index = None
        self.metadata = None
        self.df = None
        self.products_data = []  # Fallback storage without pandas
        self.products_with_embeddings = []  # Products with embeddings for similarity search
        self.dimension = None
        self.fallback_mode = True  # Start in fallback mode by default
        self.openai_service = None  # Will be set when needed
        
    async def load_or_create_index(self) -> bool:
        """
        Load existing FAISS index or create embeddings following OpenAI cookbook approach
        Priority: Mode A (FAISS) -> Mode B (Embeddings) -> Mode C (Keyword)
        """
        try:
            # Check if we have the required dependencies for full FAISS functionality
            if FAISS_AVAILABLE and NUMPY_AVAILABLE and PANDAS_AVAILABLE:
                # Try to load existing FAISS index
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
                    self.fallback_mode = False
                    logger.info(f"MODE A: Loaded FAISS index with {self.index.ntotal} vectors, dimension {self.dimension}")
                    self.mode = "A"
                    return True
            
            # Initialize with CSV data and prepare for embedding generation
            logger.info("FAISS not available or no pre-generated index. Initializing for embedding generation...")
            success = await self._initialize_embedding_mode()
            
            if success and self.products_data:
                # Try to generate embeddings immediately for Mode A/B
                logger.info("Attempting immediate embedding generation for Mode A/B...")
                try:
                    # Generate embeddings for a subset first to test
                    await self._generate_embeddings_immediate()
                    
                    if self.products_with_embeddings and len(self.products_with_embeddings) > 0:
                        logger.info(f"MODE B: Embedding similarity search enabled with {len(self.products_with_embeddings)} products")
                        self.mode = "B"
                        self.fallback_mode = False
                        return True
                    
                except Exception as e:
                    logger.warning(f"Immediate embedding generation failed: {e}")
                
                # Fall back to background generation + keyword search
                logger.info("Starting background embedding generation...")
                import asyncio
                asyncio.create_task(self._generate_embeddings_background())
                
                logger.info("MODE C: Keyword similarity search enabled as fallback")
                self.mode = "C"
                return True
            
            return success
                
        except Exception as e:
            logger.error(f"Error loading FAISS index: {e}")
            return await self._initialize_embedding_mode()
    
    async def _initialize_embedding_mode(self) -> bool:
        """
        Initialize with CSV data and prepare for on-demand embedding generation
        Following the OpenAI cookbook approach
        """
        try:
            logger.info(f"Checking for CSV file at: {settings.styles_csv_path}")
            logger.info(f"Current working directory: {os.getcwd()}")
            logger.info(f"Data directory exists: {os.path.exists(settings.data_dir)}")
            
            # Try to find and load the CSV file
            csv_path = None
            if os.path.exists(settings.styles_csv_path):
                csv_path = settings.styles_csv_path
            else:
                # Try alternative paths
                alternative_paths = [
                    "backend/data/sample_styles.csv",
                    "../data/sample_styles.csv", 
                    "./data/sample_styles.csv",
                    "sample_styles.csv"
                ]
                
                for alt_path in alternative_paths:
                    logger.info(f"Trying alternative path: {alt_path}")
                    if os.path.exists(alt_path):
                        csv_path = alt_path
                        logger.info(f"Found CSV at alternative path: {alt_path}")
                        break
            
            if csv_path:
                logger.info("Loading CSV data...")
                
                # Load CSV data
                if PANDAS_AVAILABLE:
                    self.df = pd.read_csv(csv_path)
                    logger.info(f"Loaded {len(self.df)} products with pandas")
                    # Convert DataFrame to list of dicts for consistency
                    self.products_data = self.df.to_dict('records')
                else:
                    # Load CSV manually without pandas
                    self.products_data = []
                    with open(csv_path, 'r', encoding='utf-8') as file:
                        csv_reader = csv.DictReader(file)
                        for row in csv_reader:
                            self.products_data.append(row)
                    logger.info(f"Loaded {len(self.products_data)} products without pandas")
                
                # Don't generate embeddings at startup to avoid timeouts
                # Instead, we'll generate them on-demand or use a simpler similarity approach
                logger.info("CSV data loaded successfully. Embeddings will be generated on-demand.")
                
                self.fallback_mode = False  # We have data loaded
                return True
            else:
                logger.error("No CSV file found in any location")
                return False
                
        except Exception as e:
            logger.error(f"Error initializing embedding mode: {e}")
            return False
    
    async def _generate_embeddings_for_all_products(self):
        """
        Generate embeddings for all products following the OpenAI cookbook approach
        """
        try:
            # Import OpenAI service here to avoid circular imports
            from app.services.openai_service import OpenAIService
            if not self.openai_service:
                self.openai_service = OpenAIService()
            
            logger.info("Generating embeddings for all products...")
            
            # Create product descriptions for embedding
            product_descriptions = []
            for product in self.products_data:
                # Create rich description following cookbook approach
                description = self._create_product_description(product)
                product_descriptions.append(description)
            
            # Generate embeddings in batches to be cost-efficient
            batch_size = 100  # Process in batches to avoid API limits
            all_embeddings = []
            
            for i in range(0, len(product_descriptions), batch_size):
                batch = product_descriptions[i:i + batch_size]
                logger.info(f"Generating embeddings for batch {i//batch_size + 1}/{(len(product_descriptions) + batch_size - 1)//batch_size}")
                
                try:
                    batch_embeddings = await self.openai_service.get_embeddings_batch(batch)
                    all_embeddings.extend(batch_embeddings)
                except Exception as e:
                    logger.error(f"Error generating embeddings for batch: {e}")
                    # Create zero embeddings as fallback
                    zero_embedding = [0.0] * 1536  # text-embedding-3-large dimension
                    all_embeddings.extend([zero_embedding] * len(batch))
            
            # Combine products with their embeddings
            self.products_with_embeddings = []
            for product, embedding in zip(self.products_data, all_embeddings):
                product_with_embedding = product.copy()
                product_with_embedding['embedding'] = embedding
                self.products_with_embeddings.append(product_with_embedding)
            
            logger.info(f"Generated embeddings for {len(self.products_with_embeddings)} products")
            
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            # Fallback: use products without embeddings (will use random selection)
            self.products_with_embeddings = []
    
    def _create_product_description(self, product: Dict) -> str:
        """
        Create rich product description for embedding generation
        Following the OpenAI cookbook approach
        """
        description_parts = []
        
        # Product name
        if product.get('productDisplayName'):
            description_parts.append(product['productDisplayName'])
        
        # Category and type
        if product.get('masterCategory'):
            description_parts.append(f"Category: {product['masterCategory']}")
        
        if product.get('subCategory'):
            description_parts.append(f"Subcategory: {product['subCategory']}")
        
        if product.get('articleType'):
            description_parts.append(f"Type: {product['articleType']}")
        
        # Color and style attributes
        if product.get('baseColour'):
            description_parts.append(f"Color: {product['baseColour']}")
        
        if product.get('gender'):
            description_parts.append(f"Gender: {product['gender']}")
        
        if product.get('season'):
            description_parts.append(f"Season: {product['season']}")
        
        if product.get('usage'):
            description_parts.append(f"Usage: {product['usage']}")
        
        return " | ".join(description_parts)
    
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
    
    async def similarity_search(
        self, 
        query_embedding: List[float], 
        k: int = 20,
        exclude_ids: List[str] = None,
        search_query: str = None,
        gender_filter: str = None,
        article_type_filter: List[str] = None
    ) -> List[Tuple[ProductItem, float]]:
        """
        Perform similarity search using embeddings, FAISS, or keyword matching
        Returns top-k similar items with scores
        """
        exclude_ids = exclude_ids or []
        
        # Use FAISS if available (Mode A)
        if not self.fallback_mode and self.index is not None and FAISS_AVAILABLE:
            logger.info("Using FAISS similarity search (Mode A)")
            return await self._faiss_search(query_embedding, k, exclude_ids, gender_filter, article_type_filter)
        
        # Use embedding similarity if we have embeddings (Mode B)
        if self.products_with_embeddings and len(self.products_with_embeddings) > 0:
            logger.info(f"Using embedding similarity search (Mode B) with {len(self.products_with_embeddings)} products")
            return await self._embedding_similarity_search(query_embedding, k, exclude_ids, gender_filter, article_type_filter)
        
        # Use keyword-based search as fallback (Mode C)
        if self.products_data:
            logger.info(f"Using keyword similarity search (Mode C) with {len(self.products_data)} products")
            return await self._keyword_similarity_search(k, exclude_ids, search_query, gender_filter, article_type_filter)
        
        # Final fallback - this should not happen in production
        logger.error("No data available for similarity search")
        return []
    
    async def _faiss_search(self, query_embedding: List[float], k: int, exclude_ids: List[str], gender_filter: str = None, article_type_filter: List[str] = None) -> List[Tuple[ProductItem, float]]:
        """
        FAISS-based similarity search
        """
        query_vector = np.array([query_embedding]).astype('float32')
        search_k = min(k * 3, self.index.ntotal)
        distances, indices = self.index.search(query_vector, search_k)
        
        results = []
        for distance, idx in zip(distances[0], indices[0]):
            if len(results) >= k:
                break
                
            product_data = self.metadata[idx] if self.metadata else self.df.iloc[idx].to_dict()
            product_id = str(product_data['id'])
            
            if product_id in exclude_ids:
                continue
            
            similarity_score = 1.0 / (1.0 + distance)
            if gender_filter and product_data.get('gender', '') != gender_filter:
                continue
            if article_type_filter and product_data.get('articleType', '') not in article_type_filter:
                continue
            product_item = self._create_product_item(product_data, similarity_score)
            results.append((product_item, similarity_score))
        
        return results
    
    async def _embedding_similarity_search(self, query_embedding: List[float], k: int, exclude_ids: List[str], gender_filter: str = None, article_type_filter: List[str] = None) -> List[Tuple[ProductItem, float]]:
        """
        Custom embedding-based similarity search following OpenAI cookbook
        """
        similarities = []
        
        for product in self.products_with_embeddings:
            product_id = str(product['id'])
            if product_id in exclude_ids:
                continue
            
            if 'embedding' in product and product['embedding']:
                similarity = self.cosine_similarity(query_embedding, product['embedding'])
                if gender_filter and product['gender'] != gender_filter:
                    continue
                if article_type_filter and product['articleType'] not in article_type_filter:
                    continue
                similarities.append((product, similarity))
        
        # Sort by similarity (highest first)
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        # Take top-k results
        top_results = similarities[:k]
        
        # Convert to ProductItem format
        results = []
        for product_data, similarity in top_results:
            if gender_filter and product_data['gender'] != gender_filter:
                continue
            if article_type_filter and product_data['articleType'] not in article_type_filter:
                continue
            product_item = self._create_product_item(product_data, similarity)
            results.append((product_item, similarity))
        
        logger.info(f"Embedding similarity search returned {len(results)} results")
        return results
    
    async def _keyword_similarity_search(self, k: int, exclude_ids: List[str], search_query: str = None, gender_filter: str = None, article_type_filter: List[str] = None) -> List[Tuple[ProductItem, float]]:
        """
        Keyword-based similarity search using text matching
        This provides meaningful matching based on user search terms
        """
        logger.info("Using keyword-based similarity search with text matching")
        
        # Filter out excluded IDs
        available_products = [p for p in self.products_data if str(p['id']) not in exclude_ids]
        
        if not available_products:
            return []
        
        # If we have a search query, do text-based matching
        if search_query:
            scored_products = []
            search_terms = search_query.lower().split()
            
            for product_data in available_products:
                score = self._calculate_text_similarity(product_data, search_terms)
                if score > 0:  # Only include products with some relevance
                    if gender_filter and product_data.get('gender', '') != gender_filter:
                        continue
                    if article_type_filter and product_data.get('articleType', '') not in article_type_filter:
                        continue
                    scored_products.append((product_data, score))
            
            # Sort by score (highest first) and take top k
            scored_products.sort(key=lambda x: x[1], reverse=True)
            sample_size = min(k, len(scored_products))
            selected_products = scored_products[:sample_size]
            
        else:
            # Fallback to diverse selection if no search query
            sample_size = min(k, len(available_products))
            selected_products = [(p, 0.5) for p in available_products[:sample_size]]
        
        # Convert to ProductItem format
        results = []
        for product_data, similarity_score in selected_products:
            if gender_filter and product_data.get('gender', '') != gender_filter:
                continue
            if article_type_filter and product_data.get('articleType', '') not in article_type_filter:
                continue
            product_item = self._create_product_item(product_data, similarity_score)
            results.append((product_item, similarity_score))
        
        logger.info(f"Keyword similarity search returned {len(results)} items")
        return results
    
    def _calculate_text_similarity(self, product_data: Dict, search_terms: List[str]) -> float:
        """
        Calculate text-based similarity score between product and search terms
        """
        score = 0.0
        
        # Create searchable text from product data
        searchable_fields = [
            product_data.get('productDisplayName', ''),
            product_data.get('masterCategory', ''),
            product_data.get('subCategory', ''),
            product_data.get('articleType', ''),
            product_data.get('baseColour', ''),
            product_data.get('gender', ''),
            product_data.get('season', ''),
            product_data.get('usage', '')
        ]
        
        product_text = ' '.join(searchable_fields).lower()
        
        # Score based on term matches
        for term in search_terms:
            if term in product_text:
                # Higher score for exact matches in important fields
                if term in product_data.get('productDisplayName', '').lower():
                    score += 0.3
                elif term in product_data.get('articleType', '').lower():
                    score += 0.25
                elif term in product_data.get('baseColour', '').lower():
                    score += 0.2
                elif term in product_data.get('usage', '').lower():
                    score += 0.15
                else:
                    score += 0.1
        
        # Bonus for gender match
        if any(term in ['men', 'man', 'male'] for term in search_terms):
            if product_data.get('gender', '').lower() in ['men', 'male']:
                score += 0.2
        elif any(term in ['women', 'woman', 'female'] for term in search_terms):
            if product_data.get('gender', '').lower() in ['women', 'female']:
                score += 0.2
        
        # Bonus for season/occasion match
        season_terms = ['summer', 'winter', 'spring', 'fall', 'casual', 'formal', 'party', 'beach', 'pool']
        for term in search_terms:
            if term in season_terms:
                if term in product_data.get('season', '').lower() or term in product_data.get('usage', '').lower():
                    score += 0.15
        
        return min(score, 1.0)  # Cap at 1.0
    
    def create_index_from_embeddings(self, embeddings: List[List[float]], metadata: List[Dict]) -> None:
        """
        Create FAISS index from embeddings - only works if dependencies available
        """
        if not (FAISS_AVAILABLE and NUMPY_AVAILABLE):
            logger.warning("Cannot create FAISS index: required dependencies not available")
            return
            
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
    
    async def _fallback_search(self, k: int, exclude_ids: List[str]) -> List[Tuple[ProductItem, float]]:
        """
        Fallback search when no embeddings are available
        This should rarely be used in production
        """
        logger.warning("Using fallback search without embeddings - this should not happen in production")
        
        # Use basic product data if available
        available_products = [p for p in self.products_data if str(p['id']) not in exclude_ids]
        
        if not available_products:
            return []
        
        # Take first k products as fallback
        sample_size = min(k, len(available_products))
        selected_products = available_products[:sample_size]
        
        results = []
        for product_data in selected_products:
            # Use a low similarity score to indicate this is fallback
            similarity_score = 0.1
            product_item = self._create_product_item(product_data, similarity_score)
            results.append((product_item, similarity_score))
        
        logger.warning(f"Fallback search returned {len(results)} items")
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
        locations = ["A1-B2", "C3-D4", "E5-F6", "G7-H8", "I9-J10"]
        return locations[hash(product_id) % len(locations)]
    
    async def get_fresh_recommendations(
        self, 
        query_embedding: List[float],
        exclude_ids: List[str],
        count: int = 1,
        search_query: str = None,
        gender_filter: str = None,
        article_type_filter: List[str] = None
    ) -> List[ProductItem]:
        """
        Get fresh recommendations excluding specified IDs
        Used for dynamic replacement when items are thumbs down
        """
        results = await self.similarity_search(
            query_embedding=query_embedding,
            k=count,
            exclude_ids=exclude_ids,
            search_query=search_query,
            gender_filter=gender_filter,
            article_type_filter=article_type_filter
        )
        
        return [item for item, _ in results]
    
    def get_total_products(self) -> int:
        """
        Get total number of products in the vector store
        """
        if self.index and FAISS_AVAILABLE:
            return self.index.ntotal
        elif self.products_with_embeddings:
            return len(self.products_with_embeddings)
        elif self.products_data:  # This should be the main path now
            return len(self.products_data)
        elif PANDAS_AVAILABLE and self.df is not None:
            return len(self.df)
        else:
            return 0
    
    def is_fallback_mode(self) -> bool:
        """
        Check if service is running in fallback mode
        """
        return self.fallback_mode 

    async def _generate_embeddings_background(self):
        """
        Generate embeddings in background without blocking startup
        """
        try:
            logger.info("Background embedding generation started...")
            await self._generate_embeddings_for_all_products()
            
            # Switch to embedding mode once complete
            if self.products_with_embeddings:
                logger.info(f"Background embedding generation complete! Switched to embedding mode with {len(self.products_with_embeddings)} products")
                
                # Switch to embedding mode
                self.mode = "B"
                self.fallback_mode = False
                
        except Exception as e:
            logger.error(f"Background embedding generation failed: {e}")
            # Continue with keyword search
        
    async def _generate_embeddings_immediate(self):
        """Generate embeddings immediately for a subset of products"""
        try:
            # Take a subset for immediate generation (first 50 products)
            subset_size = min(50, len(self.products_data))
            subset_products = self.products_data[:subset_size]
            
            # Generate embeddings for subset
            self.products_with_embeddings = await self.embeddings_generator.generate_embeddings_for_products(
                subset_products,
                description_column=None  # Use rich descriptions
            )
            
            logger.info(f"Generated embeddings for {len(self.products_with_embeddings)} products (immediate mode)")
            
        except Exception as e:
            logger.error(f"Immediate embedding generation failed: {e}")
            self.products_with_embeddings = [] 