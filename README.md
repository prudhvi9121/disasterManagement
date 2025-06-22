# Disaster Response Coordination Platform

A comprehensive MERN stack application for disaster response coordination that aggregates real-time data to aid disaster management. Built with Node.js, Express, React, and Supabase, featuring AI-powered location extraction, geospatial queries, and real-time social media monitoring.

## 🚀 Features

### Core Functionality
- **Disaster Data Management**: Full CRUD operations with ownership and audit trails
- **AI-Powered Location Extraction**: Google Gemini API extracts location names from descriptions
- **Geospatial Resource Mapping**: PostGIS-powered location-based queries for nearby resources
- **Real-Time Social Media Monitoring**: Mock Twitter API with priority classification
- **Official Updates Aggregation**: Web scraping for government/relief organization updates
- **Image Verification**: AI-powered image authenticity analysis
- **Real-Time Updates**: WebSocket integration for live data synchronization
- **Caching System**: Supabase-based API response caching with TTL

### Advanced Features
- **Priority Alert System**: Keyword-based classification for urgent social media reports
- **Geospatial Indexes**: Fast location-based queries using PostGIS
- **Rate Limiting**: API protection with configurable limits
- **Structured Logging**: Comprehensive audit trails and system monitoring
- **Mock Authentication**: Role-based access control (admin, contributor, viewer)

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **Supabase** (PostgreSQL + PostGIS) for data storage and caching
- **Socket.IO** for real-time communication
- **Google Gemini API** for AI-powered features
- **Cheerio** for web scraping
- **Axios** for HTTP requests

### Frontend
- **React** with Vite
- **Tailwind CSS** for styling
- **Socket.IO Client** for real-time updates

### External Services
- **Google Gemini API** (location extraction, image verification)
- **OpenStreetMap Nominatim** (geocoding)
- **FEMA RSS Feed** (official updates)

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Google Gemini API key

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Disaster_Platform
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_from_aistudio.google.com

# Server Configuration
PORT=5000
NODE_ENV=development
```

### 3. Database Setup

1. Create a Supabase project at [https://supabase.com](https://supabase.com)
2. Run the SQL schema from `backend/supabase-schema.sql` in your Supabase SQL editor
3. Copy your project URL and anon key to the `.env` file

### 4. Frontend Setup

```bash
cd ../frontend
npm install
```

### 5. Start Development Servers

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## 📊 API Endpoints

### Disasters
- `POST /disasters` - Create disaster
- `GET /disasters` - List disasters (with optional tag filter)
- `PUT /disasters/:id` - Update disaster
- `DELETE /disasters/:id` - Delete disaster

### Geocoding
- `POST /geocode` - Extract location and convert to coordinates

### Reports
- `POST /disasters/:id/reports` - Submit report
- `GET /disasters/:id/reports` - Get reports

### Social Media
- `GET /disasters/:id/social-media` - Get social media posts with priority classification

### Resources
- `GET /disasters/:id/resources?lat=X&lon=Y` - Get nearby resources (10km radius)
- `POST /disasters/:id/resources` - Add resource

### Official Updates
- `GET /disasters/:id/official-updates` - Get official updates from government sources

### Image Verification
- `POST /disasters/:id/verify-image` - Verify image authenticity using AI

## 🔌 WebSocket Events

- `disaster_updated` - Emitted when disaster is created/updated/deleted
- `social_media_updated` - Emitted when new social media posts arrive
- `resources_updated` - Emitted when resources are updated

## 🗄️ Database Schema

The system uses Supabase (PostgreSQL) with PostGIS extension:

- **disasters**: Main disaster records with geospatial location
- **reports**: User-submitted reports
- **resources**: Shelters, hospitals, and other resources
- **social_media_posts**: Social media monitoring data
- **official_updates**: Government/relief organization updates
- **cache**: API response caching with TTL

## 🗺️ Geospatial Features

- PostGIS geography type for accurate location storage
- Geospatial indexes for fast location-based queries
- `get_resources_nearby()` function for radius-based searches
- Support for multiple coordinate systems

## 🔐 Authentication

Currently uses mock authentication with hardcoded users:
- `netrunnerX` (admin) - Full system access
- `citizen1` (contributor) - Can submit reports
- `guestViewer` (viewer) - Read-only access

Pass user ID via `x-user-id` header.

## 📈 Priority Classification

Social media posts are automatically classified by priority:

- **Urgent**: Contains keywords like "urgent", "SOS", "emergency", "trapped"
- **High**: Contains keywords like "evacuate", "flooding", "fire", "danger"
- **Normal**: Standard posts

## 🚀 Deployment

### Backend (Render/Railway)

1. Connect your GitHub repository
2. Set environment variables
3. Deploy with Node.js buildpack

### Frontend (Vercel)

1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variable: `VITE_API_URL=your_backend_url`

## 🤖 AI Tool Usage

This project was developed using **Cursor AI** for:
- API route generation and optimization
- Supabase query optimization
- Geospatial logic implementation
- Error handling patterns
- WebSocket integration
- Database schema design

## 📝 Sample Data

The system includes sample data for testing:

```json
{
  "disaster": {
    "title": "NYC Flood",
    "location_name": "Manhattan, NYC",
    "description": "Heavy flooding in Manhattan area",
    "tags": ["flood", "urgent"]
  },
  "resource": {
    "name": "Red Cross Shelter",
    "location_name": "Lower East Side, NYC",
    "type": "shelter",
    "capacity": 200
  }
}
```

## 🔧 Development

### Backend Development
```bash
cd backend
npm run dev  # Start with nodemon
npm start    # Start production server
```

### Frontend Development
```bash
cd frontend
npm run dev  # Start Vite dev server
npm run build  # Build for production
```

## 📊 Monitoring & Logging

- Structured logging for all API operations
- Audit trails for disaster modifications
- Cache hit/miss tracking
- Error tracking with detailed context

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with Cursor AI for rapid development
- Uses Google Gemini API for AI features
- Supabase for database and caching
- OpenStreetMap for geocoding services

---

**Built for disaster response coordination with modern web technologies and AI capabilities.** 