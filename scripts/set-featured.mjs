const LOCAL_API = 'http://localhost:3000/api'

async function main() {
  console.log('🚀 Marking top articles as Featured and Breaking...')

  // 1. Authenticate
  const loginRes = await fetch(`${LOCAL_API}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@trend7news.com',
      password: 'adminpassword123',
    }),
  })

  if (!loginRes.ok) {
    throw new Error(`Login failed: ${await loginRes.text()}`)
  }

  const loginData = await loginRes.json()
  const token = loginData.token
  const authHeaders = {
    'Authorization': `JWT ${token}`,
    'Content-Type': 'application/json',
  }

  // 2. Fetch latest articles
  const fetchRes = await fetch(`${LOCAL_API}/articles?limit=30&sort=-id`, {
    headers: authHeaders,
  })

  if (!fetchRes.ok) {
    throw new Error(`Failed to fetch articles: ${fetchRes.statusText}`)
  }

  const data = await fetchRes.json()
  const articles = data.docs || []
  console.log(`📦 Loaded ${articles.length} articles.`)

  if (articles.length === 0) {
    console.log('No articles found.')
    return
  }

  // Mark top 3 as Featured
  for (let i = 0; i < Math.min(6, articles.length); i++) {
    const article = articles[i]
    const isFeatured = i < 3 // Top 3 featured
    const isBreaking = i % 2 === 0 // 0, 2, 4 breaking

    console.log(`Setting ID ${article.id} -> isFeatured: ${isFeatured}, isBreaking: ${isBreaking}`)
    await fetch(`${LOCAL_API}/articles/${article.id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        isFeatured,
        isBreaking,
      }),
    })
  }

  console.log('✅ Articles updated successfully!')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
