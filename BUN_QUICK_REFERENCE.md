# 🥟 Bun Quick Reference - DukaanSaathi

## 🚀 Quick Start Commands

### **Install Dependencies**
```bash
# Backend
cd backend
bun install

# Frontend React
cd frontend-react
bun install
```

### **Start Development Servers**
```bash
# Backend (Terminal 1)
cd backend
bun start

# Frontend React (Terminal 2)
cd frontend-react
bun run dev
```

### **Alternative Commands**
```bash
# Backend with watch mode
bun --watch server.js

# Frontend build for production
bun run build

# Frontend preview production build
bun run preview
```

## 📦 Bun vs NPM Comparison

| Command | NPM | Bun |
|---------|-----|-----|
| Install dependencies | `npm install` | `bun install` |
| Start script | `npm start` | `bun start` |
| Run dev | `npm run dev` | `bun run dev` |
| Run build | `npm run build` | `bun run build` |
| Run tests | `npm test` | `bun test` |

## ⚡ Bun Advantages

- **Faster installation** - Up to 20x faster than npm
- **Built-in bundler** - No need for webpack/vite
- **TypeScript support** - Native TypeScript runtime
- **Hot reloading** - Built-in file watching
- **Package manager** - All-in-one solution

## 🔧 Project Structure

```
DukaanSaathi/
├── backend/
│   ├── bun.lock          # Bun lock file
│   ├── package.json      # Already configured for bun
│   └── server.js         # Main server file
├── frontend-react/
│   ├── bun.lock          # Bun lock file
│   ├── package.json      # React dependencies
│   └── src/              # React source code
└── frontend/             # Vanilla JS version
    └── index.html        # PWA-enabled frontend
```

## 🛠️ Setup Scripts

### **Automatic Setup**
```bash
# Linux/macOS
chmod +x setup.sh
./setup.sh

# Windows PowerShell
.\setup.ps1
```

### **Manual Setup**
```bash
# 1. Install bun (if not installed)
curl -fsSL https://bun.sh/install | bash

# 2. Install dependencies
cd backend && bun install
cd ../frontend-react && bun install

# 3. Start servers
cd backend && bun start
cd ../frontend-react && bun run dev
```

## 📱 Mobile Access

After starting the servers:

1. **Find your IP address:**
   ```bash
   # Windows
   ipconfig
   
   # macOS/Linux
   ifconfig
   ```

2. **Access on mobile:**
   - Connect phone to same WiFi
   - Visit: `http://[YOUR_IP]:5173`

## 🚨 Troubleshooting

### **Bun not found**
```bash
# Reinstall bun
curl -fsSL https://bun.sh/install | bash
# Restart terminal
```

### **Port already in use**
```bash
# Kill process on port 3000 (backend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

### **Permission denied**
```bash
# Make setup script executable
chmod +x setup.sh
```

## 🎯 Performance Tips

- Bun installs dependencies much faster than npm
- Use `bun --watch` for development with auto-reload
- Bun has built-in TypeScript support
- No need for separate bundlers like webpack

## 📚 Additional Resources

- [Bun Documentation](https://bun.sh/docs)
- [Bun GitHub](https://github.com/oven-sh/bun)
- [Bun vs Node.js Performance](https://bun.sh/benchmarks)

---

**Happy coding with Bun! 🥟⚡** 