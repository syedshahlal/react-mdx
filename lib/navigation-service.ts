import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"
import { type NavigationConfig, type NavigationItem, defaultNavigationConfig } from "./navigation-config"

export interface DocumentMetadata {
  title?: string
  description?: string
  tags?: string[]
  category?: string
  difficulty?: "beginner" | "intermediate" | "advanced"
  estimatedReadTime?: number
  lastUpdated?: string
  author?: string
  version?: string
  relatedDocs?: string[]
  prerequisites?: string[]
  nextSteps?: string[]
}

export interface ProcessedDocument {
  id: string
  title: string
  content: string
  metadata: DocumentMetadata
  filePath: string
  href: string
  lastModified: Date
  wordCount: number
  headings: Array<{
    level: number
    text: string
    id: string
  }>
  links: Array<{
    type: "internal" | "external"
    href: string
    text: string
  }>
}

export class NavigationService {
  private config: NavigationConfig
  private documentsCache: Map<string, ProcessedDocument> = new Map()
  private configPath: string

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), "navigation.config.json")
    this.config = defaultNavigationConfig
  }

  async initialize(): Promise<void> {
    await this.loadConfig()
    await this.refreshDocuments()
  }

  async loadConfig(): Promise<NavigationConfig> {
    try {
      const configExists = await fs
        .access(this.configPath)
        .then(() => true)
        .catch(() => false)

      if (configExists) {
        const configContent = await fs.readFile(this.configPath, "utf-8")
        this.config = { ...defaultNavigationConfig, ...JSON.parse(configContent) }
      } else {
        await this.saveConfig()
      }
    } catch (error) {
      console.error("Error loading navigation config:", error)
      this.config = defaultNavigationConfig
    }

    return this.config
  }

  async saveConfig(): Promise<void> {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2))
    } catch (error) {
      console.error("Error saving navigation config:", error)
    }
  }

  async updateConfig(updates: Partial<NavigationConfig>): Promise<NavigationConfig> {
    this.config = { ...this.config, ...updates }
    await this.saveConfig()
    return this.config
  }

  getConfig(): NavigationConfig {
    return this.config
  }

  async refreshDocuments(): Promise<void> {
    this.documentsCache.clear()
    await this.processNavigationItems(this.config.navigation)
  }

  private async processNavigationItems(items: NavigationItem[]): Promise<void> {
    for (const item of items) {
      if (item.type === "file" && item.filePath) {
        try {
          const doc = await this.processDocument(item.filePath, item.href || "", item.id)
          this.documentsCache.set(item.id, doc)
        } catch (error) {
          console.error(`Error processing document ${item.filePath}:`, error)
        }
      }

      if (item.children) {
        await this.processNavigationItems(item.children)
      }
    }
  }

  private async processDocument(filePath: string, href: string, id: string): Promise<ProcessedDocument> {
    const fullPath = path.join(process.cwd(), filePath)
    const fileContent = await fs.readFile(fullPath, "utf-8")
    const { data: frontmatter, content } = matter(fileContent)
    const stats = await fs.stat(fullPath)

    // Extract headings
    const headings = this.extractHeadings(content)

    // Extract links
    const links = this.extractLinks(content)

    // Calculate word count
    const wordCount = content.split(/\s+/).length

    // Calculate estimated read time (average 200 words per minute)
    const estimatedReadTime = Math.ceil(wordCount / 200)

    const metadata: DocumentMetadata = {
      title: frontmatter.title || this.extractTitleFromContent(content),
      description: frontmatter.description,
      tags: frontmatter.tags || [],
      category: frontmatter.category,
      difficulty: frontmatter.difficulty,
      estimatedReadTime: frontmatter.estimatedReadTime || estimatedReadTime,
      lastUpdated: frontmatter.lastUpdated || stats.mtime.toISOString(),
      author: frontmatter.author,
      version: frontmatter.version,
      relatedDocs: frontmatter.relatedDocs || [],
      prerequisites: frontmatter.prerequisites || [],
      nextSteps: frontmatter.nextSteps || [],
    }

    return {
      id,
      title: metadata.title || "Untitled",
      content,
      metadata,
      filePath,
      href,
      lastModified: stats.mtime,
      wordCount,
      headings,
      links,
    }
  }

  private extractTitleFromContent(content: string): string {
    const titleMatch = content.match(/^#\s+(.+)$/m)
    return titleMatch ? titleMatch[1].trim() : "Untitled"
  }

  private extractHeadings(content: string): Array<{ level: number; text: string; id: string }> {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm
    const headings: Array<{ level: number; text: string; id: string }> = []
    let match

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length
      const text = match[2].trim()
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")

      headings.push({ level, text, id })
    }

    return headings
  }

  private extractLinks(content: string): Array<{ type: "internal" | "external"; href: string; text: string }> {
    const linkRegex = /\[([^\]]+)\]$$([^)]+)$$/g
    const links: Array<{ type: "internal" | "external"; href: string; text: string }> = []
    let match

    while ((match = linkRegex.exec(content)) !== null) {
      const text = match[1]
      const href = match[2]
      const type = href.startsWith("http") || href.startsWith("//") ? "external" : "internal"

      links.push({ type, href, text })
    }

    return links
  }

  getNavigation(): NavigationItem[] {
    return this.config.navigation
  }

  getDocument(id: string): ProcessedDocument | undefined {
    return this.documentsCache.get(id)
  }

  getAllDocuments(): ProcessedDocument[] {
    return Array.from(this.documentsCache.values())
  }

  searchDocuments(
    query: string,
    filters?: {
      tags?: string[]
      category?: string
      difficulty?: string
    },
  ): ProcessedDocument[] {
    const queryLower = query.toLowerCase()
    let results = Array.from(this.documentsCache.values())

    // Text search
    if (query) {
      results = results.filter(
        (doc) =>
          doc.title.toLowerCase().includes(queryLower) ||
          doc.content.toLowerCase().includes(queryLower) ||
          doc.metadata.description?.toLowerCase().includes(queryLower) ||
          doc.metadata.tags?.some((tag) => tag.toLowerCase().includes(queryLower)),
      )
    }

    // Apply filters
    if (filters) {
      if (filters.tags && filters.tags.length > 0) {
        results = results.filter((doc) => filters.tags!.some((tag) => doc.metadata.tags?.includes(tag)))
      }

      if (filters.category) {
        results = results.filter((doc) => doc.metadata.category === filters.category)
      }

      if (filters.difficulty) {
        results = results.filter((doc) => doc.metadata.difficulty === filters.difficulty)
      }
    }

    // Sort by relevance
    return results.sort((a, b) => {
      const aScore = this.calculateRelevanceScore(a, queryLower)
      const bScore = this.calculateRelevanceScore(b, queryLower)
      return bScore - aScore
    })
  }

  private calculateRelevanceScore(doc: ProcessedDocument, query: string): number {
    let score = 0

    // Title match (highest weight)
    if (doc.title.toLowerCase().includes(query)) {
      score += 10
    }

    // Description match
    if (doc.metadata.description?.toLowerCase().includes(query)) {
      score += 5
    }

    // Tag match
    if (doc.metadata.tags?.some((tag) => tag.toLowerCase().includes(query))) {
      score += 3
    }

    // Content match (lowest weight)
    const contentMatches = (doc.content.toLowerCase().match(new RegExp(query, "g")) || []).length
    score += contentMatches * 0.1

    return score
  }

  getRelatedDocuments(documentId: string, limit = 5): ProcessedDocument[] {
    const doc = this.documentsCache.get(documentId)
    if (!doc) return []

    const allDocs = Array.from(this.documentsCache.values()).filter((d) => d.id !== documentId)

    // Calculate similarity based on tags and category
    const scored = allDocs.map((otherDoc) => ({
      doc: otherDoc,
      score: this.calculateSimilarityScore(doc, otherDoc),
    }))

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.doc)
  }

  private calculateSimilarityScore(doc1: ProcessedDocument, doc2: ProcessedDocument): number {
    let score = 0

    // Same category
    if (doc1.metadata.category && doc1.metadata.category === doc2.metadata.category) {
      score += 5
    }

    // Common tags
    const commonTags = doc1.metadata.tags?.filter((tag) => doc2.metadata.tags?.includes(tag)) || []
    score += commonTags.length * 2

    // Same difficulty level
    if (doc1.metadata.difficulty && doc1.metadata.difficulty === doc2.metadata.difficulty) {
      score += 1
    }

    return score
  }

  async addNavigationItem(parentId: string | null, item: Omit<NavigationItem, "id">): Promise<NavigationItem> {
    const newItem: NavigationItem = {
      ...item,
      id: this.generateId(item.title),
    }

    if (parentId) {
      const parent = this.findNavigationItem(parentId)
      if (parent) {
        if (!parent.children) parent.children = []
        parent.children.push(newItem)
      }
    } else {
      this.config.navigation.push(newItem)
    }

    await this.saveConfig()

    if (newItem.type === "file" && newItem.filePath) {
      try {
        const doc = await this.processDocument(newItem.filePath, newItem.href || "", newItem.id)
        this.documentsCache.set(newItem.id, doc)
      } catch (error) {
        console.error(`Error processing new document ${newItem.filePath}:`, error)
      }
    }

    return newItem
  }

  async updateNavigationItem(id: string, updates: Partial<NavigationItem>): Promise<NavigationItem | null> {
    const item = this.findNavigationItem(id)
    if (!item) return null

    Object.assign(item, updates)
    await this.saveConfig()

    if (item.type === "file" && item.filePath) {
      try {
        const doc = await this.processDocument(item.filePath, item.href || "", item.id)
        this.documentsCache.set(item.id, doc)
      } catch (error) {
        console.error(`Error reprocessing document ${item.filePath}:`, error)
      }
    }

    return item
  }

  async removeNavigationItem(id: string): Promise<boolean> {
    const removed = this.removeNavigationItemRecursive(this.config.navigation, id)
    if (removed) {
      await this.saveConfig()
      this.documentsCache.delete(id)
    }
    return removed
  }

  private removeNavigationItemRecursive(items: NavigationItem[], id: string): boolean {
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === id) {
        items.splice(i, 1)
        return true
      }

      if (items[i].children && this.removeNavigationItemRecursive(items[i].children!, id)) {
        return true
      }
    }
    return false
  }

  private findNavigationItem(id: string): NavigationItem | null {
    return this.findNavigationItemRecursive(this.config.navigation, id)
  }

  private findNavigationItemRecursive(items: NavigationItem[], id: string): NavigationItem | null {
    for (const item of items) {
      if (item.id === id) return item
      if (item.children) {
        const found = this.findNavigationItemRecursive(item.children, id)
        if (found) return found
      }
    }
    return null
  }

  private generateId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  }

  getBreadcrumbs(documentId: string): Array<{ title: string; href?: string }> {
    const breadcrumbs: Array<{ title: string; href?: string }> = []
    const path = this.findNavigationPath(this.config.navigation, documentId, [])

    if (path) {
      for (const item of path) {
        breadcrumbs.push({
          title: item.title,
          href: item.href,
        })
      }
    }

    return breadcrumbs
  }

  private findNavigationPath(
    items: NavigationItem[],
    targetId: string,
    currentPath: NavigationItem[],
  ): NavigationItem[] | null {
    for (const item of items) {
      const newPath = [...currentPath, item]

      if (item.id === targetId) {
        return newPath
      }

      if (item.children) {
        const found = this.findNavigationPath(item.children, targetId, newPath)
        if (found) return found
      }
    }
    return null
  }

  getNavigationStats(): {
    totalDocuments: number
    totalFolders: number
    documentsByDifficulty: Record<string, number>
    documentsByCategory: Record<string, number>
    averageReadTime: number
  } {
    const docs = this.getAllDocuments()
    const stats = {
      totalDocuments: docs.length,
      totalFolders: this.countFolders(this.config.navigation),
      documentsByDifficulty: {} as Record<string, number>,
      documentsByCategory: {} as Record<string, number>,
      averageReadTime: 0,
    }

    let totalReadTime = 0

    for (const doc of docs) {
      if (doc.metadata.difficulty) {
        stats.documentsByDifficulty[doc.metadata.difficulty] =
          (stats.documentsByDifficulty[doc.metadata.difficulty] || 0) + 1
      }

      if (doc.metadata.category) {
        stats.documentsByCategory[doc.metadata.category] = (stats.documentsByCategory[doc.metadata.category] || 0) + 1
      }

      totalReadTime += doc.metadata.estimatedReadTime || 0
    }

    stats.averageReadTime = docs.length > 0 ? Math.round(totalReadTime / docs.length) : 0

    return stats
  }

  private countFolders(items: NavigationItem[]): number {
    let count = 0
    for (const item of items) {
      if (item.type === "folder") {
        count++
        if (item.children) {
          count += this.countFolders(item.children)
        }
      }
    }
    return count
  }
}

// Singleton instance
export const navigationService = new NavigationService()
