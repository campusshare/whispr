import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) throw new Error('Unauthorized payload access')

    const body = await req.json()
    const { story_original, category, location, incident_date, sensitivity } = body

    if (!story_original) {
      throw new Error('Missing original story payload')
    }

    // 1. Send text to LLM Gateway for Sanitization
    console.log(`[AI AGENT] Sanitizing text string for legal compliance and PII removal...`)
    // Mock LLaMA or OpenAI sanitization response
    // const llmResponse = await fetch('https://api.openai.com/v1/chat/completions', { ... })
    const story_sanitized = story_original.replace(/[A-Z][a-z]+ [A-Z][a-z]+/g, "[REDACTED NAME]")
      .replace(/\d{4} \w+ Rd/g, "[REDACTED ADDRESS]")

    // 2. Generate Semantic Embedded Vector for PgVector Search
    console.log(`[AI AGENT] Generating pgvector embeddings...`)
    // Normally uses OpenAI's text-embedding-ada-002 or local equivalent
    // const embedding = await fetch('https://api.openai.com/v1/embeddings', { ... })
    // Embedding is strictly an array of 1536 floats. Mocking first 5.
    const mockEmbedding = Array(1536).fill(0).map(() => Math.random() - 0.5)

    // 3. Insert secure payload into database
    const { data: postData, error: dbError } = await supabaseAdmin
      .from('posts')
      .insert({
        author_id: user.id,
        category: category || 'general',
        location: location || 'Unknown',
        incident_date: incident_date || null,
        story_original: story_original, // Hidden by RLS
        story_sanitized: story_sanitized, // Public
        embedding: mockEmbedding,
        sensitivity: sensitivity || 'normal'
      })
      .select('id')
      .single()

    if (dbError) throw dbError

    return new Response(JSON.stringify({
      success: true,
      message: 'Report sanitized, vectorized, and secured.',
      post_id: postData.id,
      sanitized_preview: story_sanitized
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
