import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"

interface DocItem {
  title: string
  href: string
  order?: number
  children?: DocItem[]
}

interface DocSection {
  title: string
  items: DocItem[]
}

async function processDirectory(dirPath: string, baseHref: string): Promise<DocItem[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const items: DocItem[] = []

    // Sort entries: directories first, then files, both by numeric prefix or alphabetically
    const sortedEntries = entries.sort((a, b) => {
      // Directories come first
      if (a.isDirectory() && !b.isDirectory()) return -1
      if (!a.isDirectory() && b.isDirectory()) return 1

      // Extract numeric prefix for ordering
      const aMatch = a.name.match(/^(\d+)_/)
      const bMatch = b.name.match(/^(\d+)_/)

      if (aMatch && bMatch) {
        return Number.parseInt(aMatch[1]) - Number.parseInt(bMatch[1])
      } else if (aMatch) {
        return -1
      } else if (bMatch) {
        return 1
      }

      return a.name.localeCompare(b.name)
    })

    for (const entry of sortedEntries) {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory()) {
        // Process subdirectory
        const children = await processDirectory(fullPath, `${baseHref}/${entry.name}`)

        if (children.length > 0) {
          const dirTitle = entry.name.replace(/^\d+_/, "").replace(/_/g, " ")
          items.push({
            title: dirTitle,
            href: `${baseHref}/${entry.name}`,
            children: children,
          })
        }
      } else if (entry.name.endsWith(".md")) {
        // Process markdown file
        try {
          const fileContent = await fs.readFile(fullPath, "utf-8")
          const { data: frontmatter, content } = matter(fileContent)

          // Extract title from frontmatter or first heading
          const headingMatch = content.match(/^#\s+(.+)$/m)
          const title =
            frontmatter.title ||
            (headingMatch
              ? headingMatch[1].trim()
              : entry.name.replace(/\.md$/, "").replace(/^\d+_/, "").replace(/_/g, " "))

          const fileName = entry.name.replace(/\.md$/, "")
          const href = `${baseHref}/${fileName}`

          items.push({
            title: title,
            href: href,
            order: frontmatter.order,
          })
        } catch (error) {
          console.error(`Error processing file ${fullPath}:`, error)
        }
      }
    }

    return items
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error)
    return []
  }
}

export async function GET() {
  try {
    const docsPath = path.join(process.cwd(), "docs")

    // Check if docs directory exists
    try {
      await fs.access(docsPath)
    } catch {
      // Return fallback structure if docs directory doesn't exist
      return NextResponse.json({
        sections: [
          {
            title: "Getting Started",
            items: [
              { title: "Introduction", href: "/docs/introduction" },
              { title: "User Guide", href: "/docs/user-guide" },
              { title: "API Reference", href: "/docs/api-reference" },
            ],
          },
        ],
      })
    }

    const entries = await fs.readdir(docsPath, { withFileTypes: true })
    const sections: DocSection[] = []

    // Sort directories by their numeric prefix
    const sortedEntries = entries
      .filter((entry) => entry.isDirectory())
      .sort((a, b) => {
        const aMatch = a.name.match(/^(\d+)_/)
        const bMatch = b.name.match(/^(\d+)_/)
        const aOrder = aMatch ? Number.parseInt(aMatch[1]) : 999
        const bOrder = bMatch ? Number.parseInt(bMatch[1]) : 999
        return aOrder - bOrder
      })

    for (const entry of sortedEntries) {
      const sectionPath = path.join(docsPath, entry.name)
      const sectionTitle = entry.name.replace(/^\d+_/, "").replace(/_/g, " ")

      const items = await processDirectory(sectionPath, `/docs/${entry.name}`)

      if (items.length > 0) {
        sections.push({
          title: sectionTitle,
          items: items,
        })
      }
    }

    return NextResponse.json({ sections })
  } catch (error) {
    console.error("Error generating docs structure:", error)
    return NextResponse.json({ error: "Failed to generate docs structure" }, { status: 500 })
  }
}
