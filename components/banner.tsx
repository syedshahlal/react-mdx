"use client"

import { useState } from "react"
import Link from "next/link"
import { X } from "lucide-react"

export function Banner() {
  const [open, setOpen] = useState(true)

  if (!open) return null

  return (
    <div className="bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200 py-3 px-4 text-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-600 dark:bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600 dark:bg-purple-400"></span>
          </span>
          <span className="font-semibold text-purple-900 dark:text-purple-100">New Release</span>
          <span>GRA Core Platform Planned & Unplanned Outages Dashboard.</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="https://gcp-outage-notifications.vercel.app/"
            target="dashboardFrame"
            className="underline font-medium hover:text-purple-900 dark:hover:text-purple-100"
          >
            View in Dashboard
          </Link>
          <button
            onClick={() => setOpen(false)}
            aria-label="Dismiss banner"
            className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
