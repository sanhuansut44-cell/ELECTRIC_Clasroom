$http = [System.Net.HttpListener]::new()
$http.Prefixes.Add("http://localhost:8080/")
$http.Start()
Write-Host "Server running at http://localhost:8080/"

$rootDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

while ($http.IsListening) {
    try {
        $context = $http.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $localPath = [System.Uri]::UnescapeDataString($request.Url.LocalPath.TrimStart('/'))
        if ([string]::IsNullOrWhiteSpace($localPath)) { $localPath = "index.html" }
        $filePath = Join-Path $rootDir $localPath
        
        if (Test-Path $filePath -PathType Leaf) {
            $content = [System.IO.File]::ReadAllBytes($filePath)
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            switch ($ext) {
                ".html" { $response.ContentType = "text/html; charset=utf-8" }
                ".css"  { $response.ContentType = "text/css; charset=utf-8" }
                ".js"   { $response.ContentType = "application/javascript; charset=utf-8" }
                ".json" { $response.ContentType = "application/json; charset=utf-8" }
                ".png"  { $response.ContentType = "image/png" }
                ".jpg"  { $response.ContentType = "image/jpeg" }
                ".jpeg" { $response.ContentType = "image/jpeg" }
                ".svg"  { $response.ContentType = "image/svg+xml" }
                ".ico"  { $response.ContentType = "image/x-icon" }
                ".webp" { $response.ContentType = "image/webp" }
                default { $response.ContentType = "application/octet-stream" }
            }
            $response.ContentLength64 = $content.Length
            $response.OutputStream.Write($content, 0, $content.Length)
        } else {
            $response.StatusCode = 404
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        $response.Close()
    } catch {
        Write-Warning "Request error: $_"
    }
}
