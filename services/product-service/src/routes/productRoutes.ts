import { Router } from 'express';
import multer from 'multer';
import { ProductController } from '../controllers/productController';
import { authenticate, optionalAuthenticate, adminOnly, adminOrModerator } from '../../../../shared/middleware/auth';
import { validateRequest, productValidationSchemas } from '../../../../shared/utils/src/validation';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export function createProductRoutes(productController: ProductController): Router {
  const router = Router();

  // Public routes (no authentication required)
  router.get('/',
    validateRequest(productValidationSchemas.list),
    productController.getAllProducts
  );

  router.get('/search',
    productController.searchProducts
  );

  router.get('/categories',
    productController.getCategories
  );

  router.get('/category/:category',
    validateRequest({
      params: require('joi').object({
        category: require('joi').string().required()
      }),
      query: require('joi').object({
        page: require('joi').number().integer().min(1).default(1),
        limit: require('joi').number().integer().min(1).max(100).default(10)
      })
    }),
    productController.getProductsByCategory
  );

  router.get('/id/:id',
    validateRequest(productValidationSchemas.getById),
    productController.getProductById
  );

  router.get('/sku/:sku',
    validateRequest({
      params: require('joi').object({
        sku: require('joi').string().required()
      })
    }),
    productController.getProductBySku
  );

  // Protected routes (authentication required)
  router.use(authenticate);

  // Admin/Moderator only routes
  router.post('/',
    adminOrModerator,
    validateRequest(productValidationSchemas.create),
    productController.createProduct
  );

  router.put('/:id',
    adminOrModerator,
    validateRequest(productValidationSchemas.update),
    productController.updateProduct
  );

  router.delete('/:id',
    adminOrModerator,
    validateRequest({
      params: require('joi').object({
        id: require('joi').string().pattern(/^[0-9a-fA-F]{24}$/).required()
      })
    }),
    productController.deleteProduct
  );

  router.patch('/:id/stock',
    adminOrModerator,
    validateRequest({
      params: require('joi').object({
        id: require('joi').string().pattern(/^[0-9a-fA-F]{24}$/).required()
      }),
      body: require('joi').object({
        stock: require('joi').number().integer().min(0).required()
      })
    }),
    productController.updateStock
  );

  router.post('/:id/images',
    adminOrModerator,
    upload.array('images', 10),
    productController.uploadImages
  );

  // Admin only routes
  router.get('/admin/low-stock',
    adminOnly,
    productController.getLowStockProducts
  );

  return router;
}

export default createProductRoutes;
