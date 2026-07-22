-- Supabase Database Schema for Sermon Presentation System
-- NOTE: Tables already exist - this is for RLS policies only
-- Actual table structure:
-- Messages: book_id, title, date
-- Paragraphs: id, book_id, paragraph_no, text

-- Enable Row Level Security if not already enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE paragraphs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to messages" ON messages;
DROP POLICY IF EXISTS "Allow public read access to paragraphs" ON paragraphs;

-- Create policies for public read access (for presentation system)
CREATE POLICY "Allow public read access to messages" ON messages 
    FOR SELECT 
    USING (true);

CREATE POLICY "Allow public read access to paragraphs" ON paragraphs 
    FOR SELECT 
    USING (true);

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_messages_date ON messages(date);
CREATE INDEX IF NOT EXISTS idx_messages_book_id ON messages(book_id);
CREATE INDEX IF NOT EXISTS idx_paragraphs_book_id ON paragraphs(book_id);
CREATE INDEX IF NOT EXISTS idx_paragraphs_paragraph_no ON paragraphs(paragraph_no);
