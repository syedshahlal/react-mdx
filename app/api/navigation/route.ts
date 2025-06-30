import { type NextRequest, NextResponse } from "next/server"
import { navigationService } from "@/lib/navigation-service"

export async function GET(request: NextRequest) {
  try {
    await navigationService.initialize()

    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get("includeStats") === "true"
    const includeConfig = searchParams.get("includeConfig") === "true"

    const response: any = {
      navigation: navigationService.getNavigation(),
    }

    if (includeStats) {
      response.stats = navigationService.getNavigationStats()
    }

    if (includeConfig) {
      response.config = navigationService.getConfig()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching navigation:", error)
    return NextResponse.json({ error: "Failed to fetch navigation" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { parentId, item } = body

    if (!item || !item.title || !item.type) {
      return NextResponse.json({ error: "Missing required fields: title, type" }, { status: 400 })
    }

    await navigationService.initialize()
    const newItem = await navigationService.addNavigationItem(parentId || null, item)

    return NextResponse.json(newItem, { status: 201 })
  } catch (error) {
    console.error("Error creating navigation item:", error)
    return NextResponse.json({ error: "Failed to create navigation item" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { config } = body

    if (!config) {
      return NextResponse.json({ error: "Missing navigation config" }, { status: 400 })
    }

    await navigationService.initialize()
    const updatedConfig = await navigationService.updateConfig(config)

    return NextResponse.json(updatedConfig)
  } catch (error) {
    console.error("Error updating navigation config:", error)
    return NextResponse.json({ error: "Failed to update navigation config" }, { status: 500 })
  }
}
