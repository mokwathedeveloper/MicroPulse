import jwt from 'jsonwebtoken';
import { JwtPayload, UserRole } from '../../types';
import { logger } from './logger';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class JWTService {
  private static instance: JWTService;
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  private constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET || 'default-secret';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
    this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  public static getInstance(): JWTService {
    if (!JWTService.instance) {
      JWTService.instance = new JWTService();
    }
    return JWTService.instance;
  }

  /**
   * Generate access token
   */
  public generateAccessToken(payload: {
    userId: string;
    email: string;
    role: UserRole;
  }): string {
    try {
      return jwt.sign(payload, this.accessTokenSecret, {
        expiresIn: this.accessTokenExpiry,
        issuer: 'micropulse',
        audience: 'micropulse-users'
      });
    } catch (error) {
      logger.error('Error generating access token:', error);
      throw new Error('Failed to generate access token');
    }
  }

  /**
   * Generate refresh token
   */
  public generateRefreshToken(userId: string): string {
    try {
      return jwt.sign(
        { userId, type: 'refresh' },
        this.refreshTokenSecret,
        {
          expiresIn: this.refreshTokenExpiry,
          issuer: 'micropulse',
          audience: 'micropulse-users'
        }
      );
    } catch (error) {
      logger.error('Error generating refresh token:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Generate token pair (access + refresh)
   */
  public generateTokenPair(payload: {
    userId: string;
    email: string;
    role: UserRole;
  }): TokenPair {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload.userId)
    };
  }

  /**
   * Verify access token
   */
  public verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'micropulse',
        audience: 'micropulse-users'
      }) as JwtPayload;
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      } else {
        logger.error('Error verifying access token:', error);
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Verify refresh token
   */
  public verifyRefreshToken(token: string): { userId: string; type: string } {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'micropulse',
        audience: 'micropulse-users'
      }) as { userId: string; type: string };
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      } else {
        logger.error('Error verifying refresh token:', error);
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  public decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      logger.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  public isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return true;
      }
      
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get token expiration time
   */
  public getTokenExpiration(token: string): Date | null {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return null;
      }
      
      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract user ID from token
   */
  public extractUserIdFromToken(token: string): string | null {
    try {
      const decoded = this.decodeToken(token);
      return decoded?.userId || null;
    } catch (error) {
      return null;
    }
  }
}

// Export singleton instance
export const jwtService = JWTService.getInstance();

// Helper functions
export const tokenUtils = {
  // Extract token from Authorization header
  extractTokenFromHeader: (authHeader: string): string | null => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  },

  // Generate API key (for service-to-service communication)
  generateApiKey: (serviceName: string): string => {
    const payload = {
      service: serviceName,
      type: 'api-key',
      timestamp: Date.now()
    };
    
    return jwt.sign(payload, process.env.API_KEY_SECRET || 'api-secret', {
      expiresIn: '1y',
      issuer: 'micropulse-system'
    });
  },

  // Verify API key
  verifyApiKey: (apiKey: string): { service: string; type: string } => {
    try {
      const decoded = jwt.verify(apiKey, process.env.API_KEY_SECRET || 'api-secret', {
        issuer: 'micropulse-system'
      }) as { service: string; type: string };
      
      if (decoded.type !== 'api-key') {
        throw new Error('Invalid API key type');
      }
      
      return decoded;
    } catch (error) {
      throw new Error('Invalid API key');
    }
  }
};

export default jwtService;
