import mongoose, { Schema, Document } from 'mongoose';
import { InventoryItem } from '../../../../shared/types';
import { baseSchemaOptions } from '../../../../shared/utils/src/database';

export interface InventoryDocument extends Omit<InventoryItem, '_id'>, Document {
  toJSON(): any;
}

const inventorySchema = new Schema({
  productId: {
    type: String,
    required: [true, 'Product ID is required'],
    unique: true,
    index: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0,
    validate: {
      validator: function(value: number) {
        return Number.isInteger(value) && value >= 0;
      },
      message: 'Quantity must be a non-negative integer'
    }
  },
  reservedQuantity: {
    type: Number,
    required: true,
    min: [0, 'Reserved quantity cannot be negative'],
    default: 0,
    validate: {
      validator: function(value: number) {
        return Number.isInteger(value) && value >= 0;
      },
      message: 'Reserved quantity must be a non-negative integer'
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true
  },
  lowStockThreshold: {
    type: Number,
    min: [0, 'Low stock threshold cannot be negative'],
    default: 10
  },
  reorderPoint: {
    type: Number,
    min: [0, 'Reorder point cannot be negative'],
    default: 5
  },
  maxStock: {
    type: Number,
    min: [0, 'Max stock cannot be negative']
  },
  location: {
    warehouse: {
      type: String,
      default: 'MAIN'
    },
    zone: String,
    shelf: String,
    bin: String
  },
  movements: [{
    type: {
      type: String,
      enum: ['IN', 'OUT', 'RESERVED', 'RELEASED', 'ADJUSTMENT'],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    reference: String, // Order ID, Purchase Order, etc.
    timestamp: {
      type: Date,
      default: Date.now
    },
    userId: String
  }],
  alerts: [{
    type: {
      type: String,
      enum: ['LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCK', 'NEGATIVE_STOCK'],
      required: true
    },
    message: String,
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    resolvedAt: Date
  }]
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
inventorySchema.index({ productId: 1 }, { unique: true });
inventorySchema.index({ quantity: 1 });
inventorySchema.index({ lastUpdated: -1 });
inventorySchema.index({ 'location.warehouse': 1 });

// Virtual for available quantity
inventorySchema.virtual('availableQuantity').get(function(this: InventoryDocument) {
  return Math.max(0, this.quantity - this.reservedQuantity);
});

// Virtual for low stock status
inventorySchema.virtual('isLowStock').get(function(this: InventoryDocument) {
  return this.quantity <= this.lowStockThreshold;
});

// Virtual for out of stock status
inventorySchema.virtual('isOutOfStock').get(function(this: InventoryDocument) {
  return this.quantity === 0;
});

// Virtual for needs reorder
inventorySchema.virtual('needsReorder').get(function(this: InventoryDocument) {
  return this.quantity <= this.reorderPoint;
});

// Pre-save middleware to update lastUpdated
inventorySchema.pre('save', function(this: InventoryDocument, next) {
  if (this.isModified('quantity') || this.isModified('reservedQuantity')) {
    this.lastUpdated = new Date();
  }
  next();
});

// Pre-save middleware to validate reserved quantity
inventorySchema.pre('save', function(this: InventoryDocument, next) {
  if (this.reservedQuantity > this.quantity) {
    return next(new Error('Reserved quantity cannot exceed total quantity'));
  }
  next();
});

// Static method to find by product ID
inventorySchema.statics.findByProductId = function(productId: string) {
  return this.findOne({ productId });
};

// Static method to find low stock items
inventorySchema.statics.findLowStock = function() {
  return this.find({
    $expr: {
      $lte: ['$quantity', '$lowStockThreshold']
    }
  });
};

// Static method to find out of stock items
inventorySchema.statics.findOutOfStock = function() {
  return this.find({ quantity: 0 });
};

// Static method to find items needing reorder
inventorySchema.statics.findNeedingReorder = function() {
  return this.find({
    $expr: {
      $lte: ['$quantity', '$reorderPoint']
    }
  });
};

// Instance method to reserve quantity
inventorySchema.methods.reserve = function(this: InventoryDocument, quantity: number, reason: string, reference?: string, userId?: string) {
  if (quantity <= 0) {
    throw new Error('Reserve quantity must be positive');
  }
  
  if (this.availableQuantity < quantity) {
    throw new Error('Insufficient available quantity to reserve');
  }
  
  this.reservedQuantity += quantity;
  this.movements.push({
    type: 'RESERVED',
    quantity,
    reason,
    reference,
    userId,
    timestamp: new Date()
  });
  
  return this.save();
};

// Instance method to release reserved quantity
inventorySchema.methods.release = function(this: InventoryDocument, quantity: number, reason: string, reference?: string, userId?: string) {
  if (quantity <= 0) {
    throw new Error('Release quantity must be positive');
  }
  
  if (this.reservedQuantity < quantity) {
    throw new Error('Cannot release more than reserved quantity');
  }
  
  this.reservedQuantity -= quantity;
  this.movements.push({
    type: 'RELEASED',
    quantity,
    reason,
    reference,
    userId,
    timestamp: new Date()
  });
  
  return this.save();
};

// Instance method to adjust quantity
inventorySchema.methods.adjust = function(this: InventoryDocument, newQuantity: number, reason: string, userId?: string) {
  if (newQuantity < 0) {
    throw new Error('Quantity cannot be negative');
  }
  
  if (newQuantity < this.reservedQuantity) {
    throw new Error('New quantity cannot be less than reserved quantity');
  }
  
  const difference = newQuantity - this.quantity;
  this.quantity = newQuantity;
  
  this.movements.push({
    type: 'ADJUSTMENT',
    quantity: difference,
    reason,
    userId,
    timestamp: new Date()
  });
  
  return this.save();
};

// Instance method to add stock
inventorySchema.methods.addStock = function(this: InventoryDocument, quantity: number, reason: string, reference?: string, userId?: string) {
  if (quantity <= 0) {
    throw new Error('Add quantity must be positive');
  }
  
  this.quantity += quantity;
  this.movements.push({
    type: 'IN',
    quantity,
    reason,
    reference,
    userId,
    timestamp: new Date()
  });
  
  return this.save();
};

// Instance method to remove stock
inventorySchema.methods.removeStock = function(this: InventoryDocument, quantity: number, reason: string, reference?: string, userId?: string) {
  if (quantity <= 0) {
    throw new Error('Remove quantity must be positive');
  }
  
  if (this.quantity < quantity) {
    throw new Error('Insufficient quantity to remove');
  }
  
  this.quantity -= quantity;
  this.movements.push({
    type: 'OUT',
    quantity,
    reason,
    reference,
    userId,
    timestamp: new Date()
  });
  
  return this.save();
};

export const Inventory = mongoose.model<InventoryDocument>('Inventory', inventorySchema);
export default Inventory;
