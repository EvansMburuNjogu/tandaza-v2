import { Product, VisitorBooth, VisitorExpo } from "@/lib/api/contracts"

export function findVisitorBooth(expo: VisitorExpo | undefined, boothId: string): VisitorBooth | undefined {
  if (!expo || !boothId) return undefined
  return (expo.booths || []).find((booth) => booth.id === boothId || booth.exhibitorId === boothId)
}

export function findVisitorProduct(expo: VisitorExpo | undefined, boothId: string, productId: string): Product | undefined {
  const booth = findVisitorBooth(expo, boothId)
  if (!booth || !productId) return undefined
  return booth.products.find((product) => product.id === productId)
}

export function firstProductImage(product: Product | undefined) {
  if (!product) return ""
  return product.images?.[0] || product.mediaUrl || ""
}

export function productDisplayPrice(product: Product) {
  return product.discountedPrice && product.discountedPrice < product.price ? product.discountedPrice : product.price
}

export function allVisitorDocuments(booth: VisitorBooth | undefined) {
  if (!booth) return []
  return [
    ...(booth.companyDocuments || []).map((document) => ({ ...document, scope: "Company" })),
    ...(booth.expoDocuments || []).map((document) => ({ ...document, scope: "Expo" })),
  ]
}
