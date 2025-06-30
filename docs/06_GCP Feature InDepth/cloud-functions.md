# Google Cloud Functions Integration

Deep dive into integrating Google Cloud Functions with GRA Core Platform for serverless computing.

## Overview

This guide covers:
- Setting up Cloud Functions with GRA Core Platform
- Event-driven architectures
- HTTP triggers and background functions
- Performance optimization
- Monitoring and debugging
- Best practices for serverless applications

## Getting Started with Cloud Functions

### Basic Setup

\`\`\`javascript
// functions/index.js
const functions = require('@google-cloud/functions-framework')
const { GRACore } = require('@gra-core/platform')

// Initialize GRA Core client
const graClient = new GRACore({
  apiKey: process.env.GRA_API_KEY,
  projectId: process.env.GCP_PROJECT_ID,
  environment: process.env.NODE_ENV
})

// HTTP Cloud Function
functions.http('processUserData', async (req, res) => {
  try {
    const { userId, action } = req.body
    
    // Process with GRA Core Platform
    const result = await graClient.users.processAction(userId, action)
    
    res.status(200).json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Function error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Background Cloud Function (Pub/Sub trigger)
functions.cloudEvent('processBackgroundTask', async (cloudEvent) => {
  try {
    const data = cloudEvent.data
    const message = data.message ? Buffer.from(data.message.data, 'base64').toString() : null
    
    if (!message) {
      console.log('No message data received')
      return
    }
    
    const taskData = JSON.parse(message)
    
    // Process background task
    await graClient.tasks.process(taskData)
    
    console.log('Background task processed successfully')
  } catch (error) {
    console.error('Background function error:', error)
    throw error // This will retry the function
  }
})
\`\`\`

### Deployment Configuration

\`\`\`yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/npm'
    args: ['install']
    dir: 'functions'
  
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'functions'
      - 'deploy'
      - 'processUserData'
      - '--runtime=nodejs18'
      - '--trigger=http'
      - '--allow-unauthenticated'
      - '--memory=512MB'
      - '--timeout=60s'
      - '--set-env-vars=GRA_API_KEY=${_GRA_API_KEY},NODE_ENV=production'
    dir: 'functions'
  
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'functions'
      - 'deploy'
      - 'processBackgroundTask'
      - '--runtime=nodejs18'
      - '--trigger-topic=gra-background-tasks'
      - '--memory=1GB'
      - '--timeout=300s'
      - '--set-env-vars=GRA_API_KEY=${_GRA_API_KEY},NODE_ENV=production'
    dir: 'functions'

substitutions:
  _GRA_API_KEY: 'your-api-key-here'
\`\`\`

## Event-Driven Architecture

### Pub/Sub Integration

\`\`\`javascript
const { PubSub } = require('@google-cloud/pubsub')

class EventProcessor {
  constructor() {
    this.pubsub = new PubSub({
      projectId: process.env.GCP_PROJECT_ID
    })
    
    this.graClient = new GRACore({
      apiKey: process.env.GRA_API_KEY
    })
  }
  
  // Publish events to Pub/Sub
  async publishEvent(topicName, eventData) {
    try {
      const topic = this.pubsub.topic(topicName)
      const message = Buffer.from(JSON.stringify(eventData))
      
      const messageId = await topic.publish(message, {
        eventType: eventData.type,
        timestamp: new Date().toISOString(),
        source: 'gra-core-platform'
      })
      
      console.log(`Event published: ${messageId}`)
      return messageId
    } catch (error) {
      console.error('Failed to publish event:', error)
      throw error
    }
  }
  
  // Process user events
  async processUserEvent(eventData) {
    const { userId, eventType, data } = eventData
    
    switch (eventType) {
      case 'user.created':
        await this.handleUserCreated(userId, data)
        break
      case 'user.updated':
        await this.handleUserUpdated(userId, data)
        break
      case 'user.deleted':
        await this.handleUserDeleted(userId, data)
        break
      default:
        console.log(`Unknown event type: ${eventType}`)
    }
  }
  
  async handleUserCreated(userId, data) {
    // Send welcome email
    await this.publishEvent('email-notifications', {
      type: 'welcome_email',
      userId,
      email: data.email,
      firstName: data.firstName
    })
    
    // Create user profile
    await this.graClient.profiles.create({
      userId,
      preferences: data.preferences || {}
    })
    
    // Track analytics event
    await this.publishEvent('analytics-events', {
      type: 'user_registration',
      userId,
      timestamp: new Date().toISOString(),
      metadata: data
    })
  }
  
  async handleUserUpdated(userId, data) {
    // Update related records
    await this.graClient.profiles.update(userId, {
      lastModified: new Date(),
      ...data.profileUpdates
    })
    
    // Invalidate caches
    await this.publishEvent('cache-invalidation', {
      type: 'user_cache_clear',
      userId
    })
  }
  
  async handleUserDeleted(userId, data) {
    // Cleanup related data
    await this.graClient.profiles.delete(userId)
    await this.graClient.sessions.deleteByUser(userId)
    
    // Send confirmation email
    await this.publishEvent('email-notifications', {
      type: 'account_deleted',
      email: data.email,
      firstName: data.firstName
    })
  }
}

// Cloud Function for processing user events
functions.cloudEvent('processUserEvents', async (cloudEvent) => {
  const processor = new EventProcessor()
  
  try {
    const message = cloudEvent.data.message
    const eventData = JSON.parse(Buffer.from(message.data, 'base64').toString())
    
    await processor.processUserEvent(eventData)
    
    console.log('User event processed successfully')
  } catch (error) {
    console.error('Error processing user event:', error)
    throw error
  }
})
\`\`\`

### Cloud Storage Triggers

\`\`\`javascript
const { Storage } = require('@google-cloud/storage')

// Process file uploads
functions.cloudEvent('processFileUpload', async (cloudEvent) => {
  const storage = new Storage()
  const graClient = new GRACore({ apiKey: process.env.GRA_API_KEY })
  
  try {
    const file = cloudEvent.data
    const bucketName = file.bucket
    const fileName = file.name
    const contentType = file.contentType
    
    console.log(`Processing file: ${fileName} in bucket: ${bucketName}`)
    
    // Skip if it's a temporary file
    if (fileName.startsWith('tmp/')) {
      console.log('Skipping temporary file')
      return
    }
    
    // Process different file types
    if (contentType.startsWith('image/')) {
      await processImageFile(storage, bucketName, fileName, graClient)
    } else if (contentType === 'application/json') {
      await processDataFile(storage, bucketName, fileName, graClient)
    } else if (contentType === 'text/csv') {
      await processCSVFile(storage, bucketName, fileName, graClient)
    }
    
    // Update file metadata in GRA Core Platform
    await graClient.files.updateStatus(fileName, 'processed')
    
  } catch (error) {
    console.error('File processing error:', error)
    
    // Update error status
    if (cloudEvent.data.name) {
      await graClient.files.updateStatus(cloudEvent.data.name, 'error', error.message)
    }
    
    throw error
  }
})

async function processImageFile(storage, bucketName, fileName, graClient) {
  const sharp = require('sharp')
  
  // Download the image
  const bucket = storage.bucket(bucketName)
  const file = bucket.file(fileName)
  
  const [fileBuffer] = await file.download()
  
  // Create thumbnails
  const sizes = [150, 300, 600]
  const thumbnails = []
  
  for (const size of sizes) {
    const thumbnail = await sharp(fileBuffer)
      .resize(size, size, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer()
    
    const thumbnailName = `thumbnails/${size}/${fileName}`
    const thumbnailFile = bucket.file(thumbnailName)
    
    await thumbnailFile.save(thumbnail, {
      metadata: {
        contentType: 'image/jpeg'
      }
    })
    
    thumbnails.push({
      size,
      url: `gs://${bucketName}/${thumbnailName}`
    })
  }
  
  // Store thumbnail info in GRA Core Platform
  await graClient.files.updateMetadata(fileName, {
    thumbnails,
    processedAt: new Date().toISOString()
  })
}

