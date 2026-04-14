#!/usr/bin/env powershell

# BROWN MOVIES - QUICK START SCRIPT
# This script runs the complete stack: Frontend + Backend + Database

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         BROWN MOVIES - FULL STACK START                    ║" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "║  Frontend: Next.js Server (Port 3000)                      ║" -ForegroundColor Cyan
Write-Host "║  Backend:  API Routes (/api/auth/*)                        ║" -ForegroundColor Cyan
Write-Host "║  Database: PostgreSQL (localhost:5432)                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️  .env.local not found!" -ForegroundColor Yellow
    Write-Host "Please create .env.local with DATABASE_URL and JWT_SECRET" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Example:" -ForegroundColor Green
    Write-Host "  DATABASE_URL=postgresql://postgres:password@localhost:5432/brown_movies"
    Write-Host "  JWT_SECRET=your_random_secret_key_here"
    exit 1
}

# Check if PostgreSQL is running
Write-Host "🔍 Checking PostgreSQL connection..." -ForegroundColor Yellow
$pg_test = & npm run test:db 2>&1 | Select-String "connected|error" -ErrorAction SilentlyContinue

if ($pg_test -match "error") {
    Write-Host "❌ PostgreSQL is not running or connection failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Start PostgreSQL first:" -ForegroundColor Yellow
    Write-Host "  - Windows: Services → PostgreSQL → Start" -ForegroundColor Gray
    Write-Host "  - Command: pg_isready -h localhost" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ PostgreSQL connected!" -ForegroundColor Green
Write-Host ""

# Install dependencies if needed
Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing packages..." -ForegroundColor Yellow
    npm install
}

Write-Host "✅ Dependencies ready!" -ForegroundColor Green
Write-Host ""

# Start development server
Write-Host "🚀 Starting BROWN MOVIES Full Stack..." -ForegroundColor  Cyan
Write-Host ""
Write-Host "Frontend running at:  http://localhost:3000" -ForegroundColor Green
Write-Host "Backend API at:       http://localhost:3000/api" -ForegroundColor Green
Write-Host "Database:             postgresql://localhost:5432/brown_movies" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Quick Test:" -ForegroundColor Yellow
Write-Host "  1. Open browser → http://localhost:3000" -ForegroundColor Gray
Write-Host "  2. Click 'Jisajili' (Sign Up)" -ForegroundColor Gray
Write-Host "  3. Create account (email/password/name)" -ForegroundColor Gray
Write-Host "  4. Check PostgreSQL for user: SELECT * FROM users LIMIT 1;" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop..." -ForegroundColor Yellow
Write-Host ""

npm run dev
