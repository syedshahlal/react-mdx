# Getting Started with Local Setup

This guide will help you set up the development environment locally.

## Prerequisites

Before you begin, make sure you have the following installed:

- Node.js (version 18 or higher)
- npm or yarn package manager
- Git

## Installation Steps

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd <project-directory>
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   # or
   yarn install
   \`\`\`

3. **Set up environment variables**
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`
   
   Edit the `.env.local` file with your configuration values.

4. **Run the development server**
   \`\`\`bash
   npm run dev
   # or
   yarn dev
   \`\`\`

5. **Open your browser**
   Navigate to `http://localhost:3000` to see the application running.

## Configuration

### Database Setup

If you're using a local database, make sure to:

1. Install your preferred database (PostgreSQL, MySQL, etc.)
2. Create a new database for the project
3. Update the database connection string in your `.env.local` file

### API Keys

Some features require API keys. Add them to your `.env.local` file:

\`\`\`env
API_KEY=your_api_key_here
DATABASE_URL=your_database_url_here
\`\`\`

## Troubleshooting

### Common Issues

**Port already in use**
- Change the port in your configuration or stop the process using the port

**Module not found errors**
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

**Database connection errors**
- Verify your database is running and connection string is correct

## Next Steps

Once you have the local setup running:

1. Explore the codebase structure
2. Read the development guidelines
3. Check out the API documentation
4. Start building your features

For more detailed information, refer to the other sections in this documentation.
\`\`\`

The issue was likely that:

1. The folder was empty (no markdown files), so it wasn't being displayed
2. The API route needed better error handling and logging
3. The folder structure processing needed to handle empty folders better

I've updated the API route to:
- Include folders even if they're empty
- Add better logging to help debug issues
- Improve the title processing to handle numbered prefixes
- Add better error handling

I've also added a sample markdown file to your `Local_setup` folder. The folder should now appear in the sidebar navigation. If you still don't see it, try refreshing the page or check the browser console for any error messages.
