import base64
import json
from typing import List, Dict, Any, Optional, Tuple
from openai import AsyncOpenAI
from app.config import settings
from app.utils.retry import openai_retry
from app.utils.logging import get_logger
from app.models.requests import UserProfile, ChatMessage
from app.models.responses import ProductItem

logger = get_logger(__name__)

class OpenAIService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.assistant_id = None
        
    @openai_retry
    async def get_query_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for search query
        """
        response = await self.client.embeddings.create(
            input=text,
            model=settings.embedding_model
        )
        return response.data[0].embedding
    
    @openai_retry
    async def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a batch of texts efficiently
        Following OpenAI cookbook approach for cost-effective embedding generation
        """
        if not texts:
            return []
        
        try:
            response = await self.client.embeddings.create(
                input=texts,
                model=settings.embedding_model
            )
            
            # Extract embeddings in the same order as input
            embeddings = [data.embedding for data in response.data]
            logger.info(f"Generated {len(embeddings)} embeddings in batch")
            return embeddings
            
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            # Return zero embeddings as fallback
            zero_embedding = [0.0] * 1536  # text-embedding-3-large dimension
            return [zero_embedding] * len(texts)
    
    async def create_search_query_from_profile(self, user_profile: UserProfile) -> str:
        """
        Create optimized search query from user profile using GPT-4o mini
        Following cookbook's approach to enhance search queries
        """
        system_prompt = """You are a fashion search expert. Create a detailed search query that will help find the perfect clothing items for the user.

        Focus on:
        - Style preferences and occasion
        - Color preferences
        - Gender and fit requirements
        - Seasonal appropriateness
        - Usage context (casual, formal, etc.)
        
        Return only the search query text, no explanations."""
        
        user_prompt = f"""
        User Profile:
        - Shopping Intent: {user_profile.shopping_prompt}
        - Gender: {user_profile.gender}
        - Preferred Styles: {', '.join(user_profile.preferred_styles)}
        - Preferred Colors: {', '.join(user_profile.preferred_colors)}
        - Size: {user_profile.size}
        - Age Range: {user_profile.age_range or 'Not specified'}
        - Budget: {user_profile.budget_range or 'Not specified'}
        - Body Type: {user_profile.body_type or 'Not specified'}
        
        Create a search query to find matching clothing items.
        """
        
        try:
            response = await self.client.chat.completions.create(
                model=settings.gpt_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=150,
                temperature=0.3
            )
            
            search_query = response.choices[0].message.content.strip()
            logger.info(f"Generated search query: {search_query}")
            return search_query
            
        except Exception as e:
            logger.error(f"Error generating search query: {e}")
            # Fallback to basic query
            return f"{user_profile.shopping_prompt} {user_profile.gender} clothing"
    
    async def analyze_inspiration_images(self, images: List[str]) -> str:
        """
        Analyze inspiration images using GPT-4o mini vision capabilities
        """
        if not images:
            return ""
        
        system_prompt = """Analyze the clothing/fashion images provided and describe the key style elements, colors, patterns, and overall aesthetic. Focus on details that would help in finding similar items."""
        
        # Prepare image messages (limit to first 2 images for cost efficiency)
        messages = [{"role": "system", "content": system_prompt}]
        
        for i, image_b64 in enumerate(images[:2]):
            messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": f"Image {i+1}:"},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}
                    }
                ]
            })
        
        try:
            response = await self.client.chat.completions.create(
                model=settings.gpt_model,
                messages=messages,
                max_tokens=200,
                temperature=0.3
            )
            
            analysis = response.choices[0].message.content.strip()
            logger.info("Successfully analyzed inspiration images")
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing inspiration images: {e}")
            return ""
    
    async def enhance_recommendations(
        self, 
        user_profile: UserProfile, 
        recommendations: List[ProductItem],
        inspiration_analysis: str = ""
    ) -> List[ProductItem]:
        """
        Use GPT-4o mini to rank and enhance recommendations based on user profile
        """
        system_prompt = """You are a personal fashion stylist. Rank the provided clothing items based on how well they match the user's profile and preferences. Consider style, color, occasion, and overall fit with their requirements.

        Return a JSON array of product IDs in order of best match (best first). Include only the IDs, no explanations."""
        
        # Prepare product summaries
        product_summaries = []
        for item in recommendations:
            summary = f"ID: {item.id}, Name: {item.name}, Type: {item.article_type}, Color: {item.color}, Usage: {item.usage}"
            product_summaries.append(summary)
        
        user_prompt = f"""
        User Profile:
        - Shopping Intent: {user_profile.shopping_prompt}
        - Gender: {user_profile.gender}
        - Preferred Styles: {', '.join(user_profile.preferred_styles)}
        - Preferred Colors: {', '.join(user_profile.preferred_colors)}
        - Size: {user_profile.size}
        
        {f"Inspiration Analysis: {inspiration_analysis}" if inspiration_analysis else ""}
        
        Products to rank:
        {chr(10).join(product_summaries)}
        
        Return JSON array of product IDs ranked by best match.
        """
        
        try:
            response = await self.client.chat.completions.create(
                model=settings.gpt_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=300,
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            # Parse ranking
            ranking_data = json.loads(response.choices[0].message.content)
            ranked_ids = ranking_data.get("ranking", [])
            
            # Reorder recommendations based on GPT ranking
            id_to_item = {item.id: item for item in recommendations}
            enhanced_recommendations = []
            
            # Add ranked items first
            for product_id in ranked_ids:
                if product_id in id_to_item:
                    enhanced_recommendations.append(id_to_item[product_id])
            
            # Add any remaining items
            for item in recommendations:
                if item not in enhanced_recommendations:
                    enhanced_recommendations.append(item)
            
            logger.info(f"Enhanced recommendations ranking with GPT-4o mini")
            return enhanced_recommendations
            
        except Exception as e:
            logger.error(f"Error enhancing recommendations: {e}")
            return recommendations  # Return original order on error
    
    async def chat_with_assistant(
        self, 
        message: str, 
        context: Dict[str, Any],
        history: List[ChatMessage]
    ) -> Tuple[str, bool]:
        """
        Chat with GPT-4o mini assistant about fashion and recommendations
        Returns (response_message, context_updated)
        """
        system_prompt = """You are Ray, a helpful fashion assistant. You help users find the perfect clothing items and provide style advice.

        You have access to the user's current context including their shopping preferences, current recommendations, and session history.

        Guidelines:
        - Be friendly and conversational
        - Provide specific fashion advice
        - Ask clarifying questions when needed
        - Help refine their search preferences
        - Suggest outfit combinations
        - Be concise but helpful
        
        If the user wants to update their preferences, indicate this in your response."""
        
        # Prepare conversation history
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add context information
        if context:
            context_msg = f"User Context: {json.dumps(context, indent=2)}"
            messages.append({"role": "system", "content": context_msg})
        
        # Add conversation history
        for msg in history[-5:]:  # Last 5 messages for context
            messages.append({"role": msg.role, "content": msg.content})
        
        # Add current message
        messages.append({"role": "user", "content": message})
        
        try:
            response = await self.client.chat.completions.create(
                model=settings.gpt_model,
                messages=messages,
                max_tokens=300,
                temperature=0.7
            )
            
            assistant_response = response.choices[0].message.content.strip()
            
            # Simple heuristic to detect if context should be updated
            context_keywords = ["prefer", "like", "want", "looking for", "change", "update"]
            context_updated = any(keyword in message.lower() for keyword in context_keywords)
            
            logger.info("Generated chat response")
            return assistant_response, context_updated
            
        except Exception as e:
            logger.error(f"Error in chat completion: {e}")
            return "I'm sorry, I'm having trouble responding right now. Please try again.", False
    
    @openai_retry
    async def generate_virtual_tryon(
        self, 
        user_image_b64: str, 
        product_item: ProductItem,
        style_prompt: str = None
    ) -> Tuple[str, str]:
        """
        Generate virtual try-on image using DALL-E
        Returns (image_url, generation_prompt)
        """
        # Create detailed prompt for DALL-E
        base_prompt = f"""A person wearing {product_item.name}, {product_item.article_type} in {product_item.color} color, {product_item.usage} style, photorealistic, high quality, fashion photography style"""
        
        if style_prompt:
            full_prompt = f"{base_prompt}, {style_prompt}"
        else:
            full_prompt = base_prompt
        
        try:
            response = await self.client.images.generate(
                model="dall-e-3",
                prompt=full_prompt,
                size="1024x1024",
                quality="standard",
                n=1
            )
            
            image_url = response.data[0].url
            logger.info(f"Generated virtual try-on image for product {product_item.id}")
            return image_url, full_prompt
            
        except Exception as e:
            logger.error(f"Error generating virtual try-on: {e}")
            raise 