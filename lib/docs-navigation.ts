import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"

/**
 * One flat ordered list of every markdown doc in the repo.
 * Each item has an href (eg: "/docs/06_GCP Feature InDepth/cloud-functions")
 * and a human-friendly title (front-matter `title` > first # heading > filename).
 */
export interface FlatDoc {
  href: string
  title: string
}

/**
 * Traverse the docs directory and return a depth-first, numerically-sorted list.
 */
export async function getFlatDocList(): Promise<FlatDoc[]> {
  const docsPath = path.join(process.cwd(), "docs")
  const result: FlatDoc[] = []

  async function walk(dir: string, hrefPrefix: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true })

    // sort: folders first, then files – each by numeric prefix if present
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1
      if (!a.isDirectory() && b.isDirectory()) return 1
      const getOrder = (n: string) => {
        const m = n.match(/^(\d+)_/)
        return m ? Number(m[1]) : 9_999
      }
      const orderDiff = getOrder(a.name) - getOrder(b.name)
      return orderDiff !== 0 ? orderDiff : a.name.localeCompare(b.name)
    })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const cleanedName = entry.name.replace(/^\d+_/, "") // drop numeric prefix
      const nextHref = `${hrefPrefix}/${entry.name}`.replace(/\\/g, "/")

      if (entry.isDirectory()) {
        await walk(fullPath, nextHref)
      } else if (entry.name.endsWith(".md")) {
        // derive title
        const raw = await fs.readFile(fullPath, "utf8")
        const { data, content } = matter(raw)
        const firstHeading = content.match(/^#\s+(.+)$/m)?.[1]?.trim()
        const title = (data as any).title ?? firstHeading ?? cleanedName.replace(/\.md$/, "").replace(/[_-]/g, " ")

        result.push({
          href: nextHref.replace(/\.md$/, ""),
          title,
        })
      }
    }
  }

  try {
    await walk(docsPath, "/docs")
  } catch (err) {
    console.error("Failed to read docs directory:", err)
  }

  return result
}
