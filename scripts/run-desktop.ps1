param(
    [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Push-Location (Join-Path $root 'backend')
try {
    if (-not $SkipTests) { mvn test }
    mvn package -DskipTests
} finally {
    Pop-Location
}

Push-Location (Join-Path $root 'frontend')
try {
    if (-not $SkipTests) { npm test }
    npm run build
} finally {
    Pop-Location
}

# Electron starts only after both current builds are ready.
Start-Process -FilePath 'npm.cmd' -ArgumentList 'start' -WorkingDirectory (Join-Path $root 'electron') -WindowStyle Hidden
