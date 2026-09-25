# Copies the Android release settings from set-build-env.local.ps1 into this repository's
# GitHub Actions secrets, so .github/workflows/android-release.yml can sign updates with
# the same key as the APK already on the phones. Run once, and again after changing a value:
#
#   cd android-widget
#   .\publish-release-secrets.ps1
#
# Values go to gh on stdin, never on a command line, and nothing is printed.

$ErrorActionPreference = "Stop"
# Windows PowerShell 5.1 pipes ASCII to native programs unless told otherwise.
$OutputEncoding = New-Object System.Text.UTF8Encoding $false
Set-Location $PSScriptRoot
if (-not (Test-Path .\set-build-env.local.ps1)) { throw "Create set-build-env.local.ps1 from set-build-env.example.ps1 first." }
. .\set-build-env.local.ps1

if (-not $env:WIDGET_KEYSTORE_PATH -or -not (Test-Path $env:WIDGET_KEYSTORE_PATH)) {
    throw "WIDGET_KEYSTORE_PATH must name the release keystore the installed APK was signed with."
}

$required = "WIDGET_SUPABASE_URL", "WIDGET_SUPABASE_PUBLISHABLE_KEY", "WIDGET_WEB_BASE_URL",
    "WIDGET_KEYSTORE_PASSWORD", "WIDGET_KEY_ALIAS", "WIDGET_KEY_PASSWORD"
$optional = "WIDGET_FIREBASE_APP_ID", "WIDGET_FIREBASE_SENDER_ID", "WIDGET_FIREBASE_API_KEY", "WIDGET_FIREBASE_PROJECT_ID"

foreach ($name in $required + $optional) {
    $value = [Environment]::GetEnvironmentVariable($name)
    if (-not $value) {
        if ($required -contains $name) { throw "$name is empty in set-build-env.local.ps1." }
        Write-Host "Skipping $name (not set; that build has no push)."
        continue
    }
    $value | gh secret set $name
    if ($LASTEXITCODE -ne 0) { throw "gh secret set $name failed." }
    Write-Host "Set $name"
}

[Convert]::ToBase64String([IO.File]::ReadAllBytes($env:WIDGET_KEYSTORE_PATH)) | gh secret set WIDGET_KEYSTORE_BASE64
if ($LASTEXITCODE -ne 0) { throw "gh secret set WIDGET_KEYSTORE_BASE64 failed." }
Write-Host "Set WIDGET_KEYSTORE_BASE64"
Write-Host "Done. The next push to main that changes android-widget/ publishes a release."
