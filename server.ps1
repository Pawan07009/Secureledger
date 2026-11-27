<#
.SYNOPSIS
    Secure static development server for SecureLedger banking simulation.

.DESCRIPTION
    Serves approved web assets strictly on localhost (<Port>).
    Security features:
    - Path traversal guard (blocks ../, directory climbing, and URL-encoded traversal -> 403 Forbidden).
    - Blocks access to server scripts, configs, docs, and hidden files -> 403 Forbidden.
    - Strict whitelist of approved public web MIME types -> 404 for non-whitelisted extensions.
    - Enforced Content-Security-Policy (CSP) without 'unsafe-inline' for scripts.
    - Security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Cache-Control, Permissions-Policy.
    - Request and audit access logging with ANSI color coding and timestamps.
    - Graceful port conflict handling and Ctrl+C cancellation via asynchronous event loop.

.PARAMETER Port
    Port to listen on. Default 5500.

.PARAMETER Root
    Root directory to serve. Default: script directory.

.PARAMETER EnforceCsp
    Whether to enforce strict CSP. Defaults to $true.

.EXAMPLE
    .\server.ps1
    .\server.ps1 -Port 8080
#>
param(
    [int]$Port = 5500,
    [string]$Root = $PSScriptRoot,
    [bool]$EnforceCsp = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$sep = [System.IO.Path]::DirectorySeparatorChar
$script:Root = [System.IO.Path]::GetFullPath($Root).TrimEnd('\', '/') + $sep

# Strict whitelist of approved public web assets and MIME types
$script:MimeTypes = @{
    '.html'        = 'text/html; charset=utf-8'
    '.css'         = 'text/css; charset=utf-8'
    '.js'          = 'text/javascript; charset=utf-8'
    '.mjs'         = 'text/javascript; charset=utf-8'
    '.json'        = 'application/json; charset=utf-8'
    '.webmanifest' = 'application/manifest+json'
    '.svg'         = 'image/svg+xml'
    '.png'         = 'image/png'
    '.jpg'         = 'image/jpeg'
    '.jpeg'        = 'image/jpeg'
    '.webp'        = 'image/webp'
    '.ico'         = 'image/x-icon'
    '.woff'        = 'font/woff'
    '.woff2'       = 'font/woff2'
}

# Explicitly forbidden sensitive files & patterns
$script:ForbiddenFiles = @(
    'server.ps1',
    'server.py',
    'secureledger.db',
    'readme.md',
    'files.zip',
    'package.json',
    'package-lock.json',
    'test_server.py',
    'web.config',
    '.env',
    '.gitignore',
    '.gitattributes'
)

# Content Security Policy (strict script-src 'self', no inline scripts)
$cspValue = "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
            "font-src 'self' https://fonts.gstatic.com; " +
            "img-src 'self' data:; " +
            "connect-src 'self'; " +
            "base-uri 'self'; " +
            "form-action 'self'; " +
            "frame-ancestors 'none'"
$cspHeader = if ($EnforceCsp) { 'Content-Security-Policy' } else { 'Content-Security-Policy-Report-Only' }

function Set-CommonHeaders($response) {
    $response.Headers.Set('Cache-Control', 'no-store, no-cache, must-revalidate')
    $response.Headers.Set('Pragma', 'no-cache')
    $response.Headers.Set('X-Content-Type-Options', 'nosniff')
    $response.Headers.Set('X-Frame-Options', 'DENY')
    $response.Headers.Set('Referrer-Policy', 'no-referrer')
    $response.Headers.Set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    $response.Headers.Set($cspHeader, $cspValue)
}

function Send-Text($response, [int]$code, [string]$text) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
    $response.StatusCode = $code
    $response.ContentType = 'text/plain; charset=utf-8'
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
}

function Invoke-Request($context) {
    $request  = $context.Request
    $response = $context.Response
    Set-CommonHeaders $response

    if ($request.HttpMethod -notin @('GET', 'HEAD')) {
        $response.Headers.Set('Allow', 'GET, HEAD')
        Send-Text $response 405 'Method Not Allowed'
        return 405
    }

    try {
        $urlPath = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
        if ($urlPath -eq '/' -or [string]::IsNullOrWhiteSpace($urlPath)) {
            $urlPath = '/index.html'
        }
        $relative = $urlPath.TrimStart('/').Replace('/', $sep)
        $fullPath = [System.IO.Path]::GetFullPath((Join-Path $script:Root $relative))
    }
    catch {
        Send-Text $response 400 'Bad Request: Malformed URI path'
        return 400
    }

    # 1. Path traversal protection: Path must resolve inside the root directory
    if (-not $fullPath.StartsWith($script:Root, [System.StringComparison]::OrdinalIgnoreCase)) {
        Send-Text $response 403 'Forbidden: Path traversal detected and blocked.'
        return 403
    }

    # 2. Sensitive files protection: Block direct access to server scripts, configs, README, etc.
    $fileName = [System.IO.Path]::GetFileName($fullPath).ToLowerInvariant()
    $fileExt  = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()

    if ($fileName -in $script:ForbiddenFiles -or $fileName.StartsWith('.') -or $fileExt -in @('.ps1', '.py', '.md', '.zip', '.env', '.config', '.bak', '.db', '.sqlite', '.sqlite3', '.log')) {
        Send-Text $response 403 'Forbidden: Access to server configuration and documentation files is restricted.'
        return 403
    }

    # 3. Whitelisted public web asset check
    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf) -or -not $script:MimeTypes.ContainsKey($fileExt)) {
        Send-Text $response 404 '404 Not Found'
        return 404
    }

    $bytes = [System.IO.File]::ReadAllBytes($fullPath)
    $response.StatusCode = 200
    $response.ContentType = $script:MimeTypes[$fileExt]
    $response.ContentLength64 = $bytes.Length
    if ($request.HttpMethod -ne 'HEAD') {
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    return 200
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"

try {
    $listener.Prefixes.Add($prefix)
    $listener.Start()
}
catch {
    Write-Host "[ERROR] Could not start server on port $Port. The port may already be in use or requires elevation." -ForegroundColor Red
    Write-Host "Detailed Exception: $($_.Exception.Message)" -ForegroundColor DarkGray
    Write-Host "Try running on an alternate port: .\server.ps1 -Port 8080" -ForegroundColor Yellow
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  SecureLedger - Secure Banking Simulation Server" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Serving Path : $($script:Root)" -ForegroundColor Gray
Write-Host " Endpoint     : $prefix" -ForegroundColor Green
Write-Host " CSP Enforced : $EnforceCsp" -ForegroundColor Gray
Write-Host " Press Ctrl+C to gracefully stop the server." -ForegroundColor Yellow
Write-Host "----------------------------------------------------------" -ForegroundColor DarkGray

try {
    while ($listener.IsListening) {
        $task = $listener.GetContextAsync()
        while (-not $task.AsyncWaitHandle.WaitOne(200)) { }
        $context = $task.GetAwaiter().GetResult()

        $status = 500
        try {
            $status = Invoke-Request $context
        }
        catch {
            Write-Host "[ERROR] Request handling failed: $($_.Exception.Message)" -ForegroundColor Red
            try { Send-Text $context.Response 500 'Internal Server Error' } catch { }
        }
        finally {
            $context.Response.Close()
        }

        $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        $logColor = if ($status -ge 400 -and $status -lt 500) { 'Yellow' } elseif ($status -ge 500) { 'Red' } else { 'Green' }
        Write-Host "[$timestamp] $status $($context.Request.HttpMethod) $($context.Request.Url.AbsolutePath)" -ForegroundColor $logColor
    }
}
finally {
    $listener.Stop()
    $listener.Close()
    Write-Host "`n[INFO] SecureLedger server terminated cleanly." -ForegroundColor Gray
}
