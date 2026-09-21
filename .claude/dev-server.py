"""미리보기용 서버 — 파일을 고치면 바로 보이도록 캐시를 끕니다.

python -m http.server 는 캐시 헤더를 보내지 않아서, 브라우저가 html 을
오래 붙들고 있습니다. 그러면 파일을 고쳐도 화면이 그대로여서 헷갈립니다.
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        SimpleHTTPRequestHandler.end_headers(self)


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8777
    ThreadingHTTPServer(('127.0.0.1', port), partial(NoCacheHandler)).serve_forever()
