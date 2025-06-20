import mongoose, { Schema, Document } from 'mongoose';
import { Order as IOrder, OrderStatus, OrderItem, Address } from '../../../../shared/types';
import { baseSchemaOptions } from '../../../../shared/utils/src/database';

export interface OrderDocument extends Omit<IOrder, '_id'>, Document {
  toJSON(): any;
}

const addressSchema = new Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true }
}, { _id: false });

const orderItemSchema = new Schema({
  productId: {
    type: String,
    required: true,
    index: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  name: {
    type: String,
    required: true
  }
}, { _id: false });

const orderSchema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  items: {
    type: [orderItemSchema],
    required: true,
    validate: {
      validator: function(items: OrderItem[]) {
        return items && items.length > 0;
      },
      message: 'Order must have at least one item'
    }
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING,
    index: true
  },
  shippingAddress: {
    type: addressSchema,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending',
    index: true
  },
  paymentDetails: {
    transactionId: String,
    paymentGateway: String,
    paidAt: Date
  },
  shipping: {
    trackingNumber: String,
    carrier: String,
    shippedAt: Date,
    estimatedDelivery: Date,
    actualDelivery: Date
  },
  notes: {
    customerNotes: String,
    internalNotes: String
  },
  version: {
    type: Number,
    required: true,
    default: 1
  }
}, {
  ...baseSchemaOptions,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ 'items.productId': 1 });
orderSchema.index({ createdAt: -1 });

// Virtual for order total calculation
orderSchema.virtual('calculatedTotal').get(function(this: OrderDocument) {
  return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
});

// Virtual for order item count
orderSchema.virtual('itemCount').get(function(this: OrderDocument) {
  return this.items.reduce((count, item) => count + item.quantity, 0);
});

// Virtual for order status display
orderSchema.virtual('statusDisplay').get(function(this: OrderDocument) {
  return this.status.charAt(0).toUpperCase() + this.status.slice(1).replace('_', ' ');
});

// Pre-save middleware to validate total amount
orderSchema.pre('save', function(this: OrderDocument, next) {
  const calculatedTotal = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  
  // Allow small rounding differences (1 cent)
  if (Math.abs(this.totalAmount - calculatedTotal) > 0.01) {
    return next(new Error('Total amount does not match calculated total'));
  }
  
  next();
});

// Static method to find orders by user
orderSchema.statics.findByUser = function(userId: string) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Static method to find orders by status
orderSchema.statics.findByStatus = function(status: OrderStatus) {
  return this.find({ status }).sort({ createdAt: -1 });
};

// Static method to find orders by date range
orderSchema.statics.findByDateRange = function(startDate: Date, endDate: Date) {
  return this.find({
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ createdAt: -1 });
};

// Static method to get order statistics
orderSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);
  
  const totalOrders = await this.countDocuments();
  const totalRevenue = await this.aggregate([
    {
      $match: { status: { $in: [OrderStatus.DELIVERED, OrderStatus.SHIPPED] } }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalAmount' }
      }
    }
  ]);
  
  return {
    totalOrders,
    totalRevenue: totalRevenue[0]?.total || 0,
    statusBreakdown: stats
  };
};

export const Order = mongoose.model<OrderDocument>('Order', orderSchema);
export default Order;
