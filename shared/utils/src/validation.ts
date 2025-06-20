import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../../types';

export interface ValidationSchema {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
}

export class ValidationService {
  /**
   * Validate data against schema
   */
  public static validate(data: any, schema: Joi.ObjectSchema): { error?: ValidationError[]; value?: any } {
    const { error, value } = schema.validate(data, { 
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const validationErrors: ValidationError[] = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      return { error: validationErrors };
    }

    return { value };
  }

  /**
   * Create validation middleware
   */
  public static createMiddleware(schema: ValidationSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
      const errors: ValidationError[] = [];

      // Validate body
      if (schema.body) {
        const { error } = ValidationService.validate(req.body, schema.body);
        if (error) {
          errors.push(...error);
        }
      }

      // Validate query
      if (schema.query) {
        const { error } = ValidationService.validate(req.query, schema.query);
        if (error) {
          errors.push(...error);
        }
      }

      // Validate params
      if (schema.params) {
        const { error } = ValidationService.validate(req.params, schema.params);
        if (error) {
          errors.push(...error);
        }
      }

      // Validate headers
      if (schema.headers) {
        const { error } = ValidationService.validate(req.headers, schema.headers);
        if (error) {
          errors.push(...error);
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }

      next();
    };
  }
}

// Common validation schemas
export const commonValidations = {
  // MongoDB ObjectId
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('Invalid ObjectId format'),

  // Email
  email: Joi.string().email().lowercase().trim(),

  // Password
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message('Password must contain at least 8 characters with uppercase, lowercase, number and special character'),

  // Name
  name: Joi.string().min(2).max(50).trim(),

  // Phone number
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).message('Invalid phone number format'),

  // URL
  url: Joi.string().uri(),

  // Pagination
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('asc', 'desc').default('desc'),
    sortBy: Joi.string().default('createdAt')
  },

  // Date range
  dateRange: {
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
  }
};

// User validation schemas
export const userValidationSchemas = {
  register: {
    body: Joi.object({
      email: commonValidations.email.required(),
      password: commonValidations.password.required(),
      firstName: commonValidations.name.required(),
      lastName: commonValidations.name.required()
    })
  },

  login: {
    body: Joi.object({
      email: commonValidations.email.required(),
      password: Joi.string().required()
    })
  },

  updateProfile: {
    body: Joi.object({
      firstName: commonValidations.name,
      lastName: commonValidations.name,
      phone: commonValidations.phone
    })
  },

  getUserById: {
    params: Joi.object({
      id: commonValidations.objectId.required()
    })
  }
};

// Product validation schemas
export const productValidationSchemas = {
  create: {
    body: Joi.object({
      name: Joi.string().min(2).max(100).required(),
      description: Joi.string().min(10).max(1000).required(),
      price: Joi.number().positive().precision(2).required(),
      category: Joi.string().min(2).max(50).required(),
      sku: Joi.string().min(3).max(50).required(),
      stock: Joi.number().integer().min(0).required(),
      images: Joi.array().items(commonValidations.url).max(10)
    })
  },

  update: {
    params: Joi.object({
      id: commonValidations.objectId.required()
    }),
    body: Joi.object({
      name: Joi.string().min(2).max(100),
      description: Joi.string().min(10).max(1000),
      price: Joi.number().positive().precision(2),
      category: Joi.string().min(2).max(50),
      stock: Joi.number().integer().min(0),
      images: Joi.array().items(commonValidations.url).max(10),
      isActive: Joi.boolean()
    })
  },

  getById: {
    params: Joi.object({
      id: commonValidations.objectId.required()
    })
  },

  list: {
    query: Joi.object({
      ...commonValidations.pagination,
      category: Joi.string(),
      minPrice: Joi.number().positive(),
      maxPrice: Joi.number().positive().min(Joi.ref('minPrice')),
      search: Joi.string().min(2).max(100),
      isActive: Joi.boolean()
    })
  }
};

// Order validation schemas
export const orderValidationSchemas = {
  create: {
    body: Joi.object({
      items: Joi.array().items(
        Joi.object({
          productId: commonValidations.objectId.required(),
          quantity: Joi.number().integer().min(1).required(),
          price: Joi.number().positive().precision(2).required(),
          name: Joi.string().required()
        })
      ).min(1).required(),
      shippingAddress: Joi.object({
        street: Joi.string().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        zipCode: Joi.string().required(),
        country: Joi.string().required()
      }).required(),
      paymentMethod: Joi.string().valid('credit_card', 'debit_card', 'paypal', 'bank_transfer').required()
    })
  },

  updateStatus: {
    params: Joi.object({
      id: commonValidations.objectId.required()
    }),
    body: Joi.object({
      status: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled').required()
    })
  },

  getById: {
    params: Joi.object({
      id: commonValidations.objectId.required()
    })
  },

  list: {
    query: Joi.object({
      ...commonValidations.pagination,
      status: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'),
      userId: commonValidations.objectId,
      ...commonValidations.dateRange
    })
  }
};

// Inventory validation schemas
export const inventoryValidationSchemas = {
  updateStock: {
    body: Joi.object({
      productId: commonValidations.objectId.required(),
      quantity: Joi.number().integer().required(),
      operation: Joi.string().valid('add', 'subtract', 'set').required()
    })
  },

  getByProductId: {
    params: Joi.object({
      productId: commonValidations.objectId.required()
    })
  }
};

// Convenience function to create validation middleware
export const validateRequest = (schema: ValidationSchema) => {
  return ValidationService.createMiddleware(schema);
};

export default ValidationService;
