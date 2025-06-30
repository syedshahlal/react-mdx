# User Authentication Tutorial

Learn how to implement secure user authentication in your GRA Core Platform application using built-in authentication services.

## Overview
Learn how to implement secure user authentication in your GRA Core Platform application.

## Prerequisites
- Completed [Basic Setup Tutorial](./basic-setup.md)
- Understanding of JavaScript/TypeScript
- Familiarity with REST APIs

## Authentication Methods

GRA Core Platform supports multiple authentication methods:
- Email/Password
- OAuth (Google, GitHub, Microsoft)
- JWT Tokens
- Multi-Factor Authentication (MFA)

## Authentication Setup

### 1. Install Authentication Module

\`\`\`bash
npm install @gra-core/auth
\`\`\`

### 2. Configure Authentication

#### Enable Authentication in Config
\`\`\`javascript
// gra.config.js
module.exports = {
  features: {
    authentication: {
      enabled: true,
      providers: ['email', 'google', 'github'],
      mfa: true,
      sessionTimeout: 3600 // 1 hour
    }
  }
}
\`\`\`

#### Environment Variables
\`\`\`env
# Add to .env
GRA_AUTH_SECRET=your_secret_key_here
GRA_OAUTH_GOOGLE_CLIENT_ID=your_google_client_id
GRA_OAUTH_GOOGLE_CLIENT_SECRET=your_google_client_secret
\`\`\`

## User Registration

### Basic Registration

\`\`\`javascript
import { GRAAuth } from '@gra/auth';

const auth = new GRAAuth();

export async function registerUser(userData) {
  try {
    const result = await auth.register({
      email: userData.email,
      password: userData.password,
      profile: {
        firstName: userData.firstName,
        lastName: userData.lastName
      }
    });
    
    return result;
  } catch (error) {
    throw new Error(`Registration failed: ${error.message}`);
  }
}
\`\`\`

### Registration with Email Verification

\`\`\`javascript
async function registerWithVerification(userData) {
  try {
    const result = await auth.register({
      ...userData,
      requireEmailVerification: true
    })
    
    // Send verification email
    await auth.sendVerificationEmail(result.user.email)
    
    return result
  } catch (error) {
    console.error('Registration failed:', error)
    throw error
  }
}
\`\`\`

## User Login

### Standard Login

\`\`\`javascript
export async function loginUser(credentials) {
  try {
    const result = await auth.login({
      email: credentials.email,
      password: credentials.password
    });
    
    // Store token securely
    localStorage.setItem('gra_token', result.token);
    
    return result;
  } catch (error) {
    throw new Error(`Login failed: ${error.message}`);
  }
}
\`\`\`

### OAuth Login

\`\`\`javascript
export async function loginWithOAuth(provider) {
  try {
    const result = await auth.loginWithOAuth(provider);
    return result;
  } catch (error) {
    throw new Error(`OAuth login failed: ${error.message}`);
  }
}
\`\`\`

## Token Management

### Automatic Token Refresh

\`\`\`javascript
// Set up automatic token refresh
auth.onTokenExpired(async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken')
    const result = await auth.refreshToken(refreshToken)
    
    localStorage.setItem('accessToken', result.accessToken)
    localStorage.setItem('refreshToken', result.refreshToken)
  } catch (error) {
    // Redirect to login if refresh fails
    window.location.href = '/login'
  }
})
\`\`\`

### Manual Token Validation

\`\`\`javascript
async function validateToken() {
  try {
    const token = localStorage.getItem('accessToken')
    const isValid = await auth.validateToken(token)
    
    if (!isValid) {
      // Token is invalid, redirect to login
      window.location.href = '/login'
    }
    
    return isValid
  } catch (error) {
    console.error('Token validation failed:', error)
    return false
  }
}
\`\`\`

## Protected Routes

### Middleware Example

\`\`\`javascript
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }
  
  auth.validateToken(token)
    .then(isValid => {
      if (isValid) {
        next()
      } else {
        res.status(401).json({ error: 'Invalid token' })
      }
    })
    .catch(error => {
      res.status(500).json({ error: 'Token validation failed' })
    })
}

// Use middleware
app.get('/protected', requireAuth, (req, res) => {
  res.json({ message: 'This is a protected route' })
})
\`\`\`

### Auth Guard Hook
\`\`\`javascript
// src/hooks/useAuth.js
import { useState, useEffect } from 'react';
import { GRAAuth } from '@gra/auth';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('gra_token');
        if (token) {
          const userData = await GRAAuth.verifyToken(token);
          setUser(userData);
        }
      } catch (error) {
        localStorage.removeItem('gra_token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return { user, loading };
}
\`\`\`

### Protected Component
\`\`\`jsx
// src/components/ProtectedRoute.jsx
import React from 'react';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Please log in to access this page.</div>;
  }

  return children;
}
\`\`\`

## Session Management

### Session Storage

\`\`\`javascript
class SessionManager {
  static setSession(user, tokens) {
    sessionStorage.setItem('user', JSON.stringify(user))
    sessionStorage.setItem('accessToken', tokens.accessToken)
    sessionStorage.setItem('refreshToken', tokens.refreshToken)
  }
  
  static getSession() {
    const user = JSON.parse(sessionStorage.getItem('user') || 'null')
    const accessToken = sessionStorage.getItem('accessToken')
    const refreshToken = sessionStorage.getItem('refreshToken')
    
    return { user, accessToken, refreshToken }
  }
  
  static clearSession() {
    sessionStorage.removeItem('user')
    sessionStorage.removeItem('accessToken')
    sessionStorage.removeItem('refreshToken')
  }
}
\`\`\`

## Best Practices

### Security Considerations

1. **Never store sensitive data in localStorage**
2. **Use HTTPS in production**
3. **Implement proper CORS policies**
4. **Validate tokens on every request**
5. **Use secure, httpOnly cookies when possible**

### Error Handling

\`\`\`javascript
class AuthError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'AuthError'
    this.code = code
  }
}

function handleAuthError(error) {
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return 'Invalid email or password'
    case 'USER_NOT_FOUND':
      return 'User account not found'
    case 'TOKEN_EXPIRED':
      return 'Session expired, please login again'
    default:
      return 'Authentication failed'
  }
}
\`\`\`

## Complete Example

\`\`\`javascript
import { GRAAuth } from '@gra/auth'

class AuthService {
  constructor() {
    this.auth = new GRAAuth({
      apiKey: process.env.GRA_API_KEY,
      redirectUri: window.location.origin + '/callback'
    })
    
    this.setupTokenRefresh()
  }
  
  async login(email, password) {
    try {
      const result = await this.auth.login({ email, password })
      SessionManager.setSession(result.user, result.tokens)
      return result
    } catch (error) {
      throw new AuthError(handleAuthError(error), error.code)
    }
  }
  
  async logout() {
    try {
      await this.auth.logout()
      SessionManager.clearSession()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }
  
  setupTokenRefresh() {
    this.auth.onTokenExpired(async () => {
      const { refreshToken } = SessionManager.getSession()
      if (refreshToken) {
        try {
          const result = await this.auth.refreshToken(refreshToken)
          SessionManager.setSession(result.user, result.tokens)
        } catch (error) {
          this.logout()
        }
      }
    })
  }
}

export default new AuthService()
\`\`\`

## Next Steps

- Learn about [Data Management](./data-management.md)
- Explore [Advanced Security Features](../05_Development%20Guide/security-best-practices.md)
- Check out [API Reference](../03_API%20Reference/api-reference.md)
