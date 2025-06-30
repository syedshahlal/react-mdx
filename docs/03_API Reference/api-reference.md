# API Reference

Complete reference for all GRA Core Platform APIs.

## Authentication

All API requests require authentication using API keys.

### Headers

\`\`\`
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
\`\`\`

## Endpoints

### Users API

#### GET /api/users

Retrieve a list of users.

**Parameters:**
- `limit` (optional): Number of users to return (default: 10)
- `offset` (optional): Number of users to skip (default: 0)

**Response:**
\`\`\`json
{
  "users": [
    {
      "id": "user_123",
      "name": "John Doe",
      "email": "john@example.com",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "has_more": false
}
\`\`\`

#### POST /api/users

Create a new user.

**Request Body:**
\`\`\`json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
\`\`\`

### Data API

#### GET /api/data

Retrieve data from the platform.

#### POST /api/data

Submit new data to the platform.
