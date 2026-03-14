# DukaanSaathi API - Postman Verification Guide

## Base URL
```
http://localhost:3000/api
```

## Prerequisites
1. Ensure your backend server is running on `http://localhost:3000`
2. Import this collection into Postman
3. Set up environment variables for easier testing

## Environment Variables Setup
Create a new environment in Postman with these variables:
- `base_url`: `http://localhost:3000/api`
- `auth_token`: (will be set after login)
- `user_id`: (will be set after login)

---

## 1. Health Check

### GET /api/health
**Description**: Check if the API is running

**Request**:
- Method: `GET`
- URL: `{{base_url}}/health`

**Expected Response**:
```json
{
  "status": "OK",
  "message": "DukaanSaathi API is running"
}
```

---

## 2. Authentication Endpoints

### 2.1 User Registration
**POST /api/auth/register**

**Request**:
- Method: `POST`
- URL: `{{base_url}}/auth/register`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "name": "Test User",
  "email": "testuser@example.com",
  "password": "password123"
}
```

**Expected Response** (201):
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userID": 1,
    "name": "Test User",
    "email": "testuser@example.com",
    "role": "user"
  }
}
```

**Test Script** (to save token):
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set("auth_token", response.token);
    pm.environment.set("user_id", response.user.userID);
}
```

### 2.2 User Login
**POST /api/auth/login**

**Request**:
- Method: `POST`
- URL: `{{base_url}}/auth/login`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "email": "admin@DukaanSaathi.com",
  "password": "admin123"
}
```

**Expected Response** (200):
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userID": 1,
    "name": "Admin User",
    "email": "admin@DukaanSaathi.com",
    "role": "admin"
  }
}
```

**Test Script** (to save token):
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("auth_token", response.token);
    pm.environment.set("user_id", response.user.userID);
}
```

### 2.3 Get User Profile
**GET /api/auth/profile**

**Request**:
- Method: `GET`
- URL: `{{base_url}}/auth/profile`
- Headers: `Authorization: Bearer {{auth_token}}`

**Expected Response** (200):
```json
{
  "user": {
    "userID": 1,
    "name": "Admin User",
    "email": "admin@DukaanSaathi.com",
    "role": "admin"
  }
}
```

### 2.4 Verify Token
**GET /api/auth/verify**

**Request**:
- Method: `GET`
- URL: `{{base_url}}/auth/verify`
- Headers: `Authorization: Bearer {{auth_token}}`

**Expected Response** (200):
```json
{
  "valid": true,
  "user": {
    "userID": 1,
    "email": "admin@DukaanSaathi.com",
    "role": "admin"
  }
}
```

### 2.5 Logout
**POST /api/auth/logout**

**Request**:
- Method: `POST`
- URL: `{{base_url}}/auth/logout`
- Headers: `Authorization: Bearer {{auth_token}}`

**Expected Response** (200):
```json
{
  "message": "Logged out successfully"
}
```

---

## 3. Products Endpoints

### 3.1 Get All Products
**GET /api/products**

**Request**:
- Method: `GET`
- URL: `{{base_url}}/products`

**Query Parameters** (optional):
- `category`: Filter by category
- `search`: Search in name and description

