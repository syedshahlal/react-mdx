# Basic Setup Tutorial

## Overview
This tutorial will guide you through the basic setup process for GRA Core Platform, covering initial configuration, environment setup, and your first project creation.

## Prerequisites
- Node.js 18+ installed
- Git installed
- Access to GRA Core Platform account

## Step 1: Installation

### Install GRA CLI
\`\`\`bash
npm install -g @gra/cli
\`\`\`

### Verify Installation
\`\`\`bash
gra --version
\`\`\`

## Step 2: Authentication

### Login to GRA Platform
\`\`\`bash
gra auth login
\`\`\`

This will open your browser and prompt you to authenticate with your GRA account.

### Verify Authentication
\`\`\`bash
gra auth whoami
\`\`\`

## Step 3: Create Your First Project

### Initialize New Project
\`\`\`bash
gra init my-first-project
cd my-first-project
\`\`\`

### Project Structure
\`\`\`
my-first-project/
├── src/
│   ├── components/
│   ├── services/
│   └── utils/
├── config/
├── tests/
├── package.json
└── gra.config.js
\`\`\`

## Step 4: Configuration

### Environment Variables
Create a `.env` file in your project root:

\`\`\`env
GRA_ENVIRONMENT=development
GRA_API_KEY=your_api_key_here
GRA_PROJECT_ID=your_project_id
\`\`\`

### GRA Configuration
Update `gra.config.js`:

\`\`\`javascript
module.exports = {
  projectId: process.env.GRA_PROJECT_ID,
  environment: process.env.GRA_ENVIRONMENT,
  features: {
    authentication: true,
    monitoring: true,
    caching: true
  }
}
\`\`\`

## Step 5: Run Your Project

### Development Mode
\`\`\`bash
npm run dev
\`\`\`

### Build for Production
\`\`\`bash
npm run build
\`\`\`

## Next Steps
- Explore the [User Authentication Tutorial](./user-authentication.md)
- Learn about [Data Management](./data-management.md)
- Check out the [API Reference](../03_API%20Reference/api-reference.md)

## Troubleshooting

### Common Issues

**Issue: Authentication Failed**
\`\`\`bash
# Clear auth cache and retry
gra auth logout
gra auth login
\`\`\`

**Issue: Project Creation Failed**
- Ensure you have proper permissions
- Check network connectivity
- Verify GRA CLI version

## Support
For additional help, visit our [Development Guide](../05_Development%20Guide/) or contact support.
