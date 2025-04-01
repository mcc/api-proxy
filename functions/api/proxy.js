const CACHE_TTL = 24 * 60 * 60 // 24 hours in seconds

export async function onRequest(context) {
    console.log('asd');
  const { request, env } = context
  const url = new URL(request.url)
  console.log(url)
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Update for production
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const apiKey = request.headers.get('Authorization')?.split('Bearer ')[1]
  if (!apiKey || !(await env.API_KEYS.get(apiKey))) {
    //return new Response('Invalid API Key', { status: 401, headers: corsHeaders })
  }

  const targetUrl = decodeURIComponent(url.pathname.slice('/api/proxy/?'.length))
  const forceRefresh = url.searchParams.get('refresh') === 'true'
  const cacheKey = `cache:${targetUrl}`

  if (!forceRefresh) {
    const cached = await env.CACHE.get(cacheKey)
    if (cached) {
      return new Response(cached, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
      })
    }
  }

  try {
    const response = await fetch(targetUrl)
    const contentType = response.headers.get('content-type')
    let data = await response.text()

    if (contentType.includes('csv') || targetUrl.endsWith('.csv')) {
      data = csvToJson(data)
    } else if (contentType.includes('tsv') || targetUrl.endsWith('.tsv')) {
      data = tsvToJson(data)
    } else if (targetUrl.endsWith('.xlsx')) {
      const buffer = await response.arrayBuffer()
      data = await xlsxToJson(buffer)
    } else {

    }

    const jsonData = JSON.stringify(data)
    await env.CACHE.put(cacheKey, jsonData, { expirationTtl: CACHE_TTL })

    return new Response(jsonData, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
    })
  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500, headers: corsHeaders })
  }
}

function csvToJson(csv) {
  const lines = csv.split('\n')
  const headers = lines[0].split(',')
  return lines.slice(1).map(line => {
    const values = line.split(',')
    return headers.reduce((obj, header, i) => {
      obj[header.trim()] = values[i]?.trim()
      return obj
    }, {})
  })
}

function tsvToJson(tsv) {
  const lines = tsv.split('\n')
  const headers = lines[0].split('\t')
  return lines.slice(1).map(line => {
    const values = line.split('\t')
    return headers.reduce((obj, header, i) => {
      obj[header.trim()] = values[i]?.trim()
      return obj
    }, {})
  })
}

async function xlsxToJson(buffer) {
  return { note: 'XLSX parsing requires additional library' }
}