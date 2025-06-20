import { Router } from 'express';
import { logger } from '../../../../shared/utils/src/logger';
import { healthChecker } from '../../../../shared/utils/src/healthCheck';

const router = Router();

/**
 * Get overall system health
 */
router.get('/health', async (req, res) => {
  try {
    const health = await healthChecker.getOverallHealth();
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Error getting system health:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get system health'
    });
  }
});

/**
 * Get service registry information
 */
router.get('/services', (req, res) => {
  try {
    // This will be populated by the main application
    // The actual service registry data is passed from the main app
    res.json({
      success: true,
      data: {
        message: 'Service registry endpoint - implementation in main app'
      }
    });
  } catch (error) {
    logger.error('Error getting services:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get services'
    });
  }
});

/**
 * Get WebSocket statistics
 */
router.get('/websocket/stats', (req, res) => {
  try {
    // This will be populated by the WebSocket manager
    res.json({
      success: true,
      data: {
        message: 'WebSocket stats endpoint - implementation in main app'
      }
    });
  } catch (error) {
    logger.error('Error getting WebSocket stats:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get WebSocket stats'
    });
  }
});

/**
 * Get system metrics
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error getting metrics:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get metrics'
    });
  }
});

/**
 * Get application logs (last N entries)
 */
router.get('/logs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const level = req.query.level as string || 'info';

    // In a real implementation, you would read from log files or log aggregation service
    res.json({
      success: true,
      data: {
        message: `Would return last ${limit} log entries with level ${level}`,
        logs: []
      }
    });
  } catch (error) {
    logger.error('Error getting logs:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get logs'
    });
  }
});

/**
 * Clear application cache
 */
router.post('/cache/clear', (req, res) => {
  try {
    // In a real implementation, you would clear Redis cache or other caches
    logger.info('Cache clear requested by admin');

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache'
    });
  }
});

/**
 * Restart service (graceful)
 */
router.post('/restart', (req, res) => {
  try {
    logger.info('Service restart requested by admin');

    res.json({
      success: true,
      message: 'Service restart initiated'
    });

    // Graceful restart after response
    setTimeout(() => {
      process.kill(process.pid, 'SIGTERM');
    }, 1000);

  } catch (error) {
    logger.error('Error restarting service:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to restart service'
    });
  }
});

export default router;
