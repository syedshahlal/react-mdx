# Data Management Tutorial

Learn how to effectively manage data in your GRA Core Platform applications.

## Overview

This tutorial covers:
- Data models and schemas
- CRUD operations
- Data validation
- Relationships and joins
- Caching strategies
- Real-time updates
- Database operations
- Advanced querying
- Data synchronization
- Performance optimization

## Prerequisites

- Completed [Basic Setup Tutorial](./basic-setup.md)
- Understanding of databases (SQL/NoSQL)
- Familiarity with data modeling concepts

## Data Storage Options

GRA Core Platform supports multiple data storage solutions:
- **PostgreSQL**: Relational database for structured data
- **MongoDB**: Document database for flexible schemas
- **Redis**: In-memory cache for high-performance operations
- **Cloud Storage**: File and blob storage

## Step 1: Database Configuration

### Configure Database Connection

\`\`\`javascript
// gra.config.js
module.exports = {
  database: {
    primary: {
      type: 'postgresql',
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: true
    },
    cache: {
      type: 'redis',
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD
    }
  }
}
\`\`\`

### Environment Variables

\`\`\`env
# Add to .env
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=gra_app
DB_USER=your_db_user
DB_PASSWORD=your_db_password
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
\`\`\`

## Setting Up Data Models

### Basic Model Definition

\`\`\`javascript
import { GRAModel } from '@gra/database';

export class User extends GRAModel {
  static tableName = 'users';
  
  static schema = {
    id: { type: 'uuid', primary: true },
    email: { type: 'string', unique: true, required: true },
    firstName: { type: 'string', required: true },
    lastName: { type: 'string', required: true },
    createdAt: { type: 'timestamp', default: 'now' },
    updatedAt: { type: 'timestamp', default: 'now' }
  };

  static relationships = {
    posts: { type: 'hasMany', model: 'Post' },
    profile: { type: 'hasOne', model: 'UserProfile' }
  };
}
\`\`\`

### Advanced Schema with Validation

\`\`\`javascript
import { GRAModel } from '@gra/database';

export class Product extends GRAModel {
  static tableName = 'products';
  
  static schema = {
    id: { type: 'uuid', primary: true },
    name: { 
      type: 'string', 
      required: true,
      minLength: 2,
      maxLength: 100
    },
    description: { type: 'text' },
    price: { 
      type: 'number', 
      required: true,
      min: 0,
      validate: (value) => value > 0 || 'Price must be positive'
    },
    category: {
      type: 'string',
      enum: ['electronics', 'clothing', 'books', 'home'],
      required: true
    },
    tags: { type: 'array', items: { type: 'string' } },
    metadata: { type: 'object' },
    isAvailable: { type: 'boolean', default: true }
  };
}
\`\`\`

## CRUD Operations

### Create Operations

\`\`\`javascript
// Create a single record
async function createUser(userData) {
  try {
    const user = await User.create({
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      age: userData.age
    })
    
    console.log('User created:', user)
    return user
  } catch (error) {
    console.error('Create failed:', error)
    throw error
  }
}

// Bulk create
async function createMultipleUsers(usersData) {
  try {
    const users = await User.createMany(usersData)
    console.log(`Created ${users.length} users`)
    return users
  } catch (error) {
    console.error('Bulk create failed:', error)
    throw error
  }
}
\`\`\`

### Read Operations

\`\`\`javascript
// Find by ID
async function getUserById(id) {
  try {
    const user = await User.findById(id)
    return user
  } catch (error) {
    console.error('Find by ID failed:', error)
    throw error
  }
}

// Find with conditions
async function getActiveUsers() {
  try {
    const users = await User.find({
      isActive: true,
      age: { $gte: 18 }
    })
    return users
  } catch (error) {
    console.error('Find failed:', error)
    throw error
  }
}

// Advanced queries
async function searchUsers(searchTerm) {
  try {
    const users = await User.find({
      $or: [
        { firstName: { $regex: searchTerm, $options: 'i' } },
        { lastName: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .skip(0)
    
    return users
  } catch (error) {
    console.error('Search failed:', error)
    throw error
  }
}
\`\`\`

### Update Operations

\`\`\`javascript
// Update by ID
async function updateUser(id, updates) {
  try {
    const user = await User.findByIdAndUpdate(id, {
      ...updates,
      updatedAt: new Date()
    }, { new: true })
    
    return user
  } catch (error) {
    console.error('Update failed:', error)
    throw error
  }
}

// Bulk update
async function deactivateOldUsers() {
  try {
    const result = await User.updateMany(
      { 
        createdAt: { $lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
        isActive: true
      },
      { isActive: false }
    )
    
    console.log(`Deactivated ${result.modifiedCount} users`)
    return result
  } catch (error) {
    console.error('Bulk update failed:', error)
    throw error
  }
}
\`\`\`

### Delete Operations

\`\`\`javascript
// Soft delete (recommended)
async function softDeleteUser(id) {
  try {
    const user = await User.findByIdAndUpdate(id, {
      isActive: false,
      deletedAt: new Date()
    })
    
    return user
  } catch (error) {
    console.error('Soft delete failed:', error)
    throw error
  }
}

// Hard delete (use with caution)
async function hardDeleteUser(id) {
  try {
    const result = await User.findByIdAndDelete(id)
    return result
  } catch (error) {
    console.error('Hard delete failed:', error)
    throw error
  }
}
\`\`\`

## Data Relationships

### One-to-Many Relationships

\`\`\`javascript
// Define related models
import { GRAModel } from '@gra/database';

export class Order extends GRAModel {
  static tableName = 'orders';
  
  static schema = {
    id: { type: 'uuid', primary: true },
    userId: { type: 'uuid', ref: 'User', required: true },
    items: [{ 
      productId: { type: 'uuid', ref: 'Product' },
      quantity: { type: 'number', min: 1 },
      price: { type: 'number', min: 0 }
    }],
    total: { type: 'number', min: 0 },
    status: { 
      type: 'enum', 
      values: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending'
    },
    createdAt: { type: 'timestamp', default: 'now' }
  };

  static relationships = {
    user: { type: 'belongsTo', model: 'User', foreignKey: 'userId' },
    products: { type: 'hasMany', model: 'Product', foreignKey: 'productId' }
  };
}

// Query with population
async function getUserWithOrders(userId) {
  try {
    const user = await User.findById(userId)
    const orders = await Order.find({ userId }).populate('items.productId')
    
    return { user, orders }
  } catch (error) {
    console.error('Query with population failed:', error)
    throw error
  }
}
\`\`\`

### Many-to-Many Relationships

\`\`\`javascript
import { GRAModel } from '@gra/database';

export class Tag extends GRAModel {
  static tableName = 'tags';
  
  static schema = {
    id: { type: 'uuid', primary: true },
    name: { type: 'string', required: true, unique: true },
    color: { type: 'string', default: '#000000' }
  };
}

import { GRAModel } from '@gra/database';

export class Article extends GRAModel {
  static tableName = 'articles';
  
  static schema = {
    id: { type: 'uuid', primary: true },
    title: { type: 'string', required: true },
    content: { type: 'text', required: true },
    authorId: { type: 'uuid', ref: 'User', required: true },
    tags: [{ type: 'uuid', ref: 'Tag' }],
    publishedAt: { type: 'timestamp' }
  };

  static relationships = {
    author: { type: 'belongsTo', model: 'User', foreignKey: 'authorId' },
    tags: { type: 'belongsToMany', model: 'Tag', through: 'article_tags' }
  };
}

// Query articles with tags
async function getArticlesWithTags() {
  try {
    const articles = await Article.find({ publishedAt: { $ne: null } })
      .populate('authorId', 'firstName lastName')
      .populate('tags')
      .sort({ publishedAt: -1 })
    
    return articles
  } catch (error) {
    console.error('Query failed:', error)
    throw error
  }
}
\`\`\`

## Data Validation

### Custom Validators

\`\`\`javascript
import { GRAValidator } from '@gra/validation';

export const userValidationRules = {
  create: {
    email: {
      required: true,
      email: true,
      unique: { table: 'users', column: 'email' }
    },
    firstName: {
      required: true,
      minLength: 2,
      maxLength: 50
    },
    lastName: {
      required: true,
      minLength: 2,
      maxLength: 50
    },
    password: {
      required: true,
      minLength: 8,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
    }
  },
  update: {
    firstName: {
      optional: true,
      minLength: 2,
      maxLength: 50
    },
    lastName: {
      optional: true,
      minLength: 2,
      maxLength: 50
    }
  }
};

export function validateUser(data, operation = 'create') {
  const validator = new GRAValidator();
  return validator.validate(data, userValidationRules[operation]);
}
\`\`\`

### Pre/Post Hooks

\`\`\`javascript
// Pre-save hook
User.pre('save', function(next) {
  // Hash password before saving
  if (this.isModified('password')) {
    this.password = hashPassword(this.password);
  }
  
  // Update timestamp
  this.updatedAt = new Date();
  next();
});

// Post-save hook
User.post('save', function(doc) {
  // Send welcome email for new users
  if (doc.isNew) {
    sendWelcomeEmail(doc.email);
  }
});
\`\`\`

## Caching Strategies

### Basic Caching

\`\`\`javascript
import { GRACache } from '@gra/cache';

const cache = new GRACache();

async function getCachedUser(id) {
  try {
    // Try cache first
    let user = await cache.get(`user:${id}`);
    
    if (!user) {
      // Fetch from database
      user = await User.findById(id);
      
      // Cache for 1 hour
      await cache.set(`user:${id}`, user, 3600);
    }
    
    return user;
  } catch (error) {
    console.error('Cache operation failed:', error);
    // Fallback to database
    return await User.findById(id);
  }
}
\`\`\`

### Cache Invalidation

\`\`\`javascript
// Invalidate cache on update
async function updateUserWithCache(id, updates) {
  try {
    const user = await User.findByIdAndUpdate(id, updates, { new: true });
    
    // Invalidate cache
    await cache.del(`user:${id}`);
    
    return user;
  } catch (error) {
    console.error('Update with cache failed:', error);
    throw error;
  }
}
\`\`\`

## Real-time Updates

### WebSocket Integration

\`\`\`javascript
import { GRAWebSocket } from '@gra/websocket';
import { DataService } from './dataService';

export class SyncService {
  constructor() {
    this.ws = new GRAWebSocket();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Listen for data changes
    this.ws.on('user:updated', async (data) => {
      // Update local cache
      await DataService.updateUser(data.userId, data.changes);
      
      // Notify UI components
      this.emit('userUpdated', data);
    });

    this.ws.on('post:created', async (data) => {
      // Invalidate relevant caches
      await cache.delete(`user:${data.userId}:posts`);
      
      // Notify UI
      this.emit('postCreated', data);
    });
  }

  // Sync data changes to server
  async syncUserUpdate(userId, changes) {
    try {
      // Update locally first
      await DataService.updateUser(userId, changes);
      
      // Sync to server
      await this.ws.emit('sync:user:update', {
        userId,
        changes,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Sync failed:', error);
      // Implement retry logic
    }
  }
}
\`\`\`

## Performance Optimization

### Database Indexing

\`\`\`sql
-- Create indexes for better query performance
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created_at ON posts(created_at);
CREATE INDEX idx_users_email ON users(email);

-- Composite indexes for complex queries
CREATE INDEX idx_posts_status_created_at ON posts(status, created_at);
\`\`\`

### Query Optimization

\`\`\`javascript
// src/services/optimizedQueries.js
export class OptimizedQueries {
  // Use database views for complex queries
  static async getUserDashboardData(userId) {
    return await db.raw(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        COUNT(p.id) as post_count,
        MAX(p.created_at) as last_post_date
      FROM users u
      LEFT JOIN posts p ON u.id = p.user_id
      WHERE u.id = ?
      GROUP BY u.id, u.first_name, u.last_name
    `, [userId]);
  }

  // Batch operations for better performance
  static async createMultiplePosts(postsData) {
    return await Post.insertMany(postsData);
  }
}
\`\`\`

## Testing Data Operations

### Unit Tests

\`\`\`javascript
// tests/dataService.test.js
import { DataService } from '../src/services/dataService';
import { User } from '../src/models/User';

describe('DataService', () => {
  beforeEach(async () => {
    // Setup test database
    await setupTestDatabase();
  });

  afterEach(async () => {
    // Cleanup
    await cleanupTestDatabase();
  });

  test('should create user successfully', async () => {
    const userData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe'
    };

    const user = await DataService.createUser(userData);
    
    expect(user.id).toBeDefined();
    expect(user.email).toBe(userData.email);
  });

  test('should cache user data', async () => {
    const user = await DataService.createUser({
      email: 'cache@example.com',
      firstName: 'Cache',
      lastName: 'Test'
    });

    // First call - from database
    const user1 = await DataService.getUserById(user.id);
    
    // Second call - from cache
    const user2 = await DataService.getUserById(user.id);
    
    expect(user1).toEqual(user2);
  });
});
\`\`\`

## Best Practices

1. **Use Transactions**: For operations affecting multiple tables
2. **Implement Caching**: Cache frequently accessed data
3. **Validate Input**: Always validate data before database operations
4. **Handle Errors**: Implement proper error handling and logging
5. **Monitor Performance**: Track query performance and optimize slow queries
6. **Backup Strategy**: Implement regular database backups

## Next Steps

- Explore [Performance Optimization](../05_Development%20Guide/performance-optimization.md)
- Learn about [Security Best Practices](../05_Development%20Guide/security-best-practices.md)
- Review [API Reference](../03_API%20Reference/api-reference.md)
