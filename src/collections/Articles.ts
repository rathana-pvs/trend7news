import type { CollectionConfig } from 'payload'
import { lexicalEditor, BlocksFeature } from '@payloadcms/richtext-lexical'
import { VideoEmbed } from '../blocks/VideoEmbed'
import { slugify } from '../lib/utils'
import { revalidateTag } from 'next/cache'

export const Articles: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'views', 'status', 'publishedAt'],
    description: 'News articles published on Trend7News.',
  },
  access: {
    read: ({ req }) => {
      if (req.user) return true
      return { status: { equals: 'published' } }
    },
    create: ({ req }) => !!req.user,
    update: ({ req }) => {
      if (!req.user) return false
      if ((req.user as any).role === 'admin' || (req.user as any).role === 'editor') return true
      return { author: { equals: req.user.id } }
    },
    delete: ({ req }) => (req.user as any)?.role === 'admin',
  },
  hooks: {
    beforeChange: [
      async ({ data }) => {
        if (!data.slug && data.title) {
          const generatedSlug = slugify(data.title)
          data.slug = generatedSlug || `article-${Date.now()}`
        }
        
        if (data.content) {
          const contentStr = JSON.stringify(data.content)
          const wordCount = contentStr.split(/\s+/).length
          data.readTime = Math.max(1, Math.ceil(wordCount / 200))
        }

        if (!data.og) {
          data.og = {}
        }
        data.og.metaTitle = data.title
        data.og.metaDescription = data.excerpt
        data.og.ogImage = data.coverImage

        if (!data.meta) {
          data.meta = {}
        }
        data.meta.title = data.title
        data.meta.description = data.excerpt
        data.meta.image = data.coverImage

        return data
      },
    ],
    afterChange: [
      async ({ doc }) => {
        try {
          revalidateTag('articles')
          if (doc.status === 'published' && doc.slug) {
            const envUrl = process.env.NEXT_PUBLIC_SITE_URL
            const siteUrl = envUrl && !envUrl.includes('placeholder.com') ? envUrl : 'http://localhost:3000'

            fetch(`${siteUrl}/article/${doc.slug}`, { cache: 'no-store' }).catch(() => {})
            fetch(`${siteUrl}/`, { cache: 'no-store' }).catch(() => {})
          }
        } catch (e) {
          // Ignore revalidation errors during seeding/CLI
        }
        
        return doc
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      admin: { position: 'sidebar', description: 'Auto-generated from title.' },
    },
    {
      name: 'aiAssistant',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field: '/src/components/admin/AIAssistant#AIAssistant',
        },
      },
    },
    {
      name: 'shareLink',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field: '/src/components/admin/ShareLink#ShareLink',
        },
      },
    },
    { name: 'excerpt', type: 'textarea', required: true, maxLength: 250 },
    { 
      name: 'content', 
      type: 'richText', 
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          BlocksFeature({
            blocks: [VideoEmbed],
          }),
        ],
      }), 
    },
    { name: 'coverImage', type: 'upload', relationTo: 'media', required: true },
    { name: 'credit', type: 'text', admin: { description: 'News source or attribution (e.g. AP, Reuters, Trend7News).' } },
    { name: 'author', type: 'relationship', relationTo: 'authors', admin: { position: 'sidebar' } },
    { name: 'tags', type: 'array', fields: [{ name: 'tag', type: 'text' }] },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
      defaultValue: 'published',
      admin: { position: 'sidebar' },
    },
    { name: 'isBreaking', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
    { name: 'isFeatured', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
    {
      name: 'publishedAt',
      type: 'date',
      defaultValue: () => new Date(),
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    { name: 'readTime', type: 'number', admin: { position: 'sidebar', description: 'Auto-calculated' } },
    { name: 'views', type: 'number', defaultValue: 0, admin: { position: 'sidebar', description: 'Total visitor page views' } },
    {
      name: 'og',
      label: 'OG',
      type: 'group',
      fields: [
        { name: 'metaTitle', type: 'text' },
        { name: 'metaDescription', type: 'textarea' },
        { name: 'ogImage', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
}
