"""Exercise the real automat_fb connector only against our disposable test server."""
import json
import os
from pathlib import Path
import sys
import tempfile

worker = Path(os.environ.get('AUTOMAT_FB_DIR', Path.home() / 'Projects/automat_fb'))
sys.path.insert(0, str(worker))
from backend.services import website_service as web

if len(sys.argv) != 3 or sys.argv[1] != 'http://127.0.0.1:55440':
    raise SystemExit('Use only with the disposable Studio integration server.')

configs = [
    Path(__file__).resolve().parents[1] / 'reel-studio-connection.example.json',
    worker / 'docs/examples/asian-dot-connection.json',
]
for index, config in enumerate(configs):
    with tempfile.TemporaryDirectory(prefix='trend7-connector-test-') as directory:
        root = Path(directory)
        web.ROOT = root / 'connections'
        web.SHARED_MEDIA_DIR = root / 'media'
        web.SHARED_MEDIA_DIR.mkdir()
        (web.SHARED_MEDIA_DIR / 'cover.jpg').write_bytes(Path(sys.argv[2]).read_bytes())
        value = json.loads(config.read_text())
        value.update(baseUrl=sys.argv[1], email='studio-test@example.com', password='test-password-only')
        saved = web.save_connection(web.Connector.model_validate(value))
        request = web.Prepare(
            request_id=('d' if index == 0 else 'e') * 32, connection_id=saved['id'],
            article={'title': f'Trend7News connector test {index}', 'excerpt': 'A disposable integration story.',
                     'content': 'This checks the actual connector.\n\nOnly the test database is used.',
                     'cover_file': 'cover.jpg', 'seo_title': 'Custom Studio SEO'},
            profiles=['test-page-a', 'test-page-b'], post_type='reel', media_file='test.mp4',
            caption='Read the full story', unique_captions=False)
        record = web.prepare(request)
        assert record['ready'] and record['article']['status'] == 'published'
        assert len({item['link'] for item in record['destinations'].values()}) == 2
        assert web.prepare(request) == record
        assert any(article['title'] == request.article.title for article in web.catalog(saved['id'])['articles'])
        print(f'PASS: {value["adapter"]} real login, upload, publishing, unique links, replay and catalog')
