import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qouzuypjuaytgusvrsoo.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvdXp1eXBqdWF5dGd1c3Zyc29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MzQ4MzUsImV4cCI6MjEwMDIxMDgzNX0.idrjxDgA0FVpGfNq2HSb-mmHlpvDtKZ-cjj8bBnIK_U';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
