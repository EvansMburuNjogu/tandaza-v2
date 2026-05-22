"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { AdminFormPage } from "@/components/admin/admin-form-page"
import { ErrorState } from "@/components/ui/error-state"
import { Spinner } from "@/components/ui/spinner"
import { ProductForm, emptyProductForm, productPayloadFromForm, validateProductForm } from "@/components/exhibitor/product-form"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import type { ProductPayload } from "@/lib/api/contracts"

export default function NewProductPage() {
  const router = useRouter()
  const token = useSessionStore((s) => s.token)
  const [form, setForm] = useState(emptyProductForm)

  const profileQuery = useQuery({
    queryKey: ["exhibitor-profile"],
    queryFn: () => api.getExhibitorProfile(token || ""),
    enabled: Boolean(token)
  })

  const mutation = useMutation({
    mutationFn: (payload: ProductPayload) => api.createExhibitorProduct(token || "", payload),
    onSuccess: () => {
      toast.success("Product created")
      router.push("/exhibitor/products")
    },
    onError: (error: Error) => toast.error(error.message || "Could not create product")
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = validateProductForm(form)
    if (message) {
      toast.error(message)
      return
    }
    mutation.mutate(productPayloadFromForm(form))
  }

  if (profileQuery.isLoading || !profileQuery.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (profileQuery.isError) return <ErrorState onRetry={() => profileQuery.refetch()} />

  return (
    <AdminFormPage
      title="Add Product"
      description="Add a product visitors can discover, save, and ask about after the expo."
      backHref="/exhibitor/products"
      submitLabel="Add Product"
      submitting={mutation.isPending}
      onSubmit={handleSubmit}
    >
      <ProductForm
        token={token || ""}
        form={form}
        setForm={setForm}
        categories={profileQuery.data.categories || []}
      />
    </AdminFormPage>
  )
}
