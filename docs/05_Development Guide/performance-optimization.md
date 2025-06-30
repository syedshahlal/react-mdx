# Performance Optimization Guide

Comprehensive guide to optimizing performance in GRA Core Platform applications.

## Overview

This guide covers performance optimization strategies including:
- Database optimization
- Caching strategies
- Code optimization
- Memory management
- Network optimization
- Monitoring and profiling

## Database Optimization

### Query Optimization

\`\`\`javascript
import { GRAData } from '@gra-core/data'

class OptimizedDataAccess {
  constructor() {
    this.db = new GRAData({
      apiKey: process.env.GRA_API_KEY,
      poolSize: 20, // Connection pool size
      maxIdleTime: 30000, // 30 seconds
      queryTimeout: 10000 // 10 seconds
    })
  }
  
  // Efficient pagination
  async getPaginatedUsers(page = 1, limit = 20, filters = {}) {
    const skip = (page - 1) * limit
    
    // Use projection to limit fields
    const users = await this.db.User.find(filters)
      .select('id firstName lastName email createdAt') // Only select needed fields
      .sort({ createdAt: -1 }) // Use indexed field for sorting
      .skip(skip)
      .limit(limit)
      .lean() // Return plain objects instead of Mongoose documents
    
    // Get total count efficiently
    const total = await this.db.User.countDocuments(filters)
    
    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  }
  
  // Optimized aggregation
  async getUserStatistics() {
    const stats = await this.db.User.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          averageAge: { $avg: '$age' }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      },
      {
        $limit: 12 // Last 12 months
      }
    ])
    
    return stats
  }
  
  // Bulk operations for better performance
  async bulkUpdateUsers(updates) {
    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: { _id: update.id },
        update: { $set: update.data },
        upsert: false
      }
    }))
    
    const result = await this.db.User.bulkWrite(bulkOps, {
      ordered: false // Allow parallel execution
    })
    
    return result
  }
}

// Inefficient query - N+1 problem
async function getBadUserPosts() {
  const users = await User.query();
  
  for (const user of users) {
    user.posts = await Post.query().where('user_id', user.id);
  }
  
  return users;
}

// Optimized query with eager loading
async function getOptimizedUserPosts() {
  return await User.query()
    .withRelated('posts')
    .orderBy('created_at', 'desc');
}

// Complex query optimization
async function getPostsWithStats() {
  return await db.raw(`
    SELECT 
      p.*,
      u.first_name,
      u.last_name,
      COUNT(c.id) as comment_count,
      COUNT(l.id) as like_count
    FROM posts p
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN comments c ON p.id = c.post_id
    LEFT JOIN likes l ON p.id = l.post_id
    WHERE p.status = 'published'
    GROUP BY p.id, u.id
    ORDER BY p.created_at DESC
    LIMIT 20
  `);
}
\`\`\`

### Indexing Strategy

\`\`\`javascript
// Create compound indexes for common query patterns
const createIndexes = async () => {
  const User = db.User
  
  // Compound index for filtering and sorting
  await User.createIndex({ isActive: 1, createdAt: -1 })
  
  // Text index for search functionality
  await User.createIndex({ 
    firstName: 'text', 
    lastName: 'text', 
    email: 'text' 
  })
  
  // Sparse index for optional fields
  await User.createIndex({ phoneNumber: 1 }, { sparse: true })
  
  // TTL index for temporary data
  await User.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
  
  // Partial index for specific conditions
  await User.createIndex(
    { email: 1 },
    { 
      partialFilterExpression: { isActive: true },
      unique: true
    }
  )
}

// Primary indexes for frequently queried columns
CREATE INDEX CONCURRENTLY idx_posts_user_id ON posts(user_id);
CREATE INDEX CONCURRENTLY idx_posts_status ON posts(status);
CREATE INDEX CONCURRENTLY idx_posts_created_at ON posts(created_at);

// Composite indexes for complex queries
CREATE INDEX CONCURRENTLY idx_posts_status_created_at ON posts(status, created_at);
CREATE INDEX CONCURRENTLY idx_posts_user_status ON posts(user_id, status);

// Partial indexes for specific conditions
CREATE INDEX CONCURRENTLY idx_posts_published 
ON posts(created_at) 
WHERE status = 'published';

// Full-text search indexes
CREATE INDEX CONCURRENTLY idx_posts_search 
ON posts USING gin(to_tsvector('english', title || ' ' || content));

// Monitor index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
\`\`\`

## Caching Strategies

### Multi-Level Caching

\`\`\`javascript
import Redis from 'ioredis'
import NodeCache from 'node-cache'

class CacheManager {
  constructor() {
    // L1 Cache: In-memory (fastest)
    this.memoryCache = new NodeCache({
      stdTTL: 300, // 5 minutes
      checkperiod: 60, // Check for expired keys every minute
      maxKeys: 1000 // Limit memory usage
    })
    
    // L2 Cache: Redis (shared across instances)
    this.redisCache = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    })
  }
  
  async get(key) {
    try {
      // Try L1 cache first
      let value = this.memoryCache.get(key)
      if (value !== undefined) {
        return value
      }
      
      // Try L2 cache
      const redisValue = await this.redisCache.get(key)
      if (redisValue) {
        value = JSON.parse(redisValue)
        // Store in L1 cache for faster access
        this.memoryCache.set(key, value)
        return value
      }
      
      return null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }
  
  async set(key, value, ttl = 300) {
    try {
      // Set in both caches
      this.memoryCache.set(key, value, ttl)
      await this.redisCache.setex(key, ttl, JSON.stringify(value))
    } catch (error) {
      console.error('Cache set error:', error)
    }
  }
  
  async del(key) {
    try {
      this.memoryCache.del(key)
      await this.redisCache.del(key)
    } catch (error) {
      console.error('Cache delete error:', error)
    }
  }
  
  // Cache with automatic refresh
  async getOrSet(key, fetchFunction, ttl = 300) {
    let value = await this.get(key)
    
    if (value === null) {
      value = await fetchFunction()
      if (value !== null) {
        await this.set(key, value, ttl)
      }
    }
    
    return value
  }
}

// Usage example
const cache = new CacheManager()

class UserService {
  async getUser(id) {
    return await cache.getOrSet(
      `user:${id}`,
      async () => {
        const user = await db.User.findById(id)
        return user
      },
      600 // 10 minutes
    )
  }
  
  async updateUser(id, updates) {
    const user = await db.User.findByIdAndUpdate(id, updates, { new: true })
    
    // Invalidate cache
    await cache.del(`user:${id}`)
    
    return user
  }
}
\`\`\`

### Cache Warming and Preloading

\`\`\`javascript
class CacheWarmer {
  constructor(cacheManager, dataService) {
    this.cache = cacheManager
    this.dataService = dataService
  }
  
  async warmUserCache() {
    console.log('Starting user cache warming...')
    
    // Get most active users
    const activeUsers = await this.dataService.getMostActiveUsers(100)
    
    const promises = activeUsers.map(async (user) => {
      const cacheKey = `user:${user.id}`
      await this.cache.set(cacheKey, user, 3600) // 1 hour
    })
    
    await Promise.all(promises)
    console.log(`Warmed cache for ${activeUsers.length} users`)
  }
  
  async warmPopularContent() {
    const popularContent = await this.dataService.getPopularContent(50)
    
    const promises = popularContent.map(async (content) => {
      const cacheKey = `content:${content.id}`
      await this.cache.set(cacheKey, content, 1800) // 30 minutes
    })
    
    await Promise.all(promises)
    console.log(`Warmed cache for ${popularContent.length} content items`)
  }
  
  // Schedule cache warming
  startCacheWarming() {
    // Warm cache on startup
    this.warmUserCache()
    this.warmPopularContent()
    
    // Schedule periodic warming
    setInterval(() => {
      this.warmUserCache()
    }, 30 * 60 * 1000) // Every 30 minutes
    
    setInterval(() => {
      this.warmPopularContent()
    }, 15 * 60 * 1000) // Every 15 minutes
  }
}
\`\`\`

## Code Optimization

### Asynchronous Processing

\`\`\`javascript
import Bull from 'bull'
import cluster from 'cluster'
import os from 'os'

// Job Queue for background processing
const emailQueue = new Bull('email processing', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
})

const imageQueue = new Bull('image processing', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
})

// Process jobs
emailQueue.process('send-email', 5, async (job) => {
  const { to, subject, body } = job.data
  await sendEmail(to, subject, body)
})

imageQueue.process('resize-image', 3, async (job) => {
  const { imagePath, sizes } = job.data
  await resizeImage(imagePath, sizes)
})

// Optimized user registration
class UserRegistrationService {
  async registerUser(userData) {
    try {
      // Create user synchronously (critical path)
      const user = await db.User.create(userData)
      
      // Queue background tasks (non-critical path)
      await emailQueue.add('send-email', {
        to: user.email,
        subject: 'Welcome to GRA Core Platform',
        template: 'welcome',
        data: { firstName: user.firstName }
      })
      
      // Queue profile image processing if provided
      if (userData.profileImage) {
        await imageQueue.add('resize-image', {
          imagePath: userData.profileImage,
          sizes: [50, 100, 200, 400]
        })
      }
      
      return user
    } catch (error) {
      console.error('User registration failed:', error)
      throw error
    }
  }
}
\`\`\`

### Efficient Data Processing

\`\`\`javascript
import { Transform } from 'stream'
import csv from 'csv-parser'
import fs from 'fs'

class DataProcessor {
  // Stream processing for large datasets
  async processLargeCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = []
      let processedCount = 0
      
      const transformStream = new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
          // Process each row
          const processed = this.processRow(chunk)
          processedCount++
          
          // Batch processing every 1000 records
          if (processedCount % 1000 === 0) {
            console.log(`Processed ${processedCount} records`)
          }
          
          callback(null, processed)
        }
      })
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .pipe(transformStream)
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject)
    })
  }
  
  processRow(row) {
    // Optimize row processing
    return {
      id: row.id,
      name: row.name?.trim(),
      email: row.email?.toLowerCase(),
      age: parseInt(row.age) || 0,
      processedAt: new Date()
    }
  }
  
  // Parallel processing with worker threads
  async processInParallel(data, chunkSize = 1000) {
    const chunks = this.chunkArray(data, chunkSize)
    const numWorkers = Math.min(chunks.length, os.cpus().length)
    
    if (cluster.isMaster) {
      const results = []
      let completedWorkers = 0
      
      return new Promise((resolve, reject) => {
        for (let i = 0; i < numWorkers; i++) {
          const worker = cluster.fork()
          worker.send({ chunk: chunks[i] })
          
          worker.on('message', (result) => {
            results.push(...result)
            completedWorkers++
            
            if (completedWorkers === numWorkers) {
              resolve(results)
            }
          })
          
          worker.on('error', reject)
        }
      })
    } else {
      process.on('message', async ({ chunk }) => {
        const processed = await this.processChunk(chunk)
        process.send(processed)
        process.exit()
      })
    }
  }
  
  chunkArray(array, chunkSize) {
    const chunks = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }
}
\`\`\`

## Memory Management

### Memory Optimization

\`\`\`javascript
class MemoryOptimizer {
  constructor() {
    this.memoryThreshold = 0.8 // 80% of available memory
    this.checkInterval = 30000 // Check every 30 seconds
    
    this.startMemoryMonitoring()
  }
  
  startMemoryMonitoring() {
    setInterval(() => {
      const usage = process.memoryUsage()
      const totalMemory = os.totalmem()
      const usedMemory = usage.heapUsed
      const memoryUsage = usedMemory / totalMemory
      
      if (memoryUsage > this.memoryThreshold) {
        console.warn('High memory usage detected:', {
          heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
          external: Math.round(usage.external / 1024 / 1024) + 'MB',
          rss: Math.round(usage.rss / 1024 / 1024) + 'MB'
        })
        
        this.performGarbageCollection()
      }
    }, this.checkInterval)
  }
  
  performGarbageCollection() {
    if (global.gc) {
      global.gc()
      console.log('Garbage collection performed')
    }
  }
  
  // Object pooling for frequently created objects
  createObjectPool(createFn, resetFn, initialSize = 10) {
    const pool = []
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      pool.push(createFn())
    }
    
    return {
      acquire() {
        return pool.length > 0 ? pool.pop() : createFn()
      },
      
      release(obj) {
        resetFn(obj)
        pool.push(obj)
      },
      
      size() {
        return pool.length
      }
    }
  }
}

// Usage example
const bufferPool = memoryOptimizer.createObjectPool(
  () => Buffer.alloc(1024), // Create 1KB buffer
  (buffer) => buffer.fill(0), // Reset buffer
  20 // Initial pool size
)

// Use pooled buffers
function processData(data) {
  const buffer = bufferPool.acquire()
  try {
    // Use buffer for processing
    buffer.write(data)
    return buffer.toString()
  } finally {
    bufferPool.release(buffer)
  }
}
\`\`\`

### Memory Leak Detection

\`\`\`javascript
import v8 from 'v8'
import fs from 'fs'

class MemoryLeakDetector {
  constructor() {
    this.snapshots = []
    this.snapshotInterval = 60000 // 1 minute
    this.maxSnapshots = 10
  }
  
  startMonitoring() {
    setInterval(() => {
      this.takeSnapshot()
    }, this.snapshotInterval)
  }
  
  takeSnapshot() {
    const snapshot = v8.writeHeapSnapshot()
    const timestamp = new Date().toISOString()
    
    this.snapshots.push({
      timestamp,
      file: snapshot,
      memoryUsage: process.memoryUsage()
    })
    
    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      const old = this.snapshots.shift()
      fs.unlinkSync(old.file)
    }
  }
  
  analyzeMemoryGrowth() {
    if (this.snapshots.length < 2) return null
    
    const first = this.snapshots[0]
    const last = this.snapshots[this.snapshots.length - 1]
    
    const growth = {
      heapUsed: last.memoryUsage.heapUsed - first.memoryUsage.heapUsed,
      heapTotal: last.memoryUsage.heapTotal - first.memoryUsage.heapTotal,
      external: last.memoryUsage.external - first.memoryUsage.external,
      timespan: new Date(last.timestamp) - new Date(first.timestamp)
    }
    
    return growth
  }
}
\`\`\`

## Network Optimization

### Connection Pooling

\`\`\`javascript
import http from 'http'
import https from 'https'

// HTTP/HTTPS agents with connection pooling
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  freeSocketTimeout: 30000
})

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  freeSocketTimeout: 30000
})

// Optimized HTTP client
class OptimizedHttpClient {
  constructor() {
    this.defaultOptions = {
      timeout: 10000,
      headers: {
        'Connection': 'keep-alive',
        'User-Agent': 'GRA-Core-Platform/1.0'
      }
    }
  }
  
  async request(url, options = {}) {
    const isHttps = url.startsWith('https')
    const agent = isHttps ? httpsAgent : httpAgent
    
    const requestOptions = {
      ...this.defaultOptions,
      ...options,
      agent
    }
    
    try {
      const response = await fetch(url, requestOptions)
      return response
    } catch (error) {
      console.error('HTTP request failed:', error)
      throw error
    }
  }
}
\`\`\`

### Response Compression

\`\`\`javascript
import compression from 'compression'
import zlib from 'zlib'

// Configure compression middleware
app.use(compression({
  level: 6, // Compression level (1-9)
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false
    }
    
    // Compress JSON and text responses
    return compression.filter(req, res)
  }
}))

// Custom compression for API responses
class ResponseCompressor {
  static compress(data, format = 'gzip') {
    return new Promise((resolve, reject) => {
      const input = JSON.stringify(data)
      
      switch (format) {
        case 'gzip':
          zlib.gzip(input, (err, result) => {
            if (err) reject(err)
            else resolve(result)
          })
          break
          
        case 'deflate':
          zlib.deflate(input, (err, result) => {
            if (err) reject(err)
            else resolve(result)
          })
          break
          
        case 'brotli':
          zlib.brotliCompress(input, (err, result) => {
            if (err) reject(err)
            else resolve(result)
          })
          break
          
        default:
          resolve(Buffer.from(input))
      }
    })
  }
}
\`\`\`

## Performance Monitoring

### Application Performance Monitoring

\`\`\`javascript
import { performance, PerformanceObserver } from 'perf_hooks'

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map()
    this.setupObservers()
  }
  
  setupObservers() {
    // Monitor HTTP requests
    const httpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('http_request', {
          name: entry.name,
          duration: entry.duration,
          startTime: entry.startTime
        })
      }
    })
    httpObserver.observe({ entryTypes: ['measure'] })
    
    // Monitor function execution
    const functionObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('function_execution', {
          name: entry.name,
          duration: entry.duration
        })
      }
    })
    functionObserver.observe({ entryTypes: ['function'] })
  }
  
  recordMetric(type, data) {
    if (!this.metrics.has(type)) {
      this.metrics.set(type, [])
    }
    
    this.metrics.get(type).push({
      ...data,
      timestamp: Date.now()
    })
    
    // Keep only recent metrics (last 1000)
    const metrics = this.metrics.get(type)
    if (metrics.length > 1000) {
      metrics.shift()
    }
  }
  
  // Decorator for monitoring function performance
  monitor(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function(...args) {
      const start = performance.now()
      
      try {
        const result = await originalMethod.apply(this, args)
        const end = performance.now()
        
        performanceMonitor.recordMetric('function_execution', {
          name: `${target.constructor.name}.${propertyKey}`,
          duration: end - start,
          success: true
        })
        
        return result
      } catch (error) {
        const end = performance.now()
        
        performanceMonitor.recordMetric('function_execution', {
          name: `${target.constructor.name}.${propertyKey}`,
          duration: end - start,
          success: false,
          error: error.message
        })
        
        throw error
      }
    }
    
    return descriptor
  }
  
  getMetrics(type, timeRange = 3600000) { // Default: last hour
    const metrics = this.metrics.get(type) || []
    const cutoff = Date.now() - timeRange
    
    return metrics.filter(metric => metric.timestamp > cutoff)
  }
  
  getAverageResponseTime(type) {
    const metrics = this.getMetrics(type)
    if (metrics.length === 0) return 0
    
    const total = metrics.reduce((sum, metric) => sum + metric.duration, 0)
    return total / metrics.length
  }
}

const performanceMonitor = new PerformanceMonitor()

// Usage example
class UserService {
  @performanceMonitor.monitor
  async getUser(id) {
    performance.mark('getUser-start')
    
    const user = await db.User.findById(id)
    
    performance.mark('getUser-end')
    performance.measure('getUser', 'getUser-start', 'getUser-end')
    
    return user
  }
}
\`\`\`

### Real-time Performance Dashboard

\`\`\`javascript
import WebSocket from 'ws'

class PerformanceDashboard {
  constructor(performanceMonitor) {
    this.monitor = performanceMonitor
    this.clients = new Set()
    this.setupWebSocketServer()
    this.startBroadcasting()
  }
  
  setupWebSocketServer() {
    this.wss = new WebSocket.Server({ port: 8080 })
    
    this.wss.on('connection', (ws) => {
      this.clients.add(ws)
      
      // Send initial metrics
      ws.send(JSON.stringify({
        type: 'initial_metrics',
        data: this.getCurrentMetrics()
      }))
      
      ws.on('close', () => {
        this.clients.delete(ws)
      })
    })
  }
  
  startBroadcasting() {
    setInterval(() => {
      const metrics = this.getCurrentMetrics()
      this.broadcast({
        type: 'metrics_update',
        data: metrics,
        timestamp: Date.now()
      })
    }, 5000) // Update every 5 seconds
  }
  
  getCurrentMetrics() {
    return {
      httpRequests: {
        average: this.monitor.getAverageResponseTime('http_request'),
        count: this.monitor.getMetrics('http_request', 60000).length // Last minute
      },
      functions: {
        average: this.monitor.getAverageResponseTime('function_execution'),
        count: this.monitor.getMetrics('function_execution', 60000).length
      },
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    }
  }
  
  broadcast(message) {
    const data = JSON.stringify(message)
    
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    })
  }
}
\`\`\`

## Performance Best Practices

### Code-Level Optimizations

\`\`\`javascript
// 1. Use efficient data structures
class OptimizedDataStructures {
  constructor() {
    // Use Map for O(1) lookups instead of objects
    this.userCache = new Map()
    
    // Use Set for unique collections
    this.activeUsers = new Set()
    
    // Use typed arrays for numeric data
    this.metrics = new Float64Array(1000)
  }
  
  // 2. Avoid unnecessary object creation
  processUsers(users) {
    // Bad: Creates new array on each call
    // return users.filter(u => u.isActive).map(u => u.name)
    
    // Good: Reuse arrays and minimize allocations
    const result = []
    for (let i = 0; i < users.length; i++) {
      if (users[i].isActive) {
        result.push(users[i].name)
      }
    }
    return result
  }
  
  // 3. Use object pooling for frequently created objects
  static requestPool = []
  
  static getRequest() {
    return this.requestPool.pop() || { headers: {}, body: null, params: {} }
  }
  
  static releaseRequest(req) {
    // Reset object
    req.headers = {}
    req.body = null
    req.params = {}
    this.requestPool.push(req)
  }
}

// 4. Optimize loops
class LoopOptimizations {
  // Cache array length
  processArray(items) {
    for (let i = 0, len = items.length; i < len; i++) {
      // Process item
      this.processItem(items[i])
    }
  }
  
  // Use for...of for iterables
  processIterable(items) {
    for (const item of items) {
      this.processItem(item)
    }
  }
  
  // Use forEach for functional style
  processFunctional(items) {
    items.forEach(item => this.processItem(item))
  }
}
\`\`\`

### Database Query Optimization

\`\`\`javascript
class QueryOptimizer {
  // Use explain to analyze queries
  async analyzeQuery(query) {
    const explanation = await db.collection.find(query).explain('executionStats')
    
    console.log('Query Analysis:', {
      executionTimeMillis: explanation.executionStats.executionTimeMillis,
      totalDocsExamined: explanation.executionStats.totalDocsExamined,
      totalDocsReturned: explanation.executionStats.totalDocsReturned,
      indexesUsed: explanation.executionStats.executionStages
    })
    
    return explanation
  }
  
  // Optimize aggregation pipelines
  async getOptimizedUserStats() {
    return await db.User.aggregate([
      // 1. Match early to reduce documents
      { $match: { isActive: true, createdAt: { $gte: new Date('2024-01-01') } } },
      
      // 2. Project only needed fields
      { $project: { age: 1, department: 1, salary: 1 } },
      
      // 3. Group efficiently
      {
        $group: {
          _id: '$department',
          avgAge: { $avg: '$age' },
          avgSalary: { $avg: '$salary' },
          count: { $sum: 1 }
        }
      },
      
      // 4. Sort after grouping
      { $sort: { count: -1 } },
      
      // 5. Limit results
      { $limit: 10 }
    ])
  }
}
\`\`\`

## Next Steps

- Explore [Advanced Monitoring](./advanced-monitoring.md)
- Learn about [Scalability Patterns](../06_GCP%20Feature%20InDepth/scalability-patterns.md)
- Check out [Load Testing Strategies](../06_GCP%20Feature%20InDepth/load-testing.md)
