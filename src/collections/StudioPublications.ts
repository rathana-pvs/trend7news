import type { CollectionConfig } from 'payload'

/** Durable receipts survive later article updates and lost HTTP responses. */
export const StudioPublications: CollectionConfig = {
  slug: 'studio-publications',
  admin: { hidden: true },
  access: {
    read: ({ req }) => req.user ? { owner: { equals: req.user.id } } : false,
    create: ({ req }) => Boolean(req.user),
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'studioKey', type: 'text', unique: true, required: true },
    { name: 'fingerprint', type: 'text', required: true },
    { name: 'article', type: 'relationship', relationTo: 'articles' },
    { name: 'owner', type: 'relationship', relationTo: 'users',
      hooks: { beforeChange: [({ req }) => req.user?.id] } },
  ],
}
