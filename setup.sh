#!/bin/bash

echo "🚀 Setting up VyaparAI with Bun..."

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Installing bun..."
    
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        # Windows
        powershell -Command "irm bun.sh/install.ps1 | iex"
    else
        # macOS/Linux
        curl -fsSL https://bun.sh/install | bash
    fi
    
    echo "✅ Bun installed successfully!"
    echo "🔄 Please restart your terminal and run this script again."
    exit 1
fi

echo "✅ Bun is installed: $(bun --version)"

# Setup Backend
echo "📦 Setting up backend..."
cd backend
bun install
echo "✅ Backend dependencies installed"

# Setup Frontend React
echo "📦 Setting up frontend (React)..."
cd ../frontend-react
bun install
echo "✅ Frontend dependencies installed"

# Go back to root
cd ..

echo ""
echo "🎉 Setup complete! Here's how to start the application:"
echo ""
echo "1. Start the backend server:"
echo "   cd backend && bun start"
echo ""
echo "2. Start the frontend (in a new terminal):"
echo "   cd frontend-react && bun run dev"
echo ""
echo "3. Access on mobile:"
echo "   - Connect your phone to the same WiFi"
echo "   - Find your computer's IP address"
echo "   - Visit: http://[YOUR_IP]:5173"
echo ""
echo "📱 For PWA features, use the vanilla JS version:"
echo "   Open frontend/index.html in a browser"
echo ""
echo "Happy coding! 🚀" 