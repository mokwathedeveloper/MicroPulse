import { User, UserDocument } from '../models/User';
import { UserRole, RegisterRequest, LoginRequest, UserProfile } from '../../../../shared/types';
import { jwtService } from '../../../../shared/utils/src/jwt';
import { logger } from '../../../../shared/utils/src/logger';
import { ConflictError, AuthenticationError, NotFoundError, ValidationError } from '../../../../shared/middleware/errorHandler';
import { EventBus, createEvent } from '../../../../shared/utils/src/eventBus';

export class UserService {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Register a new user
   */
  async register(userData: RegisterRequest): Promise<{ user: UserProfile; tokens: { accessToken: string; refreshToken: string } }> {
    try {
      // Check if user already exists
      const existingUser = await User.findByEmail(userData.email);
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Create new user
      const user = new User({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: UserRole.USER
      });

      await user.save();

      // Generate tokens
      const tokens = jwtService.generateTokenPair({
        userId: user._id.toString(),
        email: user.email,
        role: user.role
      });

      // Publish user created event
      const userCreatedEvent = createEvent(
        'UserCreated',
        user._id.toString(),
        'User',
        {
          userId: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      );

      await this.eventBus.publish('micropulse.events', 'user.created', userCreatedEvent);

      logger.info(`User registered successfully: ${user.email}`);

      return {
        user: this.toUserProfile(user),
        tokens
      };

    } catch (error) {
      logger.error('User registration failed:', error);
      throw error;
    }
  }

  /**
   * Authenticate user login
   */
  async login(loginData: LoginRequest): Promise<{ user: UserProfile; tokens: { accessToken: string; refreshToken: string } }> {
    try {
      const { user, reason } = await (User as any).authenticate(loginData.email, loginData.password);

      if (!user) {
        throw new AuthenticationError(reason || 'Invalid credentials');
      }

      // Generate tokens
      const tokens = jwtService.generateTokenPair({
        userId: user._id.toString(),
        email: user.email,
        role: user.role
      });

      // Publish user login event
      const userLoginEvent = createEvent(
        'UserLoggedIn',
        user._id.toString(),
        'User',
        {
          userId: user._id.toString(),
          email: user.email,
          loginTime: new Date()
        }
      );

      await this.eventBus.publish('micropulse.events', 'user.login', userLoginEvent);

      logger.info(`User logged in successfully: ${user.email}`);

      return {
        user: this.toUserProfile(user),
        tokens
      };

    } catch (error) {
      logger.error('User login failed:', error);
      throw error;
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (!user.isActive) {
        throw new AuthenticationError('User account is deactivated');
      }

      return this.toUserProfile(user);

    } catch (error) {
      logger.error(`Failed to get user profile for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updateData: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Update allowed fields
      const allowedUpdates = ['firstName', 'lastName', 'profile'];
      const updates: any = {};

      Object.keys(updateData).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updates[key] = (updateData as any)[key];
        }
      });

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        throw new NotFoundError('User not found');
      }

      // Publish user updated event
      const userUpdatedEvent = createEvent(
        'UserUpdated',
        userId,
        'User',
        {
          userId,
          updatedFields: Object.keys(updates),
          updatedAt: new Date()
        }
      );

      await this.eventBus.publish('micropulse.events', 'user.updated', userUpdatedEvent);

      logger.info(`User profile updated: ${updatedUser.email}`);

      return this.toUserProfile(updatedUser);

    } catch (error) {
      logger.error(`Failed to update user profile for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await User.findById(userId).select('+password');
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new AuthenticationError('Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Publish password changed event
      const passwordChangedEvent = createEvent(
        'UserPasswordChanged',
        userId,
        'User',
        {
          userId,
          changedAt: new Date()
        }
      );

      await this.eventBus.publish('micropulse.events', 'user.password_changed', passwordChangedEvent);

      logger.info(`Password changed for user: ${user.email}`);

    } catch (error) {
      logger.error(`Failed to change password for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(userId: string): Promise<void> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: false },
        { new: true }
      );

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Publish user deactivated event
      const userDeactivatedEvent = createEvent(
        'UserDeactivated',
        userId,
        'User',
        {
          userId,
          email: user.email,
          deactivatedAt: new Date()
        }
      );

      await this.eventBus.publish('micropulse.events', 'user.deactivated', userDeactivatedEvent);

      logger.info(`User deactivated: ${user.email}`);

    } catch (error) {
      logger.error(`Failed to deactivate user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(page: number = 1, limit: number = 10, filters: any = {}): Promise<{
    users: UserProfile[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const skip = (page - 1) * limit;
      const query: any = {};

      // Apply filters
      if (filters.role) {
        query.role = filters.role;
      }
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }
      if (filters.search) {
        query.$or = [
          { firstName: { $regex: filters.search, $options: 'i' } },
          { lastName: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const [users, total] = await Promise.all([
        User.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments(query)
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        users: users.map(user => this.toUserProfile(user)),
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      };

    } catch (error) {
      logger.error('Failed to get all users:', error);
      throw error;
    }
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId: string, newRole: UserRole): Promise<UserProfile> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { role: newRole },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Publish user role updated event
      const roleUpdatedEvent = createEvent(
        'UserRoleUpdated',
        userId,
        'User',
        {
          userId,
          newRole,
          updatedAt: new Date()
        }
      );

      await this.eventBus.publish('micropulse.events', 'user.role_updated', roleUpdatedEvent);

      logger.info(`User role updated: ${user.email} -> ${newRole}`);

      return this.toUserProfile(user);

    } catch (error) {
      logger.error(`Failed to update user role for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Convert User document to UserProfile
   */
  private toUserProfile(user: UserDocument): UserProfile {
    return {
      _id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}

export default UserService;
