-- Drop the separate UserPreferences table and add JSON fields to User table
DROP TABLE IF EXISTS "user_preferences";

-- Add preferences and settings JSON columns to users table
ALTER TABLE "users" 
ADD COLUMN "preferences" JSONB DEFAULT '{}',
ADD COLUMN "settings" JSONB DEFAULT '{}';