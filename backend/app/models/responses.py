from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ProductItemSummary(BaseModel):
    """Simplified product item for complete look suggestions to avoid circular references"""
    id: str = Field(..., description="Product ID")
    name: str = Field(..., description="Product display name")
    category: str = Field(..., description="Product category")
    article_type: str = Field(..., description="Article type")
    color: str = Field(..., description="Base color")
    image_url: str = Field(..., description="Product image URL")
    similarity_score: Optional[float] = Field(None, description="Similarity score")

class CompleteTheLookSuggestion(BaseModel):
    needed_categories: List[str] = Field(..., description="Categories needed to complete the look")
    suggested_items: Dict[str, List[ProductItemSummary]] = Field(..., description="Suggested items by category")
    style_rationale: Optional[str] = Field(None, description="Why these items work together")

class ProductItem(BaseModel):
    id: str = Field(..., description="Product ID")
    name: str = Field(..., description="Product display name")
    category: str = Field(..., description="Product category")
    subcategory: str = Field(..., description="Product subcategory")
    article_type: str = Field(..., description="Article type")
    color: str = Field(..., description="Base color")
    gender: str = Field(..., description="Target gender")
    season: Optional[str] = Field(None, description="Season")
    usage: str = Field(..., description="Usage context")
    image_url: str = Field(..., description="Product image URL")
    similarity_score: Optional[float] = Field(None, description="Similarity score from vector search")
    store_location: Optional[str] = Field(None, description="Store location")
    complete_the_look: Optional[CompleteTheLookSuggestion] = Field(None, description="Pre-computed complete look suggestions")

# Update the ProductItem model to resolve the forward reference
ProductItem.model_rebuild()

class RecommendationResponse(BaseModel):
    recommendations: List[ProductItem] = Field(..., description="List of recommended products")
    total_available: int = Field(..., description="Total number of available recommendations")
    session_id: str = Field(..., description="Session identifier for tracking")
    query_embedding: Optional[List[float]] = Field(None, description="Query embedding for debugging")

class ChatResponse(BaseModel):
    message: str = Field(..., description="Assistant's response message")
    context_updated: bool = Field(default=False, description="Whether user context was updated")
    suggestions: List[str] = Field(default=[], description="Follow-up suggestions")
    session_id: str = Field(..., description="Session identifier")

class TryOnResponse(BaseModel):
    generated_image_url: str = Field(..., description="URL of the generated try-on image")
    product_id: str = Field(..., description="Product ID that was tried on")
    generation_prompt: str = Field(..., description="The prompt used for DALL-E generation")
    success: bool = Field(default=True, description="Whether generation was successful")

class FeedbackResponse(BaseModel):
    success: bool = Field(..., description="Whether feedback was processed successfully")
    message: str = Field(..., description="Response message")
    updated_recommendations: Optional[List[ProductItem]] = Field(None, description="Updated recommendations if applicable")

class HealthResponse(BaseModel):
    status: str = Field(..., description="Service status")
    version: str = Field(..., description="API version")
    embedding_model: str = Field(..., description="Embedding model in use")
    gpt_model: str = Field(..., description="GPT model in use")
    vector_store_loaded: bool = Field(..., description="Whether vector store is loaded")
    fallback_mode: bool = Field(default=False, description="Whether running in fallback mode")
    total_products: Optional[int] = Field(None, description="Total products in vector store")
    environment: str = Field(..., description="Current environment")

class ErrorResponse(BaseModel):
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    request_id: Optional[str] = Field(None, description="Request identifier for debugging")

# V2 Response Models for improved recommendation system
class CategoryResult(BaseModel):
    items: List[ProductItem] = Field(..., description="List of products in this category")
    total_available: int = Field(..., description="Total number of items found for this category")
    requested_count: int = Field(..., description="Number of items requested for this category")
    search_time_ms: Optional[int] = Field(None, description="Time taken to search this category in milliseconds")

class DebugInfo(BaseModel):
    user_selections: List[str] = Field(..., description="Article types selected by user")
    categories_found: List[str] = Field(..., description="Categories that returned results")
    categories_missing: List[str] = Field(..., description="Categories that returned no results")
    total_items: int = Field(..., description="Total number of items across all categories")
    search_mode: str = Field(..., description="Search method used: faiss, embedding, or keyword")
    processing_time_ms: int = Field(..., description="Total processing time in milliseconds")

class RecommendationResponseV2(BaseModel):
    success: bool = Field(..., description="Whether the request was successful")
    error: Optional[str] = Field(None, description="Error message if request failed")
    categories: Dict[str, CategoryResult] = Field(..., description="Results organized by category")
    session_id: str = Field(..., description="Session identifier for tracking")
    debug_info: Optional[DebugInfo] = Field(None, description="Debug information for development") 