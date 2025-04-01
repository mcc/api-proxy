const ADMIN_PASSWORD = 'your-secure-password' // Use env vars in production

export async function onRequest(context) {
  console.log('asdasdasdasd')
  const { request, env } = context
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Update for production
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const auth = request.headers.get('Authorization')
  if (!auth || auth !== `Bearer ${ADMIN_PASSWORD}`) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  if (request.method === 'POST') {
    const { action, key } = await request.json()
    if (action === 'generate') {
      const newKey = crypto.randomUUID()
      await env.API_KEYS.put(newKey, 'true')
      return new Response(JSON.stringify({ apiKey: newKey }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (action === 'revoke' && key) {
      await env.API_KEYS.delete(key)
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  const keys = await env.API_KEYS.list()
  return new Response(JSON.stringify(keys.keys.map(k => k.name)), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}