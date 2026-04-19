$projectRoot = $PSScriptRoot

Write-Host "Stopping Gradle daemons..." -ForegroundColor Cyan
Push-Location "$projectRoot\android"
& .\gradlew.bat --stop 2>$null
Pop-Location

Write-Host "Clearing android/app/build..." -ForegroundColor Cyan
$appBuild = "$projectRoot\android\app\build"
if (Test-Path $appBuild) {
    $maxAttempts = 3
    for ($i = 1; $i -le $maxAttempts; $i++) {
        try {
            Remove-Item -Path $appBuild -Recurse -Force -ErrorAction Stop
            Write-Host "  Cleared: $appBuild" -ForegroundColor Green
            break
        } catch {
            if ($i -eq $maxAttempts) { Write-Warning "  Could not clear $appBuild`: $_" }
            else { Start-Sleep -Milliseconds 500 }
        }
    }
}

Write-Host "Clearing stale Gradle build caches from node_modules..." -ForegroundColor Cyan
$staleDirs = Get-ChildItem -Path "$projectRoot\node_modules" -Recurse -Directory -Filter "build" |
    Where-Object { $_.FullName -match "\\android\\build$" }

foreach ($dir in $staleDirs) {
    $maxAttempts = 3
    for ($i = 1; $i -le $maxAttempts; $i++) {
        try {
            Remove-Item -Path $dir.FullName -Recurse -Force -ErrorAction Stop
            Write-Host "  Cleared: $($dir.FullName)" -ForegroundColor Green
            break
        } catch {
            if ($i -eq $maxAttempts) {
                Write-Warning "  Could not clear $($dir.FullName): $_"
            } else {
                Start-Sleep -Milliseconds 500
            }
        }
    }
}

Write-Host "Starting build..." -ForegroundColor Cyan
Set-Location $projectRoot
bun expo run:android
