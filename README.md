# Ray Fashion Assistant Wizard

A modern, responsive multi-step wizard UI for Ray, a personal AI shopping assistant designed for department store shoppers. This application provides a sleek, mobile-first experience for users to discover and try on clothing items.

## Features Implemented

### 🎨 Design & UI
- **Modern, minimalist design** inspired by Apple, OpenAI, and luxury fashion brands
- **Mobile-first responsive design** with breakpoints for tablet and desktop
- **Smooth animations and transitions** between steps with fade-in effects
- **Premium color system** with elegant neutrals and accent colors
- **Custom styled components** with hover states and micro-interactions

### 📱 Wizard Flow (8 Steps)

#### Step 1: Welcome
- Clean introduction to Ray
- Large text area for shopping prompt input
- Validates input before allowing continuation

#### Step 2: About You
- Gender selection dropdown
- Size input field
- Multi-select style preferences with toggle buttons
- Form validation ensures all fields are completed

#### Step 3: Upload Inspiration
- Drag-and-drop file upload area
- Multiple image upload support
- Image preview with removal functionality
- Mobile camera integration

#### Step 4: Upload Selfie
- Single image upload for virtual try-on
- Camera capture support for mobile devices
- Optional step with skip functionality
- Image preview with removal option

#### Step 5: AI Working
- Animated loading screen with sparkle icons
- Simulated 3-second processing time
- Bouncing dots animation
- Automatic progression to next step

#### Step 6: Outfit Rail Results
- Product cards with images, names, and descriptions
- Interactive buttons for like/dislike feedback
- "Try On" functionality with modal view
- Add to cart functionality
- Mock data for 4 clothing items

#### Step 7: Virtual Try-On (Modal)
- Side-by-side comparison view
- User's selfie on left, AI-generated try-on on right
- Placeholder for AI-generated content
- Back to rail functionality

#### Step 8: Summary
- Shopping list with selected items
- Price calculation and total
- Store location info when accessed via QR code (storeID parameter)
- Checkout/Find in Store buttons
- New session reset functionality

### 🔧 Technical Implementation

#### State Management
```typescript
// Context-based state management using useReducer
interface WizardState {
  currentStep: number
  formData: {
    shoppingPrompt: string
    gender: string
    preferredStyles: string[]
    size: string
    inspirationImages: File[]
    selfieImage: File | null
    selectedItems: string[]
  }
}
```

#### Component Architecture
- **Modular design** with separate components for each step
- **Reusable UI components** (Button, Input, Select, Textarea)
- **Context provider** for global state management
- **Type safety** with TypeScript interfaces

#### File Upload Handling
```typescript
// Image upload with preview functionality
const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(event.target.files || [])
  setImages(prev => [...prev, ...files])
}
```

#### Navigation System
- Forward/backward navigation with state persistence
- Progress bar showing completion percentage
- Form validation before step progression
- URL parameter detection for QR code integration

### 🎯 Interactive Features

#### Floating Chat Button
- Fixed position chat interface
- Expandable chat window
- Message input with send functionality
- Online status indicator
- Smooth animations for open/close

#### Image Management
- Multiple file upload support
- Image preview with thumbnails
- Remove functionality for uploaded images
- Mobile camera integration
- File type validation

#### Product Interaction
- Like/dislike buttons with visual feedback
- Add to cart toggle functionality
- Virtual try-on modal overlay
- Real-time cart updates

### 📱 Responsive Design

#### Mobile (< 768px)
- Full-width layouts
- Touch-optimized button sizes
- Camera integration for selfies
- Optimized image upload

#### Tablet (768px - 1024px)
- Adjusted spacing and sizing
- Maintained mobile-like experience
- Enhanced touch targets

#### Desktop (> 1024px)
- Centered content with max-width constraints
- Enhanced hover states
- Optimized for mouse interaction

### 🎨 Styling & Animations

#### Custom CSS Animations
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

#### Interactive States
- Button hover effects with scale transforms
- Form focus states with subtle shadows
- Loading animations with rotating elements
- Smooth transitions between steps

### 🔮 Future Integration Points

The codebase is structured to easily integrate:
- **GPT-4o-mini** for chat functionality and recommendations
- **DALL·E** for virtual try-on generation
- **Backend APIs** for product data and user management
- **Payment processing** for checkout functionality
- **Store inventory systems** for real-time availability

### 📦 Component Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Textarea.tsx
│   │   └── ChatButton.tsx
│   └── wizard/
│       ├── Step1Welcome.tsx
│       ├── Step2AboutYou.tsx
│       ├── Step3UploadInspiration.tsx
│       ├── Step4UploadSelfie.tsx
│       ├── Step5AIWorking.tsx
│       ├── Step6OutfitRail.tsx
│       ├── Step8Summary.tsx
│       └── WizardContainer.tsx
├── contexts/
│   └── WizardContext.tsx
├── types/
│   └── index.ts
└── App.tsx
```

## Getting Started

1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Open in browser and begin the Ray shopping experience

## QR Code Integration

The app detects a `storeID` URL parameter for in-store usage:
- `?storeID=123` enables store-specific features
- Shows item locations within the store
- Provides "Find in Store" instead of checkout

This wizard provides a solid foundation for a production-ready fashion assistant experience, with clean code architecture that can be easily extended with AI capabilities and backend integration.