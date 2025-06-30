import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

interface BreadcrumbProps {
  slug: string[]
}

export function Breadcrumb({ slug }: BreadcrumbProps) {
  const breadcrumbs = [
    { title: "Home", href: "/" },
    { title: "Documentation", href: "/docs" },
    ...slug.map((segment, index) => ({
      title: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " "),
      href: `/docs/${slug.slice(0, index + 1).join("/")}`,
    })),
  ]

  return (
    <nav className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400 mb-8">
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex items-center space-x-2">
          {index === 0 && <Home className="w-4 h-4" />}
          {index > 0 && <ChevronRight className="w-4 h-4" />}
          {index === breadcrumbs.length - 1 ? (
            <span className="text-slate-900 dark:text-slate-100 font-medium">{crumb.title}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
              {crumb.title}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
