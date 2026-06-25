# configure_postgres_server.ps1
# Run as Administrator on the PostgreSQL Server Machine

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " PostgreSQL Server Configurator & Firewall Opener" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Run as Admin check
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "Please run this script as Administrator on the SERVER computer!"
    Exit
}

# 2. Open TCP Port 5432 in Windows Defender Firewall
Write-Host "[1/4] Opening Windows Firewall for Port 5432..." -ForegroundColor Green
$ruleName = "PostgreSQL_5432"
$existingRule = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
if ($existingRule) {
    Write-Host "Firewall rule '$ruleName' already exists. Ensuring it is allowed." -ForegroundColor Yellow
    Set-NetFirewallRule -Name $ruleName -Enabled True -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5432
} else {
    New-NetFirewallRule -Name $ruleName -DisplayName "PostgreSQL Port 5432" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5432 -Description "Allows remote systems to connect to PostgreSQL database server."
    Write-Host "Firewall rule created successfully." -ForegroundColor Green
}

# 3. Find PostgreSQL Data Directory
Write-Host "[2/4] Locating PostgreSQL data directory..." -ForegroundColor Green
$pgDataPath = ""
# Try to get from PG service registry path
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($pgService) {
    $serviceName = $pgService[0].Name
    $regPath = "Registry::HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\$serviceName"
    $imagePath = (Get-ItemProperty -Path $regPath).ImagePath
    if ($imagePath -match '-D\s+"([^"]+)"') {
        $pgDataPath = $Matches[1]
    } elseif ($imagePath -match '-D\s+([^\s]+)') {
        $pgDataPath = $Matches[1]
    }
}

if (-not $pgDataPath -or -not (Test-Path $pgDataPath)) {
    # Search common paths
    $commonPaths = @(
        "C:\Program Files\PostgreSQL\18\data",
        "C:\Program Files\PostgreSQL\17\data",
        "C:\Program Files\PostgreSQL\16\data",
        "C:\Program Files\PostgreSQL\15\data",
        "C:\Program Files\PostgreSQL\14\data"
    )
    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            $pgDataPath = $path
            break
        }
    }
}

if (-not $pgDataPath -or -not (Test-Path $pgDataPath)) {
    Write-Host "Could not locate PostgreSQL data directory automatically." -ForegroundColor Red
    $pgDataPath = Read-Host "Please enter the path to your PostgreSQL data directory (e.g. C:\Program Files\PostgreSQL\16\data)"
}

if (-not (Test-Path $pgDataPath)) {
    Write-Error "Invalid directory path: $pgDataPath. Configuration aborted."
    Exit
}

Write-Host "PostgreSQL Data Directory located at: $pgDataPath" -ForegroundColor Green

# 4. Modify postgresql.conf to listen on all interfaces
Write-Host "[3/4] Modifying postgresql.conf..." -ForegroundColor Green
$confFile = Join-Path $pgDataPath "postgresql.conf"
if (Test-Path $confFile) {
    $confContent = Get-Content $confFile -Raw
    if ($confContent -match '(?m)^\s*#?\s*listen_addresses\s*=') {
        if ($confContent -notmatch '(?m)^\s*listen_addresses\s*=\s*''\*''') {
            Copy-Item $confFile "$confFile.bak" -Force
            $confContent = $confContent -replace '(?m)^\s*#?\s*listen_addresses\s*=\s*.*$', "listen_addresses = '*'"
            Set-Content $confFile $confContent -Force
            Write-Host "Updated listen_addresses to '*' in postgresql.conf (Backup created at postgresql.conf.bak)" -ForegroundColor Green
        } else {
            Write-Host "listen_addresses is already set to '*' in postgresql.conf" -ForegroundColor Yellow
        }
    } else {
        Copy-Item $confFile "$confFile.bak" -Force
        Add-Content $confFile "`nlisten_addresses = '*'"
        Write-Host "Appended listen_addresses = '*' to postgresql.conf (Backup created at postgresql.conf.bak)" -ForegroundColor Green
    }
} else {
    Write-Error "Could not find postgresql.conf in $pgDataPath"
}

# 5. Modify pg_hba.conf to allow connections from local network
Write-Host "[4/4] Modifying pg_hba.conf..." -ForegroundColor Green
$hbaFile = Join-Path $pgDataPath "pg_hba.conf"
if (Test-Path $hbaFile) {
    $hbaContent = Get-Content $hbaFile -Raw
    $rulePattern = "0.0.0.0/0"
    
    if ($hbaContent -notmatch "host\s+all\s+all\s+0\.0\.0\.0/0\s+") {
        Copy-Item $hbaFile "$hbaFile.bak" -Force
        $hbaAppend = @"

# Allow connection from local network systems
host    all             all             0.0.0.0/0               scram-sha-256
host    all             all             0.0.0.0/0               md5
host    all             all             ::/0                    scram-sha-256
"@
        Add-Content $hbaFile $hbaAppend
        Write-Host "Appended remote access rules to pg_hba.conf (Backup created at pg_hba.conf.bak)" -ForegroundColor Green
    } else {
        Write-Host "Remote access rules already configured in pg_hba.conf" -ForegroundColor Yellow
    }
} else {
    Write-Error "Could not find pg_hba.conf in $pgDataPath"
}

# 6. Restart PostgreSQL service
Write-Host "Restarting PostgreSQL database service..." -ForegroundColor Green
if ($pgService) {
    foreach ($svc in $pgService) {
        Write-Host "Restarting service: $($svc.Name)..."
        Restart-Service -Name $svc.Name -Force
    }
    Write-Host "PostgreSQL service restarted successfully." -ForegroundColor Green
} else {
    Write-Host "Could not find PostgreSQL service automatically to restart it." -ForegroundColor Yellow
    Write-Host "Please restart the PostgreSQL service manually via Services (services.msc)." -ForegroundColor Yellow
}

# Get and display local IP addresses for reference
Write-Host "`nServer Configuration Complete!" -ForegroundColor Green
Write-Host "Here are the IP addresses of this Server machine. Use one of these on your Client machines:" -ForegroundColor Cyan
Get-NetIPAddress | Where-Object { $_.AddressFamily -eq "IPv4" -and $_.IPAddress -notlike "127.*" } | Select-Object IPAddress, InterfaceAlias | Format-Table -AutoSize
