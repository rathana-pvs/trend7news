const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

function load(file, mocks = {}) {
  const filename = path.join(__dirname, '..', file);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
  });
  assert.equal(source.diagnostics.length, 0);
  const module = { exports: {} };
  vm.runInNewContext(source.outputText, { module, exports: module.exports,
    require: name => Object.hasOwn(mocks, name) ? mocks[name] : require(name),
    Request, Response, File, URL, Buffer, process, console, setTimeout,
  }, { filename });
  return module.exports;
}
function setup() {
  let user = { id: 7, role: 'editor' };
  const data = { articles: [], media: [], 'share-links': [], 'studio-publications': [], categories: [], authors: [] };
  const calls = [];
  const payload = {
    auth: async () => ({ user }),
    find: async args => {
      calls.push(['find', args]);
      let docs = data[args.collection];
      const where = args.where;
      if (where?.studioKey) docs = docs.filter(doc => doc.studioKey === where.studioKey.equals);
      if (where?.and) for (const filter of where.and) for (const [key, value] of Object.entries(filter)) docs = docs.filter(doc => String(doc[key]) === String(value.equals));
      return { docs };
    },
    findByID: async args => {
      calls.push(['findByID', args]);
      const doc = data[args.collection].find(doc => String(doc.id) === String(args.id));
      if (!doc) throw new Error('Not found');
      return doc;
    },
    create: async args => {
      calls.push(['create', args]);
      const doc = { id: data[args.collection].length + 1, ...args.data };
      if (args.collection === 'articles') doc.slug ||= 'park-news';
      if (args.collection === 'share-links') doc.key = `key${doc.id}`;
      data[args.collection].push(doc);
      return doc;
    },
    update: async args => {
      calls.push(['update', args]);
      if (user.role === 'writer') throw new Error('No update permission');
      const index = data[args.collection].findIndex(doc => String(doc.id) === String(args.id));
      if (index < 0) throw new Error('Not found');
      return data[args.collection][index] = { ...data[args.collection][index], ...args.data };
    },
  };
  const route = load('src/app/api/studio/route.ts', { '@/lib/payload': { getPayloadClient: async () => payload } });
  const send = input => route.POST(new Request('http://localhost:3000/api/studio', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  }));
  return { route, send, data, calls, user: value => { user = value; } };
}
const article = { title: 'Park proposal', excerpt: 'Residents discuss the proposed changes.', content: 'The council explained its proposal.\n\nResidents discussed the next steps.',
  cover_id: '1', seo_title: 'Custom SEO title', seo_description: 'Custom SEO description' };
const input = () => ({ action: 'publish', requestId: 'a'.repeat(32), article: { ...article } });

test('unauthenticated Studio reads and writes are rejected', async () => {
  const app = setup(); app.user(null);
  assert.equal((await app.route.GET(new Request('http://localhost/api/studio'))).status, 401);
  assert.equal((await app.send(input())).status, 401);
  assert.equal(app.calls.length, 0);
});

test('writers cannot access Studio catalog or publish new articles', async () => {
  const app = setup(); app.user({ id: 8, role: 'writer' });
  assert.equal((await app.route.GET(new Request('http://localhost/api/studio'))).status, 403);
  assert.equal((await app.send(input())).status, 403);
  assert.equal(app.calls.length, 0);
});

test('publication is always published, stores SEO and rich text, and deduplicates retries', async () => {
  const app = setup();
  const result = await app.send(input());
  assert.equal(result.status, 200);
  const output = await result.json();
  assert.equal(output.status, 'published');
  assert.match(output.url, /\/article\/park-news$/);
  assert.equal(app.data.articles[0].meta.title, article.seo_title);
  assert.equal(app.data.articles[0].content.root.children.length, 2);
  assert.equal(app.data.articles[0].isBreaking, false);
  assert.equal(app.data.articles[0].isFeatured, false);
  assert.equal((await app.send(input())).status, 200);
  assert.equal(app.data.articles.length, 1);
  assert.equal(app.data['studio-publications'].length, 1);
  for (const [operation, args] of app.calls) {
    if (['create', 'update', 'findByID'].includes(operation)) {
      assert.equal(args.overrideAccess, false);
      assert.equal(args.user.id, 7);
    }
  }
});

test('request IDs reject altered content and keep receipts after subsequent article updates', async () => {
  const app = setup();
  await app.send(input());
  assert.equal((await app.send({ ...input(), article: { ...article, title: 'Different story' } })).status, 409);
  const update = { action: 'publish', requestId: 'b'.repeat(32), article: { ...article, id: '1', title: 'Updated proposal' } };
  assert.equal((await app.send(update)).status, 200);
  assert.equal((await app.send(input())).status, 200);
  assert.equal(app.data.articles.length, 1);
  assert.equal(app.data.articles[0].title, 'Updated proposal');
});

test('each destination link is distinct and retries reuse its key', async () => {
  const app = setup(); await app.send(input());
  const sendLink = id => app.send({ action: 'link', requestId: id.repeat(64), articleId: '1', label: 'Facebook page' });
  const first = await (await sendLink('c')).json();
  const second = await (await sendLink('d')).json();
  assert.notEqual(first.url, second.url);
  assert.equal((await (await sendLink('c')).json()).url, first.url);
  assert.equal(app.data['share-links'].length, 2);
  app.data.articles[0].status = 'draft';
  assert.equal((await sendLink('e')).status, 400);
});

