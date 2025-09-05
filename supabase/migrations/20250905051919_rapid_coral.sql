/*
  # Enable Multiple Cards Per User

  1. Changes
    - Remove any unique constraints that limit one card per user
    - Add card_type field to categorize cards (personal, business, etc.)
    - Add is_primary field to mark the main card
    - Update policies to support multiple cards per user
    - Add indexes for better performance

  2. Security
    - Maintain existing RLS policies
    - Users can only manage their own cards
    - Public can view published cards
*/

-- Add card_type column to business_cards table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_cards' AND column_name = 'card_type'
  ) THEN
    ALTER TABLE business_cards ADD COLUMN card_type text DEFAULT 'personal' CHECK (card_type IN ('personal', 'business', 'creative', 'professional', 'other'));
  END IF;
END $$;

-- Add is_primary column to mark the main card
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_cards' AND column_name = 'is_primary'
  ) THEN
    ALTER TABLE business_cards ADD COLUMN is_primary boolean DEFAULT false;
  END IF;
END $$;

-- Add card_name column for better identification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_cards' AND column_name = 'card_name'
  ) THEN
    ALTER TABLE business_cards ADD COLUMN card_name text;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_business_cards_card_type ON business_cards(card_type);
CREATE INDEX IF NOT EXISTS idx_business_cards_is_primary ON business_cards(is_primary);
CREATE INDEX IF NOT EXISTS idx_business_cards_user_id_type ON business_cards(user_id, card_type);

-- Function to ensure only one primary card per user
CREATE OR REPLACE FUNCTION ensure_single_primary_card()
RETURNS trigger AS $$
BEGIN
  -- If setting this card as primary, unset all other primary cards for this user
  IF NEW.is_primary = true THEN
    UPDATE business_cards 
    SET is_primary = false 
    WHERE user_id = NEW.user_id 
    AND id != NEW.id 
    AND is_primary = true;
  END IF;
  
  -- If this is the user's first card, make it primary
  IF NOT EXISTS (
    SELECT 1 FROM business_cards 
    WHERE user_id = NEW.user_id 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    NEW.is_primary = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for primary card management
DROP TRIGGER IF EXISTS ensure_single_primary_card_trigger ON business_cards;
CREATE TRIGGER ensure_single_primary_card_trigger
  BEFORE INSERT OR UPDATE ON business_cards
  FOR EACH ROW EXECUTE FUNCTION ensure_single_primary_card();

-- Update existing cards to have proper card_type and set first card as primary
DO $$
DECLARE
  user_record RECORD;
  first_card_id uuid;
BEGIN
  -- Set card_type for existing cards
  UPDATE business_cards 
  SET card_type = 'personal' 
  WHERE card_type IS NULL;
  
  -- Set first card as primary for each user
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM business_cards 
    WHERE is_primary IS NULL OR is_primary = false
  LOOP
    -- Get the first card for this user (oldest)
    SELECT id INTO first_card_id
    FROM business_cards 
    WHERE user_id = user_record.user_id 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- Set it as primary
    IF first_card_id IS NOT NULL THEN
      UPDATE business_cards 
      SET is_primary = true 
      WHERE id = first_card_id;
    END IF;
  END LOOP;
END $$;

-- Function to generate card name if not provided
CREATE OR REPLACE FUNCTION set_card_name()
RETURNS trigger AS $$
DECLARE
  card_count integer;
BEGIN
  -- If card_name is not provided, generate one
  IF NEW.card_name IS NULL OR NEW.card_name = '' THEN
    -- Count existing cards for this user
    SELECT COUNT(*) INTO card_count
    FROM business_cards 
    WHERE user_id = NEW.user_id;
    
    -- Generate name based on type and count
    IF card_count = 0 THEN
      NEW.card_name := 'Main Card';
    ELSE
      NEW.card_name := initcap(NEW.card_type) || ' Card ' || (card_count + 1);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for card name generation
DROP TRIGGER IF EXISTS set_card_name_trigger ON business_cards;
CREATE TRIGGER set_card_name_trigger
  BEFORE INSERT ON business_cards
  FOR EACH ROW EXECUTE FUNCTION set_card_name();

-- Remove any existing unique constraints that might limit one card per user
-- (This is just a safety measure in case any were added)
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Check for any unique constraints on user_id
  FOR constraint_name IN 
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'business_cards' 
    AND tc.constraint_type = 'UNIQUE'
    AND kcu.column_name = 'user_id'
  LOOP
    EXECUTE 'ALTER TABLE business_cards DROP CONSTRAINT IF EXISTS ' || constraint_name;
  END LOOP;
END $$;

-- Update card names for existing cards
UPDATE business_cards 
SET card_name = CASE 
  WHEN is_primary = true THEN 'Main Card'
  ELSE initcap(card_type) || ' Card'
END
WHERE card_name IS NULL;