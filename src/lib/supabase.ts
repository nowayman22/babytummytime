import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://njeoajkmpyyaromujxfm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cCEiRLoFSFZwoz20cRb1Ig_WVI1jOww';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
