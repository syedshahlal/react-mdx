import { type NextRequest, NextResponse } from "next/server"
import { navigationService } from "@/lib/navigation-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""
    const tags = searchParams.get("tags")?.split(",").filter(Boolean) || []
    const category = searchParams.get("category") || undefined
    const difficulty = searchParams.get("difficulty") || undefined
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    await navigationService.initialize()

    const filters = {
      tags: tags.length > 0 ? tags : undefined,
      category,
      difficulty,
    }

    const results = navigationService.searchDocuments(query, filters)
    const limitedResults = results.slice(0, limit)

    return NextResponse.json({
      query,
      filters,
      results: limitedResults,
      total: results.length,
      hasMore: results.length > limit,
    })
  } catch (error) {
    console.error("Error searching documents:", error)
    return NextResponse.json({ error: "Failed to search documents" }, { status: 500 })
  }
}
