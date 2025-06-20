#  MicroPulse API Documentation

Complete API reference for all MicroPulse services accessible through the API Gateway.

##  Base URL

All API requests should be made to:
```
http://localhost:8000/api
```

##  Authentication

MicroPulse uses JWT (JSON Web Tokens) for authentication.

### Authentication Flow
1. **Login**: POST `/auth/login` with credentials
2. **Receive Tokens**: Get `accessToken` and `refreshToken`
3. **Use Token**: Include in `Authorization: Bearer <token>` header
4. **Refresh**: Use `/auth/refresh` when token expires

### Headers
```http
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

##  Authentication Endpoints

### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user"
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token"
    }
  }
}
```

### Register
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Refresh Token
```http
POST /api/auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "your_refresh_token"
}
```

### Logout
```http
POST /api/auth/logout
```

##  User Endpoints

### Get User Profile
```http
GET /api/users/profile
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "profile": {
      "phone": "+1234567890",
      "avatar": "avatar_url"
    }
  }
}
```

### Update User Profile
```http
PUT /api/users/profile
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "profile": {
    "phone": "+1234567890"
  }
}
```

### Change Password
```http
POST /api/users/change-password
```

**Request Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

##  Product Endpoints

### Get All Products
```http
GET /api/products
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `category` (string): Filter by category
- `search` (string): Search in name/description
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `sortBy` (string): Sort field (name, price, createdAt)
- `sort` (string): Sort order (asc, desc)

**Example:**
```http
GET /api/products?page=1&limit=10&category=electronics&search=laptop&sortBy=price&sort=asc
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "product_id",
      "name": "Gaming Laptop",
      "description": "High-performance gaming laptop",
      "price": 1299.99,
      "category": "electronics",
      "sku": "LAPTOP001",
      "stock": 15,
      "images": ["image1.jpg", "image2.jpg"],
      "isActive": true,
      "tags": ["gaming", "laptop", "electronics"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Get Product by ID
```http
GET /api/products/id/{productId}
```

### Get Product by SKU
```http
GET /api/products/sku/{sku}
```

### Get Products by Category
```http
GET /api/products/category/{category}
```

### Search Products
```http
GET /api/products/search?q={searchQuery}
```

### Get Product Categories
```http
GET /api/products/categories
```

**Response:**
```json
{
  "success": true,
  "data": ["electronics", "clothing", "books", "home"]
}
```

### Create Product (Admin Only)
```http
POST /api/products
```

**Request Body:**
```json
{
  "name": "Gaming Laptop",
  "description": "High-performance gaming laptop",
  "price": 1299.99,
  "category": "electronics",
  "sku": "LAPTOP001",
  "stock": 15,
  "images": ["image1.jpg"],
  "tags": ["gaming", "laptop"],
  "specifications": {
    "brand": "TechBrand",
    "model": "Gaming Pro",
    "warranty": {"duration": 2, "unit": "years"}
  }
}
```

### Update Product (Admin Only)
```http
PUT /api/products/{productId}
```

### Delete Product (Admin Only)
```http
DELETE /api/products/{productId}
```

### Update Product Stock (Admin Only)
```http
PATCH /api/products/{productId}/stock
```

**Request Body:**
```json
{
  "stock": 25
}
```

##  Order Endpoints

### Get My Orders
```http
GET /api/orders/my-orders
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page

### Get All Orders (Admin Only)
```http
GET /api/orders
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): Filter by order status
- `userId` (string): Filter by user ID
- `startDate` (string): Filter by start date
- `endDate` (string): Filter by end date

### Get Order by ID
```http
GET /api/orders/{orderId}
```

### Create Order
```http
POST /api/orders
```

**Request Body:**
```json
{
  "items": [
    {
      "productId": "product_id",
      "quantity": 2,
      "price": 1299.99,
      "name": "Gaming Laptop"
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "paymentMethod": "credit_card"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "orderId": "order_id"
  }
}
```

### Update Order Status (Admin Only)
```http
PATCH /api/orders/{orderId}/status
```

**Request Body:**
```json
{
  "status": "shipped"
}
```

### Process Payment (Admin Only)
```http
PATCH /api/orders/{orderId}/payment
```

**Request Body:**
```json
{
  "paymentStatus": "completed",
  "transactionId": "txn_123456",
  "paymentGateway": "stripe"
}
```

