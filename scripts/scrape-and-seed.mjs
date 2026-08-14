import fs from 'fs'
import path from 'path'

const LOCAL_API = 'http://localhost:3000/api'
const PULEFEED_API = 'https://pulefeed.tech/api'

async function main() {
  console.log('🚀 Starting Scrape & Seed HTTP script...')

  // 1. Authenticate with local Payload API
  console.log('🔑 Logging into local Trend7News API...')
  const loginRes = await fetch(`${LOCAL_API}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@trend7news.com',
      password: 'adminpassword123',
    }),
  })

  if (!loginRes.ok) {
    throw new Error(`Login failed with status ${loginRes.status}: ${await loginRes.text()}`)
  }

  const loginData = await loginRes.json()
  const token = loginData.token
  console.log('✅ Authenticated successfully!')

  const authHeaders = {
    'Authorization': `JWT ${token}`,
  }

  // 2. Fetch 30 latest articles from pulefeed.tech
  console.log('📥 Fetching 30 latest articles from pulefeed.tech...')
  const pfRes = await fetch(`${PULEFEED_API}/articles?limit=30&depth=2`)
  if (!pfRes.ok) {
    throw new Error(`Failed to fetch from pulefeed.tech: ${pfRes.statusText}`)
  }

  const pfData = await pfRes.json()
  const pulefeedArticles = pfData.docs || []
  console.log(`📦 Received ${pulefeedArticles.length} articles from pulefeed.tech`)

  // Cache authors to avoid duplicate requests
  const authorCache = new Map()

  let successCount = 0
  let skippedCount = 0

  for (let i = 0; i < pulefeedArticles.length; i++) {
    const pfArticle = pulefeedArticles[i]
    console.log(`\n[${i + 1}/${pulefeedArticles.length}] Processing: "${pfArticle.title}"`)

    // Check if article already exists locally
    const checkRes = await fetch(`${LOCAL_API}/articles?where[slug][equals]=${encodeURIComponent(pfArticle.slug)}`)
    if (checkRes.ok) {
      const checkData = await checkRes.json()
      if (checkData.docs && checkData.docs.length > 0) {
        console.log(`  ⏩ Article with slug "${pfArticle.slug}" already exists. Skipping.`)
        skippedCount++
        continue
      }
    }

    // Handle Author
    let authorId = null
    const pfAuthor = pfArticle.author
    if (pfAuthor && typeof pfAuthor === 'object' && pfAuthor.name) {
      const authorSlug = pfAuthor.slug || pfAuthor.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      if (authorCache.has(authorSlug)) {
        authorId = authorCache.get(authorSlug)
      } else {
        // Search local author
        const findAuthRes = await fetch(`${LOCAL_API}/authors?where[slug][equals]=${encodeURIComponent(authorSlug)}`)
        if (findAuthRes.ok) {
          const findAuthData = await findAuthRes.json()
          if (findAuthData.docs && findAuthData.docs.length > 0) {
            authorId = findAuthData.docs[0].id
          }
        }

        // Create author if not found
        if (!authorId) {
          console.log(`  👤 Creating author: "${pfAuthor.name}"`)
          const createAuthRes = await fetch(`${LOCAL_API}/authors`, {
            method: 'POST',
            headers: {
              ...authHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: pfAuthor.name,
              slug: authorSlug,
              role: pfAuthor.role || 'Staff Reporter',
              bio: pfAuthor.bio || '',
            }),
          })
          if (createAuthRes.ok) {
            const newAuth = await createAuthRes.json()
            authorId = newAuth.doc?.id || newAuth.id
          }
        }
        if (authorId) authorCache.set(authorSlug, authorId)
      }
    }

    // Handle Cover Image
    let mediaId = null
    let imgUrl = null
    if (pfArticle.coverImage && typeof pfArticle.coverImage === 'object') {
      imgUrl = pfArticle.coverImage.url || pfArticle.coverImage.externalUrl
    }

    if (!imgUrl) {
      imgUrl = `https://images.unsplash.com/photo-1585829365295-ab7cd400c167?q=80&w=2000&auto=format&fit=crop`
    }

    // Upload image to local media collection
    try {
      console.log(`  🖼️ Uploading media image from: ${imgUrl.substring(0, 60)}...`)
      const imgFetch = await fetch(imgUrl)
      if (imgFetch.ok) {
        const arrayBuf = await imgFetch.arrayBuffer()
        const mimeType = imgFetch.headers.get('content-type') || 'image/jpeg'
        const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg'
        const filename = `scraped-${Date.now()}-${i}.${ext}`

        const formData = new FormData()
        formData.append('file', new Blob([arrayBuf], { type: mimeType }), filename)
        formData.append('_payload', JSON.stringify({
          alt: pfArticle.title,
          caption: pfArticle.title,
        }))

        const mediaRes = await fetch(`${LOCAL_API}/media`, {
          method: 'POST',
          headers: authHeaders,
          body: formData,
        })

        if (mediaRes.ok) {
          const mediaData = await mediaRes.json()
          mediaId = mediaData.doc?.id || mediaData.id
          console.log(`  ✅ Media created with ID: ${mediaId}`)
        } else {
          console.error(`  ⚠️ Media upload failed: ${await mediaRes.text()}`)
        }
      }
    } catch (err) {
      console.warn(`  ⚠️ Could not download/upload image: ${err.message}`)
    }

    // Fallback external media
    if (!mediaId && imgUrl) {
      const extRes = await fetch(`${LOCAL_API}/media`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alt: pfArticle.title,
          source: 'external',
          externalUrl: imgUrl,
        }),
      })
      if (extRes.ok) {
        const extData = await extRes.json()
        mediaId = extData.doc?.id || extData.id
      }
    }

    // Post Article via HTTP REST API
    const articlePayload = {
      title: pfArticle.title,
      slug: pfArticle.slug,
      excerpt: pfArticle.excerpt || '',
      content: pfArticle.content,
      coverImage: mediaId,
      author: authorId,
      isBreaking: !!pfArticle.isBreaking,
      isFeatured: !!pfArticle.isFeatured,
      publishedAt: pfArticle.publishedAt || new Date().toISOString(),
      status: 'published',
    }

    console.log(`  📝 Posting article via HTTP request...`)
    const postRes = await fetch(`${LOCAL_API}/articles`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(articlePayload),
    })

    if (postRes.ok) {
      const postData = await postRes.json()
      console.log(`  ✨ Article seeded successfully! ID: ${postData.doc?.id || postData.id}`)
      successCount++
    } else {
      const errText = await postRes.text()
      console.error(`  ❌ Failed to seed article: ${errText}`)
    }
  }

  console.log(`\n🎉 Scrape & Seed via HTTP Completed!`)
  console.log(`  - Total processed: ${pulefeedArticles.length}`)
  console.log(`  - Successfully seeded: ${successCount}`)
  console.log(`  - Skipped (already exist): ${skippedCount}`)
}

main().catch(err => {
  console.error('Fatal error running scrape script:', err)
  process.exit(1)
})
