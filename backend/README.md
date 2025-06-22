# Disaster Response Coordination Platform - Backend

A comprehensive backend system for disaster response coordination with real-time data aggregation, geospatial queries, and AI-powered features.

## Features

- **Disaster Data Management**: CRUD operations with ownership and audit trails
- **Location Extraction & Geocoding**: AI-powered location extraction with mapping service integration
- **Real-Time Social Media Monitoring**: Mock Twitter API with priority classification
- **Geospatial Resource Mapping**: PostGIS-powered location-based queries
- **Official Updates Aggregation**: Web scraping for government/relief updates
- **Image Verification**: AI-powered image authenticity analysis
- **Real-Time Updates**: WebSocket integration for live data
- **Caching System**: Supabase-based API response caching

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the backend directory with:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_from_aistudio.google.com

# Server Configuration
PORT=5000
NODE_ENV=development

# Optional: Alternative mapping services
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
```

### 3. Database Setup

1. Create a Supabase project at https://supabase.com
2. Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor
3. Copy your project URL and anon key to the `.env` file

### 4. API Keys Setup

#### Google Gemini API
1. Go to https://aistudio.google.com/app/apikey
2. Create a new API key
3. Add to your `.env` file

#### Optional: Google Maps API
1. Go to https://console.cloud.google.com
2. Enable Geocoding API
3. Create credentials and add to `.env`

### 5. Start Development Server

```bash
npm run dev
```

## API Endpoints

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
- `GET /disasters/:id/social-media` - Get social media posts

### Resources
- `GET /disasters/:id/resources?lat=X&lon=Y` - Get nearby resources
- `POST /disasters/:id/resources` - Add resource

### Official Updates
- `GET /disasters/:id/official-updates` - Get official updates

### Image Verification
- `POST /disasters/:id/verify-image` - Verify image authenticity

## WebSocket Events

- `disaster_updated` - Emitted when disaster is created/updated/deleted
- `social_media_updated` - Emitted when new social media posts arrive
- `resources_updated` - Emitted when resources are updated

## Database Schema

The system uses Supabase (PostgreSQL) with PostGIS extension for geospatial queries:

- **disasters**: Main disaster records with geospatial location
- **reports**: User-submitted reports
- **resources**: Shelters, hospitals, and other resources
- **social_media_posts**: Social media monitoring data
- **official_updates**: Government/relief organization updates
- **cache**: API response caching

## Geospatial Features

- PostGIS geography type for accurate location storage
- Geospatial indexes for fast location-based queries
- `get_resources_nearby()` function for radius-based searches
- Support for multiple coordinate systems

## Caching System

- Supabase-based caching with TTL
- Caches external API responses (1 hour default)
- Automatic cache invalidation
- Reduces API rate limit issues

## Authentication

Currently uses mock authentication with hardcoded users:
- `netrunnerX` (admin)
- `citizen1` (contributor)
- `guestViewer` (viewer)

Pass user ID via `x-user-id` header.

## Error Handling

- Structured error responses
- Rate limiting (60 requests/minute)
- Comprehensive logging
- Graceful fallbacks for external API failures

## Development

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start
```

## Deployment

The backend is designed to be deployed on Render, Railway, or any Node.js hosting platform.

## AI Tool Usage

This project was developed using Cursor AI for:
- API route generation
- Supabase query optimization
- Geospatial logic implementation
- Error handling patterns
- WebSocket integration 