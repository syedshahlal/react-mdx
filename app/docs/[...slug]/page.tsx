import { notFound } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { DocContent } from "@/components/doc-content"
import { Breadcrumb } from "@/components/breadcrumb"
import { PageNavigation } from "@/components/page-navigation"
import { TableOfContents } from "@/components/table-of-contents"
import { Header } from "@/components/header"
import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"
import { getFlatDocList } from "@/lib/docs-navigation"

// Function to get page navigation
async function getPageNavigation(currentHref: string) {
  const flat = await getFlatDocList()
  const idx = flat.findIndex((d) => d.href === currentHref)
  return {
    previousPage: idx > 0 ? flat[idx - 1] : undefined,
    nextPage: idx !== -1 && idx < flat.length - 1 ? flat[idx + 1] : undefined,
  }
}

// Tries to load a real Markdown file from the docs folder.
// Falls back to the previous mockContent object if the file is not found.
const getDocContent = async (slug: string[]) => {
  // Path to the markdown file (e.g. docs/06_GCP Feature InDepth/cloud-functions.md)
  const filePath = path.join(process.cwd(), "docs", ...slug) + ".md"

  try {
    const fileContent = await fs.readFile(filePath, "utf-8")
    const { data, content } = matter(fileContent)

    // Derive title: front-matter > first heading > slug
    const headingMatch = content.match(/^#\s+(.+)$/m)
    const derivedTitle =
      data.title || (headingMatch ? headingMatch[1].trim() : slug[slug.length - 1].replace(/-/g, " "))

    return {
      title: derivedTitle,
      content,
      lastUpdated: data.lastUpdated || "",
    }
  } catch {
    // ---------- Fallback to previous mock data ----------
    const slugPath = slug.join("/")
    // (mockContent object remains unchanged below)
    // -----------------------------------------------------
    const mockContent: Record<string, any> = {
      introduction: {
        title: "Introduction to GRA Core Platform",
        content: `# Introduction to GRA Core Platform

Welcome to the GRA Core Platform documentation. This comprehensive guide will help you understand and implement our enterprise-grade platform.

## What is GRA Core Platform?

GRA Core Platform is a powerful, scalable solution designed for modern enterprises. It provides:

- **High Performance**: Built for scale with enterprise-grade performance
- **Security First**: Advanced security features and compliance standards
- **Developer Friendly**: Intuitive APIs and comprehensive documentation
- **Flexible Architecture**: Modular design that adapts to your needs

## Getting Started

To begin using GRA Core Platform, you'll need to:

1. Set up your development environment
2. Configure your API credentials
3. Install the required dependencies
4. Run your first example

## Key Features

### Authentication & Authorization
Secure authentication system with role-based access control.

### Real-time Data Processing
Process and analyze data in real-time with our streaming architecture.

### Scalable Infrastructure
Auto-scaling capabilities that grow with your business needs.

## Next Steps

Ready to dive deeper? Check out our [User Guide](/docs/user-guide) or explore our [API Reference](/docs/api-reference).`,
        lastUpdated: "2024-01-15",
      },
      "user-guide": {
        title: "User Guide",
        content: `# User Guide

This comprehensive user guide will walk you through all aspects of using GRA Core Platform.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Operations](#basic-operations)
3. [Advanced Features](#advanced-features)
4. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- A valid GRA Core Platform account
- API credentials configured

### Installation

\`\`\`bash
npm install @gra-core/platform
\`\`\`

### Basic Configuration

\`\`\`javascript
import { GRACore } from '@gra-core/platform'

const client = new GRACore({
  apiKey: 'your-api-key',
  environment: 'production'
})
\`\`\`

## Basic Operations

### Creating Resources

Learn how to create and manage resources in the platform.

### Data Management

Understand how to efficiently manage your data with our APIs.

### Monitoring & Analytics

Set up monitoring and analytics for your applications.`,
        lastUpdated: "2024-01-14",
      },
      "api-reference": {
        title: "API Reference",
        content: `# API Reference

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
- \`limit\` (optional): Number of users to return (default: 10)
- \`offset\` (optional): Number of users to skip (default: 0)

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

Submit new data to the platform.`,
        lastUpdated: "2024-01-13",
      },
      examples: {
        title: "Examples & Tutorials",
        content: `# Examples & Tutorials

Real-world examples and step-by-step tutorials for common use cases.

## Quick Start Examples

### Basic Setup

\`\`\`javascript
import { GRACore } from '@gra-core/platform'

const client = new GRACore({
  apiKey: process.env.GRA_API_KEY,
  environment: 'production'
})
\`\`\`

### Creating Your First Resource

\`\`\`javascript
const resource = await client.resources.create({
  name: 'My First Resource',
  type: 'data-source'
})
\`\`\`

## Advanced Examples

### Real-time Data Processing

Learn how to process data in real-time with our streaming APIs.

### Custom Integrations

Build custom integrations with third-party services.`,
        lastUpdated: "2024-01-12",
      },
      development: {
        title: "Development Guide",
        content: `# Development Guide

Development workflows, contribution guidelines, and advanced topics.

## Development Environment

### Prerequisites

- Node.js 18+
- Docker
- Git

### Setup

\`\`\`bash
git clone https://github.com/gra-core/platform
cd platform
npm install
npm run dev
\`\`\`

## Contributing

### Code Style

We use ESLint and Prettier for code formatting.

### Testing

Run tests with:

\`\`\`bash
npm test
\`\`\`

## Advanced Topics

### Custom Plugins

Learn how to create custom plugins for the platform.

### Performance Optimization

Best practices for optimizing your GRA Core applications.`,
        lastUpdated: "2024-01-11",
      },
      architecture: {
        title: "Platform Architecture",
        content: `# Platform Architecture

Deep dive into GRA Core Platform architecture and infrastructure.

## System Overview

The GRA Core Platform is built on a microservices architecture with the following components:

- **API Gateway**: Routes requests and handles authentication
- **Core Services**: Business logic and data processing
- **Data Layer**: Distributed database and caching
- **Message Queue**: Asynchronous processing and events

## Scalability

### Horizontal Scaling

The platform automatically scales based on demand.

### Load Balancing

Traffic is distributed across multiple instances.

## Security

### Authentication

Multi-factor authentication and OAuth 2.0 support.

### Data Encryption

All data is encrypted at rest and in transit.`,
        lastUpdated: "2024-01-10",
      },
    }

    return mockContent[slugPath] || null
  }
}

export default async function DocPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const doc = await getDocContent(slug)

  if (!doc) {
    notFound()
  }

  const currentHref = `/docs/${slug.join("/")}`
  const { previousPage, nextPage } = await getPageNavigation(currentHref)

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Header />

      <div className="flex">
        {/* Fixed Left Sidebar */}
        <div className="fixed left-0 top-0 bottom-0 w-80 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-y-auto pt-20">
          <Sidebar />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 ml-80 mr-80">
          <div className="max-w-none px-8 py-6">
            <Breadcrumb slug={slug} />

            <div className="mt-6">
              <DocContent title={doc.title} content={doc.content} lastUpdated={doc.lastUpdated} />

              <PageNavigation previousPage={previousPage} nextPage={nextPage} />
            </div>
          </div>
        </main>

        {/* Fixed Right Sidebar - Table of Contents */}
        <div className="fixed right-0 top-0 bottom-0 w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-y-auto pt-20">
          <div className="p-6">
            <TableOfContents content={doc.content} />
          </div>
        </div>
      </div>
    </div>
  )
}

export async function generateStaticParams() {
  // Pre-generate only the main top-level pages; everything else is rendered on demand.
  return [
    { slug: ["introduction"] },
    { slug: ["user-guide"] },
    { slug: ["api-reference"] },
    { slug: ["examples"] },
    { slug: ["development"] },
    { slug: ["architecture"] },
  ]
}
