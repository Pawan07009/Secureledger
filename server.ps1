<#
.SYNOPSIS
    Minimal static file server for local development of the Meridian Treasury demo.

.DESCRIPTION
    Serves files from the project folder on http://localhost:<Port>/.
    - Only listens on localhost (not reachable from other machines).
    - Only serves known web file types, so server.ps1, README.md, .git, etc. return 404.
    - Blocks path traversal (../ and encoded variants).
    - Sends no-cache and basic security headers.
    - Stops cleanly with Ctrl+C.

.PARAMETER Port
    Port to listen on. Default 5500.

.PARAMETER Root
    Folder to serve. Default: the folder containing this script.

.PARAMETER EnforceCsp
    Send Content-Security-Policy instead of Content-Security-Policy-Report-Only.
    Leave off until inline onclick handlers and inline scripts are removed from the app.

.EXAMPLE
    .\server.ps1
    .\server.ps1 -Port 8080
#>
param(
    [int]$Port = 5500,
    [string]$Root = $PSScriptRoot,
    [switch]$EnforceCsp
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$sep = [System.IO.Path]::DirectorySeparatorChar
$script:Root = [System.IO.Path]::GetFullPath($Root).TrimEnd('\', '/') + $sep

$script:MimeTypes = @{
    '.html'        = 'text/html; charset=utf-8'
    '.css'         = 'text/css; charset=utf-8'
    '.js'          = 'text/javascript; charset=utf-8'
    '.mjs'         = 'text/javascript; charset=utf-8'
    '.json'        = 'application/json; charset=utf-8'
    '.map'         = 'application/json; charset=utf-8'
    '.webmanifest' = 'application/manifest+json'
    '.txt'         = 'text/plain; charset=utf-8'
    '.svg'         = 'image/svg+xml'
    '.png'         = 'image/png'
    '.jpg'         = 'image/jpeg'
    '.jpeg'        = 'image/jpeg'
    '.webp'        = 'image/webp'
    '.gif'         = 'image/gif'
    '.ico'         = 'image/x-icon'
    '.woff'        = 'font/woff'
    '.woff2'       = 'font/woff2'
}

$cspValue = "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
            "font-src https://fonts.gstatic.com; " +
            "img-src 'self' data:; " +
            "base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
$cspHeader = if ($EnforceCsp) { 'Content-Security-Policy' } else { 'Content-Security-Policy-Report-Only' }

function Set-CommonHeaders($response) {
    $response.Headers.Set('Cache-Control', 'no-store')
    $response.Headers.Set('X-Content-Type-Options', 'nosniff')
    $response.Headers.Set('X-Frame-Options', 'DENY')
    $response.Headers.Set('Referrer-Policy', 'no-referrer')
    $response.Headers.Set($cspHeader, $cspValue)
}

function Send-Text($response, [int]$code, [string]$text) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
    $response.StatusCode = $code
    $response.ContentType = 'text/plain; charset=utf-8'
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
}

# Handles one request and returns the HTTP status code that was sent.
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
        if ($urlPath -eq '/') { $urlPath = '/index.html' }
        $relative = $urlPath.TrimStart('/').Replace('/', $sep)
        $fullPath = [System.IO.Path]::GetFullPath((Join-Path $script:Root $relative))
    }
    catch {
        Send-Text $response 400 'Bad Request'
        return 400
    }

    # Path traversal guard: the resolved path must stay inside the root folder.
    if (-not $fullPath.StartsWith($script:Root, [System.StringComparison]::OrdinalIgnoreCase)) {
        Send-Text $response 403 'Forbidden'
        return 403
    }

    $ext = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf) -or -not $script:MimeTypes.ContainsKey($ext)) {
        Send-Text $response 404 '404 Not Found'
        return 404
    }

    $bytes = [System.IO.File]::ReadAllBytes($fullPath)
    $response.StatusCode = 200
    $response.ContentType = $script:MimeTypes[$ext]
    $response.ContentLength64 = $bytes.Length
    if ($request.HttpMethod -ne 'HEAD') {
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    return 200
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
    $listener.Start()
}
catch {
    Write-Host "Could not start server on port $Port. It may already be in use." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor DarkGray
    Write-Host "Try another port:  .\server.ps1 -Port 8080"
    exit 1
}

Write-Host "Serving $($script:Root)" -ForegroundColor Cyan
Write-Host "Open http://localhost:$Port/   (Ctrl+C to stop)" -ForegroundColor Green

try {
    while ($listener.IsListening) {
        # Async wait with a short timeout so Ctrl+C is handled promptly.
        $task = $listener.GetContextAsync()
        while (-not $task.AsyncWaitHandle.WaitOne(250)) { }
        $context = $task.GetAwaiter().GetResult()

        $status = 500
        try {
            $status = Invoke-Request $context
        }
        catch {
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
            try { Send-Text $context.Response 500 'Internal Server Error' } catch { }
        }
        finally {
            $context.Response.Close()
        }

        $color = if ($status -ge 400) { 'Yellow' } else { 'Gray' }
        Write-Host ("{0} {1,-4} {2}" -f $status, $context.Request.HttpMethod, $context.Request.Url.AbsolutePath) -ForegroundColor $color
    }
}
finally {
    $listener.Stop()
    $listener.Close()
    Write-Host "Server stopped."
}
