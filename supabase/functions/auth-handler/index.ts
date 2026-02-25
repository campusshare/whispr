import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const { action, alias, password } = await req.json()

    if (!alias || !password) {
      return new Response(JSON.stringify({ error: 'Alias and password required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase admin client to bypass RLS for registration
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const dummyEmail = `${alias.toLowerCase()}@whispr.local`

    if (action === 'register') {
      // Create user
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: dummyEmail,
        password: password,
        email_confirm: true,
      })

      if (error) throw error

      // Insert alias into public.users
      const { error: dbError } = await supabaseAdmin
        .from('users')
        .insert({ id: data.user.id, alias: alias, hashed_password: 'managed_by_supabase_auth' })

      if (dbError) throw dbError

      // Sign in to get session tokens
      const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: dummyEmail,
        password: password,
      })

      if (signInError) throw signInError

      return createAuthResponse(signInData.session)
    }

    else if (action === 'login') {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email: dummyEmail,
        password: password,
      })

      if (error) throw error
      return createAuthResponse(data.session)
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: corsHeaders })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function createAuthResponse(session: any) {
  const headers = new Headers(corsHeaders)
  headers.set('Content-Type', 'application/json')

  // Set HTTP-Only cookies
  // Supabase access token (1 hour)
  headers.append('Set-Cookie', `sb_access_token=${session.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`)
  // Supabase refresh token
  headers.append('Set-Cookie', `sb_refresh_token=${session.refresh_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`)

  return new Response(JSON.stringify({ success: true, user_id: session.user.id }), {
    status: 200,
    headers,
  })
}
