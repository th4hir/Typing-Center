# configure_postgres_backup.ps1
# Run as Administrator on the PostgreSQL Server Machine

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " PostgreSQL Server Daily Backup Installer" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Run as Admin check
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "Please run this script as Administrator on the SERVER computer!"
    Exit
}

# 2. Ask or find PostgreSQL installation
$pgBinPath = ""
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($pgService) {
    $serviceName = $pgService[0].Name
    $regPath = "Registry::HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\$serviceName"
    $imagePath = (Get-ItemProperty -Path $regPath).ImagePath
    if ($imagePath -match '"([^"]+)"') {
        $binDir = [System.IO.Path]::GetDirectoryName($Matches[1])
        if (Test-Path (Join-Path $binDir "pg_dump.exe")) {
            $pgBinPath = $binDir
        }
    }
}

if (-not $pgBinPath) {
    # Search common paths
    $commonBinPaths = @(
        "C:\Program Files\PostgreSQL\18\bin",
        "C:\Program Files\PostgreSQL\17\bin",
        "C:\Program Files\PostgreSQL\16\bin",
        "C:\Program Files\PostgreSQL\15\bin",
        "C:\Program Files\PostgreSQL\14\bin"
    )
    foreach ($path in $commonBinPaths) {
        if (Test-Path (Join-Path $path "pg_dump.exe")) {
            $pgBinPath = $path
            break
        }
    }
}

if (-not $pgBinPath) {
    Write-Host "Could not automatically locate pg_dump.exe." -ForegroundColor Red
    $pgBinPath = Read-Host "Please enter the path to your PostgreSQL bin directory (e.g. C:\Program Files\PostgreSQL\16\bin)"
}

if (-not (Test-Path (Join-Path $pgBinPath "pg_dump.exe"))) {
    Write-Error "Could not find pg_dump.exe in: $pgBinPath. Configuration aborted."
    Exit
}

Write-Host "PostgreSQL Bin Directory: $pgBinPath" -ForegroundColor Green

# 3. Create backup directory
$backupDir = "C:\PostgreSQL_Backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-Host "Created backup folder: $backupDir" -ForegroundColor Green
} else {
    Write-Host "Backup folder already exists: $backupDir" -ForegroundColor Yellow
}

# 4. Generate the backup execution script
$backupScriptPath = Join-Path $backupDir "run_daily_backup.ps1"
$scriptContent = @"
`$pgBin = "$pgBinPath"
`$backupFolder = "$backupDir"
`$dbName = "typing_center_db"
`$dbUser = "postgres"
`$env:PGPASSWORD = "admin"

`$dateStr = Get-Date -Format "yyyy-MM-dd"
`$outFile = Join-Path `$backupFolder "db_backup_`$dateStr.sql"

# Run pg_dump
`& (Join-Path `$pgBin "pg_dump.exe") -h localhost -p 5432 -U `$dbUser -F c -b -v -f `$outFile `$dbName 2>&1 | Out-File (Join-Path `$backupFolder "backup_log.txt")

# Delete backups older than 30 days
Get-ChildItem `$backupFolder -Filter "db_backup_*.sql" | Where-Object { `$_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item -Force
"@

Set-Content -Path $backupScriptPath -Value $scriptContent -Force
Write-Host "Backup script created at: $backupScriptPath" -ForegroundColor Green

# 5. Create Windows Scheduled Task
Write-Host "Setting up Windows Task Scheduler to run daily backups at 11:30 PM..." -ForegroundColor Green
$taskName = "PostgreSQL_Daily_Backup"

# Remove existing task if any
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null

# Action: Run powershell executing the backup script
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$backupScriptPath`""
$trigger = New-ScheduledTaskTrigger -Daily -At "23:30"
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal | Out-Null

Write-Host "Daily Backup Task Registered successfully!" -ForegroundColor Green
Write-Host "The database will be backed up automatically every day at 11:30 PM to $backupDir" -ForegroundColor Green
Write-Host "Only the last 30 days of backups will be kept to save disk space." -ForegroundColor Green