**Expected Response** (200):
```json
{
  "products": [
    {
      "productID": 1,
      "name": "Product Name",
      "category": "Category",
      "description": "Description",
      "price": 100.00,
      "GST_applicable": 1,
      "quantity": 10,
      "image_url": "/uploads/image.jpg",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 3.2 Get Product by ID
**GET /api/products/:id**

**Request**:
- Method: `GET`
- URL: `{{base_url}}/products/1`

**Expected Response** (200):
```json
{
  "product": {
    "productID": 1,
    "name": "Product Name",
    "category": "Category",
    "description": "Description",
    "price": 100.00,
    "GST_applicable": 1,
    "quantity": 10,
    "image_url": "/uploads/image.jpg",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3.3 Get Product Categories
**GET /api/products/categories/list**

**Request**:
- Method: `GET`
- URL: `{{base_url}}/products/categories/list`

**Expected Response** (200):
```json
{
  "categories": ["Category1", "Category2", "Category3"]
}
```

### 3.4 Add New Product (Admin Only)
**POST /api/products**

**Request**:
- Method: `POST`
- URL: `{{base_url}}/products`
- Headers: 
  - `Authorization: Bearer {{auth_token}}`
  - `Content-Type: multipart/form-data`
- Body (form-data):
  - `name`: "New Product"
  - `category`: "Electronics"
  - `description`: "Product description"
  - `price`: "150.00"
  - `GST_applicable`: "true"
  - `quantity`: "20"
  - `image`: [file upload]

**Expected Response** (201):
```json
{
  "message": "Product added successfully",
  "product": {
    "productID": 2,
    "name": "New Product",
    "category": "Electronics",
    "description": "Product description",
    "price": 150.00,
    "GST_applicable": 1,
    "quantity": 20,
    "image_url": "/uploads/image.jpg",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3.5 Update Product (Admin Only)
**PUT /api/products/:id**

**Request**:
- Method: `PUT`
- URL: `{{base_url}}/products/1`
- Headers: 
  - `Authorization: Bearer {{auth_token}}`
  - `Content-Type: multipart/form-data`
- Body (form-data):
  - `name`: "Updated Product"
  - `price`: "200.00"
  - `quantity`: "15"

**Expected Response** (200):
```json
{
  "message": "Product updated successfully",
  "product": {
    "productID": 1,
    "name": "Updated Product",
    "price": 200.00,
    "quantity": 15
  }
}
```

### 3.6 Delete Product (Admin Only)
**DELETE /api/products/:id**

**Request**:
- Method: `DELETE`
- URL: `{{base_url}}/products/1`
- Headers: `Authorization: Bearer {{auth_token}}`

**Expected Response** (200):
```json
{
  "message": "Product deleted successfully"
}
```

### 3.7 Update Product Quantity (Admin Only)
**PATCH /api/products/:id/quantity**

**Request**:
- Method: `PATCH`
- URL: `{{base_url}}/products/1/quantity`
- Headers: 
  - `Authorization: Bearer {{auth_token}}`
  - `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "quantity": 25
}
```

**Expected Response** (200):
```json
{
  "message": "Product quantity updated successfully",
  "product": {
    "productID": 1,
    "quantity": 25
  }
}
```

---

## 4. Cart Endpoints

### 4.1 Get User Cart
**GET /api/cart**

**Request**:
- Method: `GET`
- URL: `{{base_url}}/cart`
- Headers: `Authorization: Bearer {{auth_token}}`

**Expected Response** (200):
```json
{
  "cartItems": [
    {
      "cartID": 1,
      "quantity": 2,
      "productID": 1,
      "name": "Product Name",
      "category": "Category",
      "description": "Description",
      "price": 100.00,
      "GST_applicable": 1,
      "image_url": "/uploads/image.jpg",
      "available_quantity": 10
    }
  ],
  "subtotal": 200.00,
  "totalItems": 2
}
```

### 4.2 Add Item to Cart
**POST /api/cart/add**

**Request**:
- Method: `POST`
- URL: `{{base_url}}/cart/add`
- Headers: 
  - `Authorization: Bearer {{auth_token}}`
  - `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "productID": 1,
  "quantity": 2
}
```

**Expected Response** (201):
```json
{
  "message": "Item added to cart",
  "cartItem": {
    "cartID": 1,
    "quantity": 2,
    "productID": 1,
    "name": "Product Name",
    "category": "Category",
    "description": "Description",
    "price": 100.00,
    "GST_applicable": 1,
    "image_url": "/uploads/image.jpg"
  }
}
```

### 4.3 Update Cart Item Quantity
**PUT /api/cart/update/:cartID**

**Request**:
- Method: `PUT`
- URL: `{{base_url}}/cart/update/1`
- Headers: 
  - `Authorization: Bearer {{auth_token}}`
  - `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "quantity": 3
}
```

**Expected Response** (200):
```json
{
  "message": "Cart item updated",
  "cartItem": {
    "cartID": 1,
    "quantity": 3,
    "productID": 1,
    "name": "Product Name",
    "price": 100.00
  }
}
```

### 4.4 Remove Item from Cart
**DELETE /api/cart/remove/:cartID**

**Request**:
- Method: `DELETE`
- URL: `{{base_url}}/cart/remove/1`
- Headers: `Authorization: Bearer {{auth_token}}`

**Expected Response** (200):
```json
{
  "message": "Item removed from cart"
}
```

### 4.5 Clear Cart
**DELETE /api/cart/clear**

**Request**:
- Method: `DELETE`
- URL: `{{base_url}}/cart/clear`
- Headers: `Authorization: Bearer {{auth_token}}`

**Expected Response** (200):
```json
{
  "message": "Cart cleared successfully"
}
```

---

## 5. Bills Endpoints

### 5.1 Generate User Bill from Cart
**POST /api/bills/user/generate**

**Request**:
- Method: `POST`
- URL: `{{base_url}}/bills/user/generate`
- Headers: `Authorization: Bearer {{auth_token}}`

**Expected Response** (201):
```json
{
  "message": "Bill generated successfully",
  "bill": {
    "billID": 1,
    "userID": 1,
    "items": [
      {
        "productID": 1,
        "name": "Product Name",
        "category": "Category",
        "price": 100.00,
        "quantity": 2,
        "total": 200.00,
        "GST_applicable": 1
      }
    ],
    "subtotal": 200.00,
    "GST_amount": 0,
    "total": 200.00,
    "bill_type": "user",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "note": "Please visit our store to complete your purchase. Online payment is not available."
}
```

### 5.2 Generate Admin Bill
**POST /api/bills/admin/generate**

**Request**:
- Method: `POST`
- URL: `{{base_url}}/bills/admin/generate`
- Headers: 
  - `Authorization: Bearer {{auth_token}}`
  - `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "items": [
    {
      "productID": 1,
      "quantity": 2
    }
  ],
  "customerName": "John Doe"
}
```

**Expected Response** (201):
```json
{
  "message": "Admin bill generated successfully",
  "bill": {
    "billID": 2,
    "userID": null,
    "items": [
      {
        "productID": 1,
        "name": "Product Name",
        "category": "Category",
        "price": 100.00,
        "quantity": 2,
        "total": 200.00,
        "GST_applicable": 1,
        "GST_amount": 36.00
      }
    ],
    "subtotal": 200.00,
    "GST_amount": 36.00,
    "total": 236.00,
    "bill_type": "admin",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "breakdown": {
    "subtotal": 200.00,
    "gstAmount": 36.00,
    "total": 236.00,
    "gstRate": "18%"
  },
  "customerName": "John Doe"
}
```

### 5.3 Get User Bills
**GET /api/bills/user**

**Request**:
- Method: `GET`
- URL: `{{base_url}}/bills/user`
- Headers: `Authorization: Bearer {{auth_token}}`

**Expected Response** (200):
```json
{
  "bills": [
    {
      "billID": 1,
      "userID": 1,
      "items": [...],
      "subtotal": 200.00,
      "GST_amount": 0,
      "total": 200.00,
      "bill_type": "user",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 5.4 Get All Bills (Admin Only)
**GET /api/bills/admin**

**Request**:
- Method: `GET`
- URL: `{{base_url}}/bills/admin`
- Headers: `Authorization: Bearer {{auth_token}}`

**Expected Response** (200):
```json
{
  "bills": [
    {
      "billID": 1,
      "userID": 1,
      "items": [...],
      "subtotal": 200.00,
      "GST_amount": 0,
      "total": 200.00,
      "bill_type": "user",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 5.5 Get Bill by ID
**GET /api/bills/:id**

**Request**:
- Method: `GET`
- URL: `{{base_url}}/bills/1`
- Headers: `Authorization: Bearer {{auth_token}}`

**Expected Response** (200):
```json
{
  "bill": {
    "billID": 1,
    "userID": 1,
    "items": [...],
    "subtotal": 200.00,
    "GST_amount": 0,
    "total": 200.00,
    "bill_type": "user",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 6. Testing Workflow

### Complete User Journey Test:

1. **Health Check**: Verify API is running
2. **Register User**: Create a new user account
3. **Login**: Authenticate and get token
4. **Browse Products**: Get all products
5. **Add to Cart**: Add items to cart
6. **View Cart**: Check cart contents
7. **Generate Bill**: Create a bill from cart
8. **View Bills**: Check user's bills

### Admin Journey Test:

1. **Login as Admin**: Use admin credentials
2. **Add Product**: Create new product
3. **Update Product**: Modify product details
4. **Generate Admin Bill**: Create bill for customer
5. **View All Bills**: Check all bills in system
6. **Manage Inventory**: Update product quantities

### Error Testing:

1. **Invalid Login**: Test with wrong credentials
2. **Unauthorized Access**: Test endpoints without token
3. **Invalid Data**: Test with missing required fields
4. **Stock Validation**: Test adding more items than available
5. **Admin Only**: Test admin endpoints with user token

---

## 7. Postman Collection Import

You can import this collection by:
1. Creating a new collection in Postman
2. Adding all the requests above
3. Setting up environment variables
4. Running the tests in sequence

### Collection Variables:
- `base_url`: `http://localhost:3000/api`
- `auth_token`: (set after login)
- `user_id`: (set after login)
- `product_id`: (set after creating product)
- `cart_id`: (set after adding to cart)
- `bill_id`: (set after generating bill)

---

## 8. Automated Testing Scripts

Add these test scripts to verify responses:

### Authentication Tests:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has token", function () {
    const response = pm.response.json();
    pm.expect(response.token).to.exist;
});
```

### Product Tests:
```javascript
pm.test("Products array exists", function () {
    const response = pm.response.json();
    pm.expect(response.products).to.be.an('array');
});
```

### Cart Tests:
```javascript
pm.test("Cart has valid structure", function () {
    const response = pm.response.json();
    pm.expect(response.cartItems).to.be.an('array');
    pm.expect(response.subtotal).to.be.a('number');
});
```

This comprehensive guide will help you thoroughly test all API endpoints in your DukaanSaathi backend using Postman.
