# VyaparAI API Test Script
# Run this script to test all API endpoints

Write-Host "=== VyaparAI API Testing ===" -ForegroundColor Green
Write-Host ""

# Test 1: Health Check
Write-Host "1. Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET
    Write-Host "✅ Health Check: $($health.status) - $($health.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Get Products
Write-Host "2. Testing Products Endpoint..." -ForegroundColor Yellow
try {
    $products = Invoke-RestMethod -Uri "http://localhost:3000/api/products" -Method GET
    Write-Host "✅ Products: Found $($products.products.Count) products" -ForegroundColor Green
} catch {
    Write-Host "❌ Products Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Get Product Categories
Write-Host "3. Testing Product Categories..." -ForegroundColor Yellow
try {
    $categories = Invoke-RestMethod -Uri "http://localhost:3000/api/products/categories/list" -Method GET
    Write-Host "✅ Categories: Found $($categories.categories.Count) categories" -ForegroundColor Green
} catch {
    Write-Host "❌ Categories Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: User Registration
Write-Host "4. Testing User Registration..." -ForegroundColor Yellow
$registerData = @{
    name = "Test User"
    email = "testuser@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $register = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method POST -Body $registerData -ContentType "application/json"
    Write-Host "✅ Registration: User created successfully" -ForegroundColor Green
    $token = $register.token
    Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Cyan
} catch {
    Write-Host "❌ Registration Failed: $($_.Exception.Message)" -ForegroundColor Red
    $token = $null
}
Write-Host ""

# Test 5: User Login
Write-Host "5. Testing User Login..." -ForegroundColor Yellow
$loginData = @{
    email = "testuser@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $login = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    Write-Host "✅ Login: User logged in successfully" -ForegroundColor Green
    $token = $login.token
    Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Cyan
} catch {
    Write-Host "❌ Login Failed: $($_.Exception.Message)" -ForegroundColor Red
    $token = $null
}
Write-Host ""

# Test 6: Get User Profile (if token available)
if ($token) {
    Write-Host "6. Testing User Profile..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    try {
        $profile = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/profile" -Method GET -Headers $headers
        Write-Host "✅ Profile: User profile retrieved" -ForegroundColor Green
        Write-Host "   Name: $($profile.user.name)" -ForegroundColor Cyan
        Write-Host "   Email: $($profile.user.email)" -ForegroundColor Cyan
        Write-Host "   Role: $($profile.user.role)" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Profile Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""

    # Test 7: Get User Cart
    Write-Host "7. Testing User Cart..." -ForegroundColor Yellow
    try {
        $cart = Invoke-RestMethod -Uri "http://localhost:3000/api/cart" -Method GET -Headers $headers
        Write-Host "✅ Cart: Cart retrieved successfully" -ForegroundColor Green
        Write-Host "   Items: $($cart.cartItems.Count)" -ForegroundColor Cyan
        Write-Host "   Subtotal: ₹$($cart.subtotal)" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Cart Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""

    # Test 8: Get User Bills
    Write-Host "8. Testing User Bills..." -ForegroundColor Yellow
    try {
        $bills = Invoke-RestMethod -Uri "http://localhost:3000/api/bills/user" -Method GET -Headers $headers
        Write-Host "✅ Bills: User bills retrieved" -ForegroundColor Green
        Write-Host "   Count: $($bills.bills.Count) bills" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Bills Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 9: Admin Login
Write-Host "9. Testing Admin Login..." -ForegroundColor Yellow
$adminLoginData = @{
    email = "admin@vyaparai.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $adminLogin = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $adminLoginData -ContentType "application/json"
    Write-Host "✅ Admin Login: Admin logged in successfully" -ForegroundColor Green
    $adminToken = $adminLogin.token
    Write-Host "   Token: $($adminToken.Substring(0, 20))..." -ForegroundColor Cyan
} catch {
    Write-Host "❌ Admin Login Failed: $($_.Exception.Message)" -ForegroundColor Red
    $adminToken = $null
}
Write-Host ""

# Test 10: Admin Bills (if admin token available)
if ($adminToken) {
    Write-Host "10. Testing Admin Bills..." -ForegroundColor Yellow
    $adminHeaders = @{
        "Authorization" = "Bearer $adminToken"
    }
    
    try {
        $adminBills = Invoke-RestMethod -Uri "http://localhost:3000/api/bills/admin" -Method GET -Headers $adminHeaders
        Write-Host "✅ Admin Bills: All bills retrieved" -ForegroundColor Green
        Write-Host "   Count: $($adminBills.bills.Count) bills" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Admin Bills Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "=== API Testing Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Use Postman with the POSTMAN_API_VERIFICATION.md guide" -ForegroundColor White
Write-Host "2. Open test-api.html in your browser" -ForegroundColor White
Write-Host "3. Test specific endpoints as needed" -ForegroundColor White 