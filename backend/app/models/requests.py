from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

class Gender(str, Enum):
    MEN = "Men"
    WOMEN = "Women"
    UNISEX = "Unisex"

class StylePreference(str, Enum):
    CASUAL = "Casual"
    FORMAL = "Formal"
    SMART_CASUAL = "Smart Casual"
    SPORTY = "Sporty"
    ELEGANT = "Elegant"
    TRENDY = "Trendy"
    CLASSIC = "Classic"

class UserProfile(BaseModel):
    shopping_prompt: str = Field(..., description="User's shopping intent and occasion")
    gender: Gender = Field(..., description="User's gender preference")
    preferred_styles: List[StylePreference] = Field(default=[], description="Preferred clothing styles")
    preferred_colors: List[str] = Field(default=[], description="Preferred colors")
    preferred_article_types: List[str] = Field(default=[], description="Preferred article types (e.g., Shirts, Jeans, Shoes)")
    selfie_image: Optional[str] = Field(None, description="Base64 encoded selfie for virtual try-on")
    age_range: Optional[str] = Field(None, description="Age range (e.g., '25-30')")
    budget_range: Optional[str] = Field(None, description="Budget preference")
    body_type: Optional[str] = Field(None, description="Body type preference")

class FilterOptions(BaseModel):
    categories: List[str] = Field(default=[], description="Product categories to include")
    colors: List[str] = Field(default=[], description="Colors to filter by")
    price_range: Optional[Dict[str, float]] = Field(None, description="Price range filter")
    exclude_ids: List[str] = Field(default=[], description="Product IDs to exclude")

class RecommendationRequest(BaseModel):
    user_profile: UserProfile
    inspiration_images: List[str] = Field(default=[], description="Base64 encoded inspiration images")
    filters: Optional[FilterOptions] = None
    top_k: int = Field(default=20, description="Number of recommendations to return")
    items_per_category: Optional[int] = Field(None, description="Number of items to return per article type category")
    session_id: Optional[str] = Field(None, description="Session identifier for tracking")

class ChatMessage(BaseModel):
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: Optional[str] = Field(None, description="Message timestamp")

class ChatRequest(BaseModel):
    message: str = Field(..., description="User's chat message")
    context: Optional[Dict[str, Any]] = Field(None, description="Current user context")
    history: List[ChatMessage] = Field(default=[], description="Chat history")
    session_id: Optional[str] = Field(None, description="Session identifier")

class TryOnRequest(BaseModel):
    user_image: str = Field(..., description="Base64 encoded user selfie")
    product_id: str = Field(..., description="Product ID to try on")
    product_image_url: Optional[str] = Field(None, description="Product image URL")
    style_prompt: Optional[str] = Field(None, description="Style instructions for DALL-E")

class FeedbackRequest(BaseModel):
    product_id: str = Field(..., description="Product ID for feedback")
    action: str = Field(..., description="Feedback action: 'like', 'dislike', 'save'")
    session_id: Optional[str] = Field(None, description="Session identifier")
    reason: Optional[str] = Field(None, description="Reason for feedback")

class RefreshRequest(BaseModel):
    session_id: str = Field(..., description="Session identifier")
    exclude_ids: List[str] = Field(..., description="Product IDs to exclude")
    count: int = Field(default=1, description="Number of new items to fetch") 