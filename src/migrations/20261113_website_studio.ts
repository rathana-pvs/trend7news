import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS studio_publications (
      id serial PRIMARY KEY NOT NULL,
      studio_key varchar NOT NULL,
      fingerprint varchar NOT NULL,
      article_id integer REFERENCES articles(id) ON DELETE SET NULL,
      owner_id integer REFERENCES users(id) ON DELETE SET NULL,
      updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
      created_at timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS studio_publications_studio_key_idx ON studio_publications (studio_key);
    CREATE INDEX IF NOT EXISTS studio_publications_article_idx ON studio_publications (article_id);
    CREATE INDEX IF NOT EXISTS studio_publications_owner_idx ON studio_publications (owner_id);
    ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS studio_publications_id integer REFERENCES studio_publications(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_studio_publications_id_idx ON payload_locked_documents_rels (studio_publications_id);
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS studio_key varchar;
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS studio_fingerprint varchar;
    ALTER TABLE media ADD COLUMN IF NOT EXISTS studio_key varchar;
    ALTER TABLE share_links ADD COLUMN IF NOT EXISTS studio_key varchar;
    CREATE UNIQUE INDEX IF NOT EXISTS articles_studio_key_idx ON articles (studio_key);
    CREATE UNIQUE INDEX IF NOT EXISTS media_studio_key_idx ON media (studio_key);
    CREATE UNIQUE INDEX IF NOT EXISTS share_links_studio_key_idx ON share_links (studio_key);
  `)
}
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE payload_locked_documents_rels DROP COLUMN studio_publications_id;
    DROP TABLE studio_publications;
    ALTER TABLE articles DROP COLUMN studio_key, DROP COLUMN studio_fingerprint;
    ALTER TABLE media DROP COLUMN studio_key;
    ALTER TABLE share_links DROP COLUMN studio_key;
  `)
}
