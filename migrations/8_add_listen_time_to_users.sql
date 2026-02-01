-- Add total_listen_time to users table
ALTER TABLE users ADD COLUMN total_listen_time INTEGER NOT NULL DEFAULT 0;
