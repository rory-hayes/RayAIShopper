import pandas as pd
import numpy as np
import tiktoken
import concurrent.futures
from openai import AsyncOpenAI
from tqdm import tqdm
from typing import List
from app.config import settings
from app.utils.retry import openai_retry
from app.utils.logging import get_logger

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
        
        with tqdm(total=len(corpus), desc="Generating embeddings") as pbar:
            for batch in batches:
                try:
                    batch_embeddings = await self.get_embeddings(batch)
                    all_embeddings.extend(batch_embeddings)
                    pbar.update(len(batch))
                except Exception as e:
                    logger.error(f"Failed to generate embeddings for batch: {e}")
                    raise
        
        logger.info("Successfully generated all embeddings")
        return all_embeddings
    
    def create_rich_description(self, row: pd.Series) -> str:
        """
        Create rich description for embedding from product data
        Following cookbook's approach to combine multiple fields
        """
        parts = [
            row['productDisplayName'],
            f"{row['articleType']} in {row['baseColour']}",
            f"for {row['usage']} wear",
            f"{row['gender']} clothing"
        ]
        
        # Add season if available
        if pd.notna(row.get('season')):
            parts.append(f"{row['season']} season")
        
        return " - ".join(parts)
    
    async def generate_embeddings_for_dataframe(
        self, 
        df: pd.DataFrame, 
        description_column: str = None
    ) -> pd.DataFrame:
        """
        Generate embeddings for a DataFrame of products
        """
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