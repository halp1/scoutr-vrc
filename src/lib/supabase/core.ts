import { CONSTANTS } from '$lib/const';
import { createClient } from '@supabase/supabase-js';


export const supabase = createClient(CONSTANTS.SUPABASE_URL, CONSTANTS.SUPABASE_PUBLISHABLE_KEY);