async function processDataFile(storage, bucketName, fileName, graClient) {
  const bucket = storage.bucket(bucketName)
  const file = bucket.file(fileName)
  
  // Download and parse JSON
  const [fileBuffer] = await file.download()
  const data = JSON.parse(fileBuffer.toString())
  
  // Validate data structure
  if (!data.records || !Array.isArray(data.records)) {
    throw new Error('Invalid data format: expected records array')
  }
  
  // Process records in batches
  const batchSize = 100
  for (let i = 0; i < data.records.length; i += batchSize) {
    const batch = data.records.slice(i, i + batchSize)
    await graClient.data.batchInsert(batch)
  }
  
  console.log(`Processed ${data.records.length} records from ${fileName}`)
}

async function processCSVFile(storage, bucketName, fileName, graClient) {
  const csv = require('csv-parser')
  const { Readable } = require('stream')
  
  const bucket = storage.bucket(bucketName)
  const file = bucket.file(fileName)
  
  const [fileBuffer] = await file.download()
  const records = []
  
  return new Promise((resolve, reject) => {
    Readable.from(fileBuffer)
      .pipe(csv())
      .on('data', (row) => {
        records.push(row)
      })
      .on('end', async () => {
        try {
          // Process CSV records
          await graClient.data.batchInsert(records)
          console.log(`Processed ${records.length} CSV records`)
          resolve()
        } catch (error) {
          reject(error)
        }
      })
      .on('error', reject)
  })
}
\`\`\`

## Performance Optimization

### Cold Start Optimization

\`\`\`javascript
// Global variables for connection reuse
let graClientInstance = null
let dbConnectionPool = null

function getGRAClient() {
  if (!graClientInstance) {
    graClientInstance = new GRACore({
      apiKey: process.env.GRA_API_KEY,
      // Enable connection pooling
      poolSize: 5,
      keepAlive: true,
      // Reduce timeout for faster cold starts
      timeout: 5000
    })
  }
  return graClientInstance
}

function getDBConnection() {
  if (!dbConnectionPool) {
    dbConnectionPool = new DatabasePool({
      connectionString: process.env.DATABASE_URL,
      min: 1,
      max: 3, // Limit connections for Cloud Functions
      idleTimeoutMillis: 30000
    })
  }
  return dbConnectionPool
}

// Optimized function with connection reuse
functions.http('optimizedFunction', async (req, res) => {
  const startTime = Date.now()
  
  try {
    // Reuse connections
    const graClient = getGRAClient()
    const db = getDBConnection()
    
    // Parallel processing where possible
    const [userData, preferences] = await Promise.all([
      graClient.users.get(req.body.userId),
      db.query('SELECT * FROM user_preferences WHERE user_id = $1', [req.body.userId])
    ])
    
    const result = await processUserData(userData, preferences)
    
    res.status(200).json({
      success: true,
      data: result,
      executionTime: Date.now() - startTime
    })
  } catch (error) {
    console.error('Function error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime
    })
  }
})

// Memory-efficient data processing
async function processUserData(userData, preferences) {
  // Use streams for large data processing
  const processedData = {
    userId: userData.id,
    profile: {
      name: userData.name,
      email: userData.email
    },
    settings: preferences.rows.reduce((acc, pref) => {
      acc[pref.key] = pref.value
      return acc
    }, {})
  }
  
  return processedData
}
\`\`\`

### Memory Management

\`\`\`javascript
// Memory-efficient batch processing
functions.cloudEvent('processBatchData', async (cloudEvent) => {
  const message = JSON.parse(Buffer.from(cloudEvent.data.message.data, 'base64').toString())
  const { batchId, dataSource } = message
  
  try {
    // Process data in chunks to avoid memory issues
    const chunkSize = 1000
    let offset = 0
    let processedCount = 0
    
    while (true) {
      // Fetch chunk
      const chunk = await fetchDataChunk(dataSource, offset, chunkSize)
      
      if (chunk.length === 0) {
        break // No more data
      }
      
      // Process chunk
      await processDataChunk(chunk)
      
      processedCount += chunk.length
      offset += chunkSize
      
      // Force garbage collection periodically
      if (processedCount % 5000 === 0) {
        if (global.gc) {
          global.gc()
        }
      }
      
      console.log(`Processed ${processedCount} records`)
    }
    
    console.log(`Batch ${batchId} completed: ${processedCount} records processed`)
  } catch (error) {
    console.error(`Batch ${batchId} failed:`, error)
    throw error
  }
})

async function fetchDataChunk(dataSource, offset, limit) {
  const graClient = getGRAClient()
  
  return await graClient.data.query({
    source: dataSource,
    offset,
    limit,
    // Only fetch required fields
    fields: ['id', 'name', 'email', 'status']
  })
}

async function processDataChunk(chunk) {
  const graClient = getGRAClient()
  
  // Process in parallel but limit concurrency
  const concurrency = 10
  const promises = []
  
  for (let i = 0; i < chunk.length; i += concurrency) {
    const batch = chunk.slice(i, i + concurrency)
    const batchPromise = Promise.all(
      batch.map(record => processRecord(record))
    )
    promises.push(batchPromise)
  }
  
  await Promise.all(promises)
}

async function processRecord(record) {
  // Simulate processing
  return {
    id: record.id,
    processed: true,
    timestamp: new Date().toISOString()
  }
}
\`\`\`

## Monitoring and Debugging

### Structured Logging

\`\`\`javascript
const { Logging } = require('@google-cloud/logging')

class CloudFunctionLogger {
  constructor() {
    this.logging = new Logging({
      projectId: process.env.GCP_PROJECT_ID
    })
    this.log = this.logging.log('cloud-functions')
  }
  
  info(message, metadata = {}) {
    this.writeLog('INFO', message, metadata)
  }
  
  warn(message, metadata = {}) {
    this.writeLog('WARNING', message, metadata)
  }
  
  error(message, error = null, metadata = {}) {
    const errorData = error ? {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    } : {}
    
    this.writeLog('ERROR', message, { ...metadata, ...errorData })
  }
  
  writeLog(severity, message, metadata) {
    const entry = this.log.entry({
      severity,
      timestamp: new Date(),
      labels: {
        function_name: process.env.FUNCTION_NAME || 'unknown',
        execution_id: process.env.FUNCTION_EXECUTION_ID || 'unknown'
      }
    }, {
      message,
      ...metadata
    })
    
    this.log.write(entry)
  }
}

const logger = new CloudFunctionLogger()

// Enhanced function with structured logging
functions.http('monitoredFunction', async (req, res) => {
  const executionId = req.get('Function-Execution-Id') || 'unknown'
  const startTime = Date.now()
  
  logger.info('Function execution started', {
    executionId,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent')
  })
  
  try {
    const { userId, action } = req.body
    
    logger.info('Processing user action', {
      executionId,
      userId,
      action
    })
    
    const result = await processUserAction(userId, action)
    
    const executionTime = Date.now() - startTime
    
    logger.info('Function execution completed', {
      executionId,
      executionTime,
      resultSize: JSON.stringify(result).length
    })
    
    res.status(200).json({
      success: true,
      data: result,
      executionId,
      executionTime
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    
    logger.error('Function execution failed', error, {
      executionId,
      executionTime,
      requestBody: req.body
    })
    
    res.status(500).json({
      success: false,
      error: error.message,
      executionId,
      executionTime
    })
  }
})
\`\`\`

### Error Handling and Retry Logic

\`\`\`javascript
class RetryableError extends Error {
  constructor(message, retryable = true) {
    super(message)
    this.name = 'RetryableError'
    this.retryable = retryable
  }
}

async function withRetry(operation, maxRetries = 3, backoffMs = 1000) {
  let lastError
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      // Don't retry non-retryable errors
      if (error instanceof RetryableError && !error.retryable) {
        throw error
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break
      }
      
      // Exponential backoff
      const delay = backoffMs * Math.pow(2, attempt - 1)
      logger.warn(`Operation failed, retrying in ${delay}ms`, {
        attempt,
        maxRetries,
        error: error.message
      })
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

// Function with retry logic
functions.cloudEvent('resilientFunction', async (cloudEvent) => {
  const message = JSON.parse(Buffer.from(cloudEvent.data.message.data, 'base64').toString())
  
  try {
    await withRetry(async () => {
      const graClient = getGRAClient()
      
      // This operation might fail due to network issues
      const result = await graClient.data.process(message.data)
      
      if (!result.success) {
        throw new RetryableError('Processing failed, retrying...')
      }
      
      return result
    }, 3, 1000)
    
    logger.info('Message processed successfully')
  } catch (error) {
    logger.error('Message processing failed after retries', error)
    
    // Send to dead letter queue or error handling service
    await handleFailedMessage(message, error)
    
    throw error
  }
})

async function handleFailedMessage(message, error) {
  const pubsub = new PubSub()
  const deadLetterTopic = pubsub.topic('failed-messages')
  
  await deadLetterTopic.publish(Buffer.from(JSON.stringify({
    originalMessage: message,
    error: {
      message: error.message,
      stack: error.stack
    },
    failedAt: new Date().toISOString()
  })))
}
\`\`\`

## Best Practices

### Security Best Practices

\`\`\`javascript
// Input validation and sanitization
const Joi = require('joi')

const requestSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  action: Joi.string().valid('create', 'update', 'delete').required(),
  data: Joi.object().optional()
})

functions.http('secureFunction', async (req, res) => {
  try {
    // Validate input
    const { error, value } = requestSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: error.details
      })
    }
    
    // Check authentication
    const authHeader = req.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header'
      })
    }
    
    const token = authHeader.substring(7)
    const user = await validateToken(token)
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      })
    }
    
    // Check authorization
    if (!await hasPermission(user.id, value.action)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      })
    }
    
    // Process request
    const result = await processSecureRequest(value, user)
    
    res.status(200).json({
      success: true,
      data: result
    })
  } catch (error) {
    logger.error('Secure function error', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

async function validateToken(token) {
  try {
    const graClient = getGRAClient()
    return await graClient.auth.validateToken(token)
  } catch (error) {
    logger.warn('Token validation failed', { error: error.message })
    return null
  }
}

async function hasPermission(userId, action) {
  const graClient = getGRAClient()
  const permissions = await graClient.users.getPermissions(userId)
  return permissions.includes(action)
}
\`\`\`

### Cost Optimization

\`\`\`javascript
// Efficient resource usage
functions.http('costOptimizedFunction', async (req, res) => {
  const startTime = Date.now()
  
  try {
    // Use minimal memory allocation
    const result = await processWithMinimalMemory(req.body)
    
    // Early return to reduce execution time
    res.status(200).json({
      success: true,
      data: result,
      executionTime: Date.now() - startTime
    })
    
    // Cleanup after response (if needed)
    setImmediate(() => {
      cleanup()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime
    })
  }
})

async function processWithMinimalMemory(data) {
  // Use streaming for large data
  // Avoid loading everything into memory
  // Process in chunks
  
  const results = []
  const chunkSize = 100
  
  for (let i = 0; i < data.items.length; i += chunkSize) {
    const chunk = data.items.slice(i, i + chunkSize)
    const processed = await processChunk(chunk)
    results.push(...processed)
    
    // Clear chunk from memory
    chunk.length = 0
  }
  
  return results
}

function cleanup() {
  // Close connections
  if (graClientInstance) {
    graClientInstance.close()
  }
  
  if (dbConnectionPool) {
    dbConnectionPool.end()
  }
  
  // Force garbage collection
  if (global.gc) {
    global.gc()
  }
}
\`\`\`

## Next Steps

- Learn about [Cloud Run Integration](./cloud-run.md)
- Explore [Pub/Sub Patterns](./pubsub-patterns.md)
- Check out [Monitoring and Alerting](./monitoring-alerting.md)
