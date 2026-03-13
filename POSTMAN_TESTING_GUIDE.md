# VyaparAI API - Complete Postman Testing Guide

## 🚀 **Integration Status**
✅ **Backend**: Running on `http://localhost:3000`  
✅ **Frontend**: Running on `http://localhost:5173`  
✅ **API Integration**: Complete with centralized API service  
✅ **Authentication**: JWT tokens working  
✅ **CORS**: Configured and working  

---

## 📋 **Step-by-Step Postman Testing Guide**

### **Step 1: Setup Postman Environment**

1. **Open Postman**
2. **Create New Environment**:
   - Click "Environments" → "New"
   - Name: `VyaparAI Local`
   - Add these variables:

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| `base_url` | `http://localhost:3000/api` | `http://localhost:3000/api` |
| `auth_token` | (leave empty) | (will be set after login) |
| `user_id` | (leave empty) | (will be set after login) |
| `product_id` | (leave empty) | (will be set after creating product) |
| `cart_id` | (leave empty) | (will be set after adding to cart) |
| `bill_id` | (leave empty) | (will be set after generating bill) |

3. **Save the environment**

---

### **Step 2: Create Postman Collection**

1. **Create New Collection**:
   - Click "Collections" → "New Collection"
   - Name: `VyaparAI API`
   - Description: `Complete API testing for VyaparAI`

2. **Set Collection Authorization**:
   - Go to Collection settings
   - Authorization tab
   - Type: `Bearer Token`
   - Token: `{{auth_token}}`

---

### **Step 3: Test Health Endpoint**

**Request**: `GET {{base_url}}/health`

**Steps**:
1. Create new request in collection
2. Method: `GET`
3. URL: `{{base_url}}/health`
4. Send request

**Expected Response**:
```json
{
  "status": "OK",
  "message": "VyaparAI API is running"
}
```

---

### **Step 4: Test Authentication**

#### **4.1 User Registration**

**Request**: `POST {{base_url}}/auth/register`

**Headers**:
```
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "name": "Test User",
  "email": "testuser@example.com",
  "password": "password123"
}
```

**Test Script** (add to Tests tab):
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set("auth_token", response.token);
    pm.environment.set("user_id", response.user.userID);
    
    pm.test("Registration successful", function () {
        pm.expect(response.message).to.eql("User registered successfully");
        pm.expect(response.token).to.exist;
        pm.expect(response.user).to.exist;
    });
}
```

**Expected Response**:
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

#### **4.2 User Login**

**Request**: `POST {{base_url}}/auth/login`

**Headers**:
```
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "email": "admin@vyaparai.com",
  "password": "admin123"
}
```

**Test Script**:
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("auth_token", response.token);
    pm.environment.set("user_id", response.user.userID);
    
    pm.test("Login successful", function () {
        pm.expect(response.message).to.eql("Login successful");
        pm.expect(response.token).to.exist;
        pm.expect(response.user).to.exist;
    });
}
```

#### **4.3 Get User Profile**

**Request**: `GET {{base_url}}/auth/profile`

**Headers**: (uses Bearer token from collection)

**Expected Response**:
```json
{
  "user": {
    "userID": 1,
    "name": "Admin User",
    "email": "admin@vyaparai.com",
    "role": "admin"
  }
}
```

---

### **Step 5: Test Products**

#### **5.1 Get All Products**

**Request**: `GET {{base_url}}/products`

**Expected Response**:
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

#### **5.2 Get Product Categories**

**Request**: `GET {{base_url}}/products/categories/list`

**Expected Response**:
```json
{
  "categories": ["Category1", "Category2", "Category3"]
}
```

#### **5.3 Add New Product (Admin Only)**

**Request**: `POST {{base_url}}/products`

**Headers**:
```
Content-Type: multipart/form-data
```

**Body** (form-data):
- `name`: `New Product`
- `category`: `Electronics`
- `description`: `Product description`
- `price`: `150.00`
- `GST_applicable`: `true`
- `quantity`: `20`
- `image`: [file upload]

**Test Script**:
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set("product_id", response.product.productID);
    
    pm.test("Product added successfully", function () {
        pm.expect(response.message).to.eql("Product added successfully");
        pm.expect(response.product).to.exist;
    });
}
```

---

### **Step 6: Test Cart Operations**

#### **6.1 Get User Cart**

**Request**: `GET {{base_url}}/cart`

**Expected Response**:
```json
{
  "cartItems": [],
  "subtotal": 0,
  "totalItems": 0
}
```

#### **6.2 Add Item to Cart**

**Request**: `POST {{base_url}}/cart/add`

**Headers**:
```
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "productID": 1,
  "quantity": 2
}
```

**Test Script**:
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set("cart_id", response.cartItem.cartID);
    
    pm.test("Item added to cart", function () {
        pm.expect(response.message).to.eql("Item added to cart");
        pm.expect(response.cartItem).to.exist;
    });
}
```

