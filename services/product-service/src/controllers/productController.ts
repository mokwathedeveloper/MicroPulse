import { Request, Response } from 'express';
import { ProductService } from '../services/productService';
import { logger } from '../../../../shared/utils/src/logger';
import { ApiResponse } from '../../../../shared/types';
import { asyncHandler } from '../../../../shared/middleware/errorHandler';

export class ProductController {
  private productService: ProductService;

  constructor(productService: ProductService) {
    this.productService = productService;
  }

  /**
   * Create a new product
   */
  createProduct = asyncHandler(async (req: Request, res: Response) => {
    const createdBy = req.user?.userId || 'system';
    const productData = req.body;

    const product = await this.productService.createProduct(productData, createdBy);

    const response: ApiResponse = {
      success: true,
      message: 'Product created successfully',
      data: product
    };

    res.status(201).json(response);
  });

  /**
   * Get all products
   */
  getAllProducts = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const filters = {
      category: req.query.category as string,
      minPrice: req.query.minPrice as string,
      maxPrice: req.query.maxPrice as string,
      search: req.query.search as string,
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
      sortBy: req.query.sortBy as string,
      sort: req.query.sort as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined
    };

    const result = await this.productService.getAllProducts(filters, page, limit);

    const response: ApiResponse = {
      success: true,
      data: result.products,
      pagination: result.pagination
    };

    res.json(response);
  });

  /**
   * Get product by ID
   */
  getProductById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const product = await this.productService.getProductById(id);

    const response: ApiResponse = {
      success: true,
      data: product
    };

    res.json(response);
  });

  /**
   * Get product by SKU
   */
  getProductBySku = asyncHandler(async (req: Request, res: Response) => {
    const { sku } = req.params;

    const product = await this.productService.getProductBySku(sku);

    const response: ApiResponse = {
      success: true,
      data: product
    };

    res.json(response);
  });

  /**
   * Update product
   */
  updateProduct = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updatedBy = req.user?.userId || 'system';
    const updateData = req.body;

    const product = await this.productService.updateProduct(id, updateData, updatedBy);

    const response: ApiResponse = {
      success: true,
      message: 'Product updated successfully',
      data: product
    };

    res.json(response);
  });

  /**
   * Delete product
   */
  deleteProduct = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const deletedBy = req.user?.userId || 'system';

    await this.productService.deleteProduct(id, deletedBy);

    const response: ApiResponse = {
      success: true,
      message: 'Product deleted successfully'
    };

    res.json(response);
  });

  /**
   * Get products by category
   */
  getProductsByCategory = asyncHandler(async (req: Request, res: Response) => {
    const { category } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await this.productService.getProductsByCategory(category, page, limit);

    const response: ApiResponse = {
      success: true,
      data: result.products,
      pagination: result.pagination
    };

    res.json(response);
  });

  /**
   * Search products
   */
  searchProducts = asyncHandler(async (req: Request, res: Response) => {
    const { q } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const result = await this.productService.searchProducts(q, page, limit);

    const response: ApiResponse = {
      success: true,
      data: result.products,
      pagination: result.pagination
    };

    res.json(response);
  });

  /**
   * Update product stock
   */
  updateStock = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { stock } = req.body;
    const updatedBy = req.user?.userId || 'system';

    const product = await this.productService.updateStock(id, stock, updatedBy);

    const response: ApiResponse = {
      success: true,
      message: 'Product stock updated successfully',
      data: product
    };

    res.json(response);
  });

  /**
   * Get low stock products
   */
  getLowStockProducts = asyncHandler(async (req: Request, res: Response) => {
    const products = await this.productService.getLowStockProducts();

    const response: ApiResponse = {
      success: true,
      data: products
    };

    res.json(response);
  });

  /**
   * Get product categories
   */
  getCategories = asyncHandler(async (req: Request, res: Response) => {
    const categories = await this.productService.getCategories();

    const response: ApiResponse = {
      success: true,
      data: categories
    };

    res.json(response);
  });

  /**
   * Upload product images
   */
  uploadImages = asyncHandler(async (req: Request, res: Response) => {
    // This would handle file uploads using multer
    // For now, return a placeholder response
    
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // In a real implementation, you would:
    // 1. Process images with Sharp
    // 2. Upload to cloud storage (AWS S3, Cloudinary, etc.)
    // 3. Return the URLs

    const imageUrls = files.map(file => `https://example.com/images/${file.filename}`);

    const response: ApiResponse = {
      success: true,
      message: 'Images uploaded successfully',
      data: { imageUrls }
    };

    res.json(response);
  });
}

export default ProductController;
