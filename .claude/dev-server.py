"""미리보기용 서버 — 파일을 고치면 바로 보이도록 캐시를 끕니다.

python -m http.server 는 캐시 헤더를 보내지 않아서, 브라우저가 html 을
오래 붙들고 있습니다. 그러면 파일을 고쳐도 화면이 그대로여서 헷갈립니다.

POST /_save?name=파일이름 으로 보내면 그 내용을 폴더에 저장합니다.
브라우저에서 만든 그림(캔버스)을 꺼내 볼 때 씁니다. 개발용입니다.
"""
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs


class DevHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        SimpleHTTPRequestHandler.end_headers(self)

    def do_POST(self):
        parts = urlparse(self.path)
        if parts.path != '/_save':
            self.send_error(404)
            return
        name = (parse_qs(parts.query).get('name') or ['_tmp-capture.bin'])[0]
        name = os.path.basename(name)               # 폴더 밖으로 못 나가게
        if not name.startswith('_tmp-'):
            self.send_error(403, 'name must start with _tmp-')
            return
        length = int(self.headers.get('Content-Length', 0))
        data = self.rfile.read(length)
        with open(name, 'wb') as f:
            f.write(data)
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(f'{name} {len(data)}\n'.encode())


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8777
    ThreadingHTTPServer(('127.0.0.1', port), partial(DevHandler)).serve_forever()
