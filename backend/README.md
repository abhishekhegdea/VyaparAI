# VyaparAI - Backend API

A Node.js/Express backend for the VyaparAI e-commerce system with user/admin authentication, product management, cart functionality, and billing system.

## Features

- 🔐 **Authentication System**: JWT-based login for users and admins
- 📦 **Product Management**: CRUD operations for products with categories
- 🛒 **Shopping Cart**: Add, remove, and manage cart items
- 💰 **Billing System**: Generate bills with and without GST
- 📊 **Inventory Management**: Automatic stock updates
- 🖼️ **File Upload**: Product image upload support
- 📈 **Admin Dashboard**: Comprehensive admin controls

## Tech Stack

- **Runtime**: Node.js with Bun
- **Framework**: Express.js
- **Database**: MongoDB Atlas (via Mongoose)
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Password Hashing**: bcryptjs

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) installed on your system
- Node.js (for compatibility)

### Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Start the development server:
   ```bash
   bun run dev
   ```

The server will start on `http://localhost:3000`

### Default Admin Account

- **Email**: admin@vyaparai.com
- **Password**: admin123

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User/Admin login |
| POST | `/api/auth/admin/login` | Admin-only login |
| GET | `/api/auth/profile` | Get user profile |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/verify` | Verify JWT token |

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all products |
| GET | `/api/products/:id` | Get product by ID |
| GET | `/api/products/categories/list` | Get product categories |
| POST | `/api/products` | Add new product (Admin) |
| PUT | `/api/products/:id` | Update product (Admin) |
| DELETE | `/api/products/:id` | Delete product (Admin) |
| PATCH | `/api/products/:id/quantity` | Update quantity (Admin) |

### Cart

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cart` | Get user's cart |
| POST | `/api/cart/add` | Add item to cart |
| PUT | `/api/cart/update/:cartID` | Update cart item quantity |
| DELETE | `/api/cart/remove/:cartID` | Remove item from cart |
| DELETE | `/api/cart/clear` | Clear entire cart |
| GET | `/api/cart/summary` | Get cart summary |

### Bills

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bills/user/generate` | Generate user bill (no GST) |
| POST | `/api/bills/admin/generate` | Generate admin bill (with GST) |
| GET | `/api/bills/user` | Get user's bills |
| GET | `/api/bills/admin` | Get all bills (Admin) |
| GET | `/api/bills/:billID` | Get bill by ID |
| GET | `/api/bills/admin/stats` | Get billing statistics (Admin) |

## Database Collections

The backend uses MongoDB Atlas with these collections:

- users
- products
- cart
- bills
- counters (used to maintain numeric IDs like userID and productID)

## Sample Products

The system comes with sample products in these categories:
- **Stationaries**: Pencil Set, Notebook
- **Toys**: Teddy Bear, Remote Car
- **Gifts**: Gift Box, Birthday Card
- **Fancy Items**: Flower Vase, Candle Holder

## Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=3000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/?retryWrites=true&w=majority
MONGODB_DB_NAME=vyaparai
JWT_SECRET=your-jwt-secret-key
SESSION_SECRET=your-session-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

## File Upload

Product images are stored in Cloudinary when `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are configured. If those values are missing, the app falls back to the local `uploads/` directory. Supported formats:
- JPEG/JPG
- PNG
- GIF

Maximum file size: 5MB

## GST Calculation

- **GST Rate**: 18%
- **User Bills**: No GST applied
- **Admin Bills**: GST applied to applicable products

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "error": "Error message description"
}
```

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation
- SQL injection prevention
- File upload restrictions

## Development

### Running Tests
```bash
bun test
```

### Database Reset
Use MongoDB Atlas to drop the database configured in `MONGODB_DB_NAME`, then restart the server.

### Logs
Server logs are displayed in the console with timestamps and error details.

## Production Deployment

1. Set environment variables
2. Use HTTPS in production
3. Set secure cookie options
4. Configure proper CORS origins
5. Use MongoDB Atlas network restrictions and least-privilege DB users
6. Set up proper logging
7. Configure reverse proxy (Nginx)

## Support

For issues and questions, please check the frontend documentation or contact the development team. 