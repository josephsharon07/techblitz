import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseConfig = {
  url: "https://vvslloprmvlxjdfianep.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2c2xsb3BybXZseGpkZmlhbmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMjgxOTMsImV4cCI6MjA1OTcwNDE5M30.SlaL1X5hPQuCi0AgHuAVaD0Te8mpbn24D258UamqwJA"
} as const;

// Initialize Supabase client
export const supabase = createClient(supabaseConfig.url, supabaseConfig.key);

