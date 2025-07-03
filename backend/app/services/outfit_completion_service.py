from typing import Dict, List, Optional
from app.models.responses import ProductItem, CompleteLookSuggestion
from app.models.requests import UserProfile
from app.utils.logging import get_logger

logger = get_logger(__name__)

class OutfitCompletionService:
    def __init__(self):
        self.completion_rules = self._load_completion_rules()
        self.color_compatibility = self._load_color_compatibility()
    
    def _load_completion_rules(self) -> Dict[str, List[str]]:
        """
        Define what categories are needed to complete each item type
        """
        return {
            # Bottoms need tops and shoes
            'Jeans': ['Tshirts', 'Shirts', 'Casual Shoes', 'Sports Shoes'],
            'Shorts': ['Tshirts', 'Shirts', 'Casual Shoes', 'Sports Shoes'],
            'Trousers': ['Shirts', 'Tshirts', 'Formal Shoes', 'Casual Shoes'],
            'Track Pants': ['Tshirts', 'Sweatshirts', 'Sports Shoes'],
            'Leggings': ['Tops', 'Tshirts', 'Sports Shoes', 'Casual Shoes'],
            
            # Tops need bottoms and shoes
            'Tshirts': ['Jeans', 'Shorts', 'Trousers', 'Casual Shoes', 'Sports Shoes'],
            'Shirts': ['Jeans', 'Trousers', 'Shorts', 'Formal Shoes', 'Casual Shoes'],
            'Tops': ['Jeans', 'Shorts', 'Leggings', 'Casual Shoes', 'Sports Shoes'],
            'Sweatshirts': ['Jeans', 'Track Pants', 'Shorts', 'Casual Shoes', 'Sports Shoes'],
            'Sweaters': ['Jeans', 'Trousers', 'Casual Shoes', 'Formal Shoes'],
            'Jackets': ['Jeans', 'Trousers', 'Tshirts', 'Shirts', 'Casual Shoes'],
            
            # Shoes need tops and bottoms
            'Casual Shoes': ['Jeans', 'Shorts', 'Tshirts', 'Shirts'],
            'Sports Shoes': ['Jeans', 'Shorts', 'Track Pants', 'Tshirts', 'Sweatshirts'],
            'Formal Shoes': ['Trousers', 'Shirts', 'Jackets'],
            'Sandals': ['Shorts', 'Tshirts', 'Casual Shoes'],
            'Flip Flops': ['Shorts', 'Tshirts', 'Casual Shoes'],
            'Heels': ['Dresses', 'Skirts', 'Trousers'],
            'Flats': ['Dresses', 'Skirts', 'Jeans', 'Trousers'],
            
            # Dresses are complete but can add shoes/accessories
            'Dresses': ['Heels', 'Flats', 'Casual Shoes'],
            'Skirts': ['Tops', 'Shirts', 'Heels', 'Flats'],
            
            # Traditional wear
            'Kurtas': ['Trousers', 'Jeans', 'Formal Shoes', 'Casual Shoes']
        }
    
    def _load_color_compatibility(self) -> Dict[str, List[str]]:
        """
        Define color compatibility rules for basic matching
        """
        return {
            'Black': ['White', 'Grey', 'Red', 'Blue', 'Navy', 'Pink', 'Yellow', 'Green'],
            'White': ['Black', 'Blue', 'Navy', 'Red', 'Green', 'Pink', 'Brown', 'Grey'],
            'Blue': ['White', 'Black', 'Grey', 'Navy', 'Brown', 'Beige'],
            'Navy': ['White', 'Black', 'Grey', 'Blue', 'Red', 'Pink'],
            'Grey': ['White', 'Black', 'Blue', 'Navy', 'Red', 'Pink', 'Yellow'],
            'Red': ['White', 'Black', 'Navy', 'Grey', 'Blue'],
            'Green': ['White', 'Black', 'Brown', 'Beige', 'Navy'],
            'Brown': ['White', 'Blue', 'Green', 'Beige', 'Black'],
            'Beige': ['White', 'Brown', 'Blue', 'Green', 'Navy'],
            'Pink': ['White', 'Black', 'Navy', 'Grey'],
            'Yellow': ['White', 'Black', 'Grey', 'Navy'],
            'Purple': ['White', 'Black', 'Grey'],
            'Orange': ['White', 'Black', 'Navy', 'Brown'],
            'Multi': ['White', 'Black', 'Grey']  # Multi-color items are versatile
        }
    
    def generate_complete_look(
        self, 
        base_item: ProductItem, 
        available_items: Dict[str, List[ProductItem]], 
        user_profile: UserProfile
    ) -> Optional[CompleteLookSuggestion]:
        """
        Generate complete look suggestions using smart matching
        """
        try:
            # Get completion rules for this item type
            needed_categories = self.completion_rules.get(base_item.article_type, [])
            
            if not needed_categories:
                logger.debug(f"No completion rules found for {base_item.article_type}")
                return None
            
            # Find suggested items for each needed category
            suggested_items = {}
            total_suggestions = 0
            
            for category in needed_categories:
                if category in available_items:
                    # Get compatible items from this category
                    compatible_items = self._filter_compatible_items(
                        base_item=base_item,
                        candidates=available_items[category],
                        user_profile=user_profile
                    )
                    
                    if compatible_items:
                        # Take top 3 suggestions for this category
                        suggested_items[category] = compatible_items[:3]
                        total_suggestions += len(compatible_items[:3])
            
            # Only return suggestions if we found items
            if not suggested_items:
                return None
            
            # Calculate confidence score based on how many categories we filled
            filled_categories = len(suggested_items)
            target_categories = min(len(needed_categories), 3)  # Aim for 2-3 categories max
            confidence_score = min(filled_categories / target_categories, 1.0)
            
            # Create style reasoning
            style_reasoning = self._generate_style_reasoning(base_item, suggested_items)
            
            return CompleteLookSuggestion(
                needed_categories=list(suggested_items.keys()),
                suggested_items=suggested_items,
                confidence_score=confidence_score,
                style_reasoning=style_reasoning
            )
            
        except Exception as e:
            logger.error(f"Error generating complete look for {base_item.id}: {e}")
            return None
    
    def _filter_compatible_items(
        self, 
        base_item: ProductItem, 
        candidates: List[ProductItem], 
        user_profile: UserProfile
    ) -> List[ProductItem]:
        """
        Filter items that are compatible with the base item
        """
        compatible_items = []
        
        for candidate in candidates:
            # Skip if same item
            if candidate.id == base_item.id:
                continue
            
            # Check gender compatibility
            if not self._is_gender_compatible(base_item, candidate, user_profile):
                continue
            
            # Check color compatibility
            if not self._is_color_compatible(base_item, candidate):
                continue
            
            # Check style compatibility (usage context)
            if not self._is_style_compatible(base_item, candidate):
                continue
            
            compatible_items.append(candidate)
        
        # Sort by similarity score (if available) or randomly
        compatible_items.sort(key=lambda x: x.similarity_score or 0.5, reverse=True)
        
        return compatible_items
    
    def _is_gender_compatible(self, base_item: ProductItem, candidate: ProductItem, user_profile: UserProfile) -> bool:
        """Check if items are gender compatible"""
        # If user profile has gender, prioritize matching items
        if user_profile.gender:
            user_gender = user_profile.gender.lower()
            
            # Both items should match user's gender or be unisex
            base_gender = base_item.gender.lower()
            candidate_gender = candidate.gender.lower()
            
            # Unisex items work with everything
            if base_gender == 'unisex' or candidate_gender == 'unisex':
                return True
            
            # Both should match user's gender
            return (base_gender == user_gender or base_gender == 'unisex') and \
                   (candidate_gender == user_gender or candidate_gender == 'unisex')
        
        return True  # If no gender preference, allow all
    
    def _is_color_compatible(self, base_item: ProductItem, candidate: ProductItem) -> bool:
        """Check if colors are compatible"""
        base_color = base_item.color
        candidate_color = candidate.color
        
        # Get compatibility list for base color
        compatible_colors = self.color_compatibility.get(base_color, [])
        
        # Check if candidate color is in compatibility list
        if candidate_color in compatible_colors:
            return True
        
        # Special case: if either color is 'Multi', they're likely compatible
        if base_color == 'Multi' or candidate_color == 'Multi':
            return True
        
        # If no specific rule, allow neutral combinations
        neutral_colors = ['White', 'Black', 'Grey', 'Navy']
        if base_color in neutral_colors or candidate_color in neutral_colors:
            return True
        
        return False
    
    def _is_style_compatible(self, base_item: ProductItem, candidate: ProductItem) -> bool:
        """Check if usage/style contexts are compatible"""
        base_usage = base_item.usage.lower()
        candidate_usage = candidate.usage.lower()
        
        # Define style compatibility groups
        casual_styles = ['casual', 'everyday', 'sports', 'home']
        formal_styles = ['formal', 'party', 'ethnic']
        
        # Same usage is always compatible
        if base_usage == candidate_usage:
            return True
        
        # Casual items generally work together
        if base_usage in casual_styles and candidate_usage in casual_styles:
            return True
        
        # Formal items generally work together
        if base_usage in formal_styles and candidate_usage in formal_styles:
            return True
        
        # Some cross-over is acceptable (e.g., casual with everyday)
        versatile_usage = ['casual', 'everyday']
        if base_usage in versatile_usage or candidate_usage in versatile_usage:
            return True
        
        return False
    
    def _generate_style_reasoning(self, base_item: ProductItem, suggested_items: Dict[str, List[ProductItem]]) -> str:
        """Generate a brief explanation of why these items work together"""
        try:
            base_color = base_item.color
            base_type = base_item.article_type
            base_usage = base_item.usage
            
            # Count suggested categories
            category_count = len(suggested_items)
            
            # Create reasoning based on the combination
            if category_count == 1:
                return f"Perfect match for your {base_color.lower()} {base_type.lower()} with complementary styling."
            elif category_count == 2:
                return f"Complete the look with these {base_usage.lower()} pieces that complement your {base_color.lower()} {base_type.lower()}."
            else:
                return f"Full outfit suggestion with {category_count} complementary pieces for a cohesive {base_usage.lower()} look."
                
        except Exception as e:
            logger.warning(f"Error generating style reasoning: {e}")
            return "Curated pieces that work well together for a complete look." 