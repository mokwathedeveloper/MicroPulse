// Re-export shared types from backend
export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'moderator';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  sku: string;
  stock: number;
  images: string[];
  isActive: boolean;
  tags: string[];
  specifications?: {
    weight?: { value: number; unit: string };
    dimensions?: { length: number; width: number; height: number; unit: string };
    color?: string;
    material?: string;
    brand?: string;
    model?: string;
    warranty?: { duration: number; unit: string };
  };
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    slug?: string;
  };
  pricing?: {
    costPrice?: number;
    compareAtPrice?: number;
    discountPercentage?: number;
  };
  inventory?: {
    lowStockThreshold?: number;
    trackQuantity?: boolean;
    allowBackorder?: boolean;
  };
  ratings?: {
    average: number;
    count: number;
  };
  createdAt: string;
  updatedAt: string;
  isLowStock?: boolean;
  isOutOfStock?: boolean;
  discountedPrice?: number;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Order {
  _id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: Address;
  paymentMethod: string;
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  paymentDetails?: {
    transactionId?: string;
    paymentGateway?: string;
    paidAt?: string;
  };
  shipping?: {
    trackingNumber?: string;
    carrier?: string;
    shippedAt?: string;
    estimatedDelivery?: string;
    actualDelivery?: string;
  };
  notes?: {
    customerNotes?: string;
    internalNotes?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  _id: string;
  productId: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lastUpdated: string;
  lowStockThreshold: number;
  reorderPoint: number;
  maxStock?: number;
  location?: {
    warehouse: string;
    zone?: string;
    shelf?: string;
    bin?: string;
  };
  isLowStock: boolean;
  isOutOfStock: boolean;
  needsReorder: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: Date;
}

export interface OrderStatusUpdate {
  orderId: string;
  oldStatus: string;
  newStatus: string;
  timestamp: Date;
}

export interface InventoryUpdate {
  productId: string;
  oldQuantity: number;
  newQuantity: number;
  timestamp: Date;
}

// Frontend-specific types
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  tags?: string[];
  sortBy?: string;
  sort?: 'asc' | 'desc';
}

export interface OrderFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  lowStockCount: number;
  outOfStockCount: number;
  recentOrders: Order[];
  topProducts: Product[];
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  orderUpdates: boolean;
  promotions: boolean;
  newsletter: boolean;
}

export interface UserProfile extends User {
  profile?: {
    phone?: string;
    avatar?: string;
    bio?: string;
    dateOfBirth?: string;
    address?: Address;
    preferences?: {
      newsletter: boolean;
      notifications: NotificationPreferences;
      language: string;
      timezone: string;
    };
  };
}
