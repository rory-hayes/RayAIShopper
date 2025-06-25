## Ray AI Shopper

An AI-powered fashion recommendation system with virtual try-on capabilities, built with React frontend and FastAPI backend.

### Design & UI

The application features a clean, modern interface with:
- **8-step wizard flow**: Welcome → Preferences → Image Upload → Selfie → AI Processing → Recommendations → Checkout → Summary
- **Responsive design**: Mobile-first approach with Tailwind CSS
- **Smooth animations**: Page transitions, loading states, and micro-interactions
- **Professional typography**: Clean hierarchy with proper spacing and readability

### Key Features

**Smart Recommendations**
- AI-powered outfit curation based on user preferences
- Style analysis from inspiration images
- Personalized recommendations using OpenAI embeddings
- Context-aware suggestions for different occasions

**Virtual Try-On**
- DALL-E powered virtual try-on generation
- Upload selfie for personalized visualization
- Enhanced prompts using user style preferences
- Download and share generated images

**Interactive Shopping Experience**
- Like/dislike system with smart item rotation
- Real-time cart management
- Store location mapping for in-person shopping
- QR code integration for store-specific experiences

**Intelligent Chat Assistant**
- Context-aware fashion advice
- Style guidance and color matching tips
- Personalized recommendations based on user journey
- Integration with user preferences and selections

### Technical Architecture

**Frontend (React + TypeScript)**
- Vite build system for fast development
- Tailwind CSS for styling
- Context-based state management
- Type-safe API integration

**Backend (FastAPI + Python)**
- OpenAI API integration for embeddings and chat
- Vector similarity search with FAISS
- Lightweight fallback mode for deployment constraints
- RESTful API design with automatic documentation

**AI/ML Components**
- Text embeddings for semantic product search
- Image analysis for style preference extraction
- Natural language processing for chat responses
- Recommendation algorithms with user feedback loops

### Interactive Features

**Wizard Flow**
- Progressive data collection across 8 steps
- Context preservation between steps
- Smart defaults and validation
- Seamless navigation with progress tracking

**Product Interaction**
- Swipe-like interface for product discovery
- Smart replacement algorithms
- Real-time preference learning
- Contextual product information

**Virtual Try-On Integration**
- Seamless modal experience
- Progress indicators for generation
- Multiple sharing options
- Fallback handling for errors

**Chat Integration**
- Contextual assistance throughout the journey
- Fashion expertise and styling advice
- Integration with user data and preferences
- Real-time response generation

### Data Flow

**User Input Processing**
1. Collect preferences through wizard steps
2. Process inspiration images for style analysis
3. Generate user profile for recommendation engine
4. Maintain context throughout the session

**Recommendation Generation**
1. Convert user preferences to embeddings
2. Perform similarity search against product database
3. Apply filtering based on user criteria
4. Return ranked recommendations with metadata

**Context Management**
1. Preserve user interactions (likes, dislikes, cart)
2. Maintain session state across page refreshes
3. Sync data between wizard and chat contexts
4. Handle fallback scenarios gracefully

### Styling & Animations

**Design System**
- Consistent color palette with gray-based neutrals
- Typography scale with proper hierarchy
- Spacing system using Tailwind's scale
- Interactive states with hover and focus effects

**Animation Strategy**
- Page transitions with fade and slide effects
- Loading states with skeleton screens and spinners
- Micro-interactions for user feedback
- Progressive disclosure for complex interfaces

**Responsive Behavior**
- Mobile-first design approach
- Flexible layouts that adapt to screen sizes
- Touch-friendly interactive elements
- Optimized for various device orientations

### State Management

**Wizard Context**
- Centralized form data management
- Step navigation and validation
- Recommendation caching and user interactions
- Session persistence and recovery

**Chat Context**
- Message history and threading
- Context synchronization with wizard data
- Real-time typing indicators
- Error handling and retry logic

### Future Integration Points

**Enhanced AI Features**
- Advanced style analysis from multiple images
- Seasonal trend integration
- Size and fit recommendations
- Color palette analysis and matching

**E-commerce Integration**
- Real inventory management
- Dynamic pricing and promotions
- Order processing and tracking
- Customer account management

**Social Features**
- Style sharing and inspiration boards
- Community recommendations
- Influencer collaborations
- Social media integration

### Development Setup

**Prerequisites**
- Node.js 18+ for frontend
- Python 3.8+ for backend
- OpenAI API key for AI features

**Frontend Setup**
```bash
npm install
npm run dev
```

**Backend Setup**
```bash
cd backend
pip install -r requirements.txt
python start.py
```

**Environment Configuration**
- Copy `.env.example` to `.env`
- Add your OpenAI API key
- Configure any additional settings

The application is designed to work in both full-featured mode (with OpenAI API) and fallback mode (with mock data) for development and deployment flexibility.
