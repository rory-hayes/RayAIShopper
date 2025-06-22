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
    
    async def create_search_query_from_profile(
        self, 
        user_profile: UserProfile,
        inspiration_analysis: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Create enhanced search query from user profile and image analysis
        """
        # Base query from user profile
        base_elements = [
            user_profile.shopping_prompt,
            user_profile.gender.value,
            " ".join(user_profile.preferred_styles),
            " ".join(user_profile.preferred_colors)
        ]
        
        # Add image analysis insights if available
        if inspiration_analysis:
            # Add specific items identified in images
            if inspiration_analysis.get("items"):
                base_elements.extend(inspiration_analysis["items"])
            
            # Add colors from image analysis
            if inspiration_analysis.get("colors"):
                base_elements.extend(inspiration_analysis["colors"])
            
            # Add occasions/contexts
            if inspiration_analysis.get("occasions"):
                base_elements.extend(inspiration_analysis["occasions"])
            
            # Add style notes
            if inspiration_analysis.get("style_notes"):
                base_elements.append(inspiration_analysis["style_notes"])
        
        # Create comprehensive search query
        search_query = " ".join(filter(None, base_elements))
        
        # Enhance with GPT-4o mini for better semantic understanding
        try:
            prompt = f"""Create an enhanced search query for finding clothing items based on this user request: "{search_query}"

Focus on:
- Specific clothing items and accessories
- Style descriptors and aesthetics  
- Colors and patterns
- Occasions and contexts
- Gender and fit preferences

Return only the enhanced search terms, no extra text."""

            response = await self.client.chat.completions.create(
                model=settings.gpt_model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                max_tokens=150,
                temperature=0.3
            )
            
            enhanced_query = response.choices[0].message.content.strip()
            logger.info(f"Enhanced search query: {enhanced_query}")
            return enhanced_query
            
        except Exception as e:
            logger.error(f"Error enhancing search query: {e}")
            return search_query  # Fallback to basic query
    
    @openai_retry
    async def analyze_inspiration_images(self, base64_images: List[str]) -> Dict[str, Any]:
        """
        Analyze inspiration images using GPT-4o mini vision capabilities
        Returns style insights to enhance search query
        """
        if not base64_images:
            return {"items": [], "style_notes": "", "colors": [], "occasions": []}
        
        try:
            # Prepare messages with images for GPT-4o mini
            content = [
                {
                    "type": "text",
                    "text": """Analyze these fashion inspiration images and provide detailed style insights for a shopping recommendation system.

Please return a JSON response with:
1. "items": List of specific clothing items/accessories you see (e.g., "black leather jacket", "white sneakers")
2. "style_notes": Description of the overall aesthetic and style direction
3. "colors": List of dominant colors
4. "occasions": List of occasions/contexts this style would be appropriate for
5. "gender": Inferred target gender ("men", "women", or "unisex")
6. "season": Inferred season if applicable ("spring", "summer", "fall", "winter", or "year-round")

Focus on actionable details that would help find similar clothing items."""
                }
            ]
            
            # Add each image to the content
            for i, base64_image in enumerate(base64_images):
                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{base64_image}",
                        "detail": "low"  # Use low detail for cost efficiency
                    }
                })
            
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",  # GPT-4o mini supports vision
                messages=[
                    {
                        "role": "user",
                        "content": content
                    }
                ],
                max_tokens=1000,
                temperature=0.1  # Low temperature for consistent analysis
            )
            
            # Parse the response
            analysis_text = response.choices[0].message.content
            logger.info(f"Image analysis response: {analysis_text}")
            
            # Try to parse as JSON, fallback to structured parsing
            try:
                import json
                analysis = json.loads(analysis_text)
                
                # Validate required fields
                required_fields = ["items", "style_notes", "colors", "occasions"]
                for field in required_fields:
                    if field not in analysis:
                        analysis[field] = []
                
                logger.info(f"Successfully analyzed {len(base64_images)} inspiration images")
                return analysis
                
            except json.JSONDecodeError:
                # Fallback: extract information from text response
                logger.warning("Failed to parse JSON, using text extraction fallback")
                return self._extract_style_info_from_text(analysis_text)
            
        except Exception as e:
            logger.error(f"Error analyzing inspiration images: {e}")
            return {"items": [], "style_notes": "", "colors": [], "occasions": [], "error": str(e)}
    
    def _extract_style_info_from_text(self, text: str) -> Dict[str, Any]:
        """
        Fallback method to extract style information from text response
        """
        text_lower = text.lower()
        
        # Extract basic information using keyword matching
        colors = []
        common_colors = ["black", "white", "blue", "red", "green", "yellow", "brown", "gray", "pink", "purple", "orange"]
        for color in common_colors:
            if color in text_lower:
                colors.append(color)
        
        occasions = []
        common_occasions = ["casual", "formal", "business", "party", "wedding", "date", "work", "weekend"]
        for occasion in common_occasions:
            if occasion in text_lower:
                occasions.append(occasion)
        
        # Extract items mentioned
        items = []
        common_items = ["shirt", "pants", "dress", "jacket", "shoes", "sneakers", "boots", "jeans", "sweater", "coat"]
        for item in common_items:
            if item in text_lower:
                items.append(item)
        
        return {
            "items": items,
            "style_notes": text[:200] + "..." if len(text) > 200 else text,
            "colors": colors,
            "occasions": occasions,
            "gender": "unisex",  # Default fallback
            "season": "year-round"  # Default fallback
        }
    
    async def enhance_recommendations(
        self, 
        user_profile: UserProfile, 
        recommendations: List[ProductItem],
        inspiration_analysis: Optional[Dict[str, Any]] = None
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
        
        # Format inspiration analysis if available
        inspiration_text = ""
        if inspiration_analysis:
            if isinstance(inspiration_analysis, dict):
                # Convert dict to readable text
                parts = []
                if inspiration_analysis.get("style_notes"):
                    parts.append(f"Style: {inspiration_analysis['style_notes']}")
                if inspiration_analysis.get("items"):
                    parts.append(f"Items seen: {', '.join(inspiration_analysis['items'])}")
                if inspiration_analysis.get("colors"):
                    parts.append(f"Colors: {', '.join(inspiration_analysis['colors'])}")
                if inspiration_analysis.get("occasions"):
                    parts.append(f"Occasions: {', '.join(inspiration_analysis['occasions'])}")
                inspiration_text = " | ".join(parts)
            else:
                inspiration_text = str(inspiration_analysis)
        
        user_prompt = f"""
        User Profile:
        - Shopping Intent: {user_profile.shopping_prompt}
        - Gender: {user_profile.gender.value}
        - Preferred Styles: {', '.join([style.value for style in user_profile.preferred_styles])}
        - Preferred Colors: {', '.join(user_profile.preferred_colors)}
        - Preferred Article Types: {', '.join(user_profile.preferred_article_types) if user_profile.preferred_article_types else 'Any'}
        
        {f"Inspiration Analysis: {inspiration_text}" if inspiration_text else ""}
        
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