"use client"

import { useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type { Asset, AssetType } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Pencil } from "lucide-react"

interface AssetsCardProps {
  assets: Asset[]
  setAssets: (fn: (prev: Asset[]) => Asset[]) => void
  userId: string
  onRefresh: () => void
}

const ASSET_TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "investment", label: "Investment" },
  { value: "real_estate", label: "Real Estate" },
  { value: "vehicle", label: "Vehicle" },
  { value: "other", label: "Other" },
]

const TYPE_LABEL: Record<AssetType, string> = ASSET_TYPE_OPTIONS.reduce(
  (acc, opt) => ({ ...acc, [opt.value]: opt.label }),
  {} as Record<AssetType, string>,
)

const TYPE_ORDER: AssetType[] = ["cash", "investment", "real_estate", "vehicle", "other"]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

export function AssetsCard({ assets, setAssets, userId, onRefresh }: AssetsCardProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [value, setValue] = useState("")
  const [type, setType] = useState<AssetType | "">("")
  const [loading, setLoading] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [editName, setEditName] = useState("")
  const [editValue, setEditValue] = useState("")
  const [editType, setEditType] = useState<AssetType | "">("")
  const [editLoading, setEditLoading] = useState(false)
  const supabase = createClient()

  const resetForm = () => {
    setName("")
    setValue("")
    setType("")
  }

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!type) return
    setLoading(true)

    const { data, error } = await supabase
      .from("assets")
      .insert({
        user_id: userId,
        name,
        value: parseFloat(value),
        type,
      })
      .select()
      .single()

    if (!error && data) {
      setAssets((prev) => [data, ...prev])
      resetForm()
      setOpen(false)
    }
    setLoading(false)
    onRefresh()
  }

  const confirmDeleteAsset = (asset: Asset) => {
    toast(`Delete "${asset.name}"?`, {
      description: `${formatCurrency(asset.value)} · ${TYPE_LABEL[asset.type]}. This cannot be undone.`,
      action: {
        label: "Delete",
        onClick: async () => {
          const { error } = await supabase.from("assets").delete().eq("id", asset.id)
          if (error) {
            toast.error("Failed to delete asset", { description: error.message })
            return
          }
          setAssets((prev) => prev.filter((a) => a.id !== asset.id))
          toast.success(`Deleted "${asset.name}"`)
          onRefresh()
        },
      },
      cancel: { label: "Cancel", onClick: () => {} },
    })
  }

  const handleDialogOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) resetForm()
  }

  const openEditAsset = (asset: Asset) => {
    setEditingAsset(asset)
    setEditName(asset.name)
    setEditValue(asset.value.toString())
    setEditType(asset.type)
  }

  const handleEditOpenChange = (next: boolean) => {
    if (!next) {
      setEditingAsset(null)
      setEditName("")
      setEditValue("")
      setEditType("")
    }
  }

  const handleEditAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAsset || !editType) return
    const newValue = parseFloat(editValue)
    if (Number.isNaN(newValue) || newValue < 0) {
      toast.error("Enter a valid value")
      return
    }
    setEditLoading(true)
    const { data, error } = await supabase
      .from("assets")
      .update({ name: editName, value: newValue, type: editType })
      .eq("id", editingAsset.id)
      .select()
      .single()

    if (error || !data) {
      toast.error("Failed to update asset", { description: error?.message })
      setEditLoading(false)
      return
    }

    setAssets((prev) => prev.map((a) => (a.id === data.id ? data : a)))
    toast.success(`Updated "${data.name}"`)
    setEditingAsset(null)
    setEditName("")
    setEditValue("")
    setEditType("")
    setEditLoading(false)
    onRefresh()
  }

  const grouped = TYPE_ORDER.map((t) => ({
    type: t,
    items: assets.filter((a) => a.type === t),
  })).filter((group) => group.items.length > 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">Assets</CardTitle>
        <Dialog open={open} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Asset</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddAsset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="asset-name">Name</Label>
                <Input
                  id="asset-name"
                  placeholder="e.g., Chase Checking"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset-value">Value</Label>
                <Input
                  id="asset-value"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="5000.00"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset-type">Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as AssetType)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Adding..." : "Add Asset"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {assets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No assets yet. Add your first asset to track.
          </p>
        ) : (
          <div className="space-y-4">
            {grouped.map((group) => (
              <div key={group.type} className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {TYPE_LABEL[group.type]}
                </h4>
                {group.items.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{asset.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {TYPE_LABEL[asset.type]}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {formatCurrency(asset.value)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => openEditAsset(asset)}
                        aria-label={`Edit ${asset.name}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => confirmDeleteAsset(asset)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <Dialog open={editingAsset !== null} onOpenChange={handleEditOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAsset ? `Edit · ${editingAsset.name}` : "Edit asset"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditAsset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-asset-name">Name</Label>
              <Input
                id="edit-asset-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-asset-value">Value</Label>
              <Input
                id="edit-asset-value"
                type="number"
                step="0.01"
                min="0"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-asset-type">Type</Label>
              <Select
                value={editType}
                onValueChange={(v) => setEditType(v as AssetType)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={editLoading}>
              {editLoading ? "Saving..." : "Save"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
