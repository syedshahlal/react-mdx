import { type NextRequest, NextResponse } from "next/server"
import { navigationService } from "@/lib/navigation-service"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await navigationService.initialize()

    const document = navigationService.getDocument(id)

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const includeBreadcrumbs = searchParams.get("includeBreadcrumbs") === "true"
    const includeRelated = searchParams.get("includeRelated") === "true"

    const response: any = { document }

    if (includeBreadcrumbs) {
      response.breadcrumbs = navigationService.getBreadcrumbs(id)
    }

    if (includeRelated) {
      response.relatedDocuments = navigationService.getRelatedDocuments(id)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching document:", error)
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    await navigationService.initialize()
    const updatedItem = await navigationService.updateNavigationItem(id, body)

    if (!updatedItem) {
      return NextResponse.json({ error: "Navigation item not found" }, { status: 404 })
    }

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error("Error updating navigation item:", error)
    return NextResponse.json({ error: "Failed to update navigation item" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await navigationService.initialize()

    const removed = await navigationService.removeNavigationItem(id)

    if (!removed) {
      return NextResponse.json({ error: "Navigation item not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing navigation item:", error)
    return NextResponse.json({ error: "Failed to remove navigation item" }, { status: 500 })
  }
}
