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
        system_prompt = """You are Ray, a world-class fashion stylist and color expert with years of experience in high-end fashion. You're passionate about helping people discover their personal style and feel confident in their clothing choices.

        Your expertise includes:
        - Color theory and seasonal color analysis
        - Style archetypes and body type recommendations  
        - Fashion trends and timeless pieces
        - Accessory coordination and styling
        - Fabric knowledge and garment construction
        - Occasion-appropriate dressing
        - Mix-and-match outfit creation
        - Personal shopping and wardrobe building

        Guidelines for your responses:
        - Be enthusiastic and encouraging about fashion
        - Provide specific, actionable styling advice
        - Reference color theory when discussing color combinations
        - Suggest outfit formulas and styling tricks
        - Mention specific brands or style inspirations when relevant
        - Ask clarifying questions to better understand their needs
        - Use fashion terminology appropriately but explain when needed
        - Be inclusive and body-positive in all recommendations
        - Focus on building confidence through great style choices
        - Reference their current recommendations and preferences from context

        Tone: Warm, knowledgeable, enthusiastic, and supportive - like a trusted friend who happens to be a fashion expert."""
        
        # Prepare conversation history
        messages = [{"role": "system", "content": system_prompt}]
        
        # Build comprehensive context information
        context_parts = []
        
        if context:
            # Add user profile information
            if "user_profile" in context:
                profile = context["user_profile"]
                context_parts.append(f"User Profile:")
                context_parts.append(f"- Shopping Goal: {profile.get('shopping_prompt', 'Not specified')}")
                context_parts.append(f"- Gender: {profile.get('gender', 'Not specified')}")
                
                if profile.get('preferred_styles'):
                    context_parts.append(f"- Style Preferences: {', '.join(profile['preferred_styles'])}")
                
                if profile.get('preferred_colors'):
                    context_parts.append(f"- Color Preferences: {', '.join(profile['preferred_colors'])}")
                
                if profile.get('preferred_article_types'):
                    context_parts.append(f"- Preferred Items: {', '.join(profile['preferred_article_types'])}")
                
                if profile.get('age_range'):
                    context_parts.append(f"- Age Range: {profile['age_range']}")
                
                if profile.get('budget_range'):
                    context_parts.append(f"- Budget: {profile['budget_range']}")
            
            # Add journey status
            if "journey_status" in context:
                status = context["journey_status"]
                context_parts.append(f"Journey Progress:")
                context_parts.append(f"- Has inspiration images: {status.get('has_inspiration_images', False)} ({status.get('inspiration_image_count', 0)} images)")
                context_parts.append(f"- Has selfie for try-on: {status.get('has_selfie', False)}")
                context_parts.append(f"- Current recommendations: {status.get('recommendation_count', 0)} items")
            
            # Add current recommendations info with detailed styling context
            if "current_recommendations" in context:
                recs = context["current_recommendations"]
                if recs and len(recs) > 0:
                    context_parts.append(f"Current Recommendations ({len(recs)} items):")
                    for i, rec in enumerate(recs[:5]):  # Show first 5 items in detail
                        if isinstance(rec, dict):
                            name = rec.get('name', 'Unknown item')
                            article_type = rec.get('article_type', '')
                            color = rec.get('color', '')
                            usage = rec.get('usage', '')
                            context_parts.append(f"  {i+1}. {name}")
                            if article_type:
                                context_parts.append(f"     - Type: {article_type}")
                            if color:
                                context_parts.append(f"     - Color: {color}")
                            if usage:
                                context_parts.append(f"     - Best for: {usage}")
                    if len(recs) > 5:
                        context_parts.append(f"  ... and {len(recs) - 5} more items available")
                        
                    # Add styling insights
                    colors_in_recs = [rec.get('color', '') for rec in recs if rec.get('color')]
                    unique_colors = list(set([c for c in colors_in_recs if c]))
                    if unique_colors:
                        context_parts.append(f"Color palette in recommendations: {', '.join(unique_colors[:5])}")
        
        # Add context information to messages if available
        if context_parts:
            context_msg = "\n".join(context_parts)
            messages.append({"role": "system", "content": f"Current Context:\n{context_msg}\n\nUse this information to provide personalized fashion advice."})
        
        # Add conversation history (last 8 messages for better context)
        for msg in history[-8:]:
            messages.append({"role": msg.role, "content": msg.content})
        
        # Add current message
        messages.append({"role": "user", "content": message})
        
        try:
            response = await self.client.chat.completions.create(
                model=settings.gpt_model,
                messages=messages,
                max_tokens=400,  # Increased for more detailed fashion advice
                temperature=0.8  # Slightly higher for more creative styling suggestions
            )
            
            assistant_response = response.choices[0].message.content.strip()
            
            # Enhanced context update detection for fashion-related changes
            fashion_keywords = [
                "prefer", "like", "want", "looking for", "change", "update", "style", "color",
                "outfit", "occasion", "budget", "size", "fit", "trend", "classic", "formal",
                "casual", "work", "party", "date", "wedding", "travel"
            ]
            context_updated = any(keyword in message.lower() for keyword in fashion_keywords)
            
            logger.info("Generated fashion expert chat response")
            return assistant_response, context_updated
            
        except Exception as e:
            logger.error(f"Error in fashion chat completion: {e}")
            return "I'm sorry, I'm having trouble with my styling advice right now. Please try again in a moment!", False
    
    @openai_retry
    async def analyze_user_selfie(self, user_image_b64: str) -> Dict[str, Any]:
        """
        Analyze user's selfie with GPT-4o Vision to extract detailed characteristics
        for high-fidelity virtual try-on generation
        """
        system_prompt = """You are a professional fashion stylist and image analyst. Analyze this person's photo and extract detailed characteristics that will help create a virtual try-on image that looks as close as possible to the original person.

        Focus on:
        1. Physical characteristics (age range, build, posture)
        2. Facial features (hair color/style, skin tone, facial structure)
        3. Current pose and angle
        4. Background and lighting
        5. Current clothing style visible
        6. Overall aesthetic and vibe

        Return detailed JSON with specific descriptive terms that can be used in DALL-E prompts."""

        user_prompt = """Analyze this person's photo and provide detailed characteristics for virtual try-on generation. Be specific about physical features, pose, lighting, and style that should be preserved in a generated image.

        Return JSON format:
        {
            "physical_description": "detailed description of the person",
            "facial_features": "hair, skin tone, facial structure details",
            "pose_and_angle": "current pose, angle, body position",
            "lighting_and_background": "lighting style, background description",
            "current_style": "visible clothing and style elements",
            "age_range": "estimated age range",
            "build_type": "body type/build description",
            "overall_vibe": "aesthetic and mood of the photo"
        }"""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o",  # Use GPT-4o for vision analysis
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user", 
                        "content": [
                            {"type": "text", "text": user_prompt},
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{user_image_b64}"}
                            }
                        ]
                    }
                ],
                max_tokens=500,
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            analysis = json.loads(response.choices[0].message.content)
            logger.info("Analyzed user selfie with GPT-4o Vision")
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing user selfie: {e}")
            # Return fallback analysis
            return {
                "physical_description": "a person",
                "facial_features": "natural features",
                "pose_and_angle": "standing naturally",
                "lighting_and_background": "natural lighting",
                "current_style": "casual style",
                "age_range": "adult",
                "build_type": "average build",
                "overall_vibe": "friendly and approachable"
            }

    @openai_retry
    async def generate_virtual_tryon(
        self, 
        user_image_b64: str, 
        product_item: ProductItem,
        style_prompt: str = None
    ) -> Tuple[str, str]:
        """
        Generate high-fidelity virtual try-on image using DALL-E
        First analyzes the user's selfie, then creates a detailed prompt for maximum similarity
        Returns (image_url, generation_prompt)
        """
        try:
            # Step 1: Analyze the user's selfie to extract characteristics
            logger.info(f"Analyzing user selfie for virtual try-on with product {product_item.id}")
            user_analysis = await self.analyze_user_selfie(user_image_b64)
            
            # Step 2: Create detailed DALL-E prompt combining user characteristics with product
            prompt_parts = []
            
            # Start with the analyzed person description
            if user_analysis.get("physical_description"):
                prompt_parts.append(user_analysis["physical_description"])
            
            # Add facial features for consistency
            if user_analysis.get("facial_features"):
                prompt_parts.append(f"with {user_analysis['facial_features']}")
            
            # Add the product they're wearing
            product_description = f"wearing {product_item.name}"
            if product_item.article_type and product_item.article_type.lower() not in product_item.name.lower():
                product_description += f", {product_item.article_type}"
            if product_item.color and product_item.color.lower() not in product_item.name.lower():
                product_description += f" in {product_item.color}"
            
            prompt_parts.append(product_description)
            
            # Add pose and positioning
            if user_analysis.get("pose_and_angle"):
                prompt_parts.append(user_analysis["pose_and_angle"])
            
            # Add lighting and background for consistency
            if user_analysis.get("lighting_and_background"):
                prompt_parts.append(user_analysis["lighting_and_background"])
            
            # Add style context
            style_context = f"{product_item.usage} style" if product_item.usage else "casual style"
            if user_analysis.get("overall_vibe"):
                style_context += f", {user_analysis['overall_vibe']}"
            prompt_parts.append(style_context)
            
            # Add quality and photography style
            prompt_parts.append("high quality portrait photography, photorealistic, detailed, sharp focus")
            
            # Add custom style prompt if provided
            if style_prompt:
                prompt_parts.append(style_prompt)
            
            # Combine all parts into final prompt
            full_prompt = ", ".join(prompt_parts)
            
            # Ensure prompt isn't too long (DALL-E has limits)
            if len(full_prompt) > 1000:
                # Prioritize most important elements
                essential_parts = [
                    user_analysis.get("physical_description", "a person"),
                    user_analysis.get("facial_features", ""),
                    product_description,
                    user_analysis.get("pose_and_angle", ""),
                    "high quality portrait photography, photorealistic"
                ]
                full_prompt = ", ".join([part for part in essential_parts if part])
            
            logger.info(f"Generated detailed prompt for virtual try-on: {full_prompt[:200]}...")
            
            # Step 3: Generate image with DALL-E
            response = await self.client.images.generate(
                model="dall-e-3",
                prompt=full_prompt,
                size="1024x1024",
                quality="hd",  # Use HD quality for better results
                style="natural",  # Natural style for realistic photos
                n=1
            )
            
            image_url = response.data[0].url
            logger.info(f"Successfully generated high-fidelity virtual try-on for product {product_item.id}")
            return image_url, full_prompt
            
        except Exception as e:
            logger.error(f"Error generating virtual try-on: {e}")
            # Fallback to basic generation if detailed analysis fails
            try:
                basic_prompt = f"A person wearing {product_item.name}, {product_item.article_type} in {product_item.color}, high quality portrait photography, photorealistic"
                
                response = await self.client.images.generate(
                    model="dall-e-3",
                    prompt=basic_prompt,
                    size="1024x1024",
                    quality="standard",
                    n=1
                )
                
                image_url = response.data[0].url
                logger.info(f"Generated fallback virtual try-on for product {product_item.id}")
                return image_url, basic_prompt
                
            except Exception as fallback_error:
                logger.error(f"Fallback virtual try-on generation also failed: {fallback_error}")
                raise 