-- Remove email column from users table if it exists
-- Run this SQL to update your existing database

-- Check if email column exists and drop it
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE users DROP COLUMN email;
        RAISE NOTICE 'Email column removed from users table';
    ELSE
        RAISE NOTICE 'Email column does not exist in users table';
    END IF;
END $$;