import mongoose, { Schema, Document } from 'mongoose';
import { Product as IProduct } from '../../../../shared/types';
import { baseSchemaOptions } from '../../../../shared/utils/src/database';

export interface ProductDocument extends Omit<IProduct, '_id'>, Document {
  toJSON(): any;
}

const productSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters'],
    index: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    maxlength: [1000, 'Product description cannot exceed 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative'],
    validate: {
      validator: function(value: number) {
        return Number.isFinite(value) && value >= 0;
      },
      message: 'Price must be a valid positive number'
    }
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters'],
    index: true
  },
  sku: {
    type: String,
    required: [true, 'Product SKU is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [50, 'SKU cannot exceed 50 characters'],
    match: [/^[A-Z0-9-_]+$/, 'SKU can only contain uppercase letters, numbers, hyphens, and underscores']
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0,
    validate: {
      validator: function(value: number) {
        return Number.isInteger(value) && value >= 0;
      },
      message: 'Stock must be a non-negative integer'
    }
  },
  images: [{
    type: String,
    trim: true,
    validate: {
      validator: function(value: string) {
        // Basic URL validation
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(value);
      },
      message: 'Image must be a valid URL ending with jpg, jpeg, png, gif, or webp'
    }
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  specifications: {
    weight: {
      value: Number,
      unit: {
        type: String,
        enum: ['g', 'kg', 'lb', 'oz'],
        default: 'kg'
      }
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: {
        type: String,
        enum: ['mm', 'cm', 'm', 'in', 'ft'],
        default: 'cm'
      }
    },
    color: String,
    material: String,
    brand: String,
    model: String,
    warranty: {
      duration: Number,
      unit: {
        type: String,
        enum: ['days', 'months', 'years'],
        default: 'months'
      }
    }
  },
  seo: {
    metaTitle: {
      type: String,
      maxlength: [60, 'Meta title cannot exceed 60 characters']
    },
    metaDescription: {
      type: String,
      maxlength: [160, 'Meta description cannot exceed 160 characters']
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
    }
  },
  pricing: {
    costPrice: {
      type: Number,
      min: [0, 'Cost price cannot be negative']
    },
    compareAtPrice: {
      type: Number,
      min: [0, 'Compare at price cannot be negative']
    },
    discountPercentage: {
      type: Number,
      min: [0, 'Discount percentage cannot be negative'],
      max: [100, 'Discount percentage cannot exceed 100']
    }
  },
  inventory: {
    lowStockThreshold: {
      type: Number,
      min: [0, 'Low stock threshold cannot be negative'],
      default: 10
    },
    trackQuantity: {
      type: Boolean,
      default: true
    },
    allowBackorder: {
      type: Boolean,
      default: false
    }
  },
  ratings: {
    average: {
      type: Number,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5'],
      default: 0
    },
    count: {
      type: Number,
      min: [0, 'Rating count cannot be negative'],
      default: 0
    }
  },
  createdBy: {
    type: String,
    required: [true, 'Created by user ID is required']
  },
  updatedBy: {
    type: String
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
productSchema.index({ name: 'text', description: 'text', tags: 'text' }); // Text search
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ 'ratings.average': -1 });
productSchema.index({ stock: 1 });

// Virtual for low stock status
productSchema.virtual('isLowStock').get(function(this: ProductDocument) {
  return this.stock <= (this.inventory?.lowStockThreshold || 10);
});

// Virtual for out of stock status
productSchema.virtual('isOutOfStock').get(function(this: ProductDocument) {
  return this.stock === 0;
});

// Virtual for discounted price
productSchema.virtual('discountedPrice').get(function(this: ProductDocument) {
  if (this.pricing?.discountPercentage && this.pricing.discountPercentage > 0) {
    return this.price * (1 - this.pricing.discountPercentage / 100);
  }
  return this.price;
});

// Pre-save middleware to generate slug
productSchema.pre('save', function(this: ProductDocument, next) {
  if (this.isModified('name') && !this.seo?.slug) {
    this.seo = this.seo || {};
    this.seo.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  next();
});

// Static method to find active products
productSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// Static method to find by category
productSchema.statics.findByCategory = function(category: string) {
  return this.find({ category, isActive: true });
};

// Static method to search products
productSchema.statics.search = function(query: string) {
  return this.find({
    $text: { $search: query },
    isActive: true
  }).sort({ score: { $meta: 'textScore' } });
};

// Static method to find low stock products
productSchema.statics.findLowStock = function() {
  return this.find({
    $expr: {
      $lte: ['$stock', '$inventory.lowStockThreshold']
    },
    isActive: true
  });
};

export const Product = mongoose.model<ProductDocument>('Product', productSchema);
export default Product;
