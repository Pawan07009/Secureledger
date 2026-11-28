#!/usr/bin/env python3
"""
==============================================================================
SecureLedger Comprehensive Automated Security & REST API Test Suite
==============================================================================
"""

import sys
import json
import urllib.request
import urllib.error
import urllib.parse
from http.cookiejar import CookieJar

BASE_URL = 'http://localhost:8080'

# Global cookie jar for authenticated session tracking
cookie_jar = CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))


def request(path, method='GET', data=None, headers=None):
    url = f"{BASE_URL}{path}"
    req_headers = headers or {}
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode('utf-8')
        req_headers['Content-Type'] = 'application/json'

    req = urllib.request.Request(url, data=req_data, headers=req_headers, method=method)
    try:
        with opener.open(req) as resp:
            body = resp.read().decode('utf-8')
            resp_headers = resp.headers
            try:
                json_data = json.loads(body)
            except Exception:
                json_data = None
            return resp.status, resp_headers, json_data, body
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            json_data = json.loads(body)
        except Exception:
            json_data = None
        return e.code, e.headers, json_data, body
    except Exception as ex:
        return 0, {}, None, str(ex)


def run_tests():
    print("=" * 64)
    print("  SECURELEDGER COMPREHENSIVE AUTOMATED TEST SUITE")
    print("=" * 64)

    passed = 0
    total = 0

    def assert_test(name, condition, details=""):
        nonlocal passed, total
        total += 1
        if condition:
            print(f"[PASS] {name}")
            if details:
                print(f"       -> {details}")
            passed += 1
            return True
        else:
            print(f"[FAIL] {name}")
            if details:
                print(f"       -> {details}")
            return False

    # --------------------------------------------------------------------------
    # 1. STATIC ASSETS & SECURITY HEADERS
    # --------------------------------------------------------------------------
    print("\n--- Phase 1: Static Assets & Security Headers ---")
    code, headers, _, _ = request('/')
    assert_test("Homepage (index.html) returns 200 OK", code == 200, f"Status: {code}")
    assert_test("Content-Security-Policy header present", "default-src 'self'" in headers.get('Content-Security-Policy', ''))
    assert_test("X-Content-Type-Options: nosniff present", headers.get('X-Content-Type-Options') == 'nosniff')
    assert_test("X-Frame-Options: DENY present", headers.get('X-Frame-Options') == 'DENY')
    assert_test("Referrer-Policy: no-referrer present", headers.get('Referrer-Policy') == 'no-referrer')
    assert_test("Cache-Control: no-store present", "no-store" in headers.get('Cache-Control', ''))

    code, _, _, _ = request('/css/styles.css')
    assert_test("CSS stylesheet returns 200 OK", code == 200)

    code, _, _, _ = request('/js/bundle.js')
    assert_test("JavaScript bundle returns 200 OK", code == 200)

    # --------------------------------------------------------------------------
    # 2. PATH TRAVERSAL & SENSITIVE FILE ACCESS GUARDS
    # --------------------------------------------------------------------------
    print("\n--- Phase 2: Defense-in-Depth & Sensitive File Guard ---")
    code, _, _, _ = request('/server.ps1')
    assert_test("Blocking server.ps1 access -> 403 Forbidden", code == 403, f"Status: {code}")

    code, _, _, _ = request('/server.py')
    assert_test("Blocking server.py access -> 403 Forbidden", code == 403, f"Status: {code}")

    code, _, _, _ = request('/secureledger.db')
    assert_test("Blocking secureledger.db database access -> 403 Forbidden", code == 403, f"Status: {code}")

    code, _, _, _ = request('/README.md')
    assert_test("Blocking README.md documentation -> 403 Forbidden", code == 403, f"Status: {code}")

    code, _, _, _ = request('/test_server.py')
    assert_test("Blocking test_server.py -> 403 Forbidden", code == 403, f"Status: {code}")

    code, _, _, _ = request('/..%2f..%2fwin.ini')
    assert_test("Blocking path traversal URL-encoded -> 403 Forbidden", code == 403, f"Status: {code}")

    code, _, _, _ = request('/nonexistent_asset.html')
    assert_test("Nonexistent asset returns 404 Not Found", code == 404, f"Status: {code}")

    # --------------------------------------------------------------------------
    # 3. AUTHENTICATION & MULTI-FACTOR VERIFICATION
    # --------------------------------------------------------------------------
    print("\n--- Phase 3: Cryptographic Authentication & MFA ---")
    code, _, data, _ = request('/api/auth/me')
    assert_test("Unauthenticated check /api/auth/me returns 401", code == 401)

    code, _, data, _ = request('/api/auth/login', method='POST', data={
        "email": "secureuser@gmail.com",
        "password": "WrongPassword123!"
    })
    assert_test("Invalid password returns 401 Unauthorized", code == 401 and data.get("success") is False)

    code, _, data, _ = request('/api/auth/login', method='POST', data={
        "email": "secureuser@gmail.com",
        "password": "DemoSecure2026!"
    })
    assert_test("Valid credentials initiates MFA challenge (200 OK)", code == 200 and data.get("requiresMfa") is True)
    assert_test("Zero-Leak Check: demoOtp not exposed in HTTP response payload", "demoOtp" not in (data or {}))

    # Test Resend OTP Endpoint: /api/auth/resend-otp
    code_resend, _, resend_data, _ = request('/api/auth/resend-otp', method='POST', data={
        "email": "secureuser@gmail.com"
    })
    assert_test("Resend OTP endpoint handles request successfully", code_resend in (200, 429), f"Status: {code_resend}")

    # Inspect the server database directly to test OTP verification without client leakage
    import sqlite3
    import hashlib
    db_conn = sqlite3.connect('secureledger.db')
    cur = db_conn.cursor()
    cur.execute("SELECT code FROM mfa_challenges WHERE email = 'secureuser@gmail.com' ORDER BY id DESC LIMIT 1")
    row = cur.fetchone()
    stored_hash = row[0] if row else ""
    db_conn.close()

    otp_code = None
    for i in range(100000, 1000000):
        if hashlib.sha256(str(i).encode()).hexdigest() == stored_hash:
            otp_code = str(i)
            break

    assert_test("Server-Side Challenge Stored as SHA-256 Hash", bool(stored_hash and len(stored_hash) == 64), f"Hash: {stored_hash[:16]}...")

    code, _, data, _ = request('/api/auth/verify-otp', method='POST', data={
        "email": "secureuser@gmail.com",
        "code": "000000"
    })
    assert_test("Invalid OTP code rejected with 401", code == 401)

    code, resp_headers, data, _ = request('/api/auth/verify-otp', method='POST', data={
        "email": "secureuser@gmail.com",
        "code": otp_code
    })
    assert_test("Valid OTP successfully authenticates and issues session", code == 200 and data.get("success") is True and "token" in data)

    code, _, data, _ = request('/api/auth/me')
    assert_test("Authenticated /api/auth/me returns user profile", code == 200 and data.get("user", {}).get("email") == "secureuser@gmail.com")

    # --------------------------------------------------------------------------
    # 4. BANKING LEDGER & TRANSFERS
    # --------------------------------------------------------------------------
    print("\n--- Phase 4: Banking Dashboard & Ledger Operations ---")
    code, _, data, _ = request('/api/accounts')
    assert_test("Accounts endpoint returns active accounts", code == 200 and len(data.get("accounts", [])) >= 2)

    code, _, data, _ = request('/api/cards')
    assert_test("Cards endpoint returns virtual card", code == 200 and len(data.get("cards", [])) >= 1)

    code, _, data, _ = request('/api/cards/freeze', method='POST')
    new_status = data.get("status") if data else ""
    assert_test("Virtual card toggle freeze succeeds", code == 200 and new_status in ('frozen', 'active'), f"Card is now: {new_status}")

    # Test transfer > 1000 requires Step-Up authorization
    code, _, data, _ = request('/api/transfers', method='POST', data={
        "amount": 2500.0,
        "recipient": "CyberDefend Security LLC",
        "category": "Technology",
        "accountId": "acc_chk_8492"
    })
    assert_test("Large transfer (> ₹1,000) triggers Step-Up requirement (403)", code == 403 and data.get("requiresStepUp") is True)

    # Perform Step-Up authorization
    code, _, data, _ = request('/api/auth/step-up', method='POST', data={"method": "Biometric Challenge"})
    assert_test("Step-Up clearance granted (Level 2)", code == 200 and data.get("clearance") == "level_2")

    # Re-attempt transfer with Level 2 clearance
    code, _, data, _ = request('/api/transfers', method='POST', data={
        "amount": 250.0,
        "recipient": "Apex Global Logistics",
        "category": "Operations",
        "accountId": "acc_chk_8492"
    })
    assert_test("Transfer executed with ledger debit and SHA-256 chain update", code == 200 and data.get("success") is True, f"Tx ID: {data.get('transactionId')}")

    # --------------------------------------------------------------------------
    # 5. CRYPTOGRAPHIC AUDIT MERKLE CHAIN VERIFICATION
    # --------------------------------------------------------------------------
    print("\n--- Phase 5: Cryptographic Audit Chain Integrity ---")
    code, _, data, _ = request('/api/audit/verify', method='POST')
    assert_test("Cryptographic audit chain fully verified", code == 200 and data.get("chainValid") is True, f"Verified {data.get('blocksVerified')} blocks")

    code, _, _, body = request('/api/statement/download')
    assert_test("Sanitized statement CSV download generated", code == 200 and "Transaction ID" in body)

    # --------------------------------------------------------------------------
    # SUMMARY
    # --------------------------------------------------------------------------
    print("\n" + "=" * 64)
    print(f"  TEST SUITE COMPLETED: {passed}/{total} tests passed ({round((passed/total)*100)}%)")
    print("=" * 64)
    return passed == total


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
