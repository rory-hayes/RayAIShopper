import time
from typing import List, Dict, Optional, Tuple
from app.models.responses import ProductItem, CompleteTheLookSuggestion
from app.models.requests import UserProfile
from app.utils.logging import get_logger

logger = get_logger(__name__)

class CompletionService:
    def __init__(self):
        # Define which categories are needed to complete each article type
        self.completion_rules = {
            # Core clothing combinations
            'Jeans': ['Tshirts', 'Shirts', 'Casual Shoes'],
            'Tshirts': ['Jeans', 'Shorts', 'Casual Shoes'],
            'Shirts': ['Jeans', 'Trousers', 'Formal Shoes', 'Casual Shoes'],
            'Trousers': ['Shirts', 'Formal Shoes'],
            'Shorts': ['Tshirts', 'Casual Shoes'],
            
            # Footwear combinations
            'Casual Shoes': ['Jeans', 'Tshirts', 'Shorts'],
            'Formal Shoes': ['Trousers', 'Shirts'],
            'Sports Shoes': ['Shorts', 'Tshirts', 'Track Pants'],
            'Sandals': ['Shorts', 'Tshirts'],
            
            # Outerwear
            'Jackets': ['Tshirts', 'Jeans', 'Trousers'],
            'Sweaters': ['Jeans', 'Trousers'],
            
            # Dresses (complete looks)
            'Dresses': ['Casual Shoes', 'Formal Shoes', 'Sandals']
        }
        
        # Color compatibility matrix
        self.color_compatibility = {
            'Blue': ['White', 'Black', 'Navy', 'Gray', 'Beige', 'Brown'],
            'Black': ['White', 'Gray', 'Red', 'Blue', 'Beige', 'Silver'],
            'White': ['*'],  # Universal - works with everything
            'Navy': ['White', 'Beige', 'Gray', 'Red', 'Light Blue'],
            'Gray': ['White', 'Black', 'Blue', 'Red', 'Navy'],
            'Beige': ['White', 'Navy', 'Brown', 'Blue', 'Black'],
            'Red': ['Black', 'White', 'Navy', 'Gray', 'Beige'],
            'Brown': ['Beige', 'White', 'Navy', 'Cream', 'Tan'],
            'Green': ['White', 'Black', 'Navy', 'Beige', 'Brown'],
            'Pink': ['White', 'Black', 'Navy', 'Gray'],
            'Yellow': ['White', 'Black', 'Navy', 'Blue'],
            'Purple': ['White', 'Black', 'Gray', 'Silver']
        }
        
        # Performance settings
        self.max_suggestions_per_category = 3
        self.max_processing_time = 1.0  # 1 second max per item
        self.compatibility_threshold = 50  # Minimum score for compatibility
    
    def generate_complete_look(
        self, 
        base_item: ProductItem, 
        all_categories: Dict[str, List[ProductItem]], 
        user_profile: UserProfile
    ) -> Optional[CompleteTheLookSuggestion]:
        """
        Generate complete look using smart matching - no API calls needed
        """
        start_time = time.time()
        
        try:
            # Validate inputs
            if not base_item or not hasattr(base_item, 'article_type'):
                logger.debug(f"Invalid base_item provided: {base_item}")
                return None
            
            if not all_categories:
                logger.debug("No categories provided for complete look generation")
                return None
            
            # Get needed categories for this item type
            needed_categories = self.completion_rules.get(base_item.article_type, [])
            
            if not needed_categories:
                logger.debug(f"No completion rules for article type: {base_item.article_type}")
                return None
            
            suggested_items = {}
            
            # Find compatible items in each needed category
            for category in needed_categories:
                # Timeout check
                if time.time() - start_time > self.max_processing_time:
                    logger.warning(f"Complete look timeout for item {base_item.id}")
                    return None
                
                if category in all_categories and all_categories[category]:
                    compatible_items = self._filter_compatible_items(
                        base_item, 
                        all_categories[category], 
                        user_profile
                    )
                    
                    if compatible_items:
                        suggested_items[category] = compatible_items[:self.max_suggestions_per_category]
            
            # Only return suggestion if we have at least one complete category
            if suggested_items:
                style_rationale = self._generate_style_rationale(base_item, suggested_items)
                
                return CompleteTheLookSuggestion(
                    needed_categories=needed_categories,
                    suggested_items=suggested_items,
                    style_rationale=style_rationale
                )
            else:
                logger.debug(f"No compatible items found for {base_item.id}")
                return None
                
        except Exception as e:
            logger.error(f"Complete look generation failed for {base_item.id}: {e}")
            return None
    
    def _filter_compatible_items(
        self, 
        base_item: ProductItem, 
        candidate_items: List[ProductItem], 
        user_profile: UserProfile
    ) -> List[ProductItem]:
        """
        Smart filtering considering color, style, and user preferences
        """
        compatible_items = []
        
        for candidate in candidate_items:
            # Skip the same item
            if candidate.id == base_item.id:
                continue
                
            score = self._calculate_compatibility_score(base_item, candidate, user_profile)
            
            if score >= self.compatibility_threshold:
                compatible_items.append((candidate, score))
        
        # Sort by compatibility score and return top items
        compatible_items.sort(key=lambda x: x[1], reverse=True)
        return [item for item, _ in compatible_items]
    
    def _calculate_compatibility_score(
        self, 
        base_item: ProductItem, 
        candidate: ProductItem, 
        user_profile: UserProfile
    ) -> float:
        """
        Calculate compatibility score between base item and candidate
        """
        score = 0
        
        # 1. Color compatibility (40% weight)
        if self._colors_are_compatible(base_item.color, candidate.color):
            score += 40
        
        # 2. Style consistency (30% weight)
        if self._styles_are_compatible(base_item.usage, candidate.usage):
            score += 30
        
        # 3. User preference alignment (20% weight)
        if user_profile.preferred_colors and candidate.color in user_profile.preferred_colors:
            score += 20
        
        # 4. Similarity score (10% weight)
        similarity_bonus = (candidate.similarity_score or 0.5) * 10
        score += similarity_bonus
        
        return score
    
    def _colors_are_compatible(self, color1: str, color2: str) -> bool:
        """
        Check if two colors are compatible
        """
        # Normalize colors (handle case variations)
        color1 = color1.strip().title()
        color2 = color2.strip().title()
        
        # Check if color1 is compatible with color2
        if color1 in self.color_compatibility:
            compatible_colors = self.color_compatibility[color1]
            if '*' in compatible_colors or color2 in compatible_colors:
                return True
        
        # Check reverse compatibility
        if color2 in self.color_compatibility:
            compatible_colors = self.color_compatibility[color2]
            if '*' in compatible_colors or color1 in compatible_colors:
                return True
        
        # Same color is always compatible
        return color1 == color2
    
    def _styles_are_compatible(self, usage1: str, usage2: str) -> bool:
        """
        Check if two usage styles are compatible
        """
        # Normalize usage strings
        usage1 = usage1.strip().lower()
        usage2 = usage2.strip().lower()
        
        # Define style compatibility groups
        casual_styles = ['casual', 'sports', 'home', 'travel']
        formal_styles = ['formal', 'party', 'ethnic']
        
        # Check if both are in the same style group
        if (usage1 in casual_styles and usage2 in casual_styles) or \
           (usage1 in formal_styles and usage2 in formal_styles):
            return True
        
        # Same usage is always compatible
        return usage1 == usage2
    
    def _generate_style_rationale(
        self, 
        base_item: ProductItem, 
        suggested_items: Dict[str, List[ProductItem]]
    ) -> str:
        """
        Generate a brief explanation of why these items work together
        """
        rationales = []
        
        # Color-based rationale
        base_color = base_item.color.strip().title()
        suggested_colors = []
        for category_items in suggested_items.values():
            for item in category_items[:1]:  # Just first item from each category
                suggested_colors.append(item.color.strip().title())
        
        if base_color == 'White':
            rationales.append(f"White {base_item.article_type.lower()} pairs beautifully with any color")
        elif base_color == 'Black':
            rationales.append(f"Black {base_item.article_type.lower()} creates a versatile foundation")
        elif suggested_colors:
            rationales.append(f"{base_color} {base_item.article_type.lower()} complements {', '.join(suggested_colors[:2]).lower()}")
        
        # Style-based rationale
        if base_item.usage.lower() in ['casual', 'sports']:
            rationales.append("Perfect for a relaxed, comfortable look")
        elif base_item.usage.lower() in ['formal', 'party']:
            rationales.append("Ideal for a polished, sophisticated appearance")
        
        return '. '.join(rationales) if rationales else f"These pieces create a cohesive look with your {base_item.article_type.lower()}" 