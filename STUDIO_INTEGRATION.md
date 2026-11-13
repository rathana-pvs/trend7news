# Connect Trend7News to automat_fb

Trend7News implements the same `payload-news-v1` Studio API as `news_website`.
The existing automat_fb desktop app can publish or update an article, upload its
cover, verify publication, and create a separate tracking link for each account.
No changes to automat_fb are required.

## Setup

1. For an existing production database, apply `20261113_website_studio` from this
   project with `npx payload migrate` before restarting the updated application.
   This migration extends existing CMS tables; it does not bootstrap an empty
   production database. Local development uses Payload schema synchronization.
2. Set `NEXT_PUBLIC_SITE_URL` to the website's actual origin and configure the
   database and `PAYLOAD_SECRET` as usual.
3. Import `reel-studio-connection.example.json` in automat_fb under
   **Settings → Websites → Upload website JSON**. For local development, change
   `baseUrl` to `http://localhost:3000` (or your actual localhost port). Production
   connections use HTTPS.
4. Enter an existing CMS **editor or admin** email and password, then select
   **Test connection & save**. The example contains no credentials. If you save a
   credential-filled copy, use the Git-ignored `reel-studio-connection.json`.
5. In a Photo, Reel, or Live composer, enable **Read more**, select Trend7News,
   choose an existing article or enter a new article and cover, and review it.
   Select **Publish article & create links**, then post or schedule Facebook work.

Publishing the article happens immediately during preparation, even when the
Facebook post is scheduled later. Photo/Reel use first comments; Live uses the
desktop app's existing comment-after-end flow. Optional caption generation is
controlled by automat_fb and its own AI configuration.

## API and behavior

Login uses Payload's `POST /api/users/login`; subsequent requests use
`Authorization: JWT <token>`. Studio requires an editor/admin and passes the user
to CMS mutations with access checks enabled.

- `GET /api/studio`: adapter ID, latest 100 articles, authors, and an empty
  categories list. Trend7News has no categories collection.
- `GET /api/studio?published=<id>`: checks anonymous visibility of a published
  article.
- `POST /api/studio`: `action: publish`, `requestId`, and `article`. Accepts JSON
  when using an existing `cover_id`, or multipart with a `payload` JSON field and
  optional `file`. Covers accept JPEG, PNG, WebP, or AVIF up to 20 MB. Required
  fields are title, excerpt (up to 160 characters), plain body text, and a cover.
  Supply `article.id` to update an existing article. Optional fields include
  author, tags, credit, slug, alt text, `seo_title`, and `seo_description`.
- `POST /api/studio`: `action: link`, `requestId`, `articleId`, optional `label`.
  Returns `/article/<tracking-key>/<article-slug>`.

Request IDs contain 32–64 lowercase hexadecimal characters and are scoped to
the authenticated CMS user. Repeated requests reuse the publication/cover/link;
changed publication input under the same request ID returns a conflict. Durable
receipts let retries reconcile even after a later edit. New Studio articles are
published without marking them Breaking or Featured; existing editorial flags
are retained. Custom SEO is preserved. An unchanged body retains its Lexical
formatting and embeds; edited plain text becomes paragraphs.

Tracking pages validate that the key belongs to the requested published article
and use the main article URL as canonical. View tracking checks the article/key
association when incrementing link clicks. Public article lookups exclude drafts
and archived articles.

The version 2 `http-json-v1` schema connector also works with this API, following
the existing news_website schema. Keep category empty. The included simple
connection JSON is sufficient for normal use.

## Tests

Offline API, permission, retry, SEO, and public lookup checks:

```sh
npm run test:studio
npx tsc --noEmit --incremental false
```

Real Payload/PostgreSQL and Python connector tests use only a disposable database
on port 55439, a temporary HTTP server on 55440, and temporary media/connections.
They do not contact Facebook or use the application's normal database. Both
ports must be free. Use a fresh container for each run:

```sh
docker run --rm -d --name trend7news-studio-test-db --memory=512m -p 127.0.0.1:55439:5432 -e POSTGRES_USER=studio_test -e POSTGRES_PASSWORD=studio-test-only -e POSTGRES_DB=studio_test postgres:15-alpine
docker exec trend7news-studio-test-db pg_isready -U studio_test
npx tsx test/studio.integration.ts
docker stop trend7news-studio-test-db
```

The Python checkout defaults to `~/Projects/automat_fb`; set `AUTOMAT_FB_DIR` if
it lives elsewhere. Its `automation/venv/bin/python` and dependencies must exist.
The tests check the actual migration down/up, login, image upload, publication,
SEO, unique links and retries, and both connector formats over real HTTP.
