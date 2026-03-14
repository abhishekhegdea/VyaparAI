# PowerShell setup script for DukaanSaathi with Bun

Write-Host "🚀 Setting up DukaanSaathi with Bun..." -ForegroundColor Green

# Check if bun is installed
try {
    $bunVersion = bun --version
    Write-Host "✅ Bun is installed: $bunVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Bun is not installed. Installing bun..." -ForegroundColor Yellow
    Invoke-RestMethod -Uri "https://bun.sh/install.ps1" | Invoke-Expression
    Write-Host "✅ Bun installed successfully!" -ForegroundColor Green
    Write-Host "🔄 Please restart your terminal and run this script again." -ForegroundColor Yellow
    exit 1
}

# Setup Backend
Write-Host "📦 Setting up backend..." -ForegroundColor Cyan
Set-Location backend
bun install
Write-Host "✅ Backend dependencies installed" -ForegroundColor Green

# Setup Frontend React
Write-Host "📦 Setting up frontend (React)..." -ForegroundColor Cyan
Set-Location ../frontend-react
bun install
Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green

# Go back to root
Set-Location ..

Write-Host ""
Write-Host "🎉 Setup complete! Here's how to start the application:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Start the backend server:" -ForegroundColor White
Write-Host "   cd backend && bun start" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Start the frontend (in a new terminal):" -ForegroundColor White
Write-Host "   cd frontend-react && bun run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Access on mobile:" -ForegroundColor White
Write-Host "   - Connect your phone to the same WiFi" -ForegroundColor Gray
Write-Host "   - Find your computer's IP address" -ForegroundColor Gray
Write-Host "   - Visit: http://[YOUR_IP]:5173" -ForegroundColor Gray
Write-Host ""
Write-Host "📱 For PWA features, use the vanilla JS version:" -ForegroundColor White
Write-Host "   Open frontend/index.html in a browser" -ForegroundColor Gray
Write-Host ""
Write-Host "Happy coding! 🚀" -ForegroundColor Green 