#### **6.3 Update Cart Item**

**Request**: `PUT {{base_url}}/cart/update/{{cart_id}}`

**Headers**:
```
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "quantity": 3
}
```

#### **6.4 Remove Item from Cart**

**Request**: `DELETE {{base_url}}/cart/remove/{{cart_id}}`

---

### **Step 7: Test Bills**

#### **7.1 Generate User Bill from Cart**

**Request**: `POST {{base_url}}/bills/user/generate`

**Test Script**:
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set("bill_id", response.bill.billID);
    
    pm.test("Bill generated successfully", function () {
        pm.expect(response.message).to.eql("Bill generated successfully");
        pm.expect(response.bill).to.exist;
    });
}
```

#### **7.2 Generate Admin Bill**

**Request**: `POST {{base_url}}/bills/admin/generate`

**Headers**:
```
Content-Type: application/json
```

**Body** (raw JSON):
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

**Test Script**:
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set("bill_id", response.bill.billID);
    
    pm.test("Admin bill generated successfully", function () {
        pm.expect(response.message).to.eql("Admin bill generated successfully");
        pm.expect(response.bill).to.exist;
        pm.expect(response.breakdown).to.exist;
    });
}
```

#### **7.3 Get User Bills**

**Request**: `GET {{base_url}}/bills/user`

#### **7.4 Get All Bills (Admin)**

**Request**: `GET {{base_url}}/bills/admin`

---

## 🔄 **Complete Testing Workflow**

### **User Journey Test**:

1. **Health Check** → Verify API is running
2. **Register User** → Create new account
3. **Login** → Authenticate and get token
4. **Get Profile** → Verify user data
5. **Browse Products** → Get all products
6. **Add to Cart** → Add items to cart
7. **View Cart** → Check cart contents
8. **Generate Bill** → Create bill from cart
9. **View Bills** → Check user's bills

### **Admin Journey Test**:

1. **Login as Admin** → Use admin credentials
2. **Add Product** → Create new product
3. **Update Product** → Modify product details
4. **Generate Admin Bill** → Create bill for customer
5. **View All Bills** → Check all bills in system
6. **Manage Inventory** → Update product quantities

---

## 🧪 **Advanced Testing Scenarios**

### **Error Testing**:

1. **Invalid Login**:
   ```json
   {
     "email": "wrong@email.com",
     "password": "wrongpassword"
   }
   ```

2. **Unauthorized Access**:
   - Remove Authorization header
   - Test protected endpoints

3. **Invalid Data**:
   ```json
   {
     "name": "",
     "email": "invalid-email",
     "password": "123"
   }
   ```

4. **Stock Validation**:
   ```json
   {
     "productID": 1,
     "quantity": 999999
   }
   ```

### **File Upload Testing**:

1. **Product Image Upload**:
   - Use form-data
   - Upload image file
   - Verify image URL in response

### **GST Calculation Testing**:

1. **Admin Bill with GST**:
   - Create bill with GST-applicable products
   - Verify GST breakdown in response

---

## 📊 **Testing Checklist**

- [ ] Health endpoint working
- [ ] User registration successful
- [ ] User login successful
- [ ] Token authentication working
- [ ] Products listing working
- [ ] Product categories working
- [ ] Cart operations working
- [ ] Bill generation working
- [ ] Admin functions working
- [ ] Error handling working
- [ ] File uploads working
- [ ] GST calculations working

---

## 🎯 **Quick Test Commands**

### **PowerShell Commands**:
```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET

# Login
$loginData = '{"email":"admin@vyaparai.com","password":"admin123"}'
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"

# Get products
Invoke-RestMethod -Uri "http://localhost:3000/api/products" -Method GET
```

### **Run Test Script**:
```powershell
.\test-api.ps1
```

---

## 🌐 **Frontend Integration**

Your React frontend is now fully integrated with the backend:

- **URL**: `http://localhost:5173`
- **API Proxy**: Configured in Vite
- **Authentication**: JWT tokens working
- **Real-time Updates**: Cart and user state synchronized

### **Test Frontend**:
1. Open `http://localhost:5173` in browser
2. Register/Login as user
3. Browse products
4. Add items to cart
5. Generate bills
6. Test admin features

---

## ✅ **Success Criteria**

Your API is fully functional when:
- All endpoints return correct status codes
- JWT authentication works properly
- Cart operations function correctly
- Bill generation works with GST
- File uploads work for product images
- Admin and user roles are properly enforced
- Error handling provides meaningful messages

**🎉 Your VyaparAI API is ready for production!** 