### Ship Order (Admin Only)
```http
PATCH /api/orders/{orderId}/ship
```

**Request Body:**
```json
{
  "trackingNumber": "TRACK123456",
  "carrier": "FedEx",
  "estimatedDelivery": "2024-01-15T10:00:00Z"
}
```

### Cancel Order
```http
PATCH /api/orders/{orderId}/cancel
```

**Request Body:**
```json
{
  "reason": "Customer requested cancellation"
}
```

##  Inventory Endpoints

### Get Inventory by Product ID
```http
GET /api/inventory/product/{productId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "inventory_id",
    "productId": "product_id",
    "quantity": 50,
    "reservedQuantity": 5,
    "availableQuantity": 45,
    "lowStockThreshold": 10,
    "isLowStock": false,
    "isOutOfStock": false,
    "lastUpdated": "2024-01-01T12:00:00Z"
  }
}
```

### Get All Inventory (Admin Only)
```http
GET /api/inventory
```

### Update Stock (Admin Only)
```http
PATCH /api/inventory/update-stock
```

**Request Body:**
```json
{
  "productId": "product_id",
  "quantity": 10,
  "operation": "add"
}
```

### Get Low Stock Items (Admin Only)
```http
GET /api/inventory/low-stock
```

### Get Out of Stock Items (Admin Only)
```http
GET /api/inventory/out-of-stock
```

##  Admin Endpoints

### Get Order Statistics (Admin Only)
```http
GET /api/orders/admin/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalOrders": 1250,
    "totalRevenue": 125000.50,
    "statusBreakdown": [
      {"_id": "pending", "count": 45, "totalAmount": 4500},
      {"_id": "shipped", "count": 890, "totalAmount": 89000}
    ]
  }
}
```

### Get Inventory Statistics (Admin Only)
```http
GET /api/inventory/statistics
```

##  WebSocket Events

Connect to WebSocket at `ws://localhost:8080`

### Connection
```javascript
const ws = new WebSocket('ws://localhost:8080?token=your_jwt_token');
```

### Event Types

#### Order Status Updates
```json
{
  "type": "order_status_update",
  "payload": {
    "orderId": "order_id",
    "oldStatus": "pending",
    "newStatus": "shipped",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

#### Inventory Updates
```json
{
  "type": "inventory_update",
  "payload": {
    "productId": "product_id",
    "oldQuantity": 50,
    "newQuantity": 45,
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

##  Response Format

All API responses follow this standard format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ },
  "pagination": { /* pagination info if applicable */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

##  HTTP Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Too Many Requests
- `500` - Internal Server Error

##  Rate Limiting

API endpoints are rate-limited to prevent abuse:
- **General endpoints**: 100 requests per minute
- **Authentication endpoints**: 10 requests per minute
- **Admin endpoints**: 200 requests per minute

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

##  Testing with cURL

### Login Example
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@micropulse.com","password":"user123"}'
```

### Get Products Example
```bash
curl -X GET "http://localhost:8000/api/products?page=1&limit=5" \
  -H "Authorization: Bearer your_jwt_token"
```

### Create Order Example
```bash
curl -X POST http://localhost:8000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{
    "items": [{"productId":"product_id","quantity":1,"price":99.99,"name":"Test Product"}],
    "shippingAddress": {"street":"123 Main St","city":"NYC","state":"NY","zipCode":"10001","country":"USA"},
    "paymentMethod": "credit_card"
  }'
```

##  Postman Collection

Import this collection to test all endpoints:

```json
{
  "info": {
    "name": "MicroPulse API",
    "description": "Complete API collection for MicroPulse e-commerce platform"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:8000/api"
    },
    {
      "key": "token",
      "value": ""
    }
  ]
}
```

##  API Testing Tools

### Recommended Tools
- **Postman**: GUI-based API testing
- **Insomnia**: Alternative to Postman
- **cURL**: Command-line testing
- **HTTPie**: User-friendly command-line tool

### Environment Variables
Set these variables in your testing tool:
- `baseUrl`: `http://localhost:8000/api`
- `token`: Your JWT token after login
- `adminToken`: Admin JWT token

---

This API documentation provides comprehensive coverage of all available endpoints in the MicroPulse platform.
