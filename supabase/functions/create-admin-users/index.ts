import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const users = [
    { email: 'daniel@getbrain.com.br', name: 'Daniel' },
    { email: 'vitor@getbrain.com.br', name: 'Vitor' },
    { email: 'jpcavalcante@getbrain.com.br', name: 'JP Cavalcante' },
    { email: 'rodrigo@getbrain.com.br', name: 'Rodrigo' },
  ]

  const results = []

  for (const u of users) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: 'gb@2026',
      email_confirm: true,
      user_metadata: { full_name: u.name },
    })

    if (error) {
      results.push({ email: u.email, error: error.message })
    } else {
      const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
        user_id: data.user.id,
        role: 'admin',
      })
      results.push({ email: u.email, id: data.user.id, role_error: roleError?.message || null })
    }
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  })
})
