import { getPayload } from 'payload'
import config from '../../payload.config'
import { mockArticles, mockAuthors } from './mockData'

const seed = async () => {
  const payload = await getPayload({ config })

  console.log('--- Clearing Existing Data ---')
  await payload.delete({
    collection: 'articles',
    where: { id: { exists: true } },
  })
  await payload.delete({
    collection: 'media',
    where: { id: { exists: true } },
  })
  
  console.log('--- Seeding Authors ---')
  const authorMap: Record<string, string | number> = {}
  for (const author of mockAuthors) {
    const existing = await payload.find({
      collection: 'authors',
      where: { slug: { equals: author.slug } },
    })

    const data = {
      name: author.name || '',
      slug: author.slug || '',
      bio: author.bio || '',
      role: author.role || '',
      twitter: author.twitter || '',
    }

    if (existing.docs.length === 0) {
      const created = await payload.create({
        collection: 'authors',
        data,
        draft: false,
      })
      authorMap[author.slug!] = created.id
      console.log(`Created author: ${author.name}`)
    } else {
      const updated = await payload.update({
        collection: 'authors',
        id: existing.docs[0].id,
        data,
        draft: false,
      })
      authorMap[author.slug!] = updated.id
      console.log(`Updated author: ${author.name}`)
    }
  }

  console.log('--- Seeding Articles ---')
  for (const article of mockArticles) {
    const existing = await payload.find({
      collection: 'articles',
      where: { slug: { equals: article.slug } },
    })

    const articleData: any = {
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      content: {
        root: {
          type: 'root',
          format: '',
          indent: 0,
          version: 1,
          children: [
            {
              type: 'paragraph',
              format: '',
              indent: 0,
              version: 1,
              children: [{ type: 'text', text: article.excerpt, version: 1 }],
            },
          ],
        },
      },
      status: 'published',
      publishedAt: article.publishedAt as string,
      isBreaking: article.isBreaking,
      isFeatured: article.isFeatured,
      author: authorMap[article.author?.slug as string],
    }

    if (existing.docs.length === 0) {
      const mockImageUrl = (article.coverImage as any)?.url
      const isExternal = mockImageUrl?.startsWith('http')

      const mediaData: any = {
        alt: article.title,
        source: isExternal ? 'external' : 'local',
      }

      if (isExternal) {
        mediaData.externalUrl = mockImageUrl
      }

      const media = await payload.create({
        collection: 'media',
        data: mediaData,
        file: {
          data: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA6ie6hQAAAABJRU5ErkJggg==', 'base64'),
          name: isExternal ? `external-${Date.now()}-${Math.floor(Math.random()*1000)}.png` : 'placeholder.png',
          mimetype: 'image/png',
          size: 70,
        },
      })
      articleData.coverImage = media.id

      await payload.create({
        collection: 'articles',
        data: articleData,
        draft: false,
      })
      console.log(`Created article: ${article.title}`)
    } else {
      const doc = existing.docs[0]
      const mockImageUrl = (article.coverImage as any)?.url
      const isExternal = mockImageUrl?.startsWith('http')
      
      const mediaId = typeof doc.coverImage === 'object' ? (doc.coverImage as any).id : doc.coverImage

      if (mediaId) {
        await payload.update({
          collection: 'media',
          id: mediaId,
          data: {
            externalUrl: isExternal ? mockImageUrl : undefined,
            source: isExternal ? 'external' : 'local',
          },
        })
      }

      await payload.update({
        collection: 'articles',
        id: doc.id,
        data: articleData,
        draft: false,
      })
      console.log(`Updated article record: ${article.title}`)
    }
  }

  console.log('--- Creating Admin User ---')
  const existingAdmin = await payload.find({
    collection: 'users',
    where: { email: { equals: 'admin@trend7news.com' } },
  })

  if (existingAdmin.docs.length === 0) {
    await payload.create({
      collection: 'users',
      data: {
        email: 'admin@trend7news.com',
        password: 'adminpassword123',
        name: 'Trend7News Admin',
        role: 'admin',
      },
    })
    console.log('Created admin user: admin@trend7news.com / adminpassword123')
  }

  console.log('Seed completed successfully!')
  process.exit(0)
}

seed()
