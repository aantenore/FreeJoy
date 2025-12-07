# PowerShell Launcher for FreeJoy
# Run this script to manage the server and configs

# Self-Elevation to Admin
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

# Ensure we are in the script's directory (fixes System32 issue after elevation)
Set-Location $PSScriptRoot

function Show-Menu {
    param (
        [string]$Title = 'FreeJoy Launcher'
    )
    Clear-Host
    Write-Host "==============================" -ForegroundColor Cyan
    Write-Host "   $Title   " -ForegroundColor White
    Write-Host "==============================" -ForegroundColor Cyan
    Write-Host "Use Arrow Keys to Navigate, Enter to Select" -ForegroundColor Gray
    Write-Host ""
}

$menuItems = @(
    "1. Setup (Install Dependencies & Generate SSL)", 
    "2. Start Server",
    "3. Exit"
)

$selection = 0

function Draw-Menu {
    Show-Menu
    for ($i = 0; $i -lt $menuItems.Count; $i++) {
        if ($i -eq $selection) {
            Write-Host "-> $($menuItems[$i])" -ForegroundColor Green -BackgroundColor DarkGray
        } else {
            Write-Host "   $($menuItems[$i])" -ForegroundColor White
        }
    }
}

while ($true) {
    Draw-Menu
    
    $keyKey = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    $keyCode = $keyKey.VirtualKeyCode

    # Up Arrow
    if ($keyCode -eq 38) {
        $selection--
        if ($selection -lt 0) { $selection = $menuItems.Count - 1 }
    }
    # Down Arrow
    elseif ($keyCode -eq 40) {
        $selection++
        if ($selection -ge $menuItems.Count) { $selection = 0 }
    }
    # Enter
    elseif ($keyCode -eq 13) {
        Clear-Host
        switch ($selection) {
            0 { 
                Write-Host "Installing Server Dependencies..." -ForegroundColor Yellow
                Push-Location server
                npm install

                # Check SSL (Run inside server folder where node_modules exist)
                if (-not (Test-Path ".\key.pem")) {
                    Write-Host "Generating SSL Certs..." -ForegroundColor Yellow
                    $certCtx = @"
try {
    const selfsigned = require('selfsigned');
    const fs = require('fs');
    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const pems = selfsigned.generate(attrs, { days: 365 });
    fs.writeFileSync('key.pem', pems.private);
    fs.writeFileSync('cert.pem', pems.cert);
    console.log('Certs created.');
} catch (e) {
    console.error('Failed to generate certs:', e.message);
    process.exit(1);
}
"@
                    $certCtx | Out-File -Encoding UTF8 ".\gen_certs.js"
                    node ".\gen_certs.js"
                    if ($LASTEXITCODE -eq 0) {
                        Remove-Item ".\gen_certs.js" -ErrorAction SilentlyContinue
                        # Move keys up one level if server expects them in root, OR ensure server looks in server root
                        # Current server.ts looks in ../key.pem (project root)
                        # So we move them up
                        Move-Item ".\key.pem" "..\key.pem" -Force
                        Move-Item ".\cert.pem" "..\cert.pem" -Force
                    } else {
                         Write-Host "Certificate generation failed." -ForegroundColor Red
                    }
                }
                Pop-Location

                Write-Host "Installing Client Dependencies..." -ForegroundColor Yellow
                Push-Location client
                npm install
                Write-Host "Building Client..." -ForegroundColor Yellow
                npm run build
                Pop-Location
                
                # Firewall Configuration
                Write-Host "Configuring Windows Firewall..." -ForegroundColor Yellow
                try {
                    New-NetFirewallRule -DisplayName "FreeJoy HTTP" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
                    New-NetFirewallRule -DisplayName "FreeJoy HTTPS" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
                    Write-Host "Firewall Rules Added!" -ForegroundColor Green
                } catch {
                    Write-Host "Failed to add Firewall rules. (Are you Admin?)" -ForegroundColor Red
                }
                
                Write-Host "Setup Complete!" -ForegroundColor Green
                Pause
            }
            1 {
                Write-Host "Starting Server..." -ForegroundColor Yellow
                Write-Host "Opening Browser..." -ForegroundColor Cyan
                Start-Process "https://localhost:3001"
                
                Write-Host "Press Ctrl+C to Stop" -ForegroundColor Gray
                cd server
                npm start
                cd ..
                Pause
            }
            2 {
                exit
            }
        }
    }
}
