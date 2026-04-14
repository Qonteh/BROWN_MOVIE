$content = Get-Content -Path "c:\BROWN\movie_db.sql" -Raw
$lines = $content -split "`n"
$output = @()

foreach ($line in $lines) {
    $trimmedLine = $line.TrimEnd()
    
    # Skip comment lines and empty lines
    if ($trimmedLine -match '^--' -or $trimmedLine -eq '') {
        continue
    }
    
    $output += $trimmedLine
}

$cleanedContent = $output -join "`n"
Set-Content -Path "c:\BROWN\movie_db.sql" -Value $cleanedContent -Encoding utf8

Write-Host "Done! Removed all comments and empty lines"
