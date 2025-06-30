# Advanced Monitoring Guide

## Overview
This guide covers comprehensive monitoring strategies for GRA Core Platform applications, including application performance monitoring (APM), logging, alerting, and observability best practices.

## Application Performance Monitoring

### Custom Metrics Collection
\`\`\`javascript
import { createPrometheusMetrics } from '@prometheus/client';
import { Histogram, Counter, Gauge } from 'prom-client';

// Define custom metrics
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});

// Middleware to collect HTTP metrics
export function metricsMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
    
    httpRequestTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
  });

  next();
}

// Database query monitoring
export class DatabaseMetrics {
  static async executeQuery(query, params, queryType, table) {
    const start = Date.now();
    
    try {
      const result = await db.raw(query, params);
      const duration = (Date.now() - start) / 1000;
      
      databaseQueryDuration
        .labels(queryType, table)
        .observe(duration);
      
      return result;
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      
      databaseQueryDuration
        .labels(queryType, table)
        .observe(duration);
      
      throw error;
    }
  }
}
\`\`\`

### Business Metrics Tracking
\`\`\`javascript
// Business-specific metrics
const userRegistrations = new Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations',
  labelNames: ['source', 'plan_type']
});

const postCreations = new Counter({
  name: 'posts_created_total',
  help: 'Total number of posts created',
  labelNames: ['category', 'user_type']
});

const revenueGenerated = new Counter({
  name: 'revenue_generated_total',
  help: 'Total revenue generated',
  labelNames: ['plan_type', 'payment_method']
});

const activeUsers = new Gauge({
  name: 'active_users_current',
  help: 'Current number of active users',
  labelNames: ['time_period']
});

// Business metrics service
export class BusinessMetrics {
  static trackUserRegistration(source, planType) {
    userRegistrations.labels(source, planType).inc();
  }

  static trackPostCreation(category, userType) {
    postCreations.labels(category, userType).inc();
  }

  static trackRevenue(amount, planType, paymentMethod) {
    revenueGenerated.labels(planType, paymentMethod).inc(amount);
  }

  static async updateActiveUsers() {
    const dailyActive = await User.query()
      .where('last_active_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000))
      .count();
    
    const weeklyActive = await User.query()
      .where('last_active_at', '>', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .count();
    
    const monthlyActive = await User.query()
      .where('last_active_at', '>', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .count();

    activeUsers.labels('daily').set(parseInt(dailyActive[0].count));
    activeUsers.labels('weekly').set(parseInt(weeklyActive[0].count));
    activeUsers.labels('monthly').set(parseInt(monthlyActive[0].count));
  }
}

// Schedule regular metric updates
setInterval(() => {
  BusinessMetrics.updateActiveUsers();
}, 5 * 60 * 1000); // Every 5 minutes
\`\`\`

## Structured Logging

### Advanced Logging Configuration
\`\`\`javascript
import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      service: 'gra-core-platform',
      version: process.env.APP_VERSION,
      environment: process.env.NODE_ENV,
      requestId: meta.requestId,
      userId: meta.userId,
      ...meta
    });
  })
);

// Configure transports
const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),
  new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  })
];

// Add Elasticsearch transport for production
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new ElasticsearchTransport({
      level: 'info',
      clientOpts: {
        node: process.env.ELASTICSEARCH_URL,
        auth: {
          username: process.env.ELASTICSEARCH_USERNAME,
          password: process.env.ELASTICSEARCH_PASSWORD
        }
      },
      index: 'gra-platform-logs'
    })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports
});

// Request logging middleware
export function requestLoggingMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || generateRequestId();
  req.requestId = requestId;
  
  const start = Date.now();
  
  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id
    });
  });

  next();
}
\`\`\`

### Contextual Logging
\`\`\`javascript
// Logger with context
export class ContextualLogger {
  constructor(context = {}) {
    this.context = context;
  }

  withContext(additionalContext) {
    return new ContextualLogger({ ...this.context, ...additionalContext });
  }

  info(message, meta = {}) {
    logger.info(message, { ...this.context, ...meta });
  }

  warn(message, meta = {}) {
    logger.warn(message, { ...this.context, ...meta });
  }

  error(message, error = null, meta = {}) {
    logger.error(message, {
      ...this.context,
      ...meta,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    });
  }

  debug(message, meta = {}) {
    logger.debug(message, { ...this.context, ...meta });
  }
}

// Usage in services
export class UserService {
  static async createUser(userData) {
    const log = new ContextualLogger({
      requestId: userData.requestId,
      service: 'UserService',
      operation: 'createUser'
    });

    log.info('Creating new user', { email: userData.email });

    try {
      const user = await User.create(userData);
      
      log.info('User created successfully', {
        userId: user.id,
        email: user.email
      });

      return user;
    } catch (error) {
      log.error('Failed to create user', error, {
        email: userData.email
      });
      throw error;
    }
  }
}
\`\`\`

## Error Tracking and Alerting

### Comprehensive Error Handling
\`\`\`javascript
import Sentry from '@sentry/node';

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions
  beforeSend(event) {
    // Filter out sensitive information
    if (event.request) {
      delete event.request.headers?.authorization;
      delete event.request.data?.password;
    }
    return event;
  }
});

// Error classification
export class ErrorClassifier {
  static classify(error) {
    if (error.code === 'ECONNREFUSED') {
      return {
        type: 'INFRASTRUCTURE',
        severity: 'HIGH',
        category: 'DATABASE_CONNECTION'
      };
    }
    
    if (error.name === 'ValidationError') {
      return {
        type: 'USER_INPUT',
        severity: 'LOW',
        category: 'VALIDATION'
      };
    }
    
    if (error.status >= 500) {
      return {
        type: 'APPLICATION',
        severity: 'HIGH',
        category: 'SERVER_ERROR'
      };
    }
    
    return {
      type: 'UNKNOWN',
      severity: 'MEDIUM',
      category: 'GENERAL'
    };
  }
}

// Enhanced error handler
export function errorHandler(error, req, res, next) {
  const classification = ErrorClassifier.classify(error);
  const requestId = req.requestId;
  
  const errorContext = {
    requestId,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    classification
  };

  // Log error with context
  logger.error('Unhandled error', error, errorContext);

  // Send to Sentry for high severity errors
  if (classification.severity === 'HIGH') {
    Sentry.withScope(scope => {
      scope.setTag('errorType', classification.type);
      scope.setTag('errorCategory', classification.category);
      scope.setContext('request', errorContext);
      Sentry.captureException(error);
    });
  }

  // Send appropriate response
  const statusCode = error.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;

  res.status(statusCode).json({
    error: {
      message,
      requestId,
      timestamp: new Date().toISOString()
    }
  });
}
\`\`\`

### Custom Alert System
\`\`\`javascript
// Alert configuration
const alertRules = [
  {
    name: 'High Error Rate',
    condition: 'error_rate > 0.05', // 5% error rate
    severity: 'CRITICAL',
    channels: ['slack', 'email', 'pagerduty']
  },
  {
    name: 'Slow Response Time',
    condition: 'avg_response_time > 2000', // 2 seconds
    severity: 'WARNING',
    channels: ['slack']
  },
  {
    name: 'Database Connection Issues',
    condition: 'db_connection_errors > 0',
    severity: 'CRITICAL',
    channels: ['slack', 'email', 'pagerduty']
  },
  {
    name: 'Memory Usage High',
    condition: 'memory_usage > 0.85', // 85% memory usage
    severity: 'WARNING',
    channels: ['slack']
  }
];

// Alert manager
export class AlertManager {
  static async checkAlerts() {
    const metrics = await this.collectMetrics();
    
    for (const rule of alertRules) {
      const shouldAlert = this.evaluateCondition(rule.condition, metrics);
      
      if (shouldAlert) {
        await this.sendAlert(rule, metrics);
      }
    }
  }

  static async collectMetrics() {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    // Collect error rate
    const totalRequests = await this.getMetricValue('http_requests_total', fiveMinutesAgo);
    const errorRequests = await this.getMetricValue('http_requests_total', fiveMinutesAgo, { status_code: '5xx' });
    const errorRate = totalRequests > 0 ? errorRequests / totalRequests : 0;

    // Collect response time
    const avgResponseTime = await this.getMetricValue('http_request_duration_seconds', fiveMinutesAgo, {}, 'avg');

    // Collect database errors
    const dbConnectionErrors = await this.getMetricValue('database_connection_errors_total', fiveMinutesAgo);

    // Collect memory usage
    const memoryUsage = process.memoryUsage().heapUsed / process.memoryUsage().heapTotal;

    return {
      error_rate: errorRate,
      avg_response_time: avgResponseTime * 1000, // Convert to milliseconds
      db_connection_errors: dbConnectionErrors,
      memory_usage: memoryUsage
    };
  }

  static evaluateCondition(condition, metrics) {
    // Simple condition evaluator
    // In production, use a more robust expression evaluator
    try {
      const expression = condition.replace(/(\w+)/g, (match) => {
        return metrics[match] !== undefined ? metrics[match] : match;
      });
      
      return eval(expression);
    } catch (error) {
      logger.error('Failed to evaluate alert condition', error, { condition });
      return false;
    }
  }

  static async sendAlert(rule, metrics) {
    const alert = {
      name: rule.name,
      severity: rule.severity,
      timestamp: new Date().toISOString(),
      metrics,
      environment: process.env.NODE_ENV
    };

    logger.warn('Alert triggered', alert);

    // Send to configured channels
    for (const channel of rule.channels) {
      try {
        await this.sendToChannel(channel, alert);
      } catch (error) {
        logger.error(`Failed to send alert to ${channel}`, error);
      }
    }
  }

  static async sendToChannel(channel, alert) {
    switch (channel) {
      case 'slack':
        await this.sendSlackAlert(alert);
        break;
      case 'email':
        await this.sendEmailAlert(alert);
        break;
      case 'pagerduty':
        await this.sendPagerDutyAlert(alert);
        break;
    }
  }

  static async sendSlackAlert(alert) {
    const webhook = process.env.SLACK_WEBHOOK_URL;
    if (!webhook) return;

    const color = alert.severity === 'CRITICAL' ? 'danger' : 'warning';
    
    const payload = {
      attachments: [{
        color,
        title: `🚨 ${alert.name}`,
        fields: [
          {
            title: 'Severity',
            value: alert.severity,
            short: true
          },
          {
            title: 'Environment',
            value: alert.environment,
            short: true
          },
          {
            title: 'Metrics',
            value: JSON.stringify(alert.metrics, null, 2),
            short: false
          }
        ],
        timestamp: alert.timestamp
      }]
    };

    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }
}

// Schedule alert checks
setInterval(() => {
  AlertManager.checkAlerts();
}, 60 * 1000); // Check every minute
\`\`\`

## Health Checks and Uptime Monitoring

### Comprehensive Health Checks
\`\`\`javascript
// Health check service
export class HealthCheckService {
  static async performHealthCheck() {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      externalAPIs: await this.checkExternalAPIs(),
      diskSpace: await this.checkDiskSpace(),
      memory: await this.checkMemory(),
      cpu: await this.checkCPU()
    };

    const overallHealth = Object.values(checks).every(check => check.healthy);

    return {
      healthy: overallHealth,
      timestamp: new Date().toISOString(),
      checks
    };
  }

  static async checkDatabase() {
    try {
      const start = Date.now();
      await db.raw('SELECT 1');
      const responseTime = Date.now() - start;

      return {
        healthy: true,
        responseTime,
        details: 'Database connection successful'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        details: 'Database connection failed'
      };
    }
  }

  static async checkRedis() {
    try {
      const start = Date.now();
      await redisClient.ping();
      const responseTime = Date.now() - start;

      return {
        healthy: true,
        responseTime,
        details: 'Redis connection successful'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        details: 'Redis connection failed'
      };
    }
  }

  static async checkExternalAPIs() {
    const apis = [
      { name: 'Payment Gateway', url: process.env.PAYMENT_API_URL },
      { name: 'Email Service', url: process.env.EMAIL_API_URL }
    ];

    const results = await Promise.all(
      apis.map(async (api) => {
        try {
          const start = Date.now();
          const response = await fetch(`${api.url}/health`, { timeout: 5000 });
          const responseTime = Date.now() - start;

          return {
            name: api.name,
            healthy: response.ok,
            responseTime,
            statusCode: response.status
          };
        } catch (error) {
          return {
            name: api.name,
            healthy: false,
            error: error.message
          };
        }
      })
    );

    return {
      healthy: results.every(result => result.healthy),
      details: results
    };
  }

  static async checkDiskSpace() {
    const fs = require('fs').promises;
    
    try {
      const stats = await fs.statfs('.');
      const total = stats.blocks * stats.blksize;
      const free = stats.bavail * stats.blksize;
      const used = total - free;
      const usagePercent = (used / total) * 100;

      return {
        healthy: usagePercent < 90, // Alert if disk usage > 90%
        usagePercent: Math.round(usagePercent * 100) / 100,
        totalGB: Math.round(total / 1024 / 1024 / 1024 * 100) / 100,
        freeGB: Math.round(free / 1024 / 1024 / 1024 * 100) / 100
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  static async checkMemory() {
    const usage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const freeMemory = require('os').freemem();
    const usedMemory = totalMemory - freeMemory;
    const usagePercent = (usedMemory / totalMemory) * 100;

    return {
      healthy: usagePercent < 85, // Alert if memory usage > 85%
      usagePercent: Math.round(usagePercent * 100) / 100,
      heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
      rssMB: Math.round(usage.rss / 1024 / 1024)
    };
  }

  static async checkCPU() {
    const os = require('os');
    const cpus = os.cpus();
    
    // Simple CPU check - in production, use more sophisticated monitoring
    const loadAverage = os.loadavg();
    const cpuCount = cpus.length;
    const loadPercent = (loadAverage[0] / cpuCount) * 100;

    return {
      healthy: loadPercent < 80, // Alert if CPU load > 80%
      loadPercent: Math.round(loadPercent * 100) / 100,
      loadAverage: loadAverage.map(load => Math.round(load * 100) / 100),
      cpuCount
    };
  }
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = await HealthCheckService.performHealthCheck();
    const statusCode = health.healthy ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Detailed health check endpoint
app.get('/health/detailed', async (req, res) => {
  const health = await HealthCheckService.performHealthCheck();
  res.json(health);
});
\`\`\`

## Distributed Tracing

### OpenTelemetry Integration
\`\`\`javascript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

// Initialize OpenTelemetry
const jaegerExporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT,
});

const sdk = new NodeSDK({
  traceExporter: jaegerExporter,
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: 'gra-core-platform',
  serviceVersion: process.env.APP_VERSION,
});

sdk.start();

// Custom tracing
import { trace, context } from '@opentelemetry/api';

const tracer = trace.getTracer('gra-core-platform');

export class TracingService {
  static async traceOperation(name, operation, attributes = {}) {
    return tracer.startActiveSpan(name, { attributes }, async (span) => {
      try {
        const result = await operation();
        span.setStatus({ code: 1 }); // OK
        return result;
      } catch (error) {
        span.recordException(error);
        span.setStatus({ code: 2, message: error.message }); // ERROR
        throw error;
      } finally {
        span.end();
      }
    });
  }

  static addSpanAttributes(attributes) {
    const span = trace.getActiveSpan();
    if (span) {
      Object.entries(attributes).forEach(([key, value]) => {
        span.setAttribute(key, value);
      });
    }
  }

  static addSpanEvent(name, attributes = {}) {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }
}

// Usage in services
export class UserService {
  static async createUser(userData) {
    return TracingService.traceOperation(
      'user.create',
      async () => {
        TracingService.addSpanAttributes({
          'user.email': userData.email,
          'user.source': userData.source || 'direct'
        });

        const user = await User.create(userData);
        
        TracingService.addSpanEvent('user.created', {
          'user.id': user.id
        });

        return user;
      },
      {
        'operation.type': 'database.insert',
        'service.name': 'user-service'
      }
    );
  }
}
