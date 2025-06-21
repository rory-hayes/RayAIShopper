from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

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