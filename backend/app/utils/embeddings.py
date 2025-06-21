import tiktoken
import concurrent.futures
from openai import AsyncOpenAI
from typing import List, Dict, Any, Union
from app.config import settings
from app.utils.retry import openai_retry
from app.utils.logging import get_logger

# Optional heavy dependencies
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
    from tqdm import tqdm
    TQDM_AVAILABLE = True
except ImportError:
    TQDM_AVAILABLE = False

logger = get_logger(__name__)

class EmbeddingGenerator:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.encoding = tiktoken.get_encoding("cl100k_base")
    
    @openai_retry
    async def get_embeddings(self, input_texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts using OpenAI API
        Following cookbook's retry pattern
        """
        response = await self.client.embeddings.create(
            input=input_texts,
            model=settings.embedding_model
        )
        return [data.embedding for data in response.data]
    
    def batchify(self, iterable: List, batch_size: int = 64) -> List[List]:
        """
        Split an iterable into batches of specified size
        """
        length = len(iterable)
        for ndx in range(0, length, batch_size):
            yield iterable[ndx:min(ndx + batch_size, length)]
    
    async def embed_corpus(
        self,
        corpus: List[str],
        batch_size: int = 64,
        max_context_len: int = 8191
    ) -> List[List[float]]:
        """
        Generate embeddings for entire corpus with batch processing
        Following cookbook's parallel processing approach
        """
        # Encode and truncate texts
        encoded_corpus = [
            self.encoding.encode(text)[:max_context_len] 
            for text in corpus
        ]
        
        # Decode back to strings (after truncation)
        truncated_corpus = [
            self.encoding.decode(encoded_text) 
            for encoded_text in encoded_corpus
        ]
        
        # Calculate statistics
        num_tokens = sum(len(encoded_text) for encoded_text in encoded_corpus)
        cost_estimate = num_tokens / 1000 * settings.embedding_cost_per_1k_tokens
        
        logger.info(
            f"Generating embeddings for {len(corpus)} items, "
            f"{num_tokens} tokens, estimated cost: ${cost_estimate:.4f}"
        )
        
        # Process in batches
        all_embeddings = []
        batches = list(self.batchify(truncated_corpus, batch_size))
        
        # Use tqdm if available, otherwise simple iteration
        if TQDM_AVAILABLE:
            with tqdm(total=len(corpus), desc="Generating embeddings") as pbar:
                for batch in batches:
                    try:
                        batch_embeddings = await self.get_embeddings(batch)
                        all_embeddings.extend(batch_embeddings)
                        pbar.update(len(batch))
                    except Exception as e:
                        logger.error(f"Failed to generate embeddings for batch: {e}")
                        raise
        else:
            for i, batch in enumerate(batches):
                try:
                    logger.info(f"Processing batch {i+1}/{len(batches)}")
                    batch_embeddings = await self.get_embeddings(batch)
                    all_embeddings.extend(batch_embeddings)
                except Exception as e:
                    logger.error(f"Failed to generate embeddings for batch: {e}")
                    raise
        
        logger.info("Successfully generated all embeddings")
        return all_embeddings
    
    def create_rich_description(self, product_data: Union[Dict, Any]) -> str:
        """
        Create rich description for embedding from product data
        Works with both dict and pandas Series
        """
        # Handle both dict and pandas Series
        if hasattr(product_data, 'get'):
            # Dict-like access
            get_value = lambda key: product_data.get(key, '')
        else:
            # Pandas Series access
            get_value = lambda key: getattr(product_data, key, '')
        
        parts = [
            get_value('productDisplayName'),
            f"{get_value('articleType')} in {get_value('baseColour')}",
            f"for {get_value('usage')} wear",
            f"{get_value('gender')} clothing"
        ]
        
        # Add season if available
        season = get_value('season')
        if season and str(season).lower() not in ['', 'nan', 'none']:
            parts.append(f"{season} season")
        
        return " - ".join(filter(None, parts))
    
    async def generate_embeddings_for_dataframe(
        self, 
        df, 
        description_column: str = None
    ):
        """
        Generate embeddings for a DataFrame of products
        Only works if pandas is available
        """
        if not PANDAS_AVAILABLE:
            raise ImportError("pandas is required for DataFrame operations")
            
        if description_column:
            descriptions = df[description_column].astype(str).tolist()
        else:
            # Create rich descriptions
            descriptions = [
                self.create_rich_description(row) 
                for _, row in df.iterrows()
            ]
        
        # Generate embeddings
        embeddings = await self.embed_corpus(descriptions)
        
        # Add embeddings to DataFrame
        df_with_embeddings = df.copy()
        df_with_embeddings['embeddings'] = embeddings
        
        return df_with_embeddings
    
    async def generate_embeddings_for_products(
        self,
        products_data: List[Dict],
        description_column: str = None
    ) -> List[Dict]:
        """
        Generate embeddings for a list of product dictionaries
        Works without pandas
        """
        if description_column:
            descriptions = [str(product.get(description_column, '')) for product in products_data]
        else:
            # Create rich descriptions
            descriptions = [
                self.create_rich_description(product) 
                for product in products_data
            ]
        
        # Generate embeddings
        embeddings = await self.embed_corpus(descriptions)
        
        # Add embeddings to product data
        products_with_embeddings = []
        for product, embedding in zip(products_data, embeddings):
            product_copy = product.copy()
            product_copy['embeddings'] = embedding
            products_with_embeddings.append(product_copy)
        
        return products_with_embeddings 