const LOCAL_API = 'http://localhost:3000/api'

async function main() {
  console.log('🚀 Starting article cleanup to keep only the 30 latest articles...')

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
  const authHeaders = { 'Authorization': `JWT ${token}` }

  // 2. Fetch all articles sorted by ID desc / createdAt desc
  const fetchRes = await fetch(`${LOCAL_API}/articles?limit=500&sort=-id`, {
    headers: authHeaders,
  })

  if (!fetchRes.ok) {
    throw new Error(`Failed to fetch articles: ${fetchRes.statusText}`)
  }

  const data = await fetchRes.json()
  const allArticles = data.docs || []
  console.log(`📦 Found total ${allArticles.length} articles in database.`)

  if (allArticles.length <= 30) {
    console.log(`✅ Total articles (${allArticles.length}) is already <= 30. No deletion needed.`)
    return
  }

  const keepArticles = allArticles.slice(0, 30)
  const deleteArticles = allArticles.slice(30)

  console.log(`📌 Keeping latest 30 articles (IDs: ${keepArticles.map(a => a.id).join(', ')})`)
  console.log(`🗑️ Deleting ${deleteArticles.length} older articles...`)

  let deletedCount = 0
  for (const article of deleteArticles) {
    console.log(`  Deleting ID ${article.id}: "${article.title}"`)
    const delRes = await fetch(`${LOCAL_API}/articles/${article.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    })

    if (delRes.ok) {
      deletedCount++
    } else {
      console.error(`  ❌ Failed to delete ID ${article.id}: ${await delRes.text()}`)
    }
  }

  console.log(`\n🎉 Cleanup finished! ${deletedCount} older articles deleted. Exactly 30 articles remaining.`)
}

main().catch(err => {
  console.error('Fatal cleanup error:', err)
  process.exit(1)
})
