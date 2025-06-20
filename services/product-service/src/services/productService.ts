import { Product, ProductDocument } from '../models/Product';
import { ProductCreateRequest, ProductUpdateRequest, Product as IProduct } from '../../../../shared/types';
import { logger } from '../../../../shared/utils/src/logger';
import { NotFoundError, ConflictError, ValidationError } from '../../../../shared/middleware/errorHandler';
import { EventBus, createEvent } from '../../../../shared/utils/src/eventBus';
import { dbUtils } from '../../../../shared/utils/src/database';

export class ProductService {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Create a new product
   */
  async createProduct(productData: ProductCreateRequest, createdBy: string): Promise<IProduct> {
    try {
      // Check if SKU already exists
      const existingProduct = await Product.findOne({ sku: productData.sku.toUpperCase() });
      if (existingProduct) {
        throw new ConflictError('Product with this SKU already exists');
      }

      // Create new product
      const product = new Product({
        ...productData,
        sku: productData.sku.toUpperCase(),
        createdBy,
        updatedBy: createdBy
      });

      await product.save();

      // Publish product created event
      const productCreatedEvent = createEvent(
        'ProductCreated',
        product._id.toString(),
        'Product',
        {
          productId: product._id.toString(),
          name: product.name,
          sku: product.sku,
          stock: product.stock,
          price: product.price,
          category: product.category,
          createdBy
        }
      );

      await this.eventBus.publish('micropulse.events', 'product.created', productCreatedEvent);

      logger.info(`Product created successfully: ${product.name} (${product.sku})`);

      return this.toProductResponse(product);

    } catch (error) {
      logger.error('Product creation failed:', error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(productId: string): Promise<IProduct> {
    try {
      if (!dbUtils.isValidObjectId(productId)) {
        throw new ValidationError('Invalid product ID format');
      }

      const product = await Product.findById(productId);
      
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      return this.toProductResponse(product);

    } catch (error) {
      logger.error(`Failed to get product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Get product by SKU
   */
  async getProductBySku(sku: string): Promise<IProduct> {
    try {
      const product = await Product.findOne({ sku: sku.toUpperCase() });
      
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      return this.toProductResponse(product);

    } catch (error) {
      logger.error(`Failed to get product by SKU ${sku}:`, error);
      throw error;
    }
  }

  /**
   * Update product
   */
  async updateProduct(productId: string, updateData: ProductUpdateRequest, updatedBy: string): Promise<IProduct> {
    try {
      if (!dbUtils.isValidObjectId(productId)) {
        throw new ValidationError('Invalid product ID format');
      }

      // Check if SKU is being updated and if it conflicts
      if (updateData.sku) {
        const existingProduct = await Product.findOne({ 
          sku: updateData.sku.toUpperCase(),
          _id: { $ne: productId }
        });
        
        if (existingProduct) {
          throw new ConflictError('Product with this SKU already exists');
        }
        
        updateData.sku = updateData.sku.toUpperCase();
      }

      const product = await Product.findByIdAndUpdate(
        productId,
        { 
          ...updateData,
          updatedBy,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );

      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Publish product updated event
      const productUpdatedEvent = createEvent(
        'ProductUpdated',
        productId,
        'Product',
        {
          productId,
          updatedFields: Object.keys(updateData),
          updatedBy,
          updatedAt: new Date()
        }
      );

      await this.eventBus.publish('micropulse.events', 'product.updated', productUpdatedEvent);

      logger.info(`Product updated successfully: ${product.name} (${product.sku})`);

      return this.toProductResponse(product);

    } catch (error) {
      logger.error(`Failed to update product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Delete product (soft delete)
   */
  async deleteProduct(productId: string, deletedBy: string): Promise<void> {
    try {
      if (!dbUtils.isValidObjectId(productId)) {
        throw new ValidationError('Invalid product ID format');
      }

      const product = await Product.findByIdAndUpdate(
        productId,
        { 
          isActive: false,
          updatedBy: deletedBy,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Publish product deleted event
      const productDeletedEvent = createEvent(
        'ProductDeleted',
        productId,
        'Product',
        {
          productId,
          name: product.name,
          sku: product.sku,
          deletedBy,
          deletedAt: new Date()
        }
      );

      await this.eventBus.publish('micropulse.events', 'product.deleted', productDeletedEvent);

      logger.info(`Product deleted successfully: ${product.name} (${product.sku})`);

    } catch (error) {
      logger.error(`Failed to delete product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Get all products with filtering and pagination
   */
  async getAllProducts(filters: any = {}, page: number = 1, limit: number = 10): Promise<{
    products: IProduct[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const { skip, limit: limitNum } = dbUtils.getPaginationOptions(page, limit);
      const query: any = {};

      // Apply filters
      if (filters.category) {
        query.category = filters.category;
      }
      
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      } else {
        query.isActive = true; // Default to active products
      }
      
      if (filters.minPrice || filters.maxPrice) {
        query.price = {};
        if (filters.minPrice) query.price.$gte = parseFloat(filters.minPrice);
        if (filters.maxPrice) query.price.$lte = parseFloat(filters.maxPrice);
      }
      
      if (filters.search) {
        query.$text = { $search: filters.search };
      }
      
      if (filters.tags && Array.isArray(filters.tags)) {
        query.tags = { $in: filters.tags };
      }

      // Build sort criteria
      let sort: any = { createdAt: -1 }; // Default sort
      
      if (filters.sortBy) {
        const sortOrder = filters.sort === 'asc' ? 1 : -1;
        sort = { [filters.sortBy]: sortOrder };
        
        // Add text score for search queries
        if (filters.search) {
          sort.score = { $meta: 'textScore' };
        }
      }

      const [products, total] = await Promise.all([
        Product.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limitNum),
        Product.countDocuments(query)
      ]);

      return dbUtils.buildPaginationResponse(
        products.map(product => this.toProductResponse(product)),
        total,
        page,
        limitNum
      );

    } catch (error) {
      logger.error('Failed to get all products:', error);
      throw error;
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category: string, page: number = 1, limit: number = 10): Promise<{
    products: IProduct[];
    pagination: any;
  }> {
    try {
      return this.getAllProducts({ category, isActive: true }, page, limit);
    } catch (error) {
      logger.error(`Failed to get products by category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Search products
   */
  async searchProducts(query: string, page: number = 1, limit: number = 10): Promise<{
    products: IProduct[];
    pagination: any;
  }> {
    try {
      return this.getAllProducts({ search: query, isActive: true }, page, limit);
    } catch (error) {
      logger.error(`Failed to search products with query "${query}":`, error);
      throw error;
    }
  }

  /**
   * Update product stock
   */
  async updateStock(productId: string, newStock: number, updatedBy: string): Promise<IProduct> {
    try {
      if (!dbUtils.isValidObjectId(productId)) {
        throw new ValidationError('Invalid product ID format');
      }

      if (newStock < 0) {
        throw new ValidationError('Stock cannot be negative');
      }

      const product = await Product.findById(productId);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      const oldStock = product.stock;
      
      product.stock = newStock;
      product.updatedBy = updatedBy;
      await product.save();

      // Publish stock updated event
      const stockUpdatedEvent = createEvent(
        'ProductStockUpdated',
        productId,
        'Product',
        {
          productId,
          sku: product.sku,
          oldStock,
          newStock,
          updatedBy,
          updatedAt: new Date()
        }
      );

      await this.eventBus.publish('micropulse.events', 'product.stock_updated', stockUpdatedEvent);

      logger.info(`Product stock updated: ${product.sku} from ${oldStock} to ${newStock}`);

      return this.toProductResponse(product);

    } catch (error) {
      logger.error(`Failed to update stock for product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(): Promise<IProduct[]> {
    try {
      const products = await (Product as any).findLowStock();
      return products.map((product: ProductDocument) => this.toProductResponse(product));
    } catch (error) {
      logger.error('Failed to get low stock products:', error);
      throw error;
    }
  }

  /**
   * Get product categories
   */
  async getCategories(): Promise<string[]> {
    try {
      const categories = await Product.distinct('category', { isActive: true });
      return categories.sort();
    } catch (error) {
      logger.error('Failed to get product categories:', error);
      throw error;
    }
  }

  /**
   * Convert Product document to response format
   */
  private toProductResponse(product: ProductDocument): IProduct {
    const productObj = product.toJSON();
    
    // Add virtual fields
    productObj.isLowStock = product.isLowStock;
    productObj.isOutOfStock = product.isOutOfStock;
    productObj.discountedPrice = product.discountedPrice;
    
    return productObj;
  }
}

export default ProductService;
