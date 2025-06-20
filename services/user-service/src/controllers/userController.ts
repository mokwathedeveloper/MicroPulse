import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { logger } from '../../../../shared/utils/src/logger';
import { ApiResponse } from '../../../../shared/types';
import { asyncHandler } from '../../../../shared/middleware/errorHandler';

export class UserController {
  private userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  /**
   * Register a new user
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName } = req.body;

    const result = await this.userService.register({
      email,
      password,
      firstName,
      lastName
    });

    const response: ApiResponse = {
      success: true,
      message: 'User registered successfully',
      data: result
    };

    res.status(201).json(response);
  });

  /**
   * User login
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const result = await this.userService.login({ email, password });

    const response: ApiResponse = {
      success: true,
      message: 'Login successful',
      data: result
    };

    res.json(response);
  });

  /**
   * Get current user profile
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const user = await this.userService.getUserProfile(userId);

    const response: ApiResponse = {
      success: true,
      data: user
    };

    res.json(response);
  });

  /**
   * Update user profile
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const updateData = req.body;

    const user = await this.userService.updateUserProfile(userId, updateData);

    const response: ApiResponse = {
      success: true,
      message: 'Profile updated successfully',
      data: user
    };

    res.json(response);
  });

  /**
   * Change password
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    await this.userService.changePassword(userId, currentPassword, newPassword);

    const response: ApiResponse = {
      success: true,
      message: 'Password changed successfully'
    };

    res.json(response);
  });

  /**
   * Deactivate user account
   */
  deactivateAccount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    await this.userService.deactivateUser(userId);

    const response: ApiResponse = {
      success: true,
      message: 'Account deactivated successfully'
    };

    res.json(response);
  });

  /**
   * Get user by ID (admin or self)
   */
  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const currentUserId = req.user!.userId;
    const currentUserRole = req.user!.role;

    // Users can only access their own profile unless they're admin
    if (id !== currentUserId && currentUserRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await this.userService.getUserProfile(id);

    const response: ApiResponse = {
      success: true,
      data: user
    };

    res.json(response);
  });

  /**
   * Get all users (admin only)
   */
  getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const filters = {
      role: req.query.role as string,
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
      search: req.query.search as string
    };

    const result = await this.userService.getAllUsers(page, limit, filters);

    const response: ApiResponse = {
      success: true,
      data: result.users,
      pagination: result.pagination
    };

    res.json(response);
  });

  /**
   * Update user role (admin only)
   */
  updateUserRole = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;

    const user = await this.userService.updateUserRole(id, role);

    const response: ApiResponse = {
      success: true,
      message: 'User role updated successfully',
      data: user
    };

    res.json(response);
  });

  /**
   * Deactivate user (admin only)
   */
  deactivateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await this.userService.deactivateUser(id);

    const response: ApiResponse = {
      success: true,
      message: 'User deactivated successfully'
    };

    res.json(response);
  });
}

export default UserController;
