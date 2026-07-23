/**
 * Migration Script: Populate normalized_text for existing paragraphs
 * 
 * This script:
 * 1. Fetches all existing paragraphs from the database
 * 2. Normalizes their text using the normalizeText utility
 * 3. Updates each paragraph with the normalized_text field
 * 
 * Run once after adding the normalized_text column.
 */

import { createClient } from '@supabase/supabase-js';
import { normalizeText } from '../src/utils/textNormalizer.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qouzuypjuaytgusvrsoo.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvdXp1eXBqdWF5dGd1c3Zyc29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MzQ4MzUsImV4cCI6MjEwMDIxMDgzNX0.idrjxDgA0FVpGfNq2HSb-mmHlpvDtKZ-cjj8bBnIK_U';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function migrateNormalizedText() {
  console.log('Starting migration: Populating normalized_text for existing paragraphs...');
  
  let processedCount = 0;
  let errorCount = 0;
  let from = 0;
  const pageSize = 100;
  
  while (true) {
    // Fetch batch of paragraphs
    const { data: paragraphs, error } = await supabase
      .from('paragraphs')
      .select('id, text')
      .range(from, from + pageSize - 1);
    
    if (error) {
      console.error('Error fetching paragraphs:', error);
      errorCount++;
      break;
    }
    
    if (!paragraphs || paragraphs.length === 0) {
      console.log('No more paragraphs to process.');
      break;
    }
    
    console.log(`Processing batch of ${paragraphs.length} paragraphs...`);
    
    // Process each paragraph in the batch
    for (const paragraph of paragraphs) {
      const normalized = normalizeText(paragraph.text);
      
      const { error: updateError } = await supabase
        .from('paragraphs')
        .update({ normalized_text: normalized })
        .eq('id', paragraph.id);
      
      if (updateError) {
        console.error(`Error updating paragraph ${paragraph.id}:`, updateError);
        errorCount++;
      } else {
        processedCount++;
      }
    }
    
    console.log(`Processed ${processedCount} paragraphs total.`);
    
    if (paragraphs.length < pageSize) {
      break;
    }
    
    from += pageSize;
  }
  
  console.log('\nMigration complete!');
  console.log(`Successfully processed: ${processedCount} paragraphs`);
  console.log(`Errors encountered: ${errorCount}`);
}

migrateNormalizedText().catch(console.error);
