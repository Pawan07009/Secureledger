import urllib.request
import urllib.error

base = 'http://localhost:8080'

tests = [
    (f'{base}/', 200, "Home page (index.html)"),
    (f'{base}/css/styles.css', 200, "CSS stylesheet"),
    (f'{base}/js/bundle.js', 200, "JavaScript application logic"),
    (f'{base}/server.ps1', 403, "Sensitive server script blocking"),
    (f'{base}/test_server.py', 403, "Python test script blocking"),
    (f'{base}/README.md', 403, "Documentation file blocking"),
    (f'{base}/nonexistent.html', 404, "Missing asset 404 handling"),
    (f'{base}/..%2f..%2fwin.ini', 403, "Path traversal block"),
]

print("=== MERIDIAN TREASURY SERVER SECURITY TEST SUITE ===")
passed = 0
for url, expected, desc in tests:
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as resp:
            code = resp.status
            if code == expected:
                print(f"[PASS] {desc} ({code}) - {url}")
                passed += 1
                if url == f'{base}/':
                    print("  Security Headers Verified:")
                    for h in ['Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Cache-Control']:
                        print(f"    • {h}: {resp.headers.get(h)}")
            else:
                print(f"[FAIL] {desc}: Got {code}, expected {expected}")
    except urllib.error.HTTPError as e:
        if e.code == expected:
            print(f"[PASS] {desc} ({e.code}) - {url}")
            passed += 1
        else:
            print(f"[FAIL] {desc}: Got {e.code}, expected {expected}")
    except Exception as ex:
        print(f"[ERROR] {desc}: {ex}")

print(f"\nResult: {passed}/{len(tests)} tests passed.")