test('existing article permission failures cannot create tracking links', async () => {
  const app = setup(); await app.send(input()); app.user({ id: 8, role: 'writer' });
  const response = await app.send({ action: 'publish', requestId: 'b'.repeat(32), article: { ...article, id: '1' } });
  assert.equal(response.status, 403);
  assert.equal(app.data['share-links'].length, 0);
  assert.doesNotMatch(await response.text(), /No update permission/);
});

test('anonymous publication check and catalog return supported adapter', async () => {
  const app = setup(); await app.send(input());
  const catalog = await (await app.route.GET(new Request('http://localhost/api/studio'))).json();
  assert.equal(catalog.adapter, 'payload-news-v1');
  assert.equal(catalog.categories.length, 0);
  assert.equal(catalog.articles[0].content, article.content);
  assert.equal((await (await app.route.GET(new Request('http://localhost/api/studio?published=1'))).json()).published, true);
  app.data.articles[0].status = 'archived';
  assert.equal((await (await app.route.GET(new Request('http://localhost/api/studio?published=1'))).json()).published, false);
});

test('invalid requests cannot publish articles or reuse links for a different article', async () => {
  const app = setup();
  assert.equal((await app.send({ ...input(), requestId: 'invalid' })).status, 400);
  assert.equal((await app.send({ ...input(), article: { ...article, excerpt: 'x'.repeat(161) } })).status, 400);
  await app.send(input());
  await app.send({ action: 'link', requestId: 'c'.repeat(32), articleId: '1' });
  await app.send({ ...input(), requestId: 'b'.repeat(32) });
  assert.equal((await app.send({ action: 'link', requestId: 'c'.repeat(32), articleId: '2' })).status, 400);
  assert.equal(app.data['share-links'].length, 1);
});

test('unchanged article body preserves rich text and editorial flags', async () => {
  const app = setup(); await app.send(input());
  const saved = app.data.articles[0];
  saved.content.root.children[0].children[0].format = 1;
  saved.isBreaking = true; saved.isFeatured = true;
  const originalBody = JSON.stringify(saved.content);
  await app.send({ action: 'publish', requestId: 'b'.repeat(32), article: { ...article, id: '1', title: 'Updated headline' } });
  assert.equal(JSON.stringify(app.data.articles[0].content), originalBody);
  assert.equal(app.data.articles[0].isBreaking, true);
  assert.equal(app.data.articles[0].isFeatured, true);
});

test('public lookup hides drafts and rejects mismatched tracking keys', async () => {
  const docs = [
    { id: 1, slug: 'published-story', status: 'published' },
    { id: 2, slug: 'draft-story', status: 'draft' },
  ];
  const links = [{ key: 'good-key', article: 1 }, { key: 'draft-key', article: 2 }];
  const payload = {
    find: async ({ collection, where }) => ({ docs: (collection === 'articles' ? docs : links)
      .filter(doc => Object.entries(where).every(([key, filter]) => String(doc[key]) === String(filter.equals))) }),
    findByID: async ({ id }) => docs.find(doc => doc.id === id),
  };
  const previous = process.env.DATABASE_URI;
  process.env.DATABASE_URI = 'postgresql://unused/test';
  let api;
  try {
    api = load('src/lib/api-server.ts', {
      './payload': { getPayloadClient: async () => payload },
      './image': { normalizeImageUrl: value => value },
      'next/cache': { unstable_cache: fn => fn },
    });
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URI;
    else process.env.DATABASE_URI = previous;
  }
  assert.equal(await api.getArticle('draft-story'), null);
  assert.equal(await api.getArticle('2'), null);
  assert.equal(await api.getArticle('draft-key'), null);
  assert.equal((await api.getTrackedArticle('good-key', 'published-story')).id, 1);
  assert.equal(await api.getTrackedArticle('wrong-key', 'published-story'), null);
  assert.equal(await api.getTrackedArticle('good-key', 'draft-story'), null);
});

test('article hook preserves independent SEO on saves and partial updates', async () => {
  const { Articles } = load('src/collections/Articles.ts', {
    '@payloadcms/richtext-lexical': { lexicalEditor: () => ({}), BlocksFeature: () => ({}) },
    '../blocks/VideoEmbed': { VideoEmbed: {} }, '../lib/utils': { slugify: value => value.toLowerCase().replace(/\s+/g, '-') },
    'next/cache': { revalidateTag: () => {} },
  });
  const hook = Articles.hooks.beforeChange[0];
  const custom = await hook({ data: { title: 'Article title', excerpt: 'Article excerpt', coverImage: 1,
    og: { metaTitle: 'Search title', metaDescription: 'Search description' }, meta: { title: 'Search title' } } });
  assert.equal(custom.og.metaTitle, 'Search title');
  assert.equal(custom.meta.title, 'Search title');
  const partial = await hook({ data: { status: 'published' }, originalDoc: custom });
  assert.equal(partial.og.metaTitle, 'Search title');
  assert.equal(partial.og.ogImage, 1);
  assert.equal(partial.meta.description, 'Article excerpt');
});
