# 📱 Mobile Usage Guide - VyaparAI

## 🚀 Quick Start

### Option 1: Web Browser (Easiest)
1. **Start the backend server:**
   ```bash
   cd backend
   bun install
   bun start
   ```

2. **Start the frontend:**
   - **Vanilla JS version:** Open `frontend/index.html` in a browser
   - **React version:**
     ```bash
     cd frontend-react
     bun install
     bun run dev
     ```

3. **Access on mobile:**
   - Connect your phone to the same WiFi as your computer
   - Find your computer's IP address (e.g., `192.168.1.100`)
   - Open mobile browser and go to:
     - Vanilla JS: `http://[YOUR_COMPUTER_IP]:5500`
     - React: `http://[YOUR_COMPUTER_IP]:5173`

### Option 2: Progressive Web App (PWA) - Enhanced Experience
The app now supports PWA features for better mobile experience:

#### **Install as App:**
- **Android:** Tap "Add to Home Screen" in Chrome menu
- **iOS:** Tap "Add to Home Screen" in Safari share menu
- **Desktop:** Click the install icon in browser address bar

#### **PWA Features:**
- ✅ Offline functionality
- ✅ App-like experience
- ✅ Home screen icon
- ✅ Full-screen mode
- ✅ Fast loading with caching

## 📱 Mobile Features

### **Responsive Design**
- ✅ Optimized for all screen sizes
- ✅ Touch-friendly interface
- ✅ Mobile navigation menu
- ✅ Swipe gestures supported

### **Shopping Experience**
- ✅ Browse products by category
- ✅ Search functionality
- ✅ Add to cart with one tap
- ✅ View cart and checkout
- ✅ Track order history

### **User Management**
- ✅ Login/Register
- ✅ Profile management
- ✅ Order history
- ✅ Bill generation

### **Admin Features** (if admin user)
- ✅ Product management
- ✅ Order processing
- ✅ Sales statistics
- ✅ Bill generation

## 🔧 Setup Instructions

### **For Development:**
1. **Backend Setup:**
   ```bash
   cd backend
   bun install
   bun start
   ```

2. **Frontend Setup (Choose one):**
   
   **Vanilla JS:**
   ```bash
   # Use Live Server extension in VS Code
   # Or any local server
   ```
   
   **React:**
   ```bash
   cd frontend-react
   bun install
   bun run dev
   ```

3. **Network Configuration:**
   - Ensure your computer and phone are on the same WiFi
   - Find your computer's IP address:
     - **Windows:** `ipconfig` in CMD
     - **Mac/Linux:** `ifconfig` in Terminal
   - Use the IP address instead of `localhost`

### **For Production:**
1. **Deploy backend to a cloud service** (Heroku, Vercel, etc.)
2. **Deploy frontend to a static hosting service** (Netlify, Vercel, etc.)
3. **Update API endpoints in config files**
4. **Access via your domain name**

## 📋 Mobile Usage Tips

### **Navigation:**
- Use the hamburger menu (☰) for navigation
- Swipe between sections
- Tap and hold for additional options

### **Shopping:**
- Tap product images to view details
- Use the search bar to find specific items
- Filter by category for easier browsing
- Add items to cart with the + button

### **Checkout:**
- Review cart before checkout
- Fill in billing details
- Generate and download bills
- Track order status

### **Admin Functions:**
- Manage inventory
- Process orders
- Generate reports
- Handle customer queries

## 🔒 Security Notes

- Always use HTTPS in production
- Keep API keys secure
- Implement proper authentication
- Regular security updates

## 🛠️ Troubleshooting

### **Common Issues:**

1. **Can't connect to server:**
   - Check if backend is running
   - Verify IP address is correct
   - Ensure same WiFi network

2. **PWA not installing:**
   - Use HTTPS in production
   - Check manifest.json is accessible
   - Clear browser cache

3. **Slow loading:**
   - Check internet connection
   - Clear browser cache
   - Optimize images

4. **Touch not working:**
   - Check viewport meta tag
   - Ensure CSS touch-action is set
   - Test on different devices

## 🚀 Bun Installation (if not installed)

If you don't have bun installed, install it first:

**Windows:**
```bash
# Using PowerShell
irm bun.sh/install.ps1 | iex
```

**macOS/Linux:**
```bash
curl -fsSL https://bun.sh/install | bash
```

**Verify installation:**
```bash
bun --version
```

## 📞 Support

For technical support or questions about mobile usage, please refer to the main documentation or contact the development team.

---

**Happy Shopping! 🛍️** 