import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://edliniyruqjvrmyxsxgk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkbGluaXlydXFqdnJteXhzeGdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzA2NzgsImV4cCI6MjA4NzMwNjY3OH0.PCx7HVzAPn-vDlBRBVPMrKZ1T2BH5nj_i-cGQVj4Cus'

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn('Missing Supabase env vars: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
