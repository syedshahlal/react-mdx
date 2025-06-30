export interface NavigationItem {
  id: string
  title: string
  description?: string
  icon?: string
  type: "file" | "folder" | "link" | "separator"
  href?: string
  filePath?: string
  order?: number
  visible?: boolean
  children?: NavigationItem[]
  metadata?: {
    tags?: string[]
    category?: string
    difficulty?: "beginner" | "intermediate" | "advanced"
    estimatedReadTime?: number
    lastUpdated?: string
    author?: string
    version?: string
  }
  conditions?: {
    showIf?: string // JavaScript expression
    hideIf?: string // JavaScript expression
    roles?: string[] // Required user roles
  }
}

export interface NavigationConfig {
  version: string
  title: string
  description?: string
  baseUrl: string
  navigation: NavigationItem[]
  settings: {
    autoGenerateFromFiles?: boolean
    sortBy?: "order" | "title" | "lastUpdated"
    sortDirection?: "asc" | "desc"
    showMetadata?: boolean
    enableSearch?: boolean
    enableBreadcrumbs?: boolean
  }
}

// Default navigation configuration
export const defaultNavigationConfig: NavigationConfig = {
  version: "1.0.0",
  title: "GCP 5.7 Documentation",
  description: "Comprehensive documentation for GCP 5.7 platform",
  baseUrl: "/docs",
  settings: {
    autoGenerateFromFiles: true,
    sortBy: "order",
    sortDirection: "asc",
    showMetadata: true,
    enableSearch: true,
    enableBreadcrumbs: true,
  },
  navigation: [
    {
      id: "getting-started",
      title: "Getting Started",
      type: "folder",
      icon: "Home",
      order: 1,
      children: [
        {
          id: "introduction",
          title: "Introduction",
          type: "file",
          filePath: "docs/gcp-5.7/01_GRA_Core_Platform Introduction/introduction.md",
          href: "/docs/gcp-5.7/01_GRA_Core_Platform Introduction/introduction",
          order: 1,
          metadata: {
            tags: ["introduction", "overview"],
            difficulty: "beginner",
            estimatedReadTime: 5,
          },
        },
        {
          id: "quick-start",
          title: "Quick Start Guide",
          type: "file",
          filePath: "docs/gcp-5.7/02_User Guide/Local_setup/getting-started.md",
          href: "/docs/gcp-5.7/02_User Guide/Local_setup/getting-started",
          order: 2,
          metadata: {
            tags: ["setup", "installation"],
            difficulty: "beginner",
            estimatedReadTime: 10,
          },
        },
      ],
    },
    {
      id: "user-guide",
      title: "User Guide",
      type: "folder",
      icon: "Users",
      order: 2,
      children: [
        {
          id: "user-guide-overview",
          title: "User Guide Overview",
          type: "file",
          filePath: "docs/gcp-5.7/02_User Guide/user-guide.md",
          href: "/docs/gcp-5.7/02_User Guide/user-guide",
          order: 1,
        },
      ],
    },
    {
      id: "api-reference",
      title: "API Reference",
      type: "folder",
      icon: "Code",
      order: 3,
      children: [
        {
          id: "api-overview",
          title: "API Overview",
          type: "file",
          filePath: "docs/gcp-5.7/03_API Reference/api-reference.md",
          href: "/docs/gcp-5.7/03_API Reference/api-reference",
          order: 1,
          metadata: {
            tags: ["api", "reference"],
            difficulty: "intermediate",
          },
        },
      ],
    },
    {
      id: "tutorials",
      title: "Examples & Tutorials",
      type: "folder",
      icon: "Layers",
      order: 4,
      children: [
        {
          id: "basic-setup",
          title: "Basic Setup",
          type: "file",
          filePath: "docs/gcp-5.7/04_Examples & Tutorials/basic-setup.md",
          href: "/docs/gcp-5.7/04_Examples & Tutorials/basic-setup",
          order: 1,
          metadata: {
            tags: ["tutorial", "setup"],
            difficulty: "beginner",
            estimatedReadTime: 15,
          },
        },
        {
          id: "user-authentication",
          title: "User Authentication",
          type: "file",
          filePath: "docs/gcp-5.7/04_Examples & Tutorials/user-authentication.md",
          href: "/docs/gcp-5.7/04_Examples & Tutorials/user-authentication",
          order: 2,
          metadata: {
            tags: ["tutorial", "authentication", "security"],
            difficulty: "intermediate",
            estimatedReadTime: 25,
          },
        },
        {
          id: "data-management",
          title: "Data Management",
          type: "file",
          filePath: "docs/gcp-5.7/04_Examples & Tutorials/data-management.md",
          href: "/docs/gcp-5.7/04_Examples & Tutorials/data-management",
          order: 3,
          metadata: {
            tags: ["tutorial", "data", "database"],
            difficulty: "advanced",
            estimatedReadTime: 30,
          },
        },
      ],
    },
    {
      id: "development",
      title: "Development Guide",
      type: "folder",
      icon: "Wrench",
      order: 5,
      children: [
        {
          id: "security-practices",
          title: "Security Best Practices",
          type: "file",
          filePath: "docs/gcp-5.7/05_Development Guide/security-best-practices.md",
          href: "/docs/gcp-5.7/05_Development Guide/security-best-practices",
          order: 1,
          metadata: {
            tags: ["security", "best-practices"],
            difficulty: "intermediate",
          },
        },
        {
          id: "performance-optimization",
          title: "Performance Optimization",
          type: "file",
          filePath: "docs/gcp-5.7/05_Development Guide/performance-optimization.md",
          href: "/docs/gcp-5.7/05_Development Guide/performance-optimization",
          order: 2,
          metadata: {
            tags: ["performance", "optimization"],
            difficulty: "advanced",
          },
        },
        {
          id: "monitoring",
          title: "Advanced Monitoring",
          type: "file",
          filePath: "docs/gcp-5.7/05_Development Guide/advanced-monitoring.md",
          href: "/docs/gcp-5.7/05_Development Guide/advanced-monitoring",
          order: 3,
          metadata: {
            tags: ["monitoring", "observability"],
            difficulty: "advanced",
          },
        },
      ],
    },
    {
      id: "gcp-features",
      title: "GCP Feature In-Depth",
      type: "folder",
      icon: "Database",
      order: 6,
      children: [
        {
          id: "cloud-functions",
          title: "Cloud Functions",
          type: "file",
          filePath: "docs/gcp-5.7/06_GCP Feature InDepth/cloud-functions.md",
          href: "/docs/gcp-5.7/06_GCP Feature InDepth/cloud-functions",
          order: 1,
          metadata: {
            tags: ["gcp", "cloud-functions", "serverless"],
            difficulty: "intermediate",
          },
        },
        {
          id: "cloud-storage",
          title: "Cloud Storage",
          type: "file",
          filePath: "docs/gcp-5.7/06_GCP Feature InDepth/cloud-storage.md",
          href: "/docs/gcp-5.7/06_GCP Feature InDepth/cloud-storage",
          order: 2,
          metadata: {
            tags: ["gcp", "storage", "cloud"],
            difficulty: "intermediate",
          },
        },
      ],
    },
  ],
}
