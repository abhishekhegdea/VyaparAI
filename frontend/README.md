# DukaanSaathi - Frontend

A modern, responsive e-commerce website frontend built with HTML, CSS, and JavaScript for the DukaanSaathi store.

## Features

- 🎨 **Modern UI Design**: Clean, colorful interface with pastel colors and card layouts
- 📱 **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- 🔐 **User Authentication**: Login/register system with JWT token management
- 👥 **Role-Based Access**: Separate interfaces for users and admins
- 🛒 **Shopping Cart**: Add, remove, and manage cart items with quantity controls
- 📦 **Product Management**: Browse, search, and filter products by category
- 💰 **Billing System**: Generate bills with and without GST calculations
- 📊 **Admin Dashboard**: Comprehensive admin panel for product and billing management
- 🖼️ **Image Support**: Product image upload and display
- 📈 **Statistics**: Admin dashboard with sales and billing statistics

## Tech Stack

- **HTML5**: Semantic markup and modern structure
- **CSS3**: Flexbox, Grid, animations, and responsive design
- **JavaScript (ES6+)**: Modern JavaScript with classes and modules
- **Font Awesome**: Icons for better user experience
- **Google Fonts**: Poppins font family for clean typography

## File Structure

```
frontend/
├── index.html              # Main HTML file
├── css/
│   ├── style.css           # Main styles and layout
│   ├── auth.css            # Authentication page styles
│   ├── dashboard.css       # Products and admin dashboard styles
│   ├── cart.css            # Shopping cart styles
│   └── billing.css         # Billing and invoice styles
├── js/
│   ├── config.js           # Configuration and utilities
│   ├── app.js              # Main application logic
│   ├── auth.js             # Authentication management
│   ├── products.js         # Product listing and management
│   ├── cart.js             # Shopping cart functionality
│   ├── billing.js          # Billing and invoice generation
│   └── admin.js            # Admin dashboard functionality
└── README.md               # This file
```

## Quick Start

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Backend server running on `http://localhost:3000`
- Live server or similar for local development

### Installation

1. **Clone or download the frontend files**
   ```bash
   # If using git
   git clone <repository-url>
   cd frontend
   ```

2. **Start a local server**
   
   **Option A: Using Live Server (VS Code Extension)**
   - Install Live Server extension in VS Code
   - Right-click on `index.html` and select "Open with Live Server"

   **Option B: Using Python**
   ```bash
   # Python 3
   python -m http.server 5500
   
   # Python 2
   python -m SimpleHTTPServer 5500
   ```

   **Option C: Using Node.js**
   ```bash
   npx live-server --port=5500
   ```

3. **Open in browser**
   - Navigate to `http://localhost:5500`
   - The application should load with the loading screen

### Default Admin Account

- **Email**: admin@DukaanSaathi.com
- **Password**: admin123

## Features Overview

### 🏠 Home Page
- Welcome hero section with category cards
- Quick access to products and authentication
- Responsive design with smooth animations

### 🔐 Authentication
- **Login Form**: Email and password authentication
- **Register Form**: User registration with validation
- **Tab Switching**: Smooth transitions between login and register
- **Form Validation**: Real-time validation with error messages
- **Password Strength**: Visual password strength indicator

### 📦 Products Page
- **Product Grid**: Responsive card layout for products
- **Search Functionality**: Real-time search with debouncing
- **Category Filter**: Filter products by category
- **Stock Status**: Visual indicators for stock levels
- **Add to Cart**: Quantity controls and cart integration
- **GST Badges**: Visual indicators for GST-applicable products

### 🛒 Shopping Cart
- **Cart Items**: Detailed view of cart contents
- **Quantity Controls**: Increase/decrease item quantities
- **Stock Validation**: Prevents adding more than available stock
- **Cart Summary**: Real-time calculation of totals
- **Checkout Process**: Generate bills for in-store purchase
- **Empty State**: Friendly message when cart is empty

### 💰 Billing System
- **User Bills**: View generated bills from cart checkout
- **Bill Details**: Complete bill information with items
- **Print Functionality**: Print-friendly bill layout
- **GST Calculation**: Automatic GST calculation (18%)
- **Bill History**: View all past bills

### 👨‍💼 Admin Dashboard
- **Product Management**: Add, edit, delete products
- **Image Upload**: Support for product images
- **Stock Management**: Update product quantities
- **Admin Billing**: Generate bills for walk-in customers
- **Statistics**: Sales and billing statistics
- **Real-time Preview**: Live bill preview with calculations

## Configuration

### API Configuration
Edit `js/config.js` to modify API settings:

```javascript
const CONFIG = {
    API_BASE_URL: 'http://localhost:3000/api',
    // ... other settings
};
```

### Customization
- **Colors**: Modify CSS variables in `css/style.css`
- **Categories**: Update categories in `js/config.js`
- **GST Rate**: Change GST rate in configuration
- **Currency**: Modify currency symbol and format

## Browser Support

- **Chrome**: 60+
- **Firefox**: 55+
- **Safari**: 12+
- **Edge**: 79+

## Responsive Breakpoints

- **Desktop**: 1200px and above
- **Tablet**: 768px - 1199px
- **Mobile**: Below 768px

## Key Features

### 🔒 Security
- JWT token authentication
- Secure password handling
- Input validation and sanitization
- Role-based access control

### 🎯 User Experience
- Loading states and animations
- Toast notifications
- Form validation feedback
- Responsive design
- Keyboard navigation support

### 📊 Data Management
- Local storage for user sessions
- Real-time data synchronization
- Error handling and recovery
- Offline-friendly design

### 🎨 Design System
- Consistent color palette
- Typography hierarchy
- Component-based design
- Accessibility considerations

## Development

### Adding New Features
1. Create new JavaScript module in `js/` directory
2. Add corresponding CSS in `css/` directory
3. Update `index.html` with new elements
4. Register new functionality in `app.js`

### Styling Guidelines
- Use CSS Grid and Flexbox for layouts
- Follow BEM methodology for CSS classes
- Use CSS custom properties for theming
- Ensure mobile-first responsive design

### JavaScript Guidelines
- Use ES6+ features and modern syntax
- Follow class-based architecture
- Implement proper error handling
- Use async/await for API calls

## Troubleshooting

### Common Issues

**1. API Connection Errors**
- Ensure backend server is running on port 3000
- Check CORS configuration in backend
- Verify API endpoints in `config.js`

**2. Authentication Issues**
- Clear browser local storage
- Check JWT token expiration
- Verify login credentials

**3. Image Loading Issues**
- Check image file paths
- Ensure backend uploads directory exists
- Verify image file permissions

**4. Responsive Issues**
- Test on different screen sizes
- Check CSS media queries
- Verify viewport meta tag

### Debug Mode
Enable debug logging by adding to browser console:
```javascript
localStorage.setItem('debug', 'true');
```

## Performance

### Optimization Tips
- Images are lazy-loaded
- CSS and JS are minified for production
- API calls are debounced where appropriate
- Local storage is used for caching

### Loading Performance
- Initial load: ~2-3 seconds
- Page transitions: ~200ms
- API responses: ~500ms average

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the backend documentation
3. Contact the development team

---

**DukaanSaathi** - Your one-stop destination for Stationaries, Fancy Items, Toys, and Gifts! 🎁 