# DukaanSaathi - React Frontend

A modern, responsive e-commerce frontend built with React, Vite, and Tailwind CSS for DukaanSaathi.

## 🚀 Features

- **Modern React Architecture**: Built with React 18, Vite, and modern JavaScript
- **Responsive Design**: Mobile-first design with beautiful pastel color palette
- **Authentication System**: JWT-based login/register with role-based access
- **Product Management**: Browse, search, and filter products by category
- **Shopping Cart**: Add, update, and remove items with real-time updates
- **Billing System**: Generate bills with GST calculations
- **Admin Dashboard**: Product management, statistics, and admin billing
- **Real-time Updates**: Live cart updates and notifications
- **Toast Notifications**: User-friendly feedback system

## 🛠️ Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router DOM** - Client-side routing
- **Axios** - HTTP client
- **Lucide React** - Icon library
- **Context API** - State management
- **CSS-in-JS** - Styled components

## 📦 Installation

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend-react
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Start the development server:**
   ```bash
   bun run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:5173`

## 🏗️ Project Structure

```
frontend-react/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Navbar.jsx      # Navigation bar
│   │   ├── LoadingScreen.jsx # Loading screen
│   │   └── Toast.jsx       # Toast notifications
│   ├── contexts/           # React contexts
│   │   ├── AuthContext.jsx # Authentication state
│   │   └── CartContext.jsx # Shopping cart state
│   ├── pages/              # Page components
│   │   ├── Home.jsx        # Home page
│   │   ├── Auth.jsx        # Login/Register
│   │   ├── Products.jsx    # Product listing
│   │   ├── Cart.jsx        # Shopping cart
│   │   ├── Bills.jsx       # Billing history
│   │   └── Admin.jsx       # Admin dashboard
│   ├── App.jsx             # Main app component
│   ├── App.css             # Global styles
│   └── main.jsx            # App entry point
├── public/                 # Static assets
├── index.html              # HTML template
├── package.json            # Dependencies
└── README.md               # This file
```

## 🎨 Design System

### Color Palette
- **Primary**: `#a8e6cf` (Mint Green)
- **Secondary**: `#ffd3b6` (Peach)
- **Accent**: `#ffaaa5` (Coral)
- **Background**: `#f7fafc` (Light Gray)
- **Surface**: `#ffffff` (White)

### Typography
- **Font Family**: Poppins (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700

### Components
- **Cards**: Rounded corners with subtle shadows
- **Buttons**: Hover effects with color transitions
- **Forms**: Clean inputs with focus states
- **Modals**: Overlay dialogs with backdrop blur

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=DukaanSaathi
```

### API Endpoints
The frontend communicates with the backend API:

- **Authentication**: `/api/auth/*`
- **Products**: `/api/products/*`
- **Cart**: `/api/cart/*`
- **Bills**: `/api/bills/*`

## 🚀 Usage

### Authentication
1. **Register**: Create a new account with email and password
2. **Login**: Sign in with existing credentials
3. **Admin Access**: Use `admin@DukaanSaathi.com` / `admin123` for admin features

### Shopping Experience
1. **Browse Products**: View products by category or search
2. **Add to Cart**: Select quantity and add items
3. **Manage Cart**: Update quantities or remove items
4. **Checkout**: Generate bills for purchases

### Admin Features
1. **Product Management**: Add, edit, or delete products
2. **Statistics**: View sales and user statistics
3. **Admin Billing**: Generate bills with GST calculations

## 📱 Responsive Design

The application is fully responsive with breakpoints:

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access**: User and admin role separation
- **Input Validation**: Form validation and sanitization
- **Protected Routes**: Admin-only page access

## 🧪 Development

### Available Scripts

```bash
# Start development server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview

# Run tests
bun run test
```

### Code Style
- Use functional components with hooks
- Implement proper error handling
- Follow React best practices
- Use semantic HTML elements

## 🐛 Troubleshooting

### Common Issues

1. **Backend Connection Error**
   - Ensure the backend server is running on port 3000
   - Check CORS configuration in backend

2. **Authentication Issues**
   - Clear browser localStorage
   - Check JWT token expiration
   - Verify API endpoints

3. **Build Errors**
   - Clear node_modules and reinstall
   - Check for missing dependencies
   - Verify import paths

### Debug Mode
Enable debug logging by setting:
```javascript
localStorage.setItem('debug', 'true');
```

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**DukaanSaathi** - Your One-Stop Shop for Stationaries, Fancy Items, Toys, and Gifts! 🛍️
