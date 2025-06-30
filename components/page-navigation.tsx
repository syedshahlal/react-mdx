"use client"

import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PageNavigationProps {
  previousPage?: {
    title: string
    href: string
  }
  nextPage?: {
    title: string
    href: string
  }
}

export function PageNavigation({ previousPage, nextPage }: PageNavigationProps) {
  // Always render the container, even if no navigation items
  return (
    <div className="flex items-center justify-between pt-8 mt-8 border-t border-slate-200 dark:border-slate-700">
      <div className="flex-1">
        {previousPage ? (
          <Link href={previousPage.href}>
            <Button
              variant="ghost"
              className="group p-4 h-auto flex-col items-start hover:bg-slate-50 dark:hover:bg-slate-800 text-left"
            >
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 mb-1 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </div>
              <div className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {previousPage.title}
              </div>
            </Button>
          </Link>
        ) : (
          <div className="p-4 h-auto opacity-50">
            <div className="flex items-center text-sm text-slate-400 mb-1">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </div>
            <div className="text-slate-400">No previous page</div>
          </div>
        )}
      </div>

      <div className="flex-1 flex justify-end">
        {nextPage ? (
          <Link href={nextPage.href}>
            <Button
              variant="ghost"
              className="group p-4 h-auto flex-col items-end hover:bg-slate-50 dark:hover:bg-slate-800 text-right"
            >
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 mb-1 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
              <div className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {nextPage.title}
              </div>
            </Button>
          </Link>
        ) : (
          <div className="p-4 h-auto opacity-50 text-right">
            <div className="flex items-center text-sm text-slate-400 mb-1 justify-end">
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
            <div className="text-slate-400">No next page</div>
          </div>
        )}
      </div>
    </div>
  )
}
