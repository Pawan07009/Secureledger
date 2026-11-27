#!/usr/bin/env python3
"""
==============================================================================
SecureLedger - Secure Static & Network Development Server
==============================================================================
Features:
- Binds to 0.0.0.0 for access across Localhost and Mobile/LAN devices.
- Multi-threaded (ThreadingHTTPServer) for concurrent asset delivery.
- Path traversal guard (blocks ../, directory climbing -> 403 Forbidden).
- Blocks access to server scripts, configs, documentation, and hidden files (403 Forbidden).
- Strict whitelist of approved public web MIME types (404 for unknown extensions).
- Enforces Content-Security-Policy (CSP) matching server.ps1.
- Adds X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Cache-Control.
- Automatically discovers and displays the LAN IP for mobile phone connection.
==============================================================================
"""

import os
import sys
import argparse
import socket
import urllib.parse
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
}

FORBIDDEN_FILES = {
    'server.ps1',
    'server.py',
    'test_server.py',
    'readme.md',
    '.env',
    '.gitignore',
}

FORBIDDEN_EXTENSIONS = {
    '.ps1',
    '.py',
    '.md',
    '.zip',
    '.env',
    '.config',
    '.bak',
    '.log',
    '.sh',
}

CSP_POLICY = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com; "
    "img-src 'self' data:; "
    "connect-src 'self'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "frame-ancestors 'none'"
)


class SecureRequestHandler(BaseHTTPRequestHandler):
    server_version = "SecureLedgerServer/3.0"

    def set_security_headers(self):
        self.send_header("Content-Security-Policy", CSP_POLICY)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

    def do_HEAD(self):
        self.handle_request(is_head=True)

    def do_GET(self):
        self.handle_request(is_head=False)

    def handle_request(self, is_head=False):
        parsed = urllib.parse.urlsplit(self.path)
        raw_path = urllib.parse.unquote(parsed.path)

        if raw_path in ('', '/'):
            raw_path = '/index.html'

        root_dir = os.path.abspath(self.server.root_dir)
        rel_path = raw_path.lstrip('/').replace('/', os.sep)
        full_path = os.path.abspath(os.path.join(root_dir, rel_path))

        # 1. Path traversal guard
        if not full_path.startswith(root_dir + os.sep) and full_path != root_dir:
            self.send_error_response(403, "Forbidden: Path traversal detected and blocked.")
            return

        file_name = os.path.basename(full_path).lower()
        file_ext = os.path.splitext(full_path)[1].lower()

        # 2. Sensitive files protection
        if (
            file_name in FORBIDDEN_FILES
            or file_name.startswith('.')
            or file_ext in FORBIDDEN_EXTENSIONS
        ):
            self.send_error_response(403, "Forbidden: Access to configuration and script files is restricted.")
            return

        # 3. Whitelisted MIME check and file existence
        if not os.path.isfile(full_path) or file_ext not in MIME_TYPES:
            self.send_error_response(404, "404 Not Found")
            return

        # 4. Read and serve asset
        try:
            with open(full_path, 'rb') as f:
                content = f.read()

            self.send_response(200)
            self.send_header("Content-Type", MIME_TYPES[file_ext])
            self.send_header("Content-Length", str(len(content)))
            self.set_security_headers()
            self.end_headers()

            if not is_head:
                self.wfile.write(content)
        except Exception as e:
            self.send_error_response(500, f"Internal Server Error: {str(e)}")

    def send_error_response(self, code, message):
        body = message.encode('utf-8')
        self.send_response(code)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.set_security_headers()
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        client_ip = self.client_address[0]
        timestamp = self.log_date_time_string()
        msg = format % args
        sys.stderr.write(f"[{timestamp}] [{client_ip}] {msg}\n")


def get_lan_ip():
    """Detect the local machine's IP address on the primary network interface."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'


def main():
    parser = argparse.ArgumentParser(description="SecureLedger Development Server")
    parser.add_argument("-p", "--port", type=int, default=8080, help="Port to listen on (default: 8080)")
    parser.add_argument("-b", "--bind", default="0.0.0.0", help="Address to bind to (default: 0.0.0.0 for LAN access)")
    parser.add_argument("-d", "--dir", default=os.path.dirname(os.path.abspath(__file__)), help="Root directory")
    args = parser.parse_args()

    lan_ip = get_lan_ip()

    try:
        httpd = ThreadingHTTPServer((args.bind, args.port), SecureRequestHandler)
        httpd.root_dir = args.dir
    except OSError as e:
        sys.stderr.write(f"[ERROR] Could not start server on port {args.port}: {e}\n")
        sys.stderr.write("Try specifying a different port: python server.py --port 8081\n")
        sys.exit(1)

    print("=" * 60)
    print("  SecureLedger - Secure Banking Simulation Server")
    print("=" * 60)
    print(f" Serving Directory : {args.dir}")
    print(f" Desktop (Local)   : http://localhost:{args.port}/")
    print(f" Phone / Mobile    : http://{lan_ip}:{args.port}/")
    print(f" Network Bind      : {args.bind}:{args.port} (All Interfaces)")
    print(f" CSP Enforced      : True")
    print(" Press Ctrl+C to stop the server.")
    print("-" * 60)
    sys.stdout.flush()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[INFO] Server shutting down gracefully...")
    finally:
        httpd.server_close()
        print("[INFO] Server stopped.")


if __name__ == '__main__':
    main()
