"""
Demo: OpenAI Cookbook Approach Without FAISS
Shows how to implement the exact cookbook methodology using lightweight dependencies
"""
import asyncio
import csv
from app.services.similarity_service import LightweightSimilarityService
from app.utils.embeddings import EmbeddingGenerator
from app.config import settings

async def cookbook_approach_demo():
    """
    Demonstrate the OpenAI cookbook approach without heavy dependencies
    """
    print("OpenAI Cookbook Approach Demo (Lightweight)")
    print("=" * 50)
    
    # Step 1: Load sample data (same as cookbook)
    print("Loading sample styles data...")
    products_data = []
    
    try:
        with open(settings.styles_csv_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            for row in csv_reader:
                products_data.append(row)
        print(f"Loaded {len(products_data)} products")
    except Exception as e:
        print(f"Error loading data: {e}")
        return
    
    # Step 2: Generate embeddings (same as cookbook)
    print("\nGenerating embeddings...")
    embedding_generator = EmbeddingGenerator()
    
    # Take first 10 products for demo (to avoid costs)
    sample_products = products_data[:10]
    
    try:
        products_with_embeddings = await embedding_generator.generate_embeddings_for_products(
            sample_products,
            description_column=None  # Use rich descriptions
        )
        print(f"Generated embeddings for {len(products_with_embeddings)} products")
    except Exception as e:
        print(f"Error generating embeddings: {e}")
        return
    
    # Step 3: Initialize similarity service (replaces FAISS)
    print("\nInitializing similarity search...")
    similarity_service = LightweightSimilarityService()
    similarity_service.load_embeddings_data(products_with_embeddings)
    
    # Step 4: Demonstrate image analysis simulation
    print("\nSimulating image analysis (cookbook approach)...")
    
    # This would normally come from GPT-4o mini image analysis
    simulated_analysis = {
        "items": ["casual blue jeans", "comfortable cotton t-shirt"],
        "category": "Topwear", 
        "gender": "Men"
    }
    
    print(f"Image analysis results: {simulated_analysis}")
    
    # Step 5: Filter data (same as cookbook)
    print("\nFiltering products (cookbook approach)...")
    
    # Filter same gender or unisex, different category
    filtered_products = []
    target_gender = simulated_analysis["gender"].lower()
    exclude_category = simulated_analysis["category"].lower()
    
    for product in products_with_embeddings:
        product_gender = product.get('gender', '').lower()
        product_category = product.get('masterCategory', '').lower()
        
        # Same logic as cookbook
        if product_gender in [target_gender, 'unisex'] and product_category != exclude_category:
            filtered_products.append(product)
    
    print(f"{len(filtered_products)} products after filtering")
    
    # Step 6: Find matching items using RAG (cookbook approach)
    print("\nFinding matches using RAG...")
    
    if filtered_products:
        # Update similarity service with filtered data
        similarity_service.load_embeddings_data(filtered_products)
        
        # Find matches for each description
        matching_items = await similarity_service.find_matching_items_with_rag(
            query_descriptions=simulated_analysis["items"],
            embeddings_generator=embedding_generator,
            gender_filter=simulated_analysis["gender"],
            exclude_category=simulated_analysis["category"],
            items_per_description=2
        )
        
        print(f"Found {len(matching_items)} matching items")
        
        # Display results (same as cookbook)
        print("\nMatching Items:")
        for i, item in enumerate(matching_items, 1):
            print(f"{i}. {item.get('productDisplayName', 'Unknown')}")
            print(f"   Category: {item.get('articleType', 'Unknown')}")
            print(f"   Color: {item.get('baseColour', 'Unknown')}")
            print(f"   Similarity: {item.get('similarity_score', 0):.3f}")
            print(f"   Matched: {item.get('matched_description', 'Unknown')}")
            print()
    else:
        print("No products available after filtering")
    
    print("Demo completed! This shows the exact cookbook approach without FAISS.")
    print("\nKey Points:")
    print("   • Uses custom cosine similarity (same as cookbook)")
    print("   • Filters by gender/category (same as cookbook)")
    print("   • Generates embeddings on-demand (same as cookbook)")
    print("   • Works without pandas/numpy/faiss")
    print("   • Deployable under 250MB limit")

if __name__ == "__main__":
    asyncio.run(cookbook_approach_demo()) 