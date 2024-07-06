import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://koupjgmgvpspvaaclzvf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdXBqZ21ndnBzcHZhYWNsenZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTcyMTYwMzIsImV4cCI6MjAzMjc5MjAzMn0.JADS25lBKfopHeZSllUKx0kdAhkSjECubkzGEm-gYrQ'
const redirectUrl = 'https://fallout76.snorl.ax/plans/beta/'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    redirectTo: redirectUrl
  }
})