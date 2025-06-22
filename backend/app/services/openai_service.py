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
        Enhanced analysis of user's selfie with GPT-4o Vision for high-fidelity virtual try-on
        Extracts detailed characteristics to preserve person's identity in generated images
        """
        system_prompt = """You are a professional portrait photographer and facial analysis expert. Analyze this person's photo with extreme detail to preserve their exact appearance in virtual try-on generation.

        Focus on capturing:
        1. FACIAL FEATURES: Exact details that make this person unique
        2. PHYSICAL CHARACTERISTICS: Body type, posture, distinctive features  
        3. POSE & EXPRESSION: Head angle, body position, facial expression
        4. LIGHTING & ENVIRONMENT: Light direction, intensity, background
        5. PHOTOGRAPHY STYLE: Camera angle, framing, aesthetic

        Be extremely specific - these details will be used to recreate this exact person in AI-generated images."""

        user_prompt = """Analyze this person's selfie with maximum detail for virtual try-on generation. I need to preserve their exact appearance when showing them wearing different clothes.

        Return detailed JSON with specific descriptive terms:
        {
            "facial_features": {
                "face_shape": "oval/round/square/heart/diamond",
                "eye_color": "specific color",
                "eye_shape": "almond/round/hooded etc",
                "eyebrow_style": "thick/thin/arched etc",
                "nose_shape": "straight/button/aquiline etc",
                "lip_shape": "full/thin/bow-shaped etc",
                "skin_tone": "fair/medium/olive/dark with undertones",
                "distinctive_features": "freckles/dimples/moles/scars etc"
            },
            "hair_details": {
                "color": "exact color description",
                "style": "short/long/curly/straight/wavy",
                "texture": "fine/thick/coarse",
                "length": "specific length description"
            },
            "physical_build": {
                "body_type": "petite/average/tall/athletic etc",
                "build": "slim/average/curvy/muscular etc",
                "posture": "straight/relaxed/confident etc"
            },
            "pose_and_expression": {
                "head_angle": "straight/tilted left/right",
                "body_orientation": "facing camera/3-quarter turn etc",
                "facial_expression": "smiling/serious/neutral etc",
                "eye_contact": "direct/looking away etc"
            },
            "lighting_and_setting": {
                "lighting_type": "natural/artificial/studio",
                "light_direction": "front/side/top",
                "lighting_quality": "soft/harsh/diffused",
                "background": "plain/indoor/outdoor/textured",
                "background_color": "specific color if visible",
                "overall_mood": "bright/moody/professional etc"
            },
            "photography_style": {
                "camera_angle": "eye level/slightly above/below",
                "framing": "headshot/bust/full body",
                "photo_quality": "professional/casual/phone selfie",
                "image_sharpness": "crisp/soft/slightly blurred"
            },
            "age_range": "specific age estimate",
            "gender_presentation": "masculine/feminine/androgynous",
            "overall_vibe": "confident/casual/professional/artistic etc"
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
                max_tokens=800,  # Increased for detailed analysis
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            analysis = json.loads(response.choices[0].message.content)
            logger.info("Enhanced user selfie analysis completed with detailed characteristics")
            return analysis
            
        except Exception as e:
            logger.error(f"Error in enhanced selfie analysis: {e}")
            # Return detailed fallback analysis
            return {
                "facial_features": {
                    "face_shape": "oval",
                    "eye_color": "brown",
                    "skin_tone": "medium with warm undertones",
                    "distinctive_features": "natural features"
                },
                "hair_details": {
                    "color": "dark brown",
                    "style": "medium length",
                    "texture": "natural"
                },
                "physical_build": {
                    "body_type": "average",
                    "build": "average build",
                    "posture": "natural posture"
                },
                "pose_and_expression": {
                    "head_angle": "straight",
                    "facial_expression": "natural expression",
                    "eye_contact": "looking at camera"
                },
                "lighting_and_setting": {
                    "lighting_type": "natural lighting",
                    "background": "neutral background",
                    "overall_mood": "natural"
                },
                "photography_style": {
                    "camera_angle": "eye level",
                    "framing": "portrait"
                },
                "age_range": "adult",
                "gender_presentation": "natural",
                "overall_vibe": "friendly and approachable"
            }

    @openai_retry
    async def analyze_product_image(self, product_item: ProductItem) -> Dict[str, Any]:
        """
        Analyze the actual product image to get precise visual details for virtual try-on
        This replaces generic text descriptions with actual visual analysis
        """
        if not product_item.image_url:
            logger.warning(f"No image URL for product {product_item.id}")
            return self._get_fallback_product_description(product_item)

        system_prompt = """You are a fashion expert and product photographer. Analyze this clothing item image with extreme detail for virtual try-on generation.

        Focus on:
        1. EXACT VISUAL APPEARANCE: Colors, patterns, textures, materials
        2. GARMENT CONSTRUCTION: Cut, fit, silhouette, design details
        3. STYLING ELEMENTS: Necklines, sleeves, hemlines, closures
        4. FABRIC CHARACTERISTICS: Drape, structure, weight, finish
        5. DESIGN DETAILS: Buttons, zippers, embellishments, prints

        Be extremely specific about what you see - this will be used to recreate this exact item on a person."""

        user_prompt = """Analyze this clothing item image in detail for virtual try-on generation. I need to accurately show this exact item being worn by someone.

        Return detailed JSON:
        {
            "item_type": "specific garment type",
            "visual_description": {
                "primary_color": "exact color name and shade",
                "secondary_colors": ["any accent colors"],
                "pattern": "solid/striped/floral/geometric/etc",
                "pattern_details": "specific pattern description if any",
                "fabric_type": "cotton/silk/denim/knit/etc",
                "fabric_texture": "smooth/textured/ribbed/etc",
                "fabric_weight": "lightweight/medium/heavy",
                "fabric_finish": "matte/shiny/satin/etc"
            },
            "garment_details": {
                "silhouette": "fitted/loose/oversized/tailored/etc",
                "neckline": "crew/v-neck/scoop/high-neck/etc",
                "sleeve_type": "short/long/sleeveless/3-quarter/etc",
                "sleeve_style": "fitted/loose/bell/etc",
                "hemline": "cropped/regular/long/etc",
                "closure_type": "buttons/zipper/pullover/etc",
                "fit_style": "slim/regular/relaxed/oversized"
            },
            "design_elements": {
                "embellishments": "buttons/sequins/embroidery/none",
                "hardware": "zippers/buckles/grommets/none",
                "special_features": "pockets/hood/collar/etc",
                "trim_details": "piping/contrast stitching/etc"
            },
            "styling_context": {
                "formality_level": "casual/business casual/formal/etc",
                "season": "spring/summer/fall/winter/year-round",
                "occasion": "everyday/work/party/etc",
                "styling_suggestions": "how this item typically fits and drapes"
            },
            "brand_style": "if visible, brand aesthetic",
            "overall_vibe": "classic/trendy/edgy/romantic/etc"
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
                                "image_url": {"url": product_item.image_url}
                            }
                        ]
                    }
                ],
                max_tokens=600,
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            analysis = json.loads(response.choices[0].message.content)
            logger.info(f"Detailed product image analysis completed for {product_item.id}")
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing product image for {product_item.id}: {e}")
            return self._get_fallback_product_description(product_item)

    def _get_fallback_product_description(self, product_item: ProductItem) -> Dict[str, Any]:
        """Fallback product description when image analysis fails"""
        return {
            "item_type": product_item.article_type or "clothing item",
            "visual_description": {
                "primary_color": product_item.color or "neutral",
                "fabric_type": "quality fabric",
                "fabric_texture": "smooth"
            },
            "garment_details": {
                "silhouette": "well-fitted",
                "fit_style": "regular"
            },
            "styling_context": {
                "formality_level": "versatile",
                "occasion": product_item.usage or "everyday wear"
            },
            "overall_vibe": "stylish and comfortable"
        }

    @openai_retry
    async def generate_virtual_tryon(
        self, 
        user_image_b64: str, 
        product_item: ProductItem,
        style_prompt: str = None
    ) -> Tuple[str, str]:
        """
        Generate ultra-high-fidelity virtual try-on using detailed analysis of both user and product
        Returns (image_url, generation_prompt)
        """
        try:
            logger.info(f"Starting enhanced virtual try-on generation for product {product_item.id}")
            
            # Step 1: Detailed analysis of user's selfie
            logger.info("Analyzing user selfie with enhanced detail...")
            user_analysis = await self.analyze_user_selfie(user_image_b64)
            
            # Step 2: Detailed analysis of product image
            logger.info("Analyzing product image for exact visual details...")
            product_analysis = await self.analyze_product_image(product_item)
            
            # Step 3: Construct ultra-detailed DALL-E prompt
            prompt_parts = []
            
            # Person identity preservation (most important)
            if user_analysis.get("facial_features"):
                facial = user_analysis["facial_features"]
                person_desc = f"A person with {facial.get('face_shape', 'natural')} face shape"
                
                if facial.get("skin_tone"):
                    person_desc += f", {facial['skin_tone']} skin"
                
                if facial.get("eye_color") and facial.get("eye_shape"):
                    person_desc += f", {facial['eye_shape']} {facial['eye_color']} eyes"
                
                if facial.get("distinctive_features") and facial['distinctive_features'] != "natural features":
                    person_desc += f", {facial['distinctive_features']}"
                
                prompt_parts.append(person_desc)
            
            # Hair details
            if user_analysis.get("hair_details"):
                hair = user_analysis["hair_details"]
                hair_desc = f"{hair.get('color', 'natural')} {hair.get('style', 'hair')}"
                if hair.get("length"):
                    hair_desc += f", {hair['length']}"
                prompt_parts.append(f"with {hair_desc}")
            
            # Physical build and posture
            if user_analysis.get("physical_build"):
                build = user_analysis["physical_build"]
                build_desc = f"{build.get('body_type', 'average')} {build.get('build', 'build')}"
                if build.get("posture"):
                    build_desc += f", {build['posture']}"
                prompt_parts.append(build_desc)
            
            # Product details from actual image analysis
            if product_analysis.get("visual_description"):
                visual = product_analysis["visual_description"]
                garment = product_analysis.get("garment_details", {})
                
                # Build detailed product description
                product_desc = f"wearing {product_analysis.get('item_type', product_item.name)}"
                
                # Add color details
                if visual.get("primary_color"):
                    product_desc += f" in {visual['primary_color']}"
                
                # Add fabric and texture
                if visual.get("fabric_type"):
                    product_desc += f", {visual['fabric_type']} fabric"
                
                if visual.get("fabric_texture") and visual['fabric_texture'] != "smooth":
                    product_desc += f" with {visual['fabric_texture']} texture"
                
                # Add fit and silhouette
                if garment.get("silhouette"):
                    product_desc += f", {garment['silhouette']} fit"
                
                # Add specific garment details
                if garment.get("neckline") and garment['neckline'] != "regular":
                    product_desc += f", {garment['neckline']} neckline"
                
                if garment.get("sleeve_type") and garment['sleeve_type'] != "regular":
                    product_desc += f", {garment['sleeve_type']} sleeves"
                
                prompt_parts.append(product_desc)
            
            # Pose and expression preservation
            if user_analysis.get("pose_and_expression"):
                pose = user_analysis["pose_and_expression"]
                pose_desc = ""
                
                if pose.get("facial_expression"):
                    pose_desc += f"{pose['facial_expression']}"
                
                if pose.get("head_angle") and pose['head_angle'] != "straight":
                    pose_desc += f", {pose['head_angle']}"
                
                if pose.get("body_orientation"):
                    pose_desc += f", {pose['body_orientation']}"
                
                if pose_desc:
                    prompt_parts.append(pose_desc)
            
            # Lighting and environment preservation
            if user_analysis.get("lighting_and_setting"):
                lighting = user_analysis["lighting_and_setting"]
                lighting_desc = ""
                
                if lighting.get("lighting_type"):
                    lighting_desc += f"{lighting['lighting_type']} lighting"
                
                if lighting.get("light_direction") and lighting['light_direction'] != "front":
                    lighting_desc += f" from {lighting['light_direction']}"
                
                if lighting.get("background") and lighting['background'] != "plain":
                    lighting_desc += f", {lighting['background']} background"
                
                if lighting_desc:
                    prompt_parts.append(lighting_desc)
            
            # Photography style and quality
            photo_style = "high-quality portrait photography, photorealistic, detailed, sharp focus"
            if user_analysis.get("photography_style"):
                style = user_analysis["photography_style"]
                if style.get("camera_angle"):
                    photo_style += f", {style['camera_angle']} camera angle"
                if style.get("framing"):
                    photo_style += f", {style['framing']} framing"
            
            prompt_parts.append(photo_style)
            
            # Add identity preservation keywords
            prompt_parts.append("maintaining exact facial features and identity, same person, identical appearance")
            
            # Add custom style prompt if provided
            if style_prompt:
                prompt_parts.append(style_prompt)
            
            # Combine all parts into final prompt
            full_prompt = ", ".join([part for part in prompt_parts if part])
            
            # Ensure prompt isn't too long (DALL-E has limits)
            if len(full_prompt) > 1000:
                # Prioritize most important elements for identity preservation
                essential_parts = [
                    prompt_parts[0] if len(prompt_parts) > 0 else "A person",  # Person description
                    prompt_parts[1] if len(prompt_parts) > 1 else "",  # Hair
                    [p for p in prompt_parts if "wearing" in p][0] if any("wearing" in p for p in prompt_parts) else f"wearing {product_item.name}",  # Product
                    photo_style,
                    "maintaining exact facial features and identity, same person"
                ]
                full_prompt = ", ".join([part for part in essential_parts if part])
            
            logger.info(f"Generated ultra-detailed prompt for virtual try-on (length: {len(full_prompt)})")
            logger.info(f"Prompt preview: {full_prompt[:200]}...")
            
            # Step 4: Generate image with DALL-E using enhanced prompt
            response = await self.client.images.generate(
                model="dall-e-3",
                prompt=full_prompt,
                size="1024x1024",
                quality="hd",  # Use HD quality for maximum realism
                style="natural",  # Natural style for photorealistic results
                n=1
            )
            
            image_url = response.data[0].url
            logger.info(f"Successfully generated enhanced virtual try-on for product {product_item.id}")
            return image_url, full_prompt
            
        except Exception as e:
            logger.error(f"Error in enhanced virtual try-on generation: {e}")
            # Enhanced fallback with basic product analysis
            try:
                logger.info("Attempting enhanced fallback generation...")
                
                # Get basic user characteristics
                basic_user = "A person"
                if user_analysis and user_analysis.get("facial_features"):
                    facial = user_analysis["facial_features"]
                    basic_user += f" with {facial.get('skin_tone', 'natural')} skin"
                    if facial.get("eye_color"):
                        basic_user += f" and {facial['eye_color']} eyes"
                
                # Use product metadata as fallback
                product_desc = f"wearing {product_item.name}"
                if product_item.article_type:
                    product_desc += f", {product_item.article_type}"
                if product_item.color:
                    product_desc += f" in {product_item.color}"
                
                fallback_prompt = f"{basic_user} {product_desc}, high quality portrait photography, photorealistic, maintaining facial features"
                
                response = await self.client.images.generate(
                    model="dall-e-3",
                    prompt=fallback_prompt,
                    size="1024x1024",
                    quality="standard",
                    n=1
                )
                
                image_url = response.data[0].url
                logger.info(f"Generated enhanced fallback virtual try-on for product {product_item.id}")
                return image_url, fallback_prompt
                
            except Exception as fallback_error:
                logger.error(f"Enhanced fallback generation also failed: {fallback_error}")
                raise 