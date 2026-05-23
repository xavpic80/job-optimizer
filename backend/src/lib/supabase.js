import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    `Missing Supabase env vars: SUPABASE_URL=${process.env.SUPABASE_URL}, SERVICE_ROLE_KEY set=${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`
  );
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default supabase;
