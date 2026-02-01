-- Add has_image to songs
ALTER TABLE songs ADD COLUMN has_image BOOLEAN DEFAULT FALSE;
