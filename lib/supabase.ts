import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.warn('Supabase environment variables are not properly configured')
  console.warn('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseAnonKey)
  console.warn('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
}

// Client for browser/client-side operations
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Admin client for server-side operations (with service role key)
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Storage bucket name for documents
export const DOCUMENTS_BUCKET = 'documents'

// Helper function to get public URL for a file
export function getSupabasePublicUrl(bucket: string, path: string): string {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check environment variables.')
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// Helper function to get signed URL for private files
export async function getSupabaseSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<string> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized. Check environment variables.')
  }
  
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)
  
  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`)
  }
  
  return data.signedUrl
}
