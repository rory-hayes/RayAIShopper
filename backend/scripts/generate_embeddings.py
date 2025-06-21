#!/usr/bin/env python3
"""
Generate embeddings for the sample clothing dataset and create FAISS index.

This script follows the OpenAI cookbook approach for creating a vector store:
1. Load the sample_styles.csv data
2. Create rich descriptions for each product
3. Generate embeddings using OpenAI API
4. Create and save FAISS index
5. Save metadata for product lookup

Usage:
    python scripts/generate_embeddings.py
"""

import os
import sys
import asyncio
import pandas as pd
import pickle
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.config import settings
from app.utils.embeddings import EmbeddingGenerator
from app.services.vector_service import VectorSearchService
from app.utils.logging import setup_logging, get_logger

# Setup logging
setup_logging()
logger = get_logger(__name__)

async def main():
    """
    Main function to generate embeddings and create FAISS index
    """
    logger.info("🚀 Starting embedding generation process...")
    
    # Check if CSV file exists
    if not os.path.exists(settings.styles_csv_path):
        logger.error(f"Sample styles CSV not found at {settings.styles_csv_path}")
        logger.info("Please ensure the data/sample_styles.csv file is present")
        return False
    
    try:
        # Step 1: Load the data
        logger.info(f"Loading data from {settings.styles_csv_path}")
        df = pd.read_csv(settings.styles_csv_path)
        logger.info(f"Loaded {len(df)} products from CSV")
        
        # Display sample data
        logger.info("Sample data:")
        logger.info(df.head().to_string())
        
        # Step 2: Initialize embedding generator
        embedding_generator = EmbeddingGenerator()
        
        # Step 3: Generate embeddings for all products
        logger.info("Generating embeddings for all products...")
        df_with_embeddings = await embedding_generator.generate_embeddings_for_dataframe(df)
        
        # Step 4: Save DataFrame with embeddings
        os.makedirs(os.path.dirname(settings.embeddings_csv_path), exist_ok=True)
        df_with_embeddings.to_csv(settings.embeddings_csv_path, index=False)
        logger.info(f"Saved embeddings to {settings.embeddings_csv_path}")
        
        # Step 5: Create FAISS index
        logger.info("Creating FAISS index...")
        vector_service = VectorSearchService()
        
        # Extract embeddings and metadata
        embeddings = df_with_embeddings['embeddings'].tolist()
        metadata = df_with_embeddings.drop('embeddings', axis=1).to_dict('records')
        
        # Create the index
        vector_service.create_index_from_embeddings(embeddings, metadata)
        
        # Step 6: Test the index
        logger.info("Testing the FAISS index...")
        success = await vector_service.load_or_create_index()
        
        if success:
            # Test search
            test_query = "elegant blue dress for formal occasions"
            query_embedding = await embedding_generator.get_embeddings([test_query])
            
            results = await vector_service.similarity_search(
                query_embedding=query_embedding[0],
                k=5
            )
            
            logger.info(f"Test search for '{test_query}' returned {len(results)} results:")
            for i, (item, score) in enumerate(results):
                logger.info(f"  {i+1}. {item.name} (score: {score:.3f})")
            
            logger.info("✅ Embedding generation completed successfully!")
            logger.info(f"Created FAISS index with {vector_service.get_total_products()} products")
            return True
        else:
            logger.error("❌ Failed to load the created FAISS index")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error during embedding generation: {e}")
        return False

def create_store_location_map():
    """
    Create a mock store location map for product inventory
    """
    logger.info("Creating store location map...")
    
    # Mock store layout
    store_map = {
        "sections": {
            "A": {"name": "Women's Casual", "aisles": ["A1", "A2", "A3"]},
            "B": {"name": "Women's Formal", "aisles": ["B1", "B2", "B3"]},
            "C": {"name": "Men's Casual", "aisles": ["C1", "C2", "C3"]},
            "D": {"name": "Men's Formal", "aisles": ["D1", "D2", "D3"]},
            "E": {"name": "Accessories", "aisles": ["E1", "E2"]},
            "F": {"name": "Footwear", "aisles": ["F1", "F2", "F3"]},
            "G": {"name": "Seasonal", "aisles": ["G1", "G2"]},
        },
        "layout": "Two-floor retail space with escalator access",
        "total_locations": 100
    }
    
    # Save store map
    os.makedirs(os.path.dirname(settings.store_location_path), exist_ok=True)
    import json
    with open(settings.store_location_path, 'w') as f:
        json.dump(store_map, f, indent=2)
    
    logger.info(f"Store location map saved to {settings.store_location_path}")

if __name__ == "__main__":
    # Create store location map
    create_store_location_map()
    
    # Generate embeddings
    success = asyncio.run(main())
    
    if success:
        print("\n🎉 Embedding generation completed successfully!")
        print(f"📁 Files created:")
        print(f"   - FAISS index: {settings.faiss_index_path}")
        print(f"   - Metadata: {settings.metadata_path}")
        print(f"   - Embeddings CSV: {settings.embeddings_csv_path}")
        print(f"   - Store map: {settings.store_location_path}")
        print(f"\n🚀 You can now start the API server with:")
        print(f"   cd backend && python -m uvicorn app.main:app --reload")
    else:
        print("\n❌ Embedding generation failed. Check the logs for details.")
        sys.exit(1) 