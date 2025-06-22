-- Disaster Response Coordination Platform Database Schema
-- Run this in your Supabase SQL editor

-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Disasters table with geospatial support
CREATE TABLE IF NOT EXISTS disasters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    location_name TEXT,
    location GEOGRAPHY(POINT, 4326), -- PostGIS geography type for lat/lng
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    owner_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    audit_trail JSONB DEFAULT '[]'::jsonb
);

-- Reports table for user-submitted reports
CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    disaster_id UUID REFERENCES disasters(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'unverified')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resources table for shelters, hospitals, etc.
CREATE TABLE IF NOT EXISTS resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    disaster_id UUID REFERENCES disasters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location_name TEXT,
    location GEOGRAPHY(POINT, 4326),
    type TEXT NOT NULL CHECK (type IN ('shelter', 'hospital', 'food', 'water', 'transport', 'other')),
    capacity INTEGER,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'full', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cache table for API responses
CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Social media posts table
CREATE TABLE IF NOT EXISTS social_media_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    disaster_id UUID REFERENCES disasters(id) ON DELETE CASCADE,
    post TEXT NOT NULL,
    user TEXT NOT NULL,
    platform TEXT DEFAULT 'twitter',
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Official updates table
CREATE TABLE IF NOT EXISTS official_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    disaster_id UUID REFERENCES disasters(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    link TEXT,
    pub_date TIMESTAMP WITH TIME ZONE,
    source TEXT DEFAULT 'fema',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create geospatial indexes for fast location-based queries
CREATE INDEX IF NOT EXISTS disasters_location_idx ON disasters USING GIST (location);
CREATE INDEX IF NOT EXISTS resources_location_idx ON resources USING GIST (location);

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS disasters_tags_idx ON disasters USING GIN (tags);
CREATE INDEX IF NOT EXISTS disasters_owner_idx ON disasters (owner_id);
CREATE INDEX IF NOT EXISTS disasters_created_at_idx ON disasters (created_at DESC);
CREATE INDEX IF NOT EXISTS reports_disaster_idx ON reports (disaster_id);
CREATE INDEX IF NOT EXISTS resources_disaster_idx ON resources (disaster_id);
CREATE INDEX IF NOT EXISTS cache_expires_idx ON cache (expires_at);

-- Function to get resources within a radius (in meters)
CREATE OR REPLACE FUNCTION get_resources_nearby(
    disaster_id UUID,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    radius_meters INTEGER DEFAULT 10000
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    location_name TEXT,
    type TEXT,
    capacity INTEGER,
    status TEXT,
    distance_meters DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.name,
        r.location_name,
        r.type,
        r.capacity,
        r.status,
        ST_Distance(r.location::geography, ST_SetSRID(ST_Point(lon, lat), 4326)::geography) as distance_meters
    FROM resources r
    WHERE r.disaster_id = get_resources_nearby.disaster_id
    AND ST_DWithin(
        r.location::geography, 
        ST_SetSRID(ST_Point(lon, lat), 4326)::geography, 
        radius_meters
    )
    ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_disasters_updated_at 
    BEFORE UPDATE ON disasters 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO disasters (title, location_name, location, description, tags, owner_id) VALUES
('NYC Flood', 'Manhattan, NYC', ST_SetSRID(ST_Point(-74.0060, 40.7128), 4326), 'Heavy flooding in Manhattan area', ARRAY['flood', 'urgent'], 'netrunnerX'),
('California Wildfire', 'Los Angeles, CA', ST_SetSRID(ST_Point(-118.2437, 34.0522), 4326), 'Wildfire spreading in LA County', ARRAY['wildfire', 'emergency'], 'netrunnerX'),
('Texas Tornado', 'Dallas, TX', ST_SetSRID(ST_Point(-96.7970, 32.7767), 4326), 'Tornado touchdown in Dallas suburbs', ARRAY['tornado', 'destructive'], 'netrunnerX')
ON CONFLICT DO NOTHING;

INSERT INTO resources (disaster_id, name, location_name, location, type, capacity, status) VALUES
((SELECT id FROM disasters WHERE title = 'NYC Flood' LIMIT 1), 'Red Cross Shelter', 'Lower East Side, NYC', ST_SetSRID(ST_Point(-73.9903, 40.7146), 4326), 'shelter', 200, 'active'),
((SELECT id FROM disasters WHERE title = 'NYC Flood' LIMIT 1), 'Bellevue Hospital', 'Manhattan, NYC', ST_SetSRID(ST_Point(-73.9731, 40.7421), 4326), 'hospital', 500, 'active'),
((SELECT id FROM disasters WHERE title = 'California Wildfire' LIMIT 1), 'LA Convention Center', 'Los Angeles, CA', ST_SetSRID(ST_Point(-118.2673, 34.0395), 4326), 'shelter', 1000, 'active')
ON CONFLICT DO NOTHING;

INSERT INTO social_media_posts (disaster_id, post, user, priority) VALUES
((SELECT id FROM disasters WHERE title = 'NYC Flood' LIMIT 1), '#floodrelief Need food in NYC', 'citizen1', 'normal'),
((SELECT id FROM disasters WHERE title = 'NYC Flood' LIMIT 1), 'SOS! Water rising fast in Lower East Side', 'citizen2', 'urgent'),
((SELECT id FROM disasters WHERE title = 'NYC Flood' LIMIT 1), 'Evacuating area near Manhattan Bridge', 'citizen3', 'high')
ON CONFLICT DO NOTHING;

-- Create a view for disaster statistics
CREATE OR REPLACE VIEW disaster_stats AS
SELECT 
    d.id,
    d.title,
    d.location_name,
    COUNT(r.id) as report_count,
    COUNT(sm.id) as social_media_count,
    COUNT(res.id) as resource_count,
    d.created_at
FROM disasters d
LEFT JOIN reports r ON d.id = r.disaster_id
LEFT JOIN social_media_posts sm ON d.id = sm.disaster_id
LEFT JOIN resources res ON d.id = res.disaster_id
GROUP BY d.id, d.title, d.location_name, d.created_at; 