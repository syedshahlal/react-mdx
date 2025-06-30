"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronRight, Search, FileText, Folder } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"

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

export function Sidebar() {
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [navigation, setNavigation] = useState<DocSection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load navigation structure
    const loadNavigation = async () => {
      try {
        const response = await fetch("/api/docs-structure")
        if (response.ok) {
          const data = await response.json()
          setNavigation(data.sections || [])
        } else {
          // Fallback navigation structure
          setNavigation([
            {
              title: "GRA Core Platform Introduction",
              items: [{ title: "Introduction", href: "/docs/introduction" }],
            },
            {
              title: "User Guide",
              items: [
                { title: "User Guide", href: "/docs/user-guide" },
                {
                  title: "Local Setup",
                  href: "/docs/Local_setup",
                  children: [{ title: "Getting Started", href: "/docs/Local_setup/getting-started" }],
                },
              ],
            },
            {
              title: "API Reference",
              items: [{ title: "API Reference", href: "/docs/api-reference" }],
            },
            {
              title: "Examples & Tutorials",
              items: [
                { title: "Basic Setup", href: "/docs/examples/basic-setup" },
                { title: "User Authentication", href: "/docs/examples/user-authentication" },
                { title: "Data Management", href: "/docs/examples/data-management" },
              ],
            },
            {
              title: "Development Guide",
              items: [
                { title: "Security Best Practices", href: "/docs/development/security-best-practices" },
                { title: "Performance Optimization", href: "/docs/development/performance-optimization" },
                { title: "Advanced Monitoring", href: "/docs/development/advanced-monitoring" },
              ],
            },
            {
              title: "GCP Feature InDepth",
              items: [
                { title: "Cloud Functions", href: "/docs/06_GCP Feature InDepth/cloud-functions" },
                { title: "Cloud Storage", href: "/docs/06_GCP Feature InDepth/cloud-storage" },
              ],
            },
          ])
        }
      } catch (error) {
        console.error("Failed to load navigation:", error)
        // Use fallback navigation
      } finally {
        setLoading(false)
      }
    }

    loadNavigation()
  }, [])

  const toggleExpanded = (href: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(href)) {
      newExpanded.delete(href)
    } else {
      newExpanded.add(href)
    }
    setExpandedItems(newExpanded)
  }

  const filterItems = (items: DocItem[], query: string): DocItem[] => {
    if (!query) return items

    return items
      .filter((item) => {
        const matchesTitle = item.title.toLowerCase().includes(query.toLowerCase())
        const hasMatchingChildren = item.children && filterItems(item.children, query).length > 0
        return matchesTitle || hasMatchingChildren
      })
      .map((item) => ({
        ...item,
        children: item.children ? filterItems(item.children, query) : undefined,
      }))
  }

  const renderNavItem = (item: DocItem, level = 0) => {
    const isActive = pathname === item.href
    const isExpanded = expandedItems.has(item.href)
    const hasChildren = item.children && item.children.length > 0

    return (
      <div key={item.href}>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer transition-colors",
            "hover:bg-slate-100 dark:hover:bg-slate-800",
            isActive && "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium",
            level > 0 && "ml-4",
          )}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.preventDefault()
                toggleExpanded(item.href)
              }}
              className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          )}

          {!hasChildren && (
            <div className="w-4 flex justify-center">
              <FileText className="w-3 h-3 text-slate-400" />
            </div>
          )}

          {hasChildren && <Folder className="w-3 h-3 text-slate-400" />}

          <Link href={item.href} className="flex-1 min-w-0">
            <div className="truncate">{item.title}</div>
          </Link>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1">{item.children?.map((child) => renderNavItem(child, level + 1))}</div>
        )}
      </div>
    )
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Fixed Search Header */}
      <div className="fixed top-20 left-0 right-0 w-80 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 z-10">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>
        </div>
      </div>

      {/* Navigation Content */}
      <div className="flex-1 pt-20">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-6">
            {loading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              navigation.map((section) => {
                const filteredItems = filterItems(section.items, searchQuery)

                if (filteredItems.length === 0 && searchQuery) return null

                return (
                  <div key={section.title}>
                    <h3 className="px-3 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {section.title}
                    </h3>
                    <div className="space-y-1">{filteredItems.map((item) => renderNavItem(item))}</div>
                  </div>
                )
              })
            )}

            {searchQuery && navigation.every((section) => filterItems(section.items, searchQuery).length === 0) && (
              <div className="px-3 py-8 text-center text-slate-500 dark:text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No results found for "{searchQuery}"</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )

  return <SidebarContent />
}
