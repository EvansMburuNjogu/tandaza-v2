"use client"

import { FormEvent, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { PageHeader } from "@/components/admin/page-header"
import { ResourcePage } from "@/components/admin/resource-page"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/admin/status-badge"
import { api } from "@/lib/api"
import { validateCategoryInput } from "@/lib/admin-validation"
import { CategoryPayload, CategoryRecord } from "@/lib/api/contracts"
import { useSessionStore } from "@/store/session-store"

export default function CategoriesPage() {
  const token = useSessionStore((state) => state.token)
  const [values, setValues] = useState<CategoryPayload>({ name: "", slug: "", active: true })
  const query = useQuery({
    queryKey: ["admin-global-categories"],
    queryFn: async () => {
      try {
        return await api.getAdminCategories(token || "")
      } catch {
        return api.getCategories(token || "")
      }
    },
    enabled: Boolean(token)
  })
  const mutation = useMutation({
    mutationFn: (payload: CategoryPayload) => api.createAdminCategory(token || "", payload),
    onSuccess: async () => {
      toast.success("Category created")
      setValues({ name: "", slug: "", active: true })
      await query.refetch()
    },
    onError: (error) => toast.error("Could not create category", { description: error instanceof Error ? error.message : "Check the category details and try again." })
  })
  const statusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.updateAdminCategoryStatus(token || "", id, active),
    onSuccess: async (category) => {
      toast.success(category.active ? "Category activated" : "Category deactivated")
      await query.refetch()
    },
    onError: (error) => toast.error("Could not update category", { description: error instanceof Error ? error.message : "Try again or check your permissions." })
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validateCategoryInput(values)) return
    mutation.mutate({ ...values, icon: "tag" })
  }

  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  return (
    <div className="space-y-6">
      <PageHeader title="Categories" description="Global expo categories used across every Tandaza country." />

      <Card className="border-border/80 bg-card p-5">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">Name</label>
            <Input required minLength={2} maxLength={80} placeholder="Agritech" value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">Slug</label>
            <Input pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Use lowercase letters, numbers, and hyphens only" placeholder="agritech" value={values.slug} onChange={(event) => setValues((current) => ({ ...current, slug: event.target.value }))} />
          </div>
          <button type="submit" disabled={mutation.isPending} className="h-12 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
            {mutation.isPending ? "Adding..." : "Add Category"}
          </button>
        </form>
      </Card>

      <ResourcePage<CategoryRecord>
        title="Expo Categories"
        description="Categories are global taxonomy. Country pages choose from this shared list."
        stats={[
          { id: "total", label: "Categories", value: String(query.data.items.length), delta: "global taxonomy", trend: "neutral" },
          { id: "active", label: "Active", value: String(query.data.items.filter((item) => item.active).length), delta: "available to expos", trend: "up" }
        ]}
        rows={query.data.items}
        exportFileName="categories.csv"
        searchPlaceholder="Search categories..."
        searchText={(row) => `${row.name} ${row.slug} ${row.active ? "active" : "inactive"}`}
        emptyTitle="No categories found"
        emptyDescription="No global categories are available."
        columns={[
          { key: "name", header: "Name", sortable: true, exportValue: (row) => row.name, render: (row) => <span className="font-medium text-foreground">{row.name}</span> },
          { key: "slug", header: "Slug", sortable: true, exportValue: (row) => row.slug, render: (row) => <span className="font-mono text-sm text-slate-500">{row.slug}</span> },
          { key: "active", header: "Status", sortable: true, exportValue: (row) => (row.active ? "Active" : "Inactive"), render: (row) => <StatusBadge value={row.active ? "active" : "inactive"} /> },
          {
            key: "actions",
            header: "Actions",
            exportValue: (row) => row.active ? "Deactivate" : "Activate",
            render: (row) => (
              <button
                type="button"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate({ id: row.id, active: !row.active })}
                className="rounded-md border border-border bg-elevated px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {row.active ? "Deactivate" : "Activate"}
              </button>
            )
          }
        ]}
      />
    </div>
  )
}
