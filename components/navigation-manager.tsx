"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Edit, Trash2, Search, FileText, Folder, Link, Save, RefreshCw } from "lucide-react"
import type { NavigationItem, NavigationConfig } from "@/lib/navigation-config"

interface NavigationManagerProps {
  onNavigationChange?: (navigation: NavigationItem[]) => void
}

export function NavigationManager({ onNavigationChange }: NavigationManagerProps) {
  const [navigation, setNavigation] = useState<NavigationItem[]>([])
  const [config, setConfig] = useState<NavigationConfig | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItem, setSelectedItem] = useState<NavigationItem | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [parentId, setParentId] = useState<string | null>(null)

  useEffect(() => {
    loadNavigation()
  }, [])

  const loadNavigation = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/navigation?includeStats=true&includeConfig=true")
      const data = await response.json()

      setNavigation(data.navigation)
      setConfig(data.config)
      setStats(data.stats)
      onNavigationChange?.(data.navigation)
    } catch (error) {
      console.error("Error loading navigation:", error)
    } finally {
      setLoading(false)
    }
  }

  const saveNavigationItem = async (item: Partial<NavigationItem>, isEdit = false) => {
    try {
      if (isEdit && selectedItem) {
        const response = await fetch(`/api/navigation/${selectedItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        })

        if (response.ok) {
          await loadNavigation()
          setIsEditDialogOpen(false)
          setSelectedItem(null)
        }
      } else {
        const response = await fetch("/api/navigation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parentId, item }),
        })

        if (response.ok) {
          await loadNavigation()
          setIsAddDialogOpen(false)
          setParentId(null)
        }
      }
    } catch (error) {
      console.error("Error saving navigation item:", error)
    }
  }

  const deleteNavigationItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return

    try {
      const response = await fetch(`/api/navigation/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await loadNavigation()
      }
    } catch (error) {
      console.error("Error deleting navigation item:", error)
    }
  }

  const refreshDocuments = async () => {
    try {
      setLoading(true)
      // Trigger a refresh by updating the config
      await fetch("/api/navigation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { ...config, version: Date.now().toString() } }),
      })
      await loadNavigation()
    } catch (error) {
      console.error("Error refreshing documents:", error)
    } finally {
      setLoading(false)
    }
  }

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const indent = level * 20

    return (
      <div key={item.id} style={{ marginLeft: `${indent}px` }}>
        <Card className="mb-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {item.type === "folder" && <Folder className="w-4 h-4 text-blue-500" />}
                {item.type === "file" && <FileText className="w-4 h-4 text-green-500" />}
                {item.type === "link" && <Link className="w-4 h-4 text-purple-500" />}

                <div>
                  <h4 className="font-medium">{item.title}</h4>
                  {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {item.type}
                    </Badge>
                    {item.metadata?.difficulty && (
                      <Badge variant="secondary" className="text-xs">
                        {item.metadata.difficulty}
                      </Badge>
                    )}
                    {item.metadata?.estimatedReadTime && (
                      <Badge variant="outline" className="text-xs">
                        {item.metadata.estimatedReadTime}min
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedItem(item)
                    setIsEditDialogOpen(true)
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setParentId(item.id)
                    setIsAddDialogOpen(true)
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => deleteNavigationItem(item.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {item.children && item.children.map((child) => renderNavigationItem(child, level + 1))}
      </div>
    )
  }

  const filteredNavigation = navigation.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading navigation...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Navigation Manager</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={refreshDocuments} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      <Tabs defaultValue="navigation" className="w-full">
        <TabsList>
          <TabsTrigger value="navigation">Navigation</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="navigation" className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search navigation items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <ScrollArea className="h-[600px]">
            <div className="space-y-2">{filteredNavigation.map((item) => renderNavigationItem(item))}</div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalDocuments}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Folders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalFolders}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Read Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.averageReadTime}min</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Object.keys(stats.documentsByCategory).length}</div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {config && (
            <Card>
              <CardHeader>
                <CardTitle>Navigation Configuration</CardTitle>
                <CardDescription>Configure global navigation settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={config.title}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          title: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="baseUrl">Base URL</Label>
                    <Input
                      id="baseUrl"
                      value={config.baseUrl}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          baseUrl: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={config.description || ""}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        description: e.target.value,
                      })
                    }
                  />
                </div>

                <Button
                  onClick={() => {
                    fetch("/api/navigation", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ config }),
                    })
                  }}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <NavigationItemDialog
        isOpen={isAddDialogOpen || isEditDialogOpen}
        onClose={() => {
          setIsAddDialogOpen(false)
          setIsEditDialogOpen(false)
          setSelectedItem(null)
          setParentId(null)
        }}
        onSave={saveNavigationItem}
        item={selectedItem}
        isEdit={isEditDialogOpen}
      />
    </div>
  )
}

interface NavigationItemDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (item: Partial<NavigationItem>, isEdit?: boolean) => void
  item?: NavigationItem | null
  isEdit?: boolean
}

function NavigationItemDialog({ isOpen, onClose, onSave, item, isEdit }: NavigationItemDialogProps) {
  const [formData, setFormData] = useState<Partial<NavigationItem>>({
    title: "",
    description: "",
    type: "file",
    icon: "FileText",
    filePath: "",
    href: "",
    order: 0,
    visible: true,
    metadata: {
      tags: [],
      difficulty: "beginner",
    },
  })

  useEffect(() => {
    if (item && isEdit) {
      setFormData(item)
    } else {
      setFormData({
        title: "",
        description: "",
        type: "file",
        icon: "FileText",
        filePath: "",
        href: "",
        order: 0,
        visible: true,
        metadata: {
          tags: [],
          difficulty: "beginner",
        },
      })
    }
  }, [item, isEdit])

  const handleSave = () => {
    onSave(formData, isEdit)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Navigation Item" : "Add Navigation Item"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the navigation item details" : "Create a new navigation item"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="file">File</SelectItem>
                  <SelectItem value="folder">Folder</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="separator">Separator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {formData.type === "file" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="filePath">File Path</Label>
                <Input
                  id="filePath"
                  value={formData.filePath || ""}
                  onChange={(e) => setFormData({ ...formData, filePath: e.target.value })}
                  placeholder="docs/gcp-5.7/..."
                />
              </div>
              <div>
                <Label htmlFor="href">URL Path</Label>
                <Input
                  id="href"
                  value={formData.href || ""}
                  onChange={(e) => setFormData({ ...formData, href: e.target.value })}
                  placeholder="/docs/..."
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="icon">Icon</Label>
              <Input
                id="icon"
                value={formData.icon || ""}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="FileText"
              />
            </div>
            <div>
              <Label htmlFor="order">Order</Label>
              <Input
                id="order"
                type="number"
                value={formData.order || 0}
                onChange={(e) => setFormData({ ...formData, order: Number.parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={formData.metadata?.difficulty}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    metadata: { ...formData.metadata, difficulty: value as any },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{isEdit ? "Update" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
