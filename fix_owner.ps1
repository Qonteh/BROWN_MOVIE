$content = Get-Content -Path "c:\BROWN\movie_db.sql" -Raw
$cleaned = $content -replace '(?m)^\s*ALTER\s+(TABLE|FUNCTION|VIEW)\s+.*?OWNER\s+TO\s+postgres;\s*\n?', ''
Set-Content -Path "c:\BROWN\movie_db.sql" -Value $cleaned -Encoding utf8
Write-Host "Done - Removed all OWNER TO postgres statements"
