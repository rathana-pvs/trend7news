const LOCAL_API = 'http://localhost:3000/api'

async function main() {
  console.log('🚀 Seeding sample visitor view counts for articles...')

  // Authenticate
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

  const token = (await loginRes.json()).token
  const authHeaders = {
    'Authorization': `JWT ${token}`,
    'Content-Type': 'application/json',
  }

  const articlesRes = await fetch(`${LOCAL_API}/articles?limit=30`, { headers: authHeaders })
  const articles = (await articlesRes.json()).docs || []

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i]
    // Generate sample views based on position (e.g. 50 to 2500 views)
    const views = Math.floor(Math.random() * 2000) + 100
    console.log(`Setting views for article ID ${article.id} -> ${views}`)
    await fetch(`${LOCAL_API}/articles/${article.id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ views }),
    })
  }

  console.log('✅ Sample views seeded successfully!')
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
