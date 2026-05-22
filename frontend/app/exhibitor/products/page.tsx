"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/admin/page-header"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { DataTable } from "@/components/admin/data-table"
import { StatusBadge } from "@/components/admin/status-badge"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { ErrorState } from "@/components/ui/error-state"
import type { Product } from "@/lib/api/contracts"
import { formatCurrency, mediaUrl } from "@/lib/utils"

export default function ExhibitorProductsPage() {
  const token = useSessionStore((s) => s.token)
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  
  const query = useQuery({
    queryKey: ["exhibitor-products"],
    queryFn: () => api.getExhibitorProducts(token || ""),
    enabled: Boolean(token)
  })

  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  const products = query.data
  
  const filteredProducts = searchQuery
    ? products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products

  const totalValue = filteredProducts.reduce((sum, p) => sum + (p.discountedPrice || p.price), 0)
  const availableCount = filteredProducts.filter(p => p.status === "available").length
  const currency = filteredProducts[0]?.currency || "KES"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage your product catalog for exhibitions."
        actions={
          <Link href="/exhibitor/products/new">
            <Button>Add Product</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -mr-10 -mt-10 group-hover:bg-primary/10 transition-colors" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Total Products</p>
            </div>
            <p className="mt-2 text-3xl font-bold text-foreground">{filteredProducts.length}</p>
          </div>
        </Card>
        <Card className="p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-success/5 rounded-full -mr-10 -mt-10 group-hover:bg-success/10 transition-colors" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Available</p>
            </div>
            <p className="mt-2 text-3xl font-bold text-success">{availableCount}</p>
          </div>
        </Card>
        <Card className="p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full -mr-10 -mt-10 group-hover:bg-amber-500/10 transition-colors" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Total Value</p>
            </div>
            <p className="mt-2 text-3xl font-bold text-foreground">{formatCurrency(totalValue, currency)}</p>
          </div>
        </Card>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search products by name, category or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <svg 
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {searchQuery && (
          <span className="text-sm text-slate-500">
            Found {filteredProducts.length} products
          </span>
        )}
      </div>

      <DataTable<Product>
        columns={[
          {
            key: "name", header: "Product", sortable: true,
            render: (r) => (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {(r.images?.[0] || r.mediaUrl) && <img src={mediaUrl(r.images?.[0] || r.mediaUrl)} alt={r.name} className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{r.name}</p>
                  <p className="text-xs text-slate-500 truncate">{r.category}</p>
                </div>
              </div>
            )
          },
          {
            key: "description", header: "Description",
            render: (r) => (
              <span className="text-sm text-slate-500 line-clamp-2 max-w-xs">
                {r.description || "-"}
              </span>
            )
          },
          {
            key: "price", header: "Price", sortable: true,
            render: (r) => (
              <div className="text-left">
                {r.discountedPrice && r.discountedPrice < r.price ? (
                  <>
                    <span className="font-mono font-semibold text-success">{formatCurrency(r.discountedPrice, r.currency)}</span>
                    <span className="ml-2 text-sm text-slate-400 line-through">{formatCurrency(r.price, r.currency)}</span>
                  </>
                ) : (
                  <span className="font-mono">{formatCurrency(r.price, r.currency)}</span>
                )}
              </div>
            )
          },
          {
            key: "status", header: "Status", sortable: true,
            render: (r) => <StatusBadge value={r.status === "available" ? "active" : r.status === "out_of_stock" ? "pending" : "inactive"} />
          },
          {
            key: "featured", header: "Featured",
            render: (r) => r.featured ? (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">Featured</span>
            ) : (
              <span className="text-sm text-slate-400">-</span>
            )
          },
          {
            key: "createdAt", header: "Added", sortable: true,
            render: (r) => <span className="text-sm text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</span>
          }
        ]}
        rows={filteredProducts}
        rowActions={[
          { label: "View product", onClick: (r: Product) => router.push(`/exhibitor/products/${r.id}`) }
        ]}
        emptyTitle={searchQuery ? "No matching products found" : "No products yet"}
        emptyDescription={searchQuery ? "Try different search terms" : "Add your first product to showcase at exhibitions."}
      />
    </div>
  )
}
