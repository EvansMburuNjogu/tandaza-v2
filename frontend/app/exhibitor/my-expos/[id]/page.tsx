"use client"

import { type CSSProperties, FormEvent, useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams, useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { StatusBadge } from "@/components/admin/status-badge"
import { BackLink } from "@/components/ui/back-link"
import { DataTable } from "@/components/admin/data-table"
import { AIPerformanceSummaryCard } from "@/components/analytics/ai-performance-summary"
import { api } from "@/lib/api"
import { AdCampaign, CalendarInvite, ExpoDocument, ExpoVisitor, Lead, PreOrder, Product, ROIEstimate } from "@/lib/api/contracts"
import { callingCodeOptions } from "@/lib/calling-codes"
import { useSessionStore } from "@/store/session-store"
import { ErrorState } from "@/components/ui/error-state"
import { ChatIcon, ChevronDownIcon, DownloadIcon, MenuIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/ui/icons"
import { cn, formatCurrency, formatDate, mediaUrl } from "@/lib/utils"
import { toast } from "sonner"

type TabType = "overview" | "leads" | "visitors" | "products" | "orders" | "meetings" | "conversations" | "feedback" | "documents" | "ads" | "analytics" | "qrcode"

const PAGE_SIZE = 10
const DEFAULT_MEETING_CATEGORIES = ["Online demo", "Sales consultation", "Product walkthrough", "Partnership discussion", "Post-expo follow-up"]
const AD_BANNER_WIDTH = 728
const AD_BANNER_HEIGHT = 90
const AD_BANNER_MAX_SIZE_BYTES = 2 * 1024 * 1024
const ORGANIZER_FEEDBACK_CATEGORIES = [
  { value: "overall", label: "Overall experience" },
  { value: "venue", label: "Venue" },
  { value: "logistics", label: "Logistics" },
  { value: "communication", label: "Communication" },
  { value: "support", label: "Organizer support" },
  { value: "payments", label: "Payments" }
] as const
const PRE_ORDER_STATUSES: Array<{ value: PreOrder["status"]; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "ready_for_delivery", label: "Ready for delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" }
]
function paginate<T>(items: T[], page: number) {
  return items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
}

async function imageFromUrl(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = url
  })
}

async function imageToDataUrl(url: string) {
  if (!url) return null
  try {
    const image = await imageFromUrl(url)
    const canvas = document.createElement("canvas")
    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return { dataUrl: canvas.toDataURL("image/png"), width, height }
  } catch {
    return null
  }
}

function fittedImageBox(width: number, height: number, boxX: number, boxY: number, boxW: number, boxH: number) {
  const ratio = Math.min(boxW / Math.max(width, 1), boxH / Math.max(height, 1))
  const fittedW = width * ratio
  const fittedH = height * ratio
  return {
    x: boxX + (boxW - fittedW) / 2,
    y: boxY + (boxH - fittedH) / 2,
    width: fittedW,
    height: fittedH
  }
}

export default function MyExpoPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const token = useSessionStore((s) => s.token)
  const router = useRouter()
  const client = useQueryClient()
  const workspaceContentRef = useRef<HTMLElement | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>("overview")
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [coverImageFailed, setCoverImageFailed] = useState(false)
  const [leadStatus, setLeadStatus] = useState("all")
  const [leadTemperature, setLeadTemperature] = useState("all")
  const [leadsPage, setLeadsPage] = useState(1)
  const [leadDialogOpen, setLeadDialogOpen] = useState(false)
  const [leadFollowUpDialog, setLeadFollowUpDialog] = useState<Lead | null>(null)
  const [leadNotesDialog, setLeadNotesDialog] = useState<Lead | null>(null)
  const [leadFollowUpForm, setLeadFollowUpForm] = useState({ scheduledAt: "", notes: "" })
  const [leadEntryMode, setLeadEntryMode] = useState<"existing" | "new">("existing")
  const [leadForm, setLeadForm] = useState({
    visitorId: "",
    name: "",
    email: "",
    countryCode: "+254",
    phone: "",
    status: "new",
    temperature: "warm",
    action: "interest",
    scheduledAt: "",
    meetingTitle: "",
    meetingLink: "",
    ccEmails: "",
    productId: "",
    quantity: "1",
    notes: ""
  })
  const [visitorsPage, setVisitorsPage] = useState(1)
  const [visitorSearch, setVisitorSearch] = useState("")
  const [visitorSourceFilter, setVisitorSourceFilter] = useState("all")
  const [productsPage, setProductsPage] = useState(1)
  const [showcaseDialogOpen, setShowcaseDialogOpen] = useState(false)
  const [selectedShowcaseProducts, setSelectedShowcaseProducts] = useState<string[]>([])
  const [ordersPage, setOrdersPage] = useState(1)
  const [orderStatusFilter, setOrderStatusFilter] = useState<PreOrder["status"] | "all">("all")
  const [orderSearch, setOrderSearch] = useState("")
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState("all")
  const [organizerFeedbackForm, setOrganizerFeedbackForm] = useState({
    rating: "5",
    category: "overall",
    comment: "",
    improvements: "",
    dislikes: ""
  })
  const [boostForm, setBoostForm] = useState({ name: "", imageUrl: "" })
  const [boostDialogOpen, setBoostDialogOpen] = useState(false)
  const [editingBoost, setEditingBoost] = useState<AdCampaign | null>(null)
  const [roiDialogOpen, setRoiDialogOpen] = useState(false)
  const [roiForm, setRoiForm] = useState({
    estimatedSpend: "",
    booth: "",
    travel: "",
    staffing: "",
    marketing: "",
    other: "",
    notes: ""
  })
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false)
  const [documentForm, setDocumentForm] = useState<{ name: string; file: File | null }>({ name: "", file: null })
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false)
  const [meetingView, setMeetingView] = useState<"week" | "day">("week")
  const [meetingDate, setMeetingDate] = useState(() => localDateInputValue())
  const [meetingLeadMode, setMeetingLeadMode] = useState<"existing" | "new">("existing")
  const [meetingForm, setMeetingForm] = useState({ leadId: "", visitorName: "", visitorEmail: "", visitorCountryCode: "+254", visitorPhone: "", ccEmails: "", title: "", meetingType: "", scheduledAt: "", location: "", notes: "" })
  const [selectedMeeting, setSelectedMeeting] = useState<CalendarInvite | null>(null)
  const [conversationSearch, setConversationSearch] = useState("")
  const [selectedConversationId, setSelectedConversationId] = useState("")
  const [conversationMessage, setConversationMessage] = useState("")
  const [liveStreamForm, setLiveStreamForm] = useState({ title: "Expo live stream", youtubeUrl: "", enabled: false })
  const [siteOrigin, setSiteOrigin] = useState("")
  const [qrImageUrl, setQrImageUrl] = useState("")
  const [shortenedVisitorUrl, setShortenedVisitorUrl] = useState("")

  useEffect(() => {
    const tab = searchParams.get("tab") as TabType | null
    if (tab && ["overview", "leads", "visitors", "products", "orders", "meetings", "conversations", "feedback", "documents", "ads", "analytics", "qrcode"].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  useEffect(() => {
    setVisitorsPage(1)
  }, [visitorSearch, visitorSourceFilter])

  const myExposQuery = useQuery({
    queryKey: ["my-expos"],
    queryFn: () => api.getMyExpos(token || ""),
    enabled: Boolean(token)
  })

  const leadsQuery = useQuery({
    queryKey: ["expo-leads", params.id],
    queryFn: () => api.getExpoLeads(token || "", params.id),
    enabled: Boolean(token && params.id)
  })

  const qrQuery = useQuery({
    queryKey: ["expo-qrcode", params.id],
    queryFn: () => api.getExpoQRCode(token || "", params.id),
    enabled: Boolean(token && params.id)
  })

  const profileQuery = useQuery({
    queryKey: ["exhibitor-profile"],
    queryFn: () => api.getExhibitorProfile(token || ""),
    enabled: Boolean(token)
  })

  const adsQuery = useQuery({
    queryKey: ["expo-ads", params.id],
    queryFn: () => api.getExpoAdCampaigns(token || "", params.id),
    enabled: Boolean(token && params.id)
  })

  const aiQuery = useQuery({
    queryKey: ["expo-ai", params.id],
    queryFn: () => api.getExpoAIAnalysis(token || "", params.id),
    enabled: Boolean(token && params.id)
  })
  const aiSummaryQueryKey = ["expo-ai-summary", params.id] as const
  const aiSummaryQuery = useQuery({
    queryKey: aiSummaryQueryKey,
    queryFn: () => api.getExpoAIAnalyticsSummary(token || "", params.id),
    enabled: Boolean(token && params.id)
  })

  const roiQuery = useQuery({
    queryKey: ["expo-roi", params.id],
    queryFn: () => api.getExpoROI(token || "", params.id),
    enabled: Boolean(token && params.id)
  })

  const visitorsQuery = useQuery({
    queryKey: ["expo-visitors", params.id],
    queryFn: () => api.getExpoVisitors(token || "", params.id),
    enabled: Boolean(token && params.id)
  })

  const productsQuery = useQuery({
    queryKey: ["expo-products", params.id],
    queryFn: () => api.getExhibitorProducts(token || "", params.id),
    enabled: Boolean(token)
  })

  const companyProductsQuery = useQuery({
    queryKey: ["company-products"],
    queryFn: () => api.getExhibitorProducts(token || ""),
    enabled: Boolean(token)
  })

  const preOrdersQuery = useQuery({
    queryKey: ["expo-preorders", params.id],
    queryFn: () => api.getExpoPreOrders(token || "", params.id),
    enabled: Boolean(token && params.id)
  })

  const meetingsQuery = useQuery({
    queryKey: ["expo-meetings", params.id],
    queryFn: () => api.getExpoCalendarInvites(token || "", params.id),
    enabled: Boolean(token && params.id)
  })

  const meetingCategoriesQuery = useQuery({
    queryKey: ["exhibitor-meeting-categories", token],
    queryFn: () => api.getExhibitorMeetingCategories(token || ""),
    enabled: Boolean(token)
  })

  const documentsQuery = useQuery({
    queryKey: ["expo-documents", params.id],
    queryFn: () => api.getExpoDocuments(token || "", params.id),
    enabled: Boolean(token && params.id)
  })

  useEffect(() => {
    const roi = roiQuery.data
    if (!roi) return
    setRoiForm({
      estimatedSpend: roi.estimatedSpend ? String(roi.estimatedSpend) : "",
      booth: roi.breakdown?.booth ? String(roi.breakdown.booth) : "",
      travel: roi.breakdown?.travel ? String(roi.breakdown.travel) : "",
      staffing: roi.breakdown?.staffing ? String(roi.breakdown.staffing) : "",
      marketing: roi.breakdown?.marketing ? String(roi.breakdown.marketing) : "",
      other: roi.breakdown?.other ? String(roi.breakdown.other) : "",
      notes: roi.notes || ""
    })
  }, [roiQuery.data])

  const feedbackQuery = useQuery({
    queryKey: ["expo-feedback", params.id],
    queryFn: () => api.getExpoFeedback(token || "", params.id),
    enabled: Boolean(token && params.id)
  })

  const organizerFeedbackMutation = useMutation({
    mutationFn: () => {
      const comment = organizerFeedbackForm.comment.trim()
      const improvements = organizerFeedbackForm.improvements.trim()
      const dislikes = organizerFeedbackForm.dislikes.trim()
      const rating = Number(organizerFeedbackForm.rating)
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) throw new Error("Choose a rating from 1 to 5.")
      if (!comment) throw new Error("Share your overall feedback for the organizer.")
      return api.submitOrganizerFeedback(token || "", params.id, {
        rating,
        category: organizerFeedbackForm.category as "venue" | "logistics" | "communication" | "support" | "payments" | "overall",
        comment,
        improvements,
        dislikes
      })
    },
    onSuccess: () => {
      toast.success("Feedback sent to organizer.")
      setOrganizerFeedbackForm({ rating: "5", category: "overall", comment: "", improvements: "", dislikes: "" })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not send feedback")
  })

  const conversationsQuery = useQuery({
    queryKey: ["expo-conversations", params.id],
    queryFn: () => api.getExpoConversations(token || "", params.id),
    enabled: Boolean(token && params.id),
    refetchInterval: activeTab === "conversations" ? 12000 : false
  })

  const liveStreamQuery = useQuery({
    queryKey: ["expo-live-stream", params.id],
    queryFn: () => api.getExpoLiveStream(token || "", params.id),
    enabled: Boolean(token && params.id)
  })

  useEffect(() => {
    if (!liveStreamQuery.data) return
    setLiveStreamForm({
      title: liveStreamQuery.data.title || "Expo live stream",
      youtubeUrl: liveStreamQuery.data.youtubeUrl || "",
      enabled: Boolean(liveStreamQuery.data.enabled)
    })
  }, [liveStreamQuery.data])

  const activeConversationThreadId = selectedConversationId || conversationsQuery.data?.[0]?.id || ""
  useEffect(() => {
    if (activeTab !== "conversations" || !activeConversationThreadId) return
    let socket: WebSocket | null = null
    let cancelled = false
    fetch("/api/auth/realtime-token", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (cancelled || !payload?.token) return
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || window.location.origin
        const wsBase = base.replace(/^https:/, "wss:").replace(/^http:/, "ws:")
        socket = new WebSocket(`${wsBase}/api/v1/exhibitor/expos/${encodeURIComponent(params.id)}/conversations/ws?thread=${encodeURIComponent(activeConversationThreadId)}&token=${encodeURIComponent(payload.token)}`)
        socket.onmessage = () => client.invalidateQueries({ queryKey: ["expo-conversations", params.id] })
      })
      .catch(() => {})
    return () => {
      cancelled = true
      socket?.close()
    }
  }, [activeConversationThreadId, activeTab, client, params.id])

  useEffect(() => {
    setSiteOrigin(window.location.origin)
  }, [])

  const companyName = profileQuery.data?.companyName || "Your company"
  const companyLogoUrl = mediaUrl(profileQuery.data?.logoUrl || profileQuery.data?.logo)
  const shortVisitorCode = qrQuery.data?.code || (qrQuery.data?.id ? qrQuery.data.id.replace(/^qr_/, "") : "")
  const shortVisitorUrl = shortVisitorCode && siteOrigin ? `${siteOrigin}/q/${encodeURIComponent(shortVisitorCode)}` : ""
  const visitorLink = shortenedVisitorUrl || shortVisitorUrl

  useEffect(() => {
    let cancelled = false
    if (!shortVisitorUrl) {
      setShortenedVisitorUrl("")
      return
    }
    setShortenedVisitorUrl("")
    fetch("/api/shorten-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: shortVisitorUrl })
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const url = typeof data?.url === "string" ? data.url : ""
        if (!cancelled && url) setShortenedVisitorUrl(url)
      })
      .catch(() => {
        if (!cancelled) setShortenedVisitorUrl("")
      })
    return () => {
      cancelled = true
    }
  }, [shortVisitorUrl])

  useEffect(() => {
    let cancelled = false
    if (!visitorLink) {
      setQrImageUrl("")
      return
    }
    import("qrcode").then(({ default: QRCode }) => QRCode.toDataURL(visitorLink, {
      errorCorrectionLevel: "H",
      margin: 2,
      scale: 10,
      color: { dark: "#0f172a", light: "#ffffff" }
    }))
      .then((url) => {
        if (!cancelled) setQrImageUrl(url)
      })
      .catch(() => {
        if (!cancelled) {
          setQrImageUrl("")
          toast.error("Could not render QR code.")
        }
      })
    return () => {
      cancelled = true
    }
  }, [visitorLink])

  const leadMutation = useMutation({
    mutationFn: ({ leadId, status, temperature }: { leadId: string; status: "new" | "contacted" | "meeting_booked" | "proposal_sent" | "won" | "lost"; temperature: "hot" | "warm" | "cold" }) =>
      api.updateExpoLead(token || "", leadId, { status, temperature }),
    onSuccess: () => {
      toast.success("Lead updated.")
      client.invalidateQueries({ queryKey: ["expo-leads", params.id] })
      client.invalidateQueries({ queryKey: ["exhibitor-overview"] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update lead")
  })

  const leadFollowUpMutation = useMutation({
    mutationFn: () => {
      if (!leadFollowUpDialog) throw new Error("Choose a lead.")
      if (!leadFollowUpForm.scheduledAt) throw new Error("Choose a follow-up date and time.")
      if (!leadFollowUpForm.notes.trim()) throw new Error("Add follow-up notes.")
      return api.recordExpoLeadActivity(token || "", leadFollowUpDialog.id, {
        type: "follow_up",
        scheduledAt: zonedDateTimeToUtcISO(leadFollowUpForm.scheduledAt, expoTimezone),
        notes: leadFollowUpForm.notes.trim()
      })
    },
    onSuccess: () => {
      toast.success("Follow-up saved.")
      setLeadFollowUpDialog(null)
      setLeadFollowUpForm({ scheduledAt: "", notes: "" })
      client.invalidateQueries({ queryKey: ["expo-leads", params.id] })
      client.invalidateQueries({ queryKey: ["exhibitor-overview"] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save follow-up")
  })

  const openLeadFollowUp = (lead: Lead) => {
    setLeadFollowUpDialog(lead)
    setLeadFollowUpForm({ scheduledAt: lead.nextFollowUpAt ? dateTimeLocalFromISO(lead.nextFollowUpAt, expoTimezone) : "", notes: "" })
  }

  const createLeadMutation = useMutation({
    mutationFn: () => {
      const selectedVisitor = visitors.find((visitor) => visitor.id === leadForm.visitorId)
      const selectedProduct = products.find((product) => product.id === leadForm.productId)
      const scheduledAt = leadForm.scheduledAt ? zonedDateTimeToUtcISO(leadForm.scheduledAt, expoTimezone) : ""
      const name = leadEntryMode === "existing" ? selectedVisitor?.name || "" : leadForm.name.trim()
      const email = leadEntryMode === "existing" ? selectedVisitor?.email || "" : leadForm.email.trim()
      const normalizedPhone = leadForm.phone.replace(/\s/g, "").replace(/^0+/, "").replace(/^\+/, "")
      const phone = leadEntryMode === "existing" ? selectedVisitor?.phone || "" : (normalizedPhone ? `${leadForm.countryCode}${normalizedPhone}` : "")
      const ccEmails = leadForm.ccEmails.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean)
      if (!name.trim()) throw new Error(leadEntryMode === "existing" ? "Choose an existing visitor." : "Visitor name is required.")
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid visitor email address.")
      if (ccEmails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error("Enter valid CC email addresses.")
      if (leadForm.action === "meeting" && !scheduledAt) throw new Error("Meeting date and time is required.")
      if (leadForm.action === "meeting" && !email) throw new Error("Visitor email is required to arrange a meeting.")
      if (leadForm.action === "meeting" && !leadForm.meetingLink.trim()) throw new Error("Meeting link is required.")
      if (leadForm.action === "call" && !scheduledAt) throw new Error("Call follow-up date and time is required.")
      if (leadForm.action === "pre_order" && !selectedProduct?.id) throw new Error("Choose a product for the pre-order.")
      return api.createExpoLead(token || "", params.id, {
        name,
        email,
        phone,
        status: leadForm.status as Lead["status"],
        temperature: leadForm.temperature as Lead["temperature"],
        action: leadForm.action as "interest" | "meeting" | "pre_order" | "call",
        scheduledAt,
        title: leadForm.meetingTitle.trim(),
        location: leadForm.meetingLink.trim(),
        ccEmails,
        productId: selectedProduct?.id,
        productName: selectedProduct?.name,
        productPrice: selectedProduct?.discountedPrice || selectedProduct?.price,
        productCurrency: selectedProduct?.currency || expo?.currency || "KES",
        quantity: Number(leadForm.quantity) || 1,
        notes: leadForm.notes.trim(),
        source: "manual"
      })
    },
    onSuccess: () => {
      toast.success("Lead added.")
      setLeadDialogOpen(false)
      setLeadForm({ visitorId: "", name: "", email: "", countryCode: "+254", phone: "", status: "new", temperature: "warm", action: "interest", scheduledAt: "", meetingTitle: "", meetingLink: "", ccEmails: "", productId: "", quantity: "1", notes: "" })
      client.invalidateQueries({ queryKey: ["expo-leads", params.id] })
      client.invalidateQueries({ queryKey: ["expo-visitors", params.id] })
      client.invalidateQueries({ queryKey: ["expo-preorders", params.id] })
      client.invalidateQueries({ queryKey: ["expo-meetings", params.id] })
      client.invalidateQueries({ queryKey: ["exhibitor-overview"] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not add lead")
  })

  const boostMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: boostForm.name.trim(),
        placement: "banner",
        imageUrl: boostForm.imageUrl.trim(),
        mediaUrl: boostForm.imageUrl.trim(),
        budget: editingBoost?.budget || 0
      }
      return editingBoost
        ? api.updateExpoAdCampaign(token || "", params.id, editingBoost.id, payload)
        : api.createExpoAdCampaign(token || "", params.id, payload)
    },
    onSuccess: () => {
      toast.success(editingBoost ? "Workspace ad updated." : "Workspace ad submitted.")
      setBoostForm({ name: "", imageUrl: "" })
      setEditingBoost(null)
      setBoostDialogOpen(false)
      client.invalidateQueries({ queryKey: ["expo-ads", params.id] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save workspace ad")
  })

  const boostUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      await validateAdBannerFile(file)
      return api.uploadMedia(token || "", file, "ad_banner")
    },
    onSuccess: (media) => {
      setBoostForm(f => ({ ...f, imageUrl: media.url }))
      toast.success("Ad banner uploaded.")
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not upload banner")
  })

  const roiMutation = useMutation({
    mutationFn: () => {
      const payload = buildROIEstimatePayload(roiForm, expo?.currency || "KES")
      if (!payload) throw new Error("Enter at least one ROI estimate value.")
      return api.updateExpoROI(token || "", params.id, payload)
    },
    onSuccess: () => {
      toast.success("ROI estimate updated.")
      setRoiDialogOpen(false)
      client.invalidateQueries({ queryKey: ["expo-roi", params.id] })
      client.invalidateQueries({ queryKey: ["expo-ai", params.id] })
      client.invalidateQueries({ queryKey: aiSummaryQueryKey })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update ROI estimate")
  })

  const documentMutation = useMutation({
    mutationFn: async () => {
      const file = documentForm.file
      const name = documentForm.name.trim()
      if (!name || !file) throw new Error("Document name and PDF file are required.")
      if (file.type !== "application/pdf") throw new Error("Upload a PDF document.")
      const media = await api.uploadMedia(token || "", file)
      return api.createExpoDocument(token || "", params.id, {
        name,
        url: media.url,
        mimeType: media.mimeType,
        size: media.size
      })
    },
    onSuccess: () => {
      toast.success("Document uploaded.")
      setDocumentForm({ name: "", file: null })
      setDocumentDialogOpen(false)
      client.invalidateQueries({ queryKey: ["expo-documents", params.id] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not upload document")
  })

  const documentDeleteMutation = useMutation({
    mutationFn: (document: ExpoDocument) => api.deleteExpoDocument(token || "", params.id, document.id),
    onSuccess: () => {
      toast.success("Document deleted.")
      client.invalidateQueries({ queryKey: ["expo-documents", params.id] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not delete document")
  })

  const conversationMessageMutation = useMutation({
    mutationFn: () => {
      const threadId = selectedConversationId || conversationsQuery.data?.[0]?.id || ""
      if (!threadId) throw new Error("Choose a visitor conversation.")
      if (conversationMessage.trim().length < 3) throw new Error("Write a message before sending.")
      return api.sendExpoChatMessage(token || "", params.id, threadId, { message: conversationMessage.trim() })
    },
    onSuccess: () => {
      toast.success("Message saved and queued.")
      setConversationMessage("")
      client.invalidateQueries({ queryKey: ["expo-conversations", params.id] })
      client.invalidateQueries({ queryKey: ["expo-leads", params.id] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not send message")
  })

  const liveStreamMutation = useMutation({
    mutationFn: () => api.updateExpoLiveStream(token || "", params.id, {
      title: liveStreamForm.title.trim() || "Expo live stream",
      youtubeUrl: liveStreamForm.youtubeUrl.trim(),
      enabled: liveStreamForm.enabled
    }),
    onSuccess: () => {
      toast.success("Live stream settings saved.")
      client.invalidateQueries({ queryKey: ["expo-live-stream", params.id] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save live stream settings")
  })

  const meetingMutation = useMutation({
    mutationFn: () => {
      const selectedLead = leads.find((lead) => lead.id === meetingForm.leadId)
      const scheduledAt = meetingForm.scheduledAt ? zonedDateTimeToUtcISO(meetingForm.scheduledAt, expoTimezone) : ""
      const normalizedPhone = meetingForm.visitorPhone.replace(/\s/g, "").replace(/^0+/, "").replace(/^\+/, "")
      const ccEmails = meetingForm.ccEmails.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean)
      if (!scheduledAt) throw new Error("Choose a meeting date and time.")
      if (!meetingForm.location.trim()) throw new Error("Meeting link is required.")
      if (meetingLeadMode === "existing" && !selectedLead) {
        throw new Error("Select an existing lead.")
      }
      if (meetingLeadMode === "new" && (!meetingForm.visitorName.trim() || !meetingForm.visitorEmail.trim())) {
        throw new Error("Add visitor name and email.")
      }
      if (meetingLeadMode === "new" && meetingForm.visitorEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(meetingForm.visitorEmail.trim())) {
        throw new Error("Enter a valid visitor email address.")
      }
      if (ccEmails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        throw new Error("Enter valid CC email addresses.")
      }
      return api.createExpoMeeting(token || "", params.id, {
        leadId: meetingLeadMode === "existing" ? meetingForm.leadId || undefined : undefined,
        visitorName: meetingForm.visitorName.trim() || selectedLead?.visitorName || "",
        visitorEmail: meetingForm.visitorEmail.trim() || selectedLead?.visitorEmail || "",
        visitorPhone: selectedLead?.visitorPhone || (normalizedPhone ? `${meetingForm.visitorCountryCode}${normalizedPhone}` : ""),
        title: meetingForm.title.trim() || `Meeting with ${meetingForm.visitorName.trim() || selectedLead?.visitorName || "visitor"}`,
        meetingType: meetingForm.meetingType || meetingCategories[0] || "Online demo",
        scheduledAt,
        location: meetingForm.location.trim(),
        notes: meetingForm.notes.trim(),
        ccEmails
      })
    },
    onSuccess: () => {
      toast.success("Meeting scheduled.")
      setMeetingDialogOpen(false)
      setMeetingLeadMode("existing")
      setMeetingForm({ leadId: "", visitorName: "", visitorEmail: "", visitorCountryCode: "+254", visitorPhone: "", ccEmails: "", title: "", meetingType: "", scheduledAt: "", location: "", notes: "" })
      client.invalidateQueries({ queryKey: ["expo-meetings", params.id] })
      client.invalidateQueries({ queryKey: ["expo-leads", params.id] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not schedule meeting")
  })
  const meetingDeleteMutation = useMutation({
    mutationFn: (meetingId: string) => api.deleteExpoMeeting(token || "", params.id, meetingId),
    onSuccess: () => {
      toast.success("Meeting deleted.")
      setSelectedMeeting(null)
      client.invalidateQueries({ queryKey: ["expo-meetings", params.id] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not delete meeting")
  })

  const preOrderStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: PreOrder["status"] }) => api.updateExpoPreOrderStatus(token || "", params.id, orderId, status),
    onSuccess: () => {
      toast.success("Pre-order status updated.")
      client.invalidateQueries({ queryKey: ["expo-preorders", params.id] })
      client.invalidateQueries({ queryKey: ["expo-ai", params.id] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update pre-order")
  })

  const showcaseProductsMutation = useMutation({
    mutationFn: () => api.showcaseExpoProducts(token || "", params.id, selectedShowcaseProducts),
    onSuccess: () => {
      toast.success("Showcase products updated.")
      setSelectedShowcaseProducts([])
      setShowcaseDialogOpen(false)
      client.invalidateQueries({ queryKey: ["expo-products", params.id] })
      client.invalidateQueries({ queryKey: ["company-products"] })
      client.invalidateQueries({ queryKey: ["visitor-expo-details", params.id] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not showcase products")
  })

  const removeShowcaseProductMutation = useMutation({
    mutationFn: (productId: string) => api.removeExpoShowcaseProduct(token || "", params.id, productId),
    onSuccess: () => {
      toast.success("Product removed from showcase.")
      client.invalidateQueries({ queryKey: ["expo-products", params.id] })
      client.invalidateQueries({ queryKey: ["company-products"] })
      client.invalidateQueries({ queryKey: ["visitor-expo-details", params.id] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not remove showcase product")
  })

  function handleDocumentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    documentMutation.mutate()
  }

  function handleMeetingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    meetingMutation.mutate()
  }

  async function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  function leadExportRows(items: Lead[]) {
    return items.map((lead) => ({
      "Lead": lead.visitorName || "Visitor",
      "Email": lead.visitorEmail || "",
      "Phone": lead.visitorPhone || "",
      "Temperature": lead.temperature || "warm",
      "Status": (lead.status || "new").replace(/_/g, " "),
      "Next Follow-up": lead.nextFollowUpAt || "",
      "Notes": lead.followUpNotes || lead.notes || "",
      "Captured": lead.capturedAt || ""
    }))
  }

  function exportLeads(format: "csv" | "excel") {
    if (filteredLeads.length === 0) {
      toast.error("No leads to export.")
      return
    }
    const rows = leadExportRows(filteredLeads)
    const headers = Object.keys(rows[0])
    const escapeCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`
    if (format === "csv") {
      const csv = [headers.map(escapeCell).join(","), ...rows.map((row) => headers.map((header) => escapeCell(row[header as keyof typeof row])).join(","))].join("\n")
      downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "tandaza-leads.csv")
      toast.success("CSV export downloaded.")
      return
    }
    const html = `<table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((header) => `<td>${String(row[header as keyof typeof row] ?? "").replace(/[<>&]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[char] || char))}</td>`).join("")}</tr>`).join("")}</tbody></table>`
    downloadBlob(new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }), "tandaza-leads.xls")
    toast.success("Excel export downloaded.")
  }

  function visitorExportRows(items: ExpoVisitor[]) {
    return items.map((visitor) => ({
      "Visitor": visitor.name || "Visitor",
      "Email": visitor.email || "",
      "Phone": visitor.phone || "",
      "Visit Source": visitor.sourceLabel || visitor.source || "Expo profile visit",
      "Engagements": visitor.engagementCount || 1,
      "Last Seen": visitor.lastSeenAt || visitor.registeredAt || "",
      "Registered": visitor.registeredAt || ""
    }))
  }

  function exportVisitors(format: "csv" | "excel") {
    if (filteredVisitors.length === 0) {
      toast.error("No visitors to export.")
      return
    }
    const rows = visitorExportRows(filteredVisitors)
    const expoId = params.id || "expo"
    if (format === "csv") {
      downloadTextFile(`tandaza-visitors-${expoId}.csv`, toCSV(rows), "text/csv;charset=utf-8")
      toast.success("CSV export downloaded.")
      return
    }
    downloadTextFile(`tandaza-visitors-${expoId}.xls`, toExcelTable(rows), "application/vnd.ms-excel;charset=utf-8")
    toast.success("Excel export downloaded.")
  }

  async function downloadQRPdf() {
    try {
      if (!qrImageUrl || !qrQuery.data) return
      const { jsPDF } = await import("jspdf")
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const expoName = myExposQuery.data?.find(e => e.expoId === params.id)?.expoName || "Tandaza Expo"
      const logo = await imageToDataUrl(companyLogoUrl)
      const centeredLines = (text: string, y: number, maxWidth: number, lineHeight: number, maxLines: number) => {
        const lines = pdf.splitTextToSize(text, maxWidth).slice(0, maxLines) as string[]
        if (lines.length === maxLines && pdf.splitTextToSize(text, maxWidth).length > maxLines) {
          lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.,;:\s]+$/g, "")}...`
        }
        pdf.text(lines, 105, y, { align: "center" })
        return y + Math.max(lines.length, 1) * lineHeight
      }
      const cardX = 32
      const cardY = 6
      const cardW = 146
      const cardH = 282
      const cardCenter = cardX + cardW / 2
      const displayFont = "helvetica"
      const utilityFont = "courier"

      for (let y = 0; y < 297; y += 3) {
        const progress = y / 297
        pdf.setFillColor(
          Math.round(250 - progress * 12),
          Math.round(245 - progress * 10),
          255
        )
        pdf.rect(0, y, 210, 3.2, "F")
      }

      pdf.setFillColor(237, 233, 254)
      pdf.roundedRect(cardX + 4, cardY + 5, cardW, cardH, 14, 14, "F")

      pdf.setDrawColor(226, 232, 240)
      pdf.setFillColor(255, 255, 255)
      pdf.roundedRect(cardX, cardY, cardW, cardH, 14, 14, "FD")

      pdf.setFillColor(79, 70, 229)
      pdf.roundedRect(cardX, cardY, cardW, 42, 14, 14, "F")
      pdf.rect(cardX, cardY + 28, cardW, 14, "F")

      pdf.setTextColor(255, 255, 255)
      pdf.setFont(displayFont, "bold")
      pdf.setFontSize(10)
      pdf.text("TANDAZA ACCESS CARD", cardCenter, cardY + 16, { align: "center" })
      pdf.setFont(displayFont, "normal")
      pdf.setFontSize(8.5)
      pdf.setTextColor(221, 214, 254)
      centeredLines("Scan to continue the conversation after the expo floor.", cardY + 27, cardW - 30, 4, 2)

      pdf.setFillColor(255, 255, 255)
      pdf.setDrawColor(221, 214, 254)
      pdf.roundedRect(cardCenter - 20, cardY + 52, 40, 40, 10, 10, "FD")
      if (logo) {
        const logoProps = pdf.getImageProperties(logo.dataUrl)
        const logoBox = fittedImageBox(logoProps.width || logo.width, logoProps.height || logo.height, cardCenter - 15, cardY + 57, 30, 30)
        pdf.addImage(logo.dataUrl, "PNG", logoBox.x, logoBox.y, logoBox.width, logoBox.height)
      } else {
        pdf.setFillColor(248, 250, 252)
        pdf.setDrawColor(226, 232, 240)
        pdf.roundedRect(cardCenter - 15, cardY + 57, 30, 30, 7, 7, "FD")
        pdf.setTextColor(15, 23, 42)
        pdf.setFont(displayFont, "bold")
        pdf.setFontSize(18)
        pdf.text(companyName.slice(0, 1).toUpperCase(), cardCenter, cardY + 77, { align: "center" })
      }

      pdf.setTextColor(15, 23, 42)
      pdf.setFont(displayFont, "bold")
      pdf.setFontSize(17)
      centeredLines(companyName, cardY + 104, cardW - 28, 6.5, 2)
      pdf.setFont(displayFont, "normal")
      pdf.setFontSize(10)
      pdf.setTextColor(71, 85, 105)
      centeredLines(expoName, cardY + 123, cardW - 30, 5, 2)

      pdf.setDrawColor(221, 214, 254)
      pdf.setLineWidth(0.3)
      pdf.line(cardX + 24, cardY + 139, cardX + cardW - 24, cardY + 139)

      pdf.setFillColor(255, 255, 255)
      pdf.setDrawColor(226, 232, 240)
      const qrFrameY = cardY + 146
      pdf.roundedRect(cardCenter - 43, qrFrameY, 86, 86, 10, 10, "FD")
      pdf.setDrawColor(221, 214, 254)
      pdf.setLineWidth(0.4)
      pdf.roundedRect(cardCenter - 38, qrFrameY + 5, 76, 76, 7, 7, "S")
      pdf.addImage(qrImageUrl, "PNG", cardCenter - 35, qrFrameY + 8, 70, 70)

      pdf.setFillColor(245, 243, 255)
      pdf.setDrawColor(221, 214, 254)
      pdf.roundedRect(cardX + 18, cardY + 250, cardW - 36, 13, 6, 6, "FD")
      pdf.setFont(utilityFont, "bold")
      pdf.setFontSize(9.5)
      pdf.setTextColor(49, 46, 129)
      centeredLines(visitorLink, cardY + 258, cardW - 46, 4.8, 1)

      pdf.setFont(displayFont, "bold")
      pdf.setFontSize(7)
      pdf.setTextColor(79, 70, 229)
      pdf.text("Powered by Tandaza", cardCenter, cardY + 275, { align: "center" })
      pdf.save(`${expoName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-qr.pdf`)
      toast.success("QR PDF downloaded.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download QR PDF")
    }
  }

  const meetingCategories = meetingCategoriesQuery.data?.categoryTypes?.length ? meetingCategoriesQuery.data.categoryTypes : DEFAULT_MEETING_CATEGORIES

  useEffect(() => {
    if (meetingCategories.length > 0 && (!meetingForm.meetingType || !meetingCategories.includes(meetingForm.meetingType))) {
      setMeetingForm((form) => ({ ...form, meetingType: meetingCategories[0] }))
    }
  }, [meetingCategories, meetingForm.meetingType])

  if (myExposQuery.isLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (myExposQuery.isError) return <ErrorState onRetry={() => myExposQuery.refetch()} />

  const expo = myExposQuery.data?.find(e => e.expoId === params.id)
  if (!expo) return <ErrorState title="Expo not found" message="You are not registered for this expo." />
  const expoTimezone = expo.timezone || "UTC"
  const coverImage = mediaUrl(expo.coverImage)
  const expoEnded = isAfterExpoEndDate(expo.endDate)
  const adsEnded = expoEnded
  const expoDayKeys = buildExpoDayKeys(expo.startDate, expo.endDate, expoTimezone)

  const leads = leadsQuery.data || []
  const ads = adsQuery.data || []
  const workspaceAd = ads[0]
  const ai = aiQuery.data
  const visitors = visitorsQuery.data || []
  const products = productsQuery.data || []
  const companyProducts = companyProductsQuery.data || []
  const preOrders = preOrdersQuery.data || []
  const meetings = meetingsQuery.data || []
  const meetingLeadOptions = leads.slice(0, 100)
  const documents = documentsQuery.data || []
  const feedback = feedbackQuery.data || []
  const conversations = conversationsQuery.data || []
  const liveStream = liveStreamQuery.data
  const overviewAnalytics = ai?.overview
  const sortByNewest = <T extends { capturedAt?: string; createdAt?: string }>(items: T[]) =>
    [...items].sort((a, b) => new Date(b.capturedAt || b.createdAt || 0).getTime() - new Date(a.capturedAt || a.createdAt || 0).getTime())
  const recentLeads = sortByNewest(leads).slice(0, 5)
  const recentPreOrders = sortByNewest(preOrders).slice(0, 5)
  const leadTotal = overviewAnalytics?.totalLeads ?? leads.length
  const visitorTotal = overviewAnalytics?.uniqueVisitors ?? visitors.length
  const upcomingMeetings = meetings.filter((meeting) => meeting.status === "scheduled" && new Date(meeting.scheduledAt).getTime() >= Date.now())
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  const upcomingMeetingTotal = upcomingMeetings.length
  const preOrderTotal = overviewAnalytics?.preOrders ?? preOrders.length
  const preOrderValue = overviewAnalytics?.preOrderValue ?? preOrders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0)
  const nowMs = Date.now()
  const sevenDaysAgoMs = nowMs - 7 * 24 * 60 * 60 * 1000
  const newLeadsLast7Days = leads.filter((lead) => new Date(lead.capturedAt).getTime() >= sevenDaysAgoMs).length
  const visitorsLast7Days = visitors.filter((visitor) => new Date(visitor.lastSeenAt || visitor.registeredAt).getTime() >= sevenDaysAgoMs).length
  const overdueFollowUps = leads.filter((lead) => {
    if (!lead.nextFollowUpAt || lead.status === "won" || lead.status === "lost") return false
    return new Date(lead.nextFollowUpAt).getTime() < nowMs
  })
  const openLeadTotal = leads.filter((lead) => lead.status !== "won" && lead.status !== "lost").length
  const adImpressionsTotal = ads.reduce((sum, ad) => sum + (Number(ad.impressions) || 0), 0)
  const adClicksTotal = ads.reduce((sum, ad) => sum + (Number(ad.clicks) || 0), 0)
  const adCtr = adImpressionsTotal ? Number(((adClicksTotal / adImpressionsTotal) * 100).toFixed(1)) : 0
  const selectedLeadPreOrderProduct = products.find((product) => product.id === leadForm.productId)
  const selectedLeadPreOrderUnitPrice = selectedLeadPreOrderProduct ? (selectedLeadPreOrderProduct.discountedPrice || selectedLeadPreOrderProduct.price || 0) : 0
  const selectedLeadPreOrderCurrency = selectedLeadPreOrderProduct?.currency || expo.currency
  const selectedLeadPreOrderQuantity = Math.max(1, Number(leadForm.quantity) || 1)
  const selectedLeadPreOrderTotal = selectedLeadPreOrderUnitPrice * selectedLeadPreOrderQuantity
  const calendarStart = meetingView === "day" ? meetingDate : startOfWeekDateInput(meetingDate)
  const calendarDays = Array.from({ length: meetingView === "day" ? 1 : 7 }, (_, index) => addDaysToDateInput(calendarStart, index))
  const meetingsForDay = (dayKey: string) => meetings.filter((meeting) => dateKeyInTimeZone(meeting.scheduledAt, expoTimezone) === dayKey)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  const leadTemperatureItems = (["hot", "warm", "cold"] as const).map((value) => ({
    label: value[0].toUpperCase() + value.slice(1),
    value: overviewAnalytics?.leadTemperature?.[value] ?? leads.filter((lead) => lead.temperature === value).length
  }))
  const leadStatusItems = (["new", "contacted", "meeting_booked", "proposal_sent", "won", "lost"] as const).map((value) => ({
    label: value.replace(/_/g, " "),
    value: overviewAnalytics?.leadStatus?.[value] ?? leads.filter((lead) => lead.status === value).length
  }))
  const preOrderStatusItems = PRE_ORDER_STATUSES.map(({ value, label }) => ({
    label,
    value: overviewAnalytics?.preOrderStatus?.[value] ?? preOrders.filter((order) => order.status === value).length
  }))
  const meetingStatusItems = [
    { label: "Upcoming", value: overviewAnalytics?.upcomingMeetings ?? upcomingMeetingTotal },
    { label: "Completed", value: overviewAnalytics?.completedMeetings ?? meetings.filter((meeting) => meeting.status === "completed").length },
    { label: "Cancelled", value: overviewAnalytics?.cancelledMeetings ?? meetings.filter((meeting) => meeting.status === "cancelled").length }
  ]
  const engagementFunnelItems = [
    { label: "Visitors", value: visitorTotal },
    { label: "Leads", value: leadTotal },
    { label: "Meetings", value: overviewAnalytics?.meetings ?? meetings.length },
    { label: "Pre-orders", value: preOrderTotal }
  ]
  const productInterestItems = Object.entries(preOrders.reduce<Record<string, number>>((acc, order) => {
    const label = order.productName || "Product interest"
    acc[label] = (acc[label] || 0) + (Number(order.quantity) || 1)
    return acc
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value }))
  const leadSourceItems = Object.entries(leads.reduce<Record<string, number>>((acc, lead) => {
    const label = (lead.source || "manual").replace(/_/g, " ")
    acc[label] = (acc[label] || 0) + 1
    return acc
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value }))
  const visitorSourceItems = Object.entries(visitors.reduce<Record<string, number>>((acc, visitor) => {
    const label = visitor.sourceLabel || (visitor.source || "Expo profile visit").replace(/_/g, " ")
    acc[label] = (acc[label] || 0) + 1
    return acc
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value }))
  const expoDayBreakdown = expoDayKeys.map((dayKey, index) => ({
    dayKey,
    dayNumber: index + 1,
    visitors: visitors.filter((visitor) => dateKeyInTimeZone(visitor.lastSeenAt || visitor.registeredAt || "", expoTimezone) === dayKey).length,
    leads: leads.filter((lead) => dateKeyInTimeZone(lead.capturedAt || "", expoTimezone) === dayKey).length,
    meetings: meetings.filter((meeting) => dateKeyInTimeZone(meeting.scheduledAt || "", expoTimezone) === dayKey).length,
    preOrders: preOrders.filter((order) => dateKeyInTimeZone(order.createdAt || "", expoTimezone) === dayKey).length
  }))
  const leadConversionRate = visitorTotal ? Math.round((leadTotal / visitorTotal) * 100) : 0
  const meetingConversionRate = leadTotal ? Math.round(((overviewAnalytics?.meetings ?? meetings.length) / leadTotal) * 100) : 0
  const preOrderConversionRate = leadTotal ? Math.round((preOrderTotal / leadTotal) * 100) : 0
  const averagePreOrderValue = preOrderTotal ? Math.round(preOrderValue / preOrderTotal) : 0
  const maxLeadTemperature = Math.max(...leadTemperatureItems.map((item) => item.value), 1)
  const maxLeadStatus = Math.max(...leadStatusItems.map((item) => item.value), 1)
  const maxPreOrderStatus = Math.max(...preOrderStatusItems.map((item) => item.value), 1)
  const maxMeetingStatus = Math.max(...meetingStatusItems.map((item) => item.value), 1)
  const maxProductInterest = Math.max(...productInterestItems.map((item) => item.value), 1)
  const maxLeadSource = Math.max(...leadSourceItems.map((item) => item.value), 1)
  const maxVisitorSource = Math.max(...visitorSourceItems.map((item) => item.value), 1)
  const visitorInsights = ai?.visitorInsights
  const leadQualityScore = clampPercent(Number(visitorInsights?.leadQualityScore) || 0)
  const peakHours = Array.isArray(visitorInsights?.peakHours) ? visitorInsights.peakHours : []
  const aiRecommendations = Array.isArray(ai?.recommendations) ? ai.recommendations : []
  const roi = ai?.roi
  const roiPipelineByTemperature = Object.entries(roi?.pipelineByTemperature || {})
    .filter(([, value]) => Number(value) > 0)
    .map(([label, value]) => ({ label, value: Number(value) }))
  const roiPipelineByStatus = Object.entries(roi?.pipelineByStatus || {})
    .filter(([, value]) => Number(value) > 0)
    .map(([label, value]) => ({ label: label.replace(/_/g, " "), value: Number(value) }))
  const maxRoiPipelineByTemperature = Math.max(...roiPipelineByTemperature.map((item) => item.value), 1)
  const maxRoiPipelineByStatus = Math.max(...roiPipelineByStatus.map((item) => item.value), 1)

  const filteredLeads = leads.filter((lead) => {
    const statusOk = leadStatus === "all" || lead.status === leadStatus
    const tempOk = leadTemperature === "all" || lead.temperature === leadTemperature
    return statusOk && tempOk
  })
  const visitorSourceOptions = Array.from(new Map(visitors.map((visitor) => [
    visitor.source || "remote",
    visitor.sourceLabel || "Expo profile visit"
  ])).entries())
  const filteredVisitors = visitors.filter((visitor) => {
    const query = visitorSearch.trim().toLowerCase()
    const sourceOk = visitorSourceFilter === "all" || (visitor.source || "remote") === visitorSourceFilter
    const queryOk = !query || [visitor.name, visitor.email, visitor.phone, visitor.sourceLabel]
      .some((value) => String(value || "").toLowerCase().includes(query))
    return sourceOk && queryOk
  })
  const showcasedProductKeys = new Set(products.map(showcaseKey))
  const selectableCompanyProducts = companyProducts.filter((product) => product.expoId !== expo.expoId && !showcasedProductKeys.has(showcaseKey(product)))
  const filteredPreOrders = preOrders.filter((order) => {
    const query = orderSearch.trim().toLowerCase()
    const statusOk = orderStatusFilter === "all" || order.status === orderStatusFilter
    const queryOk = !query || [order.productName, order.visitorName, order.visitorEmail, order.visitorPhone].some((value) => String(value || "").toLowerCase().includes(query))
    return statusOk && queryOk
  })
  const filteredFeedback = feedback.filter((item) => feedbackRatingFilter === "all" || String(item.rating) === feedbackRatingFilter)
  const filteredConversations = conversations.filter((thread) => {
    const query = conversationSearch.trim().toLowerCase()
    if (!query) return true
    return [thread.visitorName, thread.visitorEmail, thread.lastMessage]
      .some((value) => String(value || "").toLowerCase().includes(query))
  })
  const selectedConversation = filteredConversations.find((thread) => thread.id === selectedConversationId) || filteredConversations[0]
  const selectedConversationMessages = selectedConversation?.messages || []
  const visibleLeads = paginate(filteredLeads, leadsPage)
  const visibleVisitors = paginate(filteredVisitors, visitorsPage)
  const visibleProducts = paginate(products, productsPage)
  const visiblePreOrders = paginate(filteredPreOrders, ordersPage)
  const tabs: Array<{ id: TabType; label: string; description: string; count?: number }> = [
    { id: "overview", label: "Overview", description: "Workspace summary" },
    { id: "leads", label: "Leads", description: "Follow-up pipeline", count: leadTotal },
    { id: "visitors", label: "Visitors", description: "Engaged people", count: visitorTotal },
    { id: "products", label: "Products", description: "Expo catalog", count: products.length },
    { id: "orders", label: "Pre-orders", description: "Purchase intent", count: preOrderTotal },
    { id: "meetings", label: "Meetings", description: "Upcoming sessions", count: upcomingMeetingTotal },
    { id: "conversations", label: "Conversations", description: "Visitor chat", count: conversations.length },
    { id: "feedback", label: "Feedback", description: "Visitor reviews", count: feedback.length },
    { id: "documents", label: "Documents", description: "Shared files", count: documents.length },
    ...(expo.adsAddonEnabled ? [{ id: "ads" as TabType, label: "Ads", description: "Paid visibility", count: ads.length }] : []),
    { id: "analytics", label: "Analytics", description: "Performance signals" },
    { id: "qrcode", label: "QR Code", description: "Visitor capture" }
  ]
  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label || "Overview"
  const openWorkspaceTab = (tabId: TabType, closeOnSelect = false) => {
    setActiveTab(tabId)
    if (closeOnSelect) setMobileNavOpen(false)
    window.requestAnimationFrame(() => {
      workspaceContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }
  const openBoostDialog = (ad?: AdCampaign) => {
    setEditingBoost(ad || null)
    setBoostForm({
      name: ad?.name || "",
      imageUrl: ad?.mediaUrl || ad?.imageUrl || ""
    })
    setBoostDialogOpen(true)
  }
  const closeBoostDialog = () => {
    if (boostMutation.isPending || boostUploadMutation.isPending) return
    setBoostDialogOpen(false)
    setEditingBoost(null)
    setBoostForm({ name: "", imageUrl: "" })
  }
  const exportPreOrders = (format: "csv" | "excel") => {
    if (filteredPreOrders.length === 0) {
      toast.error("No pre-orders to export.")
      return
    }
    const rows = filteredPreOrders.map((order) => ({
      "Purchase Order": order.id,
      Product: order.productName,
      "Customer Name": order.visitorName,
      "Customer Email": order.visitorEmail,
      "Customer Phone": order.visitorPhone || "",
      Quantity: order.quantity,
      "Unit Price": order.unitPrice || "",
      Amount: order.amount,
      Currency: order.currency || expo.currency,
      Status: preOrderStatusLabel(order.status),
      Date: order.createdAt
    }))
    if (format === "csv") {
      downloadTextFile(`tandaza-pre-orders-${expo.expoId}.csv`, toCSV(rows), "text/csv;charset=utf-8")
      return
    }
    downloadTextFile(`tandaza-pre-orders-${expo.expoId}.xls`, toExcelTable(rows), "application/vnd.ms-excel;charset=utf-8")
  }
  const downloadPurchaseOrder = async (order: PreOrder) => {
    const { jsPDF } = await import("jspdf")
    const currency = order.currency || expo.currency
    const quantity = Number(order.quantity) || 1
    const unitPrice = Number(order.unitPrice) || (quantity > 0 ? Math.round((Number(order.amount) || 0) / quantity) : 0)
    const total = Number(order.amount) || unitPrice * quantity
    const logo = await imageToDataUrl(companyLogoUrl)
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    pdf.setFillColor(248, 247, 252)
    pdf.rect(0, 0, 210, 297, "F")
    pdf.setFillColor(255, 255, 255)
    pdf.roundedRect(16, 16, 178, 258, 7, 7, "F")
    pdf.setFillColor(34, 30, 48)
    pdf.roundedRect(16, 16, 178, 36, 7, 7, "F")
    pdf.setFillColor(34, 30, 48)
    pdf.rect(16, 42, 178, 10, "F")
    pdf.setTextColor(255, 255, 255)
    if (logo) {
      pdf.setFillColor(255, 255, 255)
      pdf.roundedRect(27, 24, 20, 20, 4, 4, "F")
      const logoProps = pdf.getImageProperties(logo.dataUrl)
      const logoBox = fittedImageBox(logoProps.width || logo.width, logoProps.height || logo.height, 30, 27, 14, 14)
      pdf.addImage(logo.dataUrl, "PNG", logoBox.x, logoBox.y, logoBox.width, logoBox.height)
    } else {
      pdf.setFillColor(255, 255, 255)
      pdf.roundedRect(27, 24, 20, 20, 4, 4, "F")
      pdf.setTextColor(34, 30, 48)
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(12)
      pdf.text(companyName.slice(0, 1).toUpperCase(), 37, 37, { align: "center" })
      pdf.setTextColor(255, 255, 255)
    }
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(9)
    pdf.text(companyName, 54, 30, { maxWidth: 72 })
    pdf.setFontSize(20)
    pdf.text("Purchase Order", 54, 43)
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(9)
    pdf.text(order.id, 182, 31, { align: "right" })
    pdf.text(new Date(order.createdAt).toLocaleDateString(), 182, 39, { align: "right" })
    pdf.setTextColor(80, 48, 160)
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(11)
    pdf.text("Expo", 28, 68)
    pdf.text("Customer", 112, 68)
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(10)
    pdf.setTextColor(34, 30, 48)
    pdf.text(expo.expoName || "Expo", 28, 76, { maxWidth: 70 })
    pdf.text(order.visitorName || "Not provided", 112, 76, { maxWidth: 58 })
    pdf.setTextColor(110, 98, 135)
    pdf.text(order.visitorEmail || "No email", 112, 84, { maxWidth: 58 })
    pdf.text(order.visitorPhone || "No phone", 112, 92, { maxWidth: 58 })
    pdf.setDrawColor(224, 216, 244)
    pdf.line(28, 106, 182, 106)
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(9)
    pdf.setTextColor(110, 98, 135)
    pdf.text("ITEM", 28, 118)
    pdf.text("QTY", 112, 118, { align: "right" })
    pdf.text("UNIT PRICE", 148, 118, { align: "right" })
    pdf.text("TOTAL", 182, 118, { align: "right" })
    pdf.setDrawColor(235, 230, 247)
    pdf.line(28, 124, 182, 124)
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(10)
    pdf.setTextColor(34, 30, 48)
    pdf.text(order.productName || "Product", 28, 137, { maxWidth: 68 })
    pdf.text(String(quantity), 112, 137, { align: "right" })
    pdf.text(formatCurrency(unitPrice, currency), 148, 137, { align: "right" })
    pdf.text(formatCurrency(total, currency), 182, 137, { align: "right" })
    pdf.setDrawColor(235, 230, 247)
    pdf.line(28, 150, 182, 150)
    pdf.setFillColor(247, 244, 255)
    pdf.roundedRect(104, 158, 78, 28, 5, 5, "F")
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(10)
    pdf.setTextColor(80, 48, 160)
    pdf.text("Order total", 112, 170)
    pdf.setFontSize(15)
    pdf.text(formatCurrency(total, currency), 174, 179, { align: "right" })
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(10)
    pdf.setTextColor(110, 98, 135)
    pdf.text(`Status: ${preOrderStatusLabel(order.status)}`, 28, 170)
    pdf.text(`Created: ${new Date(order.createdAt).toLocaleString()}`, 28, 180)
    pdf.setTextColor(110, 98, 135)
    pdf.setFontSize(9)
    pdf.text("This purchase order records customer pre-order intent and is not a tax invoice.", 28, 252, { maxWidth: 150 })
    pdf.save(`${order.id}-purchase-order.pdf`)
  }
  const renderWorkspaceItems = (closeOnSelect = false) => tabs.map((tab) => (
    <button
      key={tab.id}
      onClick={() => {
        openWorkspaceTab(tab.id, closeOnSelect)
      }}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition",
        activeTab === tab.id
          ? "bg-primary text-white shadow-sm"
          : "text-slate-600 hover:bg-elevated hover:text-foreground"
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{tab.label}</span>
        <span className={cn("mt-0.5 block truncate text-xs", activeTab === tab.id ? "text-white/75" : "text-slate-400")}>{tab.description}</span>
      </span>
      {typeof tab.count === "number" ? (
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", activeTab === tab.id ? "bg-white/20 text-white" : "bg-elevated text-slate-500")}>{tab.count}</span>
      ) : null}
    </button>
  ))

  return (
    <div className="space-y-6">
      <BackLink href="/exhibitor/my-expos" label="Back to My Expos" />

      <Card className="sticky top-3 z-30 overflow-hidden border-border/80 bg-card/95 p-0 shadow-sm backdrop-blur lg:hidden">
        <div className="flex gap-3 p-3">
          <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(135deg,#312e81,#7c3aed)]">
            {coverImage && !coverImageFailed ? (
              <img
                src={coverImage}
                alt={`${expo.expoName} cover`}
                className="h-full w-full object-cover"
                onError={() => setCoverImageFailed(true)}
              />
            ) : (
              <div className="flex h-full items-end p-2">
                <span className="line-clamp-2 text-xs font-semibold leading-tight text-white">{expo.expoName}</span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-primary">Expo</span>
              <StatusBadge value={expo.status} />
            </div>
            <h1 className="mt-2 line-clamp-2 text-base font-semibold leading-snug text-foreground">{expo.expoName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="max-w-[9rem] truncate">{expo.location || "Expo venue"}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>{formatCurrency(expo.amount, expo.currency)}</span>
            </div>
          </div>
        </div>
        <div className="border-t border-border/70 p-2">
          <button
            type="button"
            onClick={() => setMobileNavOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-elevated"
            aria-expanded={mobileNavOpen}
            aria-controls="expo-workspace-mobile-nav"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-elevated text-slate-600">
                <MenuIcon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Workspace menu</span>
                <span className="mt-1 block truncate text-sm font-semibold text-foreground">{activeTabLabel}</span>
              </span>
            </span>
            <ChevronDownIcon className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", mobileNavOpen ? "rotate-180" : "")} />
          </button>
          <nav
            id="expo-workspace-mobile-nav"
            className={cn(
              "space-y-1 overflow-y-auto",
              mobileNavOpen ? "mt-2 block max-h-[60vh] border-t border-border/70 pt-2" : "hidden"
            )}
          >
            {renderWorkspaceItems(true)}
          </nav>
        </div>
      </Card>

      <Card className="hidden overflow-hidden border-border/80 bg-card p-0 shadow-sm lg:block">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="flex flex-col justify-between gap-6 p-5 sm:p-6 lg:p-7">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Expo management</span>
                <StatusBadge value={expo.status} />
                {expo.adsAddonEnabled ? <span className="rounded-full border border-border/70 bg-elevated px-3 py-1 text-xs font-semibold text-slate-500">Ads add-on active</span> : null}
              </div>
              <h1 className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{expo.expoName}</h1>
              <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-border/70 bg-elevated/60 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Location</p>
                  <p className="mt-1 truncate font-semibold text-foreground">{expo.location || "Expo venue"}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-elevated/60 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Starts</p>
                  <p className="mt-1 font-semibold text-foreground">{new Date(expo.startDate).toLocaleDateString()}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-elevated/60 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Ends</p>
                  <p className="mt-1 font-semibold text-foreground">{new Date(expo.endDate).toLocaleDateString()}</p>
                </div>
                <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Activation</p>
                  <p className="mt-1 font-semibold text-foreground">{formatCurrency(expo.amount, expo.currency)}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-border/70 bg-elevated/50 p-3 lg:border-l lg:border-t-0">
            <div className="relative aspect-[16/11] h-full min-h-[14rem] overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(135deg,#312e81,#7c3aed)]">
              {coverImage && !coverImageFailed ? (
                <img
                  src={coverImage}
                  alt={`${expo.expoName} cover`}
                  className="h-full w-full object-cover"
                  onError={() => setCoverImageFailed(true)}
                />
              ) : (
                <div className="flex h-full items-end p-5">
                  <p className="max-w-[16rem] text-2xl font-semibold leading-tight text-white">{expo.expoName}</p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 via-slate-950/25 to-transparent p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900">{expo.status === "confirmed" ? "Active workspace" : "Workspace access"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <Card className="border-border/80 bg-card/95 p-3 shadow-sm">
            <div className="px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Workspace menu</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{activeTabLabel}</p>
            </div>
            <nav className="space-y-1">
              {renderWorkspaceItems()}
            </nav>
          </Card>
        </aside>

        <main ref={workspaceContentRef} className="min-w-0 scroll-mt-[12.5rem] space-y-6 lg:scroll-mt-8">

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <OverviewMetricCard label="Visitors" value={visitorTotal.toLocaleString()} detail={`${visitorsLast7Days.toLocaleString()} active in the last 7 days`} action="View visitors" onClick={() => openWorkspaceTab("visitors")} />
            <OverviewMetricCard label="Leads" value={leadTotal.toLocaleString()} detail={`${newLeadsLast7Days.toLocaleString()} new in the last 7 days`} action="Review leads" onClick={() => openWorkspaceTab("leads")} />
            <OverviewMetricCard label="Open follow-ups" value={openLeadTotal.toLocaleString()} detail={`${overdueFollowUps.length.toLocaleString()} overdue follow-up${overdueFollowUps.length === 1 ? "" : "s"}`} action="Open pipeline" onClick={() => openWorkspaceTab("leads")} tone={overdueFollowUps.length ? "warning" : "default"} />
            <OverviewMetricCard label="Pre-order value" value={formatCurrency(preOrderValue, expo.currency)} detail={`${preOrderTotal.toLocaleString()} pre-order${preOrderTotal === 1 ? "" : "s"} captured`} action="View pre-orders" onClick={() => openWorkspaceTab("orders")} />
          </div>

          {expoDayBreakdown.length > 1 ? (
            <Card className="border-border/80 p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Expo day breakdown</p>
                  <p className="mt-1 text-xs text-slate-500">Daily activity across visitors, leads, meetings, and pre-orders</p>
                </div>
                <span className="text-xs font-semibold text-slate-500">{expoDayBreakdown.length} day expo</span>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {expoDayBreakdown.map((day) => (
                  <div key={day.dayKey} className="rounded-2xl border border-border/70 bg-elevated/55 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Day {day.dayNumber}</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{formatDateInputLabel(day.dayKey, expoTimezone, { weekday: "long", day: "2-digit", month: "short" })}</p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{day.visitors.toLocaleString()} visitors</span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <MiniStat label="Leads" value={day.leads.toLocaleString()} />
                      <MiniStat label="Meetings" value={day.meetings.toLocaleString()} />
                      <MiniStat label="Orders" value={day.preOrders.toLocaleString()} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
            <Card className="overflow-hidden border-border/80 p-0 shadow-sm">
              <div className="border-b border-border/70 bg-elevated/55 px-5 py-4">
                <p className="text-sm font-semibold text-foreground">Workspace funnel</p>
                <p className="mt-1 text-xs text-slate-500">Visitor activity moving into leads, meetings, and purchase intent</p>
              </div>
              <div className="grid min-h-64 grid-cols-4 items-end gap-3 p-5">
                {engagementFunnelItems.map((item) => {
                  const maxValue = Math.max(...engagementFunnelItems.map((entry) => entry.value), 1)
                  return (
                    <div key={item.label} className="flex h-full flex-col justify-end gap-3">
                      <div className="flex flex-1 items-end rounded-2xl bg-elevated p-1.5">
                        <div className="w-full rounded-xl bg-gradient-to-t from-primary to-violet-400" style={{ height: item.value ? `${Math.max(8, (item.value / maxValue) * 100)}%` : "0%" }} />
                      </div>
                      <div className="text-center">
                        <p className="font-mono text-sm font-semibold text-foreground">{item.value.toLocaleString()}</p>
                        <p className="text-[11px] font-medium text-slate-500">{item.label}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card className="border-border/80 p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Conversion health</p>
              <p className="mt-1 text-xs text-slate-500">Fast read of how workspace traffic is converting</p>
              <div className="mt-5 space-y-4">
                <ConversionLine label="Visitors to leads" value={leadConversionRate} />
                <ConversionLine label="Leads to meetings" value={meetingConversionRate} />
                <ConversionLine label="Leads to pre-orders" value={preOrderConversionRate} />
                <ConversionLine label="Ad click-through" value={adCtr} suffix="%" />
              </div>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <AnalyticsBarCard title="Lead temperature" description="Quality mix from captured visitors" items={leadTemperatureItems} maxValue={maxLeadTemperature} tone="temperature" />
            <AnalyticsBarCard title="Lead sources" description="Where captured leads are coming from" items={leadSourceItems.length ? leadSourceItems : [{ label: "No source yet", value: 0 }]} maxValue={maxLeadSource} />
            <AnalyticsBarCard title="Visitor sources" description="How visitors are reaching this workspace" items={visitorSourceItems.length ? visitorSourceItems : [{ label: "No source yet", value: 0 }]} maxValue={maxVisitorSource} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <Card className="border-border/80 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Lead pipeline</p>
                  <p className="mt-1 text-xs text-slate-500">Current follow-up stages for this expo workspace</p>
                </div>
                <button type="button" onClick={() => openWorkspaceTab("leads")} className="text-xs font-semibold text-primary">Open leads</button>
              </div>
              <div className="mt-5 grid h-44 grid-cols-6 items-end gap-3">
                {leadStatusItems.map((item) => (
                  <div key={item.label} className="flex h-full flex-col justify-end gap-2">
                    <div className="flex flex-1 items-end rounded-2xl bg-elevated p-1">
                      <div className="w-full rounded-xl bg-gradient-to-t from-primary to-violet-400" style={{ height: item.value ? `${Math.max(6, (item.value / maxLeadStatus) * 100)}%` : "0%" }} />
                    </div>
                    <div className="min-h-10 text-center">
                      <p className="font-mono text-xs font-semibold text-foreground">{item.value}</p>
                      <p className="truncate text-[10px] capitalize text-slate-500">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="border-border/80 p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Next actions</p>
              <p className="mt-1 text-xs text-slate-500">What needs attention now</p>
              <div className="mt-5 space-y-3">
                <ActionSignal label="Overdue follow-ups" value={overdueFollowUps.length} helper="call, email, or schedule a meeting" onClick={() => openWorkspaceTab("leads")} />
                <ActionSignal label="Upcoming meetings" value={upcomingMeetingTotal} helper="prepare agenda and materials" onClick={() => openWorkspaceTab("meetings")} />
                <ActionSignal label="Pending pre-orders" value={preOrderStatusItems.find((item) => item.label === "Pending")?.value || 0} helper="confirm price and fulfillment" onClick={() => openWorkspaceTab("orders")} />
              </div>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <Card className="border-border/80 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Recent leads</p>
                  <p className="mt-1 text-xs text-slate-500">Latest visitors captured from QR and remote engagement</p>
                </div>
                <Button variant="secondary" onClick={() => openWorkspaceTab("leads")}>View All</Button>
              </div>
              <div className="mt-4 divide-y divide-border/70">
                {recentLeads.length ? recentLeads.map((lead) => (
                  <div key={lead.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{lead.visitorName}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{lead.visitorEmail || lead.visitorPhone || "No contact provided"}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <TemperatureBadge value={lead.temperature} />
                      <span className="text-xs text-slate-500">{lead.capturedAt ? new Date(lead.capturedAt).toLocaleDateString() : "-"}</span>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center text-sm text-slate-500">No leads captured yet.</div>
                )}
              </div>
            </Card>

            <Card className="border-border/80 p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Pre-orders</p>
              <p className="mt-1 text-xs text-slate-500">Intent by current status</p>
              <div className="mt-5 space-y-4">
                {preOrderStatusItems.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">{item.label}</span>
                      <span className="font-mono text-slate-500">{item.value}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-elevated">
                      <div className="h-full rounded-full bg-primary" style={{ width: item.value ? `${Math.max(4, (item.value / maxPreOrderStatus) * 100)}%` : "0%" }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <Card className="border-border/80 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Product interest</p>
                  <p className="mt-1 text-xs text-slate-500">Products driving pre-orders and visitor intent</p>
                </div>
                <Button variant="secondary" onClick={() => openWorkspaceTab("products")}>Open Catalog</Button>
              </div>
              <div className="mt-5 space-y-4">
                {productInterestItems.length ? productInterestItems.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                      <span className="truncate font-medium text-slate-600">{item.label}</span>
                      <span className="font-mono text-slate-500">{item.value.toLocaleString()}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-elevated">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (item.value / maxProductInterest) * 100)}%` }} />
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center text-sm text-slate-500">No product interest yet.</div>
                )}
              </div>
            </Card>

            <Card className="border-border/80 p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Ads performance</p>
              <p className="mt-1 text-xs text-slate-500">{adsEnded ? "Campaigns have ended for this expo" : "Paid visibility for this workspace"}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <MiniStat label="Ads" value={ads.length.toLocaleString()} />
                <MiniStat label="Clicks" value={adClicksTotal.toLocaleString()} />
                <MiniStat label="Impressions" value={adImpressionsTotal.toLocaleString()} />
                <MiniStat label="CTR" value={`${adCtr}%`} />
              </div>
              {expo.adsAddonEnabled ? <Button className="mt-5 w-full" variant="secondary" onClick={() => openWorkspaceTab("ads")}>{adsEnded ? "View Ads" : "Manage Ads"}</Button> : null}
            </Card>
          </div>

          <Card className="border-border/80 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Recent pre-orders</p>
                <p className="mt-1 text-xs text-slate-500">Latest product interest submitted by visitors</p>
              </div>
              <Button variant="secondary" onClick={() => openWorkspaceTab("orders")}>View All</Button>
            </div>
            <div className="mt-4 divide-y divide-border/70">
              {recentPreOrders.length ? recentPreOrders.map((order) => (
                <div key={order.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{order.productName}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{order.visitorName} • Qty {order.quantity}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-foreground">{formatCurrency(order.amount)}</span>
                    <StatusBadge value={preOrderStatusBadgeValue(order.status)} />
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center text-sm text-slate-500">No pre-orders submitted yet.</div>
              )}
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-border/80 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Upcoming Meetings</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{upcomingMeetingTotal}</p>
              <button type="button" onClick={() => openWorkspaceTab("meetings")} className="mt-3 text-sm font-semibold text-primary">Check meetings</button>
            </Card>
            <Card className="border-border/80 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Documents</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{documents.length}</p>
              <button type="button" onClick={() => openWorkspaceTab("documents")} className="mt-3 text-sm font-semibold text-primary">Open documents</button>
            </Card>
          </div>

          {expo.adsAddonEnabled ? (
            <Card className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Ads add-on</p>
                  <p className="mt-1 text-sm text-slate-500">{ads.length} campaign{ads.length === 1 ? "" : "s"} created for this expo.</p>
                </div>
                <Button variant="secondary" onClick={() => openWorkspaceTab("ads")}>Manage Ads</Button>
              </div>
            </Card>
          ) : null}
            </div>
      )}

      {activeTab === "leads" && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</span>
                <select
                  value={leadStatus}
                  onChange={(e) => { setLeadStatus(e.target.value); setLeadsPage(1) }}
                  className="h-11 w-full rounded-xl border border-border/80 bg-elevated px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                >
                  <option value="all">All statuses</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="meeting_booked">Meeting booked</option>
                  <option value="proposal_sent">Proposal sent</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Temperature</span>
                <select
                  value={leadTemperature}
                  onChange={(e) => { setLeadTemperature(e.target.value); setLeadsPage(1) }}
                  className="h-11 w-full rounded-xl border border-border/80 bg-elevated px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                >
                  <option value="all">All temperatures</option>
                  <option value="hot">Hot</option>
                  <option value="warm">Warm</option>
                  <option value="cold">Cold</option>
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => setLeadDialogOpen(true)}><PlusIcon className="mr-2 h-4 w-4" />Add Lead</Button>
                <Button variant="secondary" onClick={() => exportLeads("csv")}><DownloadIcon className="mr-2 h-4 w-4" />CSV</Button>
                <Button variant="secondary" onClick={() => exportLeads("excel")}><DownloadIcon className="mr-2 h-4 w-4" />Excel</Button>
              </div>
            </div>
          </Card>
          <div className="hidden md:block">
            <DataTable<Lead>
              columns={[
                { key: "visitorName", header: "Lead", sortable: true, render: (r) => (
                  <div>
                    <p className="font-medium">{r.visitorName}</p>
                    <p className="text-xs text-slate-500">{r.visitorEmail}</p>
                  </div>
                ) },
                { key: "visitorPhone", header: "Phone", render: (r) => <span className="text-sm">{r.visitorPhone || "-"}</span> },
                { key: "temperature", header: "Temperature", sortable: true, render: (r) => <TemperatureBadge value={r.temperature} /> },
                { key: "status", header: "Status", sortable: true, render: (r) => <StatusBadge value={r.status || "new"} /> },
                { key: "nextFollowUpAt", header: "Next follow-up", render: (r) => <span className="text-sm text-slate-500">{r.nextFollowUpAt ? formatMeetingDateTime(r.nextFollowUpAt, expoTimezone, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}</span> },
                { key: "notes", header: "Notes", render: (r) => <span className="text-sm text-slate-500 line-clamp-1">{r.followUpNotes || r.notes || "-"}</span> },
                { key: "capturedAt", header: "Captured", sortable: true, render: (r) => <span className="text-sm text-slate-500">{new Date(r.capturedAt).toLocaleDateString()}</span> }
              ]}
              rows={filteredLeads}
              pagination={{ page: leadsPage, pageSize: PAGE_SIZE, total: filteredLeads.length, onPageChange: setLeadsPage }}
              rowActions={[
                { label: "Add follow-up", onClick: openLeadFollowUp },
                { label: "View notes", onClick: (r) => setLeadNotesDialog(r) },
                { label: "Mark contacted", hidden: (r) => r.status === "contacted", onClick: (r) => leadMutation.mutate({ leadId: r.id, status: "contacted", temperature: r.temperature || "warm" }) },
                { label: "Mark hot", hidden: (r) => r.temperature === "hot", onClick: (r) => leadMutation.mutate({ leadId: r.id, status: r.status || "new", temperature: "hot" }) },
                { label: "Mark warm", hidden: (r) => r.temperature === "warm", onClick: (r) => leadMutation.mutate({ leadId: r.id, status: r.status || "new", temperature: "warm" }) },
                { label: "Mark cold", hidden: (r) => r.temperature === "cold", onClick: (r) => leadMutation.mutate({ leadId: r.id, status: r.status || "new", temperature: "cold" }) },
              ]}
              emptyTitle="No leads captured yet"
              emptyDescription="Share your QR code with visitors to capture leads."
            />
          </div>
          <div className="grid gap-3 md:hidden">
            {visibleLeads.length ? visibleLeads.map((lead) => (
              <Card key={lead.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{lead.visitorName || "Visitor"}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{lead.visitorEmail || "No email"}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{lead.visitorPhone || "No phone"}</p>
                  </div>
                  <TemperatureBadge value={lead.temperature} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge value={lead.status || "new"} />
                  <span className="rounded-full bg-elevated px-2.5 py-1 text-xs font-semibold text-slate-500">{lead.nextFollowUpAt ? `Follow-up ${formatMeetingDateTime(lead.nextFollowUpAt, expoTimezone, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}` : `Captured ${formatDate(lead.capturedAt)}`}</span>
                </div>
                {(lead.followUpNotes || lead.notes) && <p className="mt-3 line-clamp-2 text-sm text-slate-500">{lead.followUpNotes || lead.notes}</p>}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={() => openLeadFollowUp(lead)}>Follow-up</Button>
                  <Button variant="secondary" onClick={() => setLeadNotesDialog(lead)}>Notes</Button>
                  {lead.temperature !== "hot" ? <Button variant="secondary" onClick={() => leadMutation.mutate({ leadId: lead.id, status: lead.status || "new", temperature: "hot" })}>Mark hot</Button> : null}
                  {lead.status !== "contacted" ? <Button variant="secondary" onClick={() => leadMutation.mutate({ leadId: lead.id, status: "contacted", temperature: lead.temperature || "warm" })}>Contacted</Button> : null}
                </div>
              </Card>
            )) : (
              <Card className="p-6 text-center"><p className="text-sm font-semibold text-foreground">No leads captured yet</p><p className="mt-1 text-xs text-slate-500">Share your QR code with visitors to capture leads.</p></Card>
            )}
          </div>
          <MobilePagination page={leadsPage} pageSize={PAGE_SIZE} total={filteredLeads.length} onPageChange={setLeadsPage} />
          {leadDialogOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="manual-lead-dialog-title" onClick={() => !createLeadMutation.isPending && setLeadDialogOpen(false)}>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  createLeadMutation.mutate()
                }}
                className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-border/80 bg-card p-5 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 id="manual-lead-dialog-title" className="text-lg font-semibold text-foreground">Add lead manually</h3>
                    <p className="mt-1 text-sm text-slate-500">Capture a visitor conversation and choose the next commercial action.</p>
                  </div>
                  <button type="button" onClick={() => setLeadDialogOpen(false)} className="rounded-full border border-border px-3 py-1 text-sm font-semibold">Close</button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setLeadEntryMode("existing")}
                    className={cn("rounded-2xl border p-4 text-left transition", leadEntryMode === "existing" ? "border-primary bg-primary/5" : "border-border/80 bg-elevated/60 hover:border-primary/30")}
                  >
                    <span className="text-sm font-semibold text-foreground">Existing visitor</span>
                    <span className="mt-1 block text-xs text-slate-500">Select someone already captured in this expo workspace.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeadEntryMode("new")}
                    className={cn("rounded-2xl border p-4 text-left transition", leadEntryMode === "new" ? "border-primary bg-primary/5" : "border-border/80 bg-elevated/60 hover:border-primary/30")}
                  >
                    <span className="text-sm font-semibold text-foreground">New visitor</span>
                    <span className="mt-1 block text-xs text-slate-500">Add a fresh visitor contact from a conversation.</span>
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  {leadEntryMode === "existing" ? (
                    <label className="space-y-1.5">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Visitor</span>
                      <select
                        value={leadForm.visitorId}
                        onChange={(event) => setLeadForm((form) => ({ ...form, visitorId: event.target.value }))}
                        className="h-11 w-full rounded-xl border border-border/80 bg-elevated px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                      >
                        <option value="">Search existing visitor</option>
                        {visitors.map((visitor) => (
                          <option key={visitor.id} value={visitor.id}>{visitor.name} {visitor.email ? `- ${visitor.email}` : ""} {visitor.phone ? `- ${visitor.phone}` : ""}</option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1.5">
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Visitor name</span>
                          <Input value={leadForm.name} onChange={(event) => setLeadForm((form) => ({ ...form, name: event.target.value }))} placeholder="Visitor full name" aria-label="Visitor full name" />
                        </label>
                        <label className="space-y-1.5">
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Email</span>
                          <Input value={leadForm.email} onChange={(event) => setLeadForm((form) => ({ ...form, email: event.target.value }))} placeholder="Email address" aria-label="Email address" type="email" />
                        </label>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
                        <label className="space-y-1.5">
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Code</span>
                          <select value={leadForm.countryCode} onChange={(event) => setLeadForm((form) => ({ ...form, countryCode: event.target.value }))} className="h-11 w-full rounded-xl border border-border/80 bg-elevated px-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" aria-label="Phone country code">
                            {callingCodeOptions.map((option) => (
                              <option key={`${option.iso}-${option.code}`} value={option.code}>{option.code} {option.iso}</option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1.5">
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Phone number</span>
                          <Input value={leadForm.phone} onChange={(event) => setLeadForm((form) => ({ ...form, phone: event.target.value }))} placeholder="799 010 210" aria-label="Phone number" inputMode="tel" />
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="space-y-1.5">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</span>
                      <select value={leadForm.status} onChange={(event) => setLeadForm((form) => ({ ...form, status: event.target.value }))} className="h-11 w-full rounded-xl border border-border/80 bg-elevated px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10">
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="meeting_booked">Meeting booked</option>
                        <option value="proposal_sent">Proposal sent</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Temperature</span>
                      <select value={leadForm.temperature} onChange={(event) => setLeadForm((form) => ({ ...form, temperature: event.target.value }))} className="h-11 w-full rounded-xl border border-border/80 bg-elevated px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10">
                        <option value="hot">Hot</option>
                        <option value="warm">Warm</option>
                        <option value="cold">Cold</option>
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Action</span>
                      <select value={leadForm.action} onChange={(event) => setLeadForm((form) => ({ ...form, action: event.target.value }))} className="h-11 w-full rounded-xl border border-border/80 bg-elevated px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10">
                        <option value="interest">General interest</option>
                        <option value="meeting">Arrange a meeting</option>
                        <option value="pre_order">Pre-order</option>
                        <option value="call">Schedule a call</option>
                      </select>
                    </label>
                  </div>

                  {leadForm.action === "meeting" && (
                    <div className="grid gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                      <p className="text-sm font-semibold text-foreground">Meeting details</p>
                      <Input value={leadForm.meetingTitle} onChange={(event) => setLeadForm((form) => ({ ...form, meetingTitle: event.target.value }))} placeholder="Meeting title" aria-label="Meeting title" />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input type="datetime-local" value={leadForm.scheduledAt} onChange={(event) => setLeadForm((form) => ({ ...form, scheduledAt: event.target.value }))} placeholder="Meeting date and time" aria-label="Meeting date and time" />
                        <Input value={leadForm.meetingLink} onChange={(event) => setLeadForm((form) => ({ ...form, meetingLink: event.target.value }))} placeholder="Meeting link, for example Google Meet" aria-label="Meeting link" required />
                      </div>
                      <Input value={leadForm.ccEmails} onChange={(event) => setLeadForm((form) => ({ ...form, ccEmails: event.target.value }))} placeholder="CC emails, separated by commas" aria-label="CC emails" />
                      <p className="text-xs leading-5 text-slate-500">Meeting emails will be sent to the visitor, CC emails, and exhibitor admins.</p>
                    </div>
                  )}
                  {leadForm.action === "pre_order" && (
                    <div className="grid gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
                      <label className="space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Product</span>
                        <select value={leadForm.productId} onChange={(event) => setLeadForm((form) => ({ ...form, productId: event.target.value }))} className="h-11 w-full rounded-xl border border-border/80 bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10">
                          <option value="">Select product</option>
                          {products.map((product) => <option key={product.id} value={product.id}>{product.name} - {formatCurrency(product.discountedPrice || product.price || 0, product.currency || expo.currency)}</option>)}
                        </select>
                      </label>
                      <Input value={leadForm.quantity} onChange={(event) => setLeadForm((form) => ({ ...form, quantity: event.target.value }))} placeholder="Qty" aria-label="Quantity" type="number" min="1" />
                      <div className="rounded-xl border border-primary/10 bg-card p-3 sm:col-span-2">
                        <div className="grid gap-2 text-xs sm:grid-cols-3">
                          <div><span className="text-slate-500">Unit price</span><p className="mt-1 font-semibold text-foreground">{selectedLeadPreOrderProduct ? formatCurrency(selectedLeadPreOrderUnitPrice, selectedLeadPreOrderCurrency) : "Select product"}</p></div>
                          <div><span className="text-slate-500">Quantity</span><p className="mt-1 font-semibold text-foreground">{selectedLeadPreOrderQuantity}</p></div>
                          <div><span className="text-slate-500">Total</span><p className="mt-1 font-semibold text-primary">{selectedLeadPreOrderProduct ? formatCurrency(selectedLeadPreOrderTotal, selectedLeadPreOrderCurrency) : "-"}</p></div>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-slate-500">A pre-order record with this breakdown will be created and emailed to the visitor and exhibitor admins.</p>
                      </div>
                    </div>
                  )}
                  {leadForm.action === "call" && (
                    <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                      <p className="text-sm font-semibold text-foreground">Call follow-up</p>
                      <Input className="mt-3" type="datetime-local" value={leadForm.scheduledAt} onChange={(event) => setLeadForm((form) => ({ ...form, scheduledAt: event.target.value }))} placeholder="Call date and time" aria-label="Call date and time" />
                    </div>
                  )}

                  <textarea
                    value={leadForm.notes}
                    onChange={(event) => setLeadForm((form) => ({ ...form, notes: event.target.value }))}
                    placeholder="Internal notes"
                    rows={4}
                    className="w-full rounded-xl border border-border/80 bg-elevated px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <Button type="button" variant="secondary" disabled={createLeadMutation.isPending} onClick={() => setLeadDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createLeadMutation.isPending}>{createLeadMutation.isPending ? "Adding..." : "Add Lead"}</Button>
                </div>
              </form>
            </div>
          )}
          {leadFollowUpDialog && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="lead-follow-up-dialog-title" onClick={() => !leadFollowUpMutation.isPending && setLeadFollowUpDialog(null)}>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  leadFollowUpMutation.mutate()
                }}
                className="w-full max-w-lg rounded-3xl border border-border/80 bg-card p-5 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 id="lead-follow-up-dialog-title" className="text-lg font-semibold text-foreground">Add follow-up</h3>
                    <p className="mt-1 text-sm text-slate-500">{leadFollowUpDialog.visitorName || "Lead"} · {leadFollowUpDialog.visitorEmail || "No email"}</p>
                  </div>
                  <button type="button" onClick={() => setLeadFollowUpDialog(null)} className="rounded-full border border-border px-3 py-1 text-sm font-semibold">Close</button>
                </div>
                <div className="mt-5 space-y-4">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Follow-up date and time</span>
                    <Input type="datetime-local" value={leadFollowUpForm.scheduledAt} onChange={(event) => setLeadFollowUpForm((form) => ({ ...form, scheduledAt: event.target.value }))} />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Notes</span>
                    <textarea
                      value={leadFollowUpForm.notes}
                      onChange={(event) => setLeadFollowUpForm((form) => ({ ...form, notes: event.target.value }))}
                      placeholder="What should the team do during this follow-up?"
                      rows={4}
                      className="w-full rounded-xl border border-border/80 bg-elevated px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </label>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <Button type="button" variant="secondary" disabled={leadFollowUpMutation.isPending} onClick={() => setLeadFollowUpDialog(null)}>Cancel</Button>
                  <Button type="submit" disabled={leadFollowUpMutation.isPending}>{leadFollowUpMutation.isPending ? "Saving..." : "Save Follow-up"}</Button>
                </div>
              </form>
            </div>
          )}
          {leadNotesDialog && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="lead-notes-dialog-title" onClick={() => setLeadNotesDialog(null)}>
              <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border/80 bg-card p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 id="lead-notes-dialog-title" className="text-lg font-semibold text-foreground">Lead notes and history</h3>
                    <p className="mt-1 text-sm text-slate-500">{leadNotesDialog.visitorName || "Lead"} · {leadNotesDialog.visitorEmail || "No email"}</p>
                  </div>
                  <button type="button" onClick={() => setLeadNotesDialog(null)} className="rounded-full border border-border px-3 py-1 text-sm font-semibold">Close</button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-elevated p-3"><span className="text-xs text-slate-500">Status</span><div className="mt-1"><StatusBadge value={leadNotesDialog.status || "new"} /></div></div>
                  <div className="rounded-2xl bg-elevated p-3"><span className="text-xs text-slate-500">Temperature</span><div className="mt-1"><TemperatureBadge value={leadNotesDialog.temperature} /></div></div>
                  <div className="rounded-2xl bg-elevated p-3"><span className="text-xs text-slate-500">Next follow-up</span><p className="mt-1 text-sm font-semibold text-foreground">{leadNotesDialog.nextFollowUpAt ? formatMeetingDateTime(leadNotesDialog.nextFollowUpAt, expoTimezone, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }) : "Not set"}</p></div>
                </div>
                <div className="mt-5 space-y-3">
                  {(leadNotesDialog.followUpNotes || leadNotesDialog.notes) ? (
                    <div className="rounded-2xl border border-border/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Latest note</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{leadNotesDialog.followUpNotes || leadNotesDialog.notes}</p>
                    </div>
                  ) : null}
                  {(leadNotesDialog.activities || []).length ? (leadNotesDialog.activities || []).slice().reverse().map((activity) => (
                    <div key={activity.id} className="rounded-2xl border border-border/80 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold capitalize text-primary">{activity.type.replace("_", " ")}</span>
                        <span className="text-xs text-slate-500">{formatMeetingDateTime(activity.createdAt, expoTimezone, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      {activity.scheduledAt ? <p className="mt-2 text-xs font-semibold text-slate-500">Scheduled: {formatMeetingDateTime(activity.scheduledAt, expoTimezone, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}</p> : null}
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{activity.notes || "No notes recorded."}</p>
                    </div>
                  )) : (
                    <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center text-sm text-slate-500">No history recorded yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "ads" && (
        <div className="space-y-5">
          {expo.adsAddonEnabled && !adsEnded ? (
            <Card className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{workspaceAd ? "Workspace ad" : "Create workspace ad"}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {workspaceAd ? "Each expo workspace supports one ad. Edit it whenever the creative or budget changes." : "Your ads add-on is active. Create one banner ad for admin approval."}
                  </p>
                </div>
                <Button type="button" onClick={() => openBoostDialog(workspaceAd)}>
                  {workspaceAd ? "Edit Ad" : "Create Ad"}
                </Button>
              </div>
            </Card>
          ) : expo.adsAddonEnabled ? (
            <Card className="border-dashed border-border/80 p-6">
              <h3 className="text-lg font-semibold">Ads have ended</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Ads for this expo ended after the expo end date. Existing performance remains available below for reporting.
              </p>
            </Card>
          ) : (
            <Card className="border-dashed border-border/80 p-6">
              <h3 className="text-lg font-semibold">Ads add-on not active</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Ads can be created for this expo only when the optional ads add-on was selected and paid during activation.
              </p>
            </Card>
          )}

          <DataTable<typeof ads[0]>
            columns={[
              { key: "name", header: "Campaign", sortable: true, render: (r) => <span className="font-medium">{r.name}</span> },
              { key: "placement", header: "Placement", render: (r) => <span className="text-sm text-slate-500">{r.placement}</span> },
              { key: "impressions", header: "Impressions", sortable: true, render: (r) => <span className="font-mono">{r.impressions.toLocaleString()}</span> },
              { key: "clicks", header: "Clicks", sortable: true, render: (r) => <span className="font-mono">{r.clicks.toLocaleString()}</span> },
              { key: "ctr", header: "CTR", sortable: true, render: (r) => <span className="font-mono">{r.ctr}%</span> },
              { key: "spent", header: "Spent", sortable: true, render: (r) => <span className="font-mono">{formatCurrency(r.spent ?? r.dailySpend ?? 0)}</span> },
              { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> }
            ]}
            rows={ads}
            rowActions={adsEnded ? [] : [{ label: "Edit ad", onClick: (ad) => openBoostDialog(ad) }]}
            emptyTitle="No workspace boosts yet"
            emptyDescription="Create one workspace ad to promote your company to online visitors."
          />
          {boostDialogOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="workspace-ad-dialog-title" onClick={closeBoostDialog}>
              <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border/80 bg-card p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 id="workspace-ad-dialog-title" className="text-lg font-semibold text-foreground">{editingBoost ? "Edit workspace ad" : "Create workspace ad"}</h3>
                    <p className="mt-1 text-sm text-slate-500">One ad is allowed per expo workspace. Updates are sent back for admin review.</p>
                  </div>
                  <button type="button" onClick={closeBoostDialog} className="rounded-full border border-border px-3 py-1 text-sm font-semibold">Close</button>
                </div>
                <div className="mt-5 space-y-4">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Ad name</span>
                    <Input
                      value={boostForm.name}
                      onChange={(e) => setBoostForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Expo homepage banner"
                      aria-label="Ad name"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Banner image</span>
                    <input
                      aria-label="Banner image"
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) boostUploadMutation.mutate(file)
                      }}
                      className="h-11 w-full rounded-xl border border-border/80 bg-elevated px-3 py-2 text-sm"
                    />
                    <span className="block text-xs leading-5 text-slate-500">Required: {AD_BANNER_WIDTH} x {AD_BANNER_HEIGHT} px PNG or JPG, max {formatFileSize(AD_BANNER_MAX_SIZE_BYTES)}.</span>
                  </label>
                  <div className="rounded-2xl border border-border/80 bg-elevated/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Fixed banner slot</p>
                    <div className="mt-3 overflow-hidden rounded-xl border border-border/70 bg-slate-950/90">
                      <div className="relative mx-auto aspect-[728/90] w-full max-w-[728px]">
                        {boostForm.imageUrl ? (
                          <img src={mediaUrl(boostForm.imageUrl)} alt="Workspace ad banner preview" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center px-4 text-center">
                            <div>
                              <p className="text-sm font-semibold text-white">Banner preview</p>
                              <p className="mt-1 text-xs text-slate-300">Upload exactly {AD_BANNER_WIDTH} x {AD_BANNER_HEIGHT} px.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl bg-card px-3 py-2 text-xs text-slate-500">
                        <span className="font-semibold text-foreground">Dimensions</span>
                        <p className="mt-1">{AD_BANNER_WIDTH} x {AD_BANNER_HEIGHT} px</p>
                      </div>
                      <div className="rounded-xl bg-card px-3 py-2 text-xs text-slate-500">
                        <span className="font-semibold text-foreground">Format</span>
                        <p className="mt-1">PNG or JPG</p>
                      </div>
                      <div className="rounded-xl bg-card px-3 py-2 text-xs text-slate-500">
                        <span className="font-semibold text-foreground">Max size</span>
                        <p className="mt-1">{formatFileSize(AD_BANNER_MAX_SIZE_BYTES)}</p>
                      </div>
                    </div>
                  </div>
                  {boostForm.imageUrl ? (
                    <div className="rounded-2xl border border-border/80 bg-elevated/60 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current banner</p>
                      <p className="mt-2 break-all text-xs text-slate-500">{boostForm.imageUrl}</p>
                    </div>
                  ) : null}
                </div>
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" disabled={boostMutation.isPending || boostUploadMutation.isPending} onClick={closeBoostDialog}>Cancel</Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!boostForm.name.trim()) {
                        toast.error("Enter an ad name.")
                        return
                      }
                      if (!boostForm.imageUrl.trim()) {
                        toast.error("Upload a banner image.")
                        return
                      }
                      boostMutation.mutate()
                    }}
                    disabled={boostMutation.isPending || boostUploadMutation.isPending}
                  >
                    {boostMutation.isPending ? "Saving..." : editingBoost ? "Update Ad" : "Create Ad"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "analytics" && ai && (
        <div className="space-y-6">
          <AIPerformanceSummaryCard
            summary={aiSummaryQuery.data}
            queryKey={aiSummaryQueryKey}
            onGenerate={() => api.generateExpoAIAnalyticsSummary(token || "", params.id)}
          />

          {roi && (
            <Card className="overflow-hidden border-border/80 p-0 shadow-sm">
              <div className="flex flex-col gap-3 border-b border-border/70 bg-elevated/55 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">ROI performance</p>
                  <p className="mt-1 text-xs text-slate-500">Expo-specific exhibitor ROI based on your investment, leads, meetings, and pre-order outcomes.</p>
                </div>
                <Button variant="secondary" onClick={() => setRoiDialogOpen(true)}>Update ROI</Button>
              </div>
              <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
                <AnalyticsMetricCard label="Total investment" value={formatCurrency(roi.totalInvestment, roi.currency)} detail={`${formatCurrency(roi.estimatedSpend, roi.currency)} estimate + ${formatCurrency(roi.tandazaSpend, roi.currency)} Tandaza`} />
                <AnalyticsMetricCard label="Realized return" value={formatCurrency(roi.realizedReturn, roi.currency)} detail={`${formatCurrency(roi.preOrderValue, roi.currency)} from tracked pre-orders`} />
                <AnalyticsMetricCard label="Projected pipeline" value={formatCurrency(roi.projectedPipelineValue, roi.currency)} detail={`${formatCurrency(roi.baseLeadValue, roi.currency)} baseline value shaped by lead quality, stage, meetings, and pre-order intent`} />
                <AnalyticsMetricCard label="Projected return" value={formatCurrency(roi.projectedReturn, roi.currency)} detail={`${formatCurrency(roi.realizedReturn, roi.currency)} realized + ${formatCurrency(roi.projectedPipelineValue, roi.currency)} projected`} />
              </div>
              <div className="grid gap-4 border-t border-border/70 p-5 md:grid-cols-2 xl:grid-cols-4">
                <AnalyticsMetricCard label="Realized ROI" value={`${roi.realizedROI}%`} detail={`${Math.min(999, roi.realizedRecoveredPercent || 0)}% recovered from pre-orders`} />
                <AnalyticsMetricCard label="Projected ROI" value={`${roi.projectedROI}%`} detail={`${Number(roi.projectedRevenueMultiple || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}x projected return multiple`} />
                <AnalyticsMetricCard label="Cost per lead" value={formatCurrency(roi.costPerLead, roi.currency)} detail={`${roi.hotLeads.toLocaleString()} hot, ${(roi.warmLeads || 0).toLocaleString()} warm, ${(roi.coldLeads || 0).toLocaleString()} cold`} />
                <AnalyticsMetricCard label="Projected net return" value={formatCurrency(roi.projectedNetReturn || 0, roi.currency)} detail={roi.projectedNetReturn && roi.projectedNetReturn > 0 ? roi.projectedStatus : "Current projected ROI gap"} />
                <AnalyticsMetricCard label="Cost per pre-order" value={formatCurrency(roi.costPerPreOrder || 0, roi.currency)} detail={`${(roi.preOrderQuantity || 0).toLocaleString()} item quantity tracked, ${(overviewAnalytics?.meetings ?? meetings.length).toLocaleString()} meetings total`} />
              </div>
              <div className="grid gap-4 border-t border-border/70 p-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <div className="rounded-2xl border border-border/80 bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Spend breakdown</p>
                  <div className="mt-4 space-y-3">
                    {Object.entries(roi.breakdown || {}).filter(([, value]) => Number(value) > 0).length ? Object.entries(roi.breakdown || {}).filter(([, value]) => Number(value) > 0).map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-3 text-sm">
                        <span className="capitalize text-slate-500">{label}</span>
                        <span className="font-semibold text-foreground">{formatCurrency(Number(value), roi.currency || expo.currency)}</span>
                      </div>
                    )) : <p className="text-sm text-slate-500">No detailed spend breakdown yet.</p>}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/80 bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Break-even guidance</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-elevated/70 p-3">
                      <p className="text-2xl font-semibold tracking-tight text-foreground">{(roi.breakEvenLeadsNeeded || 0).toLocaleString()}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">More qualified leads needed at current lead value</p>
                    </div>
                    <div className="rounded-xl bg-elevated/70 p-3">
                      <p className="text-2xl font-semibold tracking-tight text-foreground">{(roi.breakEvenPreOrdersNeeded || 0).toLocaleString()}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">More pre-orders needed at current average value</p>
                    </div>
                    <div className="rounded-xl bg-elevated/70 p-3">
                      <p className="text-2xl font-semibold tracking-tight text-foreground">{formatCurrency(roi.averageLeadValue || 0, roi.currency)}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Projected value per captured lead</p>
                    </div>
                    <div className="rounded-xl bg-elevated/70 p-3">
                      <p className="text-2xl font-semibold tracking-tight text-foreground">{formatCurrency(roi.averagePreOrderValue || 0, roi.currency)}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Average pre-order value</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 border-t border-border/70 p-5 lg:grid-cols-2">
                <AnalyticsValueBarCard title="Pipeline by lead temperature" description="Estimated commercial value by lead quality" items={roiPipelineByTemperature} maxValue={maxRoiPipelineByTemperature} currency={roi.currency} />
                <AnalyticsValueBarCard title="Pipeline by status" description="Estimated commercial value by follow-up stage" items={roiPipelineByStatus} maxValue={maxRoiPipelineByStatus} currency={roi.currency} />
              </div>
              <div className="border-t border-border/70 p-5">
                <div className="rounded-2xl border border-border/80 bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">How projection works</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{roi.calculationMethod}</p>
                </div>
              </div>
              <div className="border-t border-border/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recommended actions</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {roi.recommendations.map((item, index) => (
                    <div key={index} className="rounded-xl bg-elevated/70 p-3 text-sm leading-6 text-slate-600">{item}</div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AnalyticsMetricCard label="Lead conversion" value={`${leadConversionRate}%`} detail={`${leadTotal.toLocaleString()} leads from ${visitorTotal.toLocaleString()} visitors`} />
            <AnalyticsMetricCard label="Meeting rate" value={`${meetingConversionRate}%`} detail={`${(overviewAnalytics?.meetings ?? meetings.length).toLocaleString()} meetings from captured leads`} />
            <AnalyticsMetricCard label="Pre-order rate" value={`${preOrderConversionRate}%`} detail={`${preOrderTotal.toLocaleString()} pre-orders from captured leads`} />
            <AnalyticsMetricCard label="Avg. pre-order value" value={formatCurrency(averagePreOrderValue, expo.currency)} detail={`${formatCurrency(preOrderValue, expo.currency)} total intent`} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <Card className="overflow-hidden border-border/80 p-0 shadow-sm">
              <div className="border-b border-border/70 bg-elevated/55 px-5 py-4">
                <p className="text-sm font-semibold text-foreground">Engagement funnel</p>
                <p className="mt-1 text-xs text-slate-500">How visitors move from profile views into commercial intent</p>
              </div>
              <div className="grid min-h-64 grid-cols-4 items-end gap-3 p-5">
                {engagementFunnelItems.map((item) => {
                  const maxValue = Math.max(...engagementFunnelItems.map((entry) => entry.value), 1)
                  return (
                    <div key={item.label} className="flex h-full flex-col justify-end gap-3">
                      <div className="flex flex-1 items-end rounded-2xl bg-elevated p-1.5">
                        <div className="w-full rounded-xl bg-gradient-to-t from-primary to-violet-400" style={{ height: item.value ? `${Math.max(8, (item.value / maxValue) * 100)}%` : "0%" }} />
                      </div>
                      <div className="text-center">
                        <p className="font-mono text-sm font-semibold text-foreground">{item.value.toLocaleString()}</p>
                        <p className="text-[11px] font-medium text-slate-500">{item.label}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card className="border-border/80 p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Lead quality score</p>
              <p className="mt-1 text-xs text-slate-500">Weighted signal from visitor engagement and follow-up readiness</p>
              <div className="mt-6 flex items-center justify-center">
                <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-[conic-gradient(hsl(var(--primary))_var(--score),hsl(var(--elevated))_0)] p-3" style={{ "--score": `${leadQualityScore}%` } as CSSProperties}>
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-card text-center shadow-inner">
                    <span className="text-4xl font-semibold tracking-tight text-foreground">{leadQualityScore}%</span>
                    <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Quality</span>
                  </div>
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-elevated/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Peak activity</p>
                <p className="mt-2 text-sm font-medium text-foreground">{peakHours.length ? peakHours.join(", ") : "Not enough activity yet"}</p>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <AnalyticsBarCard title="Lead temperature" description="Quality mix from captured visitor interest" items={leadTemperatureItems} maxValue={maxLeadTemperature} tone="temperature" />
            <AnalyticsBarCard title="Meeting outcomes" description="Scheduled sessions and meeting follow-through" items={meetingStatusItems} maxValue={maxMeetingStatus} />
            <AnalyticsBarCard title="Pre-order status" description="Fulfillment progress for purchase intent" items={preOrderStatusItems} maxValue={maxPreOrderStatus} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card className="border-border/80 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Lead pipeline</p>
                  <p className="mt-1 text-xs text-slate-500">Stage distribution across follow-up work</p>
                </div>
                <Button variant="secondary" onClick={() => openWorkspaceTab("leads")}>Open Leads</Button>
              </div>
              <div className="mt-5 grid h-48 grid-cols-6 items-end gap-3">
                {leadStatusItems.map((item) => (
                  <div key={item.label} className="flex h-full flex-col justify-end gap-2">
                    <div className="flex flex-1 items-end rounded-2xl bg-elevated p-1">
                      <div className="w-full rounded-xl bg-gradient-to-t from-primary to-violet-400" style={{ height: item.value ? `${Math.max(6, (item.value / maxLeadStatus) * 100)}%` : "0%" }} />
                    </div>
                    <div className="min-h-10 text-center">
                      <p className="font-mono text-xs font-semibold text-foreground">{item.value}</p>
                      <p className="truncate text-[10px] capitalize text-slate-500">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="border-border/80 p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Product interest</p>
              <p className="mt-1 text-xs text-slate-500">Products driving the strongest pre-order intent</p>
              <div className="mt-5 space-y-4">
                {productInterestItems.length ? productInterestItems.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                      <span className="truncate font-medium text-slate-600">{item.label}</span>
                      <span className="font-mono text-slate-500">{item.value}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-elevated">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (item.value / maxProductInterest) * 100)}%` }} />
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center text-sm text-slate-500">No product interest data yet.</div>
                )}
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-semibold">Recommendations</h3>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {(aiRecommendations.length ? aiRecommendations : ["Keep collecting visitor activity, leads, meetings, and pre-orders to build stronger recommendations."]).map((rec, i) => (
                <li key={i} className="rounded-2xl border border-border/80 bg-elevated/55 p-4 text-sm leading-6 text-slate-600">
                  {rec}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {roiDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="roi-dialog-title" onClick={() => setRoiDialogOpen(false)}>
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border/80 bg-card p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="roi-dialog-title" className="text-lg font-semibold text-foreground">Update ROI estimate</h3>
                <p className="mt-1 text-sm text-slate-500">Enter normal money values. These estimates help Tandaza compare expo investment against leads, meetings, pre-orders, and paid add-ons.</p>
              </div>
              <button type="button" onClick={() => setRoiDialogOpen(false)} className="rounded-full border border-border px-3 py-1 text-sm font-semibold">Close</button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ROIAmountInput label="Total estimate" value={roiForm.estimatedSpend} onChange={(value) => setRoiForm(f => ({ ...f, estimatedSpend: value }))} />
              <ROIAmountInput label="Physical expo cost" value={roiForm.booth} onChange={(value) => setRoiForm(f => ({ ...f, booth: value }))} />
              <ROIAmountInput label="Travel" value={roiForm.travel} onChange={(value) => setRoiForm(f => ({ ...f, travel: value }))} />
              <ROIAmountInput label="Staffing" value={roiForm.staffing} onChange={(value) => setRoiForm(f => ({ ...f, staffing: value }))} />
              <ROIAmountInput label="Marketing" value={roiForm.marketing} onChange={(value) => setRoiForm(f => ({ ...f, marketing: value }))} />
              <ROIAmountInput label="Other" value={roiForm.other} onChange={(value) => setRoiForm(f => ({ ...f, other: value }))} />
            </div>
            <label className="mt-4 block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Notes</span>
              <textarea
                value={roiForm.notes}
                onChange={(event) => setRoiForm(f => ({ ...f, notes: event.target.value }))}
                placeholder="Add useful context about what was included in the estimate"
                rows={4}
                className="w-full rounded-2xl border border-border/80 bg-elevated px-3 py-2 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
            </label>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" disabled={roiMutation.isPending} onClick={() => setRoiDialogOpen(false)}>Cancel</Button>
              <Button type="button" disabled={roiMutation.isPending} onClick={() => roiMutation.mutate()}>
                {roiMutation.isPending ? "Saving..." : "Save ROI"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "qrcode" && (
        <Card className="overflow-hidden border-border/80 bg-card p-0 shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="p-6 sm:p-8">
              <span className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Visitor access</span>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">Tandaza access card</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">A clean card for your stand, socials, and follow-up messages. The QR stays simple for reliable scanning while the card carries your company and expo context.</p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card p-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-elevated">
                    {companyLogoUrl ? (
                      <img src={companyLogoUrl} alt={`${companyName} logo`} className="max-h-full max-w-full object-contain p-1.5" />
                    ) : (
                      <span className="text-sm font-bold text-slate-900">{companyName.slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Card brand</p>
                    <p className="truncate text-sm font-semibold text-foreground">{companyName}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/80 bg-elevated/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Expo</p>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold text-foreground">{expo.expoName}</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-primary/10 bg-primary/[0.03] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Short visitor link</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <p className="min-w-0 flex-1 break-all rounded-xl border border-border/70 bg-card px-4 py-3 font-mono text-base font-semibold leading-6 text-primary">
                    {visitorLink || "Generating link..."}
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (!visitorLink) return
                      navigator.clipboard.writeText(visitorLink)
                      toast.success("Visitor link copied.")
                    }}
                    disabled={!visitorLink}
                  >
                    Copy Link
                  </Button>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={downloadQRPdf} disabled={!qrImageUrl || !qrQuery.data}>Download PDF</Button>
              </div>
            </div>

            <div className="border-t border-border/70 bg-[radial-gradient(circle_at_top,#f5f3ff,transparent_58%),linear-gradient(180deg,#fafafa,#ffffff)] p-6 lg:border-l lg:border-t-0">
              <div className="mx-auto max-w-[18rem] rounded-[2rem] border border-primary/10 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                <div className="overflow-hidden rounded-[1.55rem] border border-slate-200 bg-white text-center shadow-sm">
                  <div className="border-b border-primary/10 bg-primary/[0.06] px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Tandaza access card</p>
                  </div>
                  <div className="px-5 pb-5 pt-5">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm">
                      {companyLogoUrl ? (
                        <img src={companyLogoUrl} alt={`${companyName} logo`} className="max-h-full max-w-full object-contain p-2" />
                      ) : (
                        <span className="text-lg font-bold text-slate-900">{companyName.slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <p className="mt-3 max-w-full truncate text-sm font-semibold text-slate-900">{companyName}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{expo.expoName}</p>
                    <div className="mt-4 rounded-[1.4rem] border border-primary/10 bg-white p-3 shadow-sm">
                      <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-white">
                        {qrImageUrl ? (
                          <img src={qrImageUrl} alt="Expo visitor QR code" className="h-full w-full object-contain" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-2xl bg-elevated text-sm text-slate-500">Generating QR...</div>
                        )}
                      </div>
                    </div>
                    <p className="mt-3 max-w-full break-all rounded-2xl border border-primary/10 bg-primary/[0.04] px-3 py-2 font-mono text-sm font-semibold leading-5 text-primary">{visitorLink || "Generating link..."}</p>
                    <p className="mx-auto mt-3 max-w-[13rem] text-xs leading-5 text-slate-500">Scan to view products, request a meeting, or share interest.</p>
                    <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Powered by Tandaza</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeTab === "visitors" && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem_auto]">
              <label className="relative">
                <span className="sr-only">Search visitors</span>
                <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  value={visitorSearch}
                  onChange={(event) => setVisitorSearch(event.target.value)}
                  placeholder="Search visitors by name, email, phone, or visit source"
                  aria-label="Search visitors"
                  className="pl-11"
                />
              </label>
              <select
                value={visitorSourceFilter}
                onChange={(event) => setVisitorSourceFilter(event.target.value)}
                aria-label="Filter visitors by visit source"
                className="h-11 rounded-xl border border-border/80 bg-elevated px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                <option value="all">All visit sources</option>
                {visitorSourceOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => exportVisitors("csv")}><DownloadIcon className="mr-2 h-4 w-4" />CSV</Button>
                <Button variant="secondary" onClick={() => exportVisitors("excel")}><DownloadIcon className="mr-2 h-4 w-4" />Excel</Button>
              </div>
            </div>
          </Card>
          <div className="hidden md:block">
            <DataTable<ExpoVisitor>
              columns={[
                { key: "name", header: "Visitor", sortable: true, render: (r) => <span className="font-medium">{r.name}</span> },
                { key: "email", header: "Email", render: (r) => <span className="text-sm text-slate-500">{r.email || "Not shared"}</span> },
                { key: "phone", header: "Phone number", render: (r) => <span className="text-sm text-slate-500">{r.phone || "Not shared"}</span> },
                {
                  key: "source",
                  header: "Visit source",
                  sortable: true,
                  sortValue: (r) => r.sourceLabel || r.source || "",
                  render: (r) => (
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {r.sourceLabel || "Expo profile visit"}
                    </span>
                  )
                },
                {
                  key: "engagementCount",
                  header: "Engagements",
                  sortable: true,
                  render: (r) => <span className="font-mono text-sm font-semibold text-foreground">{r.engagementCount || 1}</span>
                },
                {
                  key: "lastSeenAt",
                  header: "Last seen",
                  sortable: true,
                  sortValue: (r) => new Date(r.lastSeenAt || r.registeredAt || 0).getTime(),
                  render: (r) => <span className="text-sm text-slate-500">{formatDate(r.lastSeenAt || r.registeredAt)}</span>
                }
              ]}
              rows={filteredVisitors}
              pagination={{ page: visitorsPage, pageSize: PAGE_SIZE, total: filteredVisitors.length, onPageChange: setVisitorsPage }}
              emptyTitle="No visitors found"
              emptyDescription={visitors.length ? "Adjust the filters to see more visitor activity." : "Visitors will appear here once they scan your QR or engage remotely."}
            />
          </div>
          <div className="grid gap-3 md:hidden">
            {visibleVisitors.length ? visibleVisitors.map((visitor) => (
              <Card key={visitor.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{visitor.name || "Visitor"}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{visitor.email || "Email not shared"}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{visitor.phone || "Phone not shared"}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{visitor.engagementCount || 1}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{visitor.sourceLabel || "Expo profile visit"}</span>
                  <span className="rounded-full bg-elevated px-2.5 py-1 text-xs font-semibold text-slate-500">Last seen {formatDate(visitor.lastSeenAt || visitor.registeredAt)}</span>
                </div>
              </Card>
            )) : (
              <Card className="p-6 text-center"><p className="text-sm font-semibold text-foreground">No visitors found</p><p className="mt-1 text-xs text-slate-500">{visitors.length ? "Adjust the filters to see more visitor activity." : "Visitors will appear once they scan your QR or engage remotely."}</p></Card>
            )}
          </div>
          <MobilePagination page={visitorsPage} pageSize={PAGE_SIZE} total={filteredVisitors.length} onPageChange={setVisitorsPage} />
        </div>
      )}

      {activeTab === "products" && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Expo showcase products</p>
                <p className="mt-1 text-xs text-slate-500">Choose the company products visitors will see and interact with during this expo.</p>
              </div>
              {expoEnded ? (
                <span className="rounded-full border border-border/80 bg-elevated px-3 py-2 text-xs font-semibold text-slate-500">Showcase closed after expo end date</span>
              ) : (
                <Button onClick={() => setShowcaseDialogOpen(true)}><PlusIcon className="mr-2 h-4 w-4" />Showcase Product</Button>
              )}
            </div>
          </Card>
          <div className="hidden md:block">
            <DataTable<Product>
              columns={[
                { key: "name", header: "Product", sortable: true,
                  render: (r) => (
                    <button type="button" onClick={() => router.push(`/exhibitor/products/${r.id}`)} className="flex items-center gap-3 text-left">
                      <ProductThumb product={r} />
                      <span className="font-medium text-foreground hover:text-primary">{r.name}</span>
                    </button>
                  )
                },
                { key: "category", header: "Category", render: (r) => <span className="text-sm text-slate-500">{r.category}</span> },
                { key: "price", header: "Price", sortable: true, render: (r) => <ProductPrice product={r} /> }
              ]}
              rows={products}
              rowActions={[
                { label: "View product", onClick: (product) => router.push(`/exhibitor/products/${product.id}`) },
                ...(!expoEnded ? [{ label: "Remove from showcase", tone: "danger" as const, onClick: (product: Product) => removeShowcaseProductMutation.mutate(product.id) }] : [])
              ]}
              pagination={{ page: productsPage, pageSize: PAGE_SIZE, total: products.length, onPageChange: setProductsPage }}
              emptyTitle="No showcased products"
              emptyDescription="Showcase products from your company catalog for this expo."
            />
          </div>
          <div className="grid gap-3 md:hidden">
            {visibleProducts.length ? visibleProducts.map((product) => (
              <Card key={product.id} className="p-4">
                <button type="button" onClick={() => router.push(`/exhibitor/products/${product.id}`)} className="flex w-full gap-3 text-left">
                  <ProductThumb product={product} size="large" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{product.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{product.category}</p>
                    <div className="mt-2"><ProductPrice product={product} /></div>
                  </div>
                </button>
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" onClick={() => router.push(`/exhibitor/products/${product.id}`)}>View</Button>
                  {!expoEnded ? <Button variant="danger" onClick={() => removeShowcaseProductMutation.mutate(product.id)}>Remove</Button> : null}
                </div>
              </Card>
            )) : (
              <Card className="p-6 text-center">
                <p className="text-sm font-semibold text-foreground">No showcased products</p>
                <p className="mt-1 text-xs text-slate-500">Showcase products from your company catalog for this expo.</p>
              </Card>
            )}
          </div>
          <MobilePagination page={productsPage} pageSize={PAGE_SIZE} total={products.length} onPageChange={setProductsPage} />
          {showcaseDialogOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
              <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-border/70 px-6 py-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/80">Showcase product</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight">Select company products</h3>
                    <p className="mt-1 text-sm text-slate-500">Selected products will be copied into this expo showcase.</p>
                  </div>
                  <button type="button" onClick={() => setShowcaseDialogOpen(false)} className="rounded-full border border-border px-3 py-1 text-sm font-semibold">Close</button>
                </div>
                <div className="max-h-[58vh] overflow-y-auto px-6 py-4">
                  {selectableCompanyProducts.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectableCompanyProducts.map((product) => {
                        const checked = selectedShowcaseProducts.includes(product.id)
                        return (
                          <label key={product.id} className={cn("flex cursor-pointer gap-3 rounded-2xl border p-3 transition", checked ? "border-primary bg-primary/5" : "border-border bg-elevated/40 hover:border-primary/30")}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => setSelectedShowcaseProducts((items) => event.target.checked ? [...items, product.id] : items.filter((id) => id !== product.id))}
                              className="mt-2 h-4 w-4 accent-primary"
                            />
                            <ProductThumb product={product} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
                              <p className="mt-1 text-xs text-slate-500">{product.category}</p>
                              <div className="mt-2"><ProductPrice product={product} /></div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                      <p className="text-sm font-semibold text-foreground">No company products available</p>
                      <p className="mt-1 text-xs text-slate-500">Create company products first, then showcase them in this expo.</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col-reverse gap-3 border-t border-border/70 bg-background/70 px-6 py-5 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" onClick={() => setShowcaseDialogOpen(false)}>Cancel</Button>
                  <Button type="button" disabled={selectedShowcaseProducts.length === 0 || showcaseProductsMutation.isPending} onClick={() => showcaseProductsMutation.mutate()}>
                    {showcaseProductsMutation.isPending ? "Adding..." : "Add to Showcase"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "orders" && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Pre-order intent</p>
                <p className="mt-1 text-xs text-slate-500">Filter, update fulfillment status, export records, and download purchase order PDFs.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="relative sm:w-72">
                  <span className="sr-only">Search pre-orders</span>
                  <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input placeholder="Search customer, email, phone, product" value={orderSearch} onChange={(event) => { setOrderSearch(event.target.value); setOrdersPage(1) }} className="pl-11" />
                </label>
                <span className="relative block">
                  <select value={orderStatusFilter} onChange={(event) => { setOrderStatusFilter(event.target.value as PreOrder["status"] | "all"); setOrdersPage(1) }} className="h-11 w-full appearance-none rounded-xl border border-border bg-elevated px-4 pr-10 text-sm font-medium text-foreground outline-none transition hover:border-primary/40 focus:border-primary/70 focus:ring-4 focus:ring-ring/10 sm:w-48">
                    <option value="all">All statuses</option>
                    {PRE_ORDER_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </span>
                <Button variant="secondary" onClick={() => exportPreOrders("csv")}><DownloadIcon className="mr-2 h-4 w-4" />CSV</Button>
                <Button variant="secondary" onClick={() => exportPreOrders("excel")}><DownloadIcon className="mr-2 h-4 w-4" />EXCEL</Button>
              </div>
            </div>
          </Card>
          <div className="hidden md:block">
            <DataTable<PreOrder>
              columns={[
                { key: "productName", header: "Product", sortable: true, render: (r) => <span className="font-medium">{r.productName}</span> },
                { key: "customer", header: "Customer", render: (r) => (
                  <div className="min-w-56">
                    <p className="font-semibold text-foreground">{r.visitorName || "Not provided"}</p>
                    <p className="mt-1 text-xs text-slate-500">{r.visitorEmail || "No email"}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{r.visitorPhone || "No phone"}</p>
                  </div>
                ) },
                { key: "quantity", header: "Qty", render: (r) => <span className="font-mono">{r.quantity}</span> },
                { key: "amount", header: "Amount", sortable: true, render: (r) => <span className="font-mono">{formatCurrency(r.amount, r.currency || expo.currency)}</span> },
                { key: "status", header: "Status", render: (r) => (
                  <select
                    value={r.status}
                    disabled={preOrderStatusMutation.isPending}
                    onChange={(event) => preOrderStatusMutation.mutate({ orderId: r.id, status: event.target.value as PreOrder["status"] })}
                    className="h-9 rounded-xl border border-border bg-elevated px-3 text-xs font-semibold text-foreground outline-none transition hover:border-primary/40 focus:border-primary/70 focus:ring-4 focus:ring-ring/10"
                  >
                    {PRE_ORDER_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                  </select>
                ) },
                { key: "createdAt", header: "Date", sortable: true, render: (r) => <span className="text-sm text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</span> }
              ]}
              rows={filteredPreOrders}
              rowActions={[{ label: "Download PO PDF", onClick: downloadPurchaseOrder }]}
              pagination={{ page: ordersPage, pageSize: PAGE_SIZE, total: filteredPreOrders.length, onPageChange: setOrdersPage }}
              emptyTitle="No pre-orders yet"
              emptyDescription="Pre-orders from visitors will appear here."
            />
          </div>
          <div className="grid gap-3 md:hidden">
            {visiblePreOrders.length ? visiblePreOrders.map((order) => (
              <Card key={order.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{order.productName}</p>
                    <p className="mt-1 text-xs text-slate-500">{order.visitorName || "Customer not provided"}</p>
                    <p className="mt-0.5 break-all text-xs text-slate-500">{order.visitorEmail || "No email"} · {order.visitorPhone || "No phone"}</p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-foreground">{formatCurrency(order.amount, order.currency || expo.currency)}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-elevated px-3 py-2"><span className="text-slate-500">Qty</span><p className="font-mono font-semibold text-foreground">{order.quantity}</p></div>
                  <div className="rounded-xl bg-elevated px-3 py-2"><span className="text-slate-500">Date</span><p className="font-semibold text-foreground">{formatDate(order.createdAt)}</p></div>
                </div>
                <div className="mt-3 flex gap-2">
                  <select
                    value={order.status}
                    disabled={preOrderStatusMutation.isPending}
                    onChange={(event) => preOrderStatusMutation.mutate({ orderId: order.id, status: event.target.value as PreOrder["status"] })}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-elevated px-3 text-xs font-semibold text-foreground outline-none"
                  >
                    {PRE_ORDER_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                  </select>
                  <Button variant="secondary" onClick={() => downloadPurchaseOrder(order)}>PO PDF</Button>
                </div>
              </Card>
            )) : (
              <Card className="p-6 text-center"><p className="text-sm font-semibold text-foreground">No pre-orders yet</p><p className="mt-1 text-xs text-slate-500">Pre-orders from visitors will appear here.</p></Card>
            )}
          </div>
          <MobilePagination page={ordersPage} pageSize={PAGE_SIZE} total={filteredPreOrders.length} onPageChange={setOrdersPage} />
        </div>
      )}

      {activeTab === "meetings" && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/80">Meeting calendar</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">Scheduled visitor meetings</h3>
                <p className="mt-1 text-sm text-slate-500">Review your week, open the day view, and create new Google Meet-ready sessions.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant={meetingView === "week" ? "primary" : "secondary"} onClick={() => setMeetingView("week")}>Week</Button>
                <Button variant={meetingView === "day" ? "primary" : "secondary"} onClick={() => setMeetingView("day")}>Day</Button>
                <Input type="date" value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} className="w-auto" />
                <Button onClick={() => setMeetingDialogOpen(true)}><PlusIcon className="mr-2 h-4 w-4" />Schedule Visitor Meeting</Button>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <Card className="overflow-hidden p-0">
              <div className={cn("grid", meetingView === "day" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-7")}>
                {calendarDays.map((day) => {
                  const dayMeetings = meetingsForDay(day)
                  return (
                    <div key={day} className="min-h-52 border-b border-border/70 p-3 md:border-b-0 md:border-r last:border-r-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{formatDateInputLabel(day, expoTimezone, { weekday: "short" })}</p>
                          <p className="mt-1 text-lg font-semibold text-foreground">{formatDateInputLabel(day, expoTimezone, { day: "numeric" })}</p>
                        </div>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{dayMeetings.length}</span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {dayMeetings.length === 0 ? <p className="rounded-xl border border-dashed border-border p-3 text-xs text-slate-400">No meetings</p> : dayMeetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} timeZone={expoTimezone} onClick={() => setSelectedMeeting(meeting)} />)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Upcoming</p>
              <div className="mt-3 space-y-3">
                {upcomingMeetings.slice(0, 5).map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} timeZone={expoTimezone} compact onClick={() => setSelectedMeeting(meeting)} />)}
                {upcomingMeetings.length === 0 && <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-slate-500">No upcoming meetings yet.</p>}
              </div>
            </Card>
          </div>

          {meetingDialogOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
              <form onSubmit={handleMeetingSubmit} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/80">Visitor meeting</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight">Schedule visitor meeting</h3>
                  </div>
                  <button type="button" onClick={() => setMeetingDialogOpen(false)} className="rounded-full border border-border px-3 py-1 text-sm font-semibold">Close</button>
                </div>
                <div className="mt-5 grid gap-4">
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-elevated p-1">
                    {(["existing", "new"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setMeetingLeadMode(mode)
                          setMeetingForm((form) => ({ ...form, leadId: "", visitorName: "", visitorEmail: "", visitorPhone: "" }))
                        }}
                        className={cn(
                          "rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                          meetingLeadMode === mode ? "bg-primary text-white shadow-sm" : "text-slate-500 hover:bg-card hover:text-foreground"
                        )}
                      >
                        {mode === "existing" ? "Existing Lead" : "New Lead"}
                      </button>
                    ))}
                  </div>

                  {meetingLeadMode === "existing" ? (
                    <div className="space-y-4">
                      <label className="space-y-2 text-sm font-semibold">
                        <span>Existing lead</span>
                        <span className="relative block">
                          <select
                            value={meetingForm.leadId}
                            onChange={(event) => {
                              const lead = leads.find((item) => item.id === event.target.value)
                              setMeetingForm((form) => ({ ...form, leadId: event.target.value, visitorName: lead?.visitorName || "", visitorEmail: lead?.visitorEmail || "", visitorPhone: lead?.visitorPhone || "" }))
                            }}
                            className="h-12 w-full appearance-none rounded-2xl border border-border bg-elevated px-4 pr-11 text-sm font-medium text-foreground shadow-sm outline-none transition placeholder:text-slate-400 hover:border-primary/40 focus:border-primary/70 focus:ring-4 focus:ring-ring/10"
                          >
                            <option value="">Select a visitor lead</option>
                            {meetingLeadOptions.map((lead) => <option key={lead.id} value={lead.id}>{lead.visitorName} - {lead.visitorEmail}{lead.visitorPhone ? ` - ${lead.visitorPhone}` : ""}</option>)}
                          </select>
                          <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </span>
                      </label>
                      {meetingForm.leadId && (
                        <div className="grid gap-3 rounded-2xl border border-border bg-elevated p-3 sm:grid-cols-3">
                          <Input placeholder="Visitor name" value={meetingForm.visitorName} readOnly className="bg-card text-slate-500" />
                          <Input placeholder="Visitor email" value={meetingForm.visitorEmail} readOnly className="bg-card text-slate-500" />
                          <Input placeholder="Visitor phone" value={meetingForm.visitorPhone} readOnly className="bg-card text-slate-500" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 rounded-2xl border border-dashed border-primary/25 bg-primary/5 p-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">New lead details</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Use these fields when the visitor is not yet in your lead list.</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input placeholder="Visitor name" value={meetingForm.visitorName} onChange={(event) => setMeetingForm((form) => ({ ...form, visitorName: event.target.value }))} />
                        <Input type="email" placeholder="Visitor email" value={meetingForm.visitorEmail} onChange={(event) => setMeetingForm((form) => ({ ...form, visitorEmail: event.target.value }))} />
                      </div>
                      <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
                        <span className="relative block">
                          <select value={meetingForm.visitorCountryCode} onChange={(event) => setMeetingForm((form) => ({ ...form, visitorCountryCode: event.target.value }))} className="h-12 w-full appearance-none rounded-2xl border border-border bg-card px-3 pr-8 text-sm font-medium text-foreground shadow-sm outline-none transition hover:border-primary/40 focus:border-primary/70 focus:ring-4 focus:ring-ring/10">
                            {callingCodeOptions.map((option) => (
                              <option key={`${option.iso}-${option.code}`} value={option.code}>
                                {option.code} {option.iso} - {option.country}
                              </option>
                            ))}
                          </select>
                          <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </span>
                        <Input placeholder="Visitor phone" value={meetingForm.visitorPhone} onChange={(event) => setMeetingForm((form) => ({ ...form, visitorPhone: event.target.value }))} />
                      </div>
                    </div>
                  )}
                  <Input placeholder="Meeting title" value={meetingForm.title} onChange={(event) => setMeetingForm((form) => ({ ...form, title: event.target.value }))} />
                  <Input placeholder="CC emails, separated by commas" value={meetingForm.ccEmails} onChange={(event) => setMeetingForm((form) => ({ ...form, ccEmails: event.target.value }))} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <span className="relative block">
                      <select value={meetingForm.meetingType} onChange={(event) => setMeetingForm((form) => ({ ...form, meetingType: event.target.value }))} className="h-12 w-full appearance-none rounded-2xl border border-border bg-elevated px-4 pr-11 text-sm font-medium text-foreground shadow-sm outline-none transition hover:border-primary/40 focus:border-primary/70 focus:ring-4 focus:ring-ring/10">
                        {meetingCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                      </select>
                      <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </span>
                    <label className="space-y-1">
                      <Input type="datetime-local" value={meetingForm.scheduledAt} onChange={(event) => setMeetingForm((form) => ({ ...form, scheduledAt: event.target.value }))} />
                      <span className="block text-xs font-medium text-slate-500">Expo timezone: {expoTimezone}</span>
                    </label>
                  </div>
                  <Input placeholder="Meeting link, for example Google Meet" value={meetingForm.location} onChange={(event) => setMeetingForm((form) => ({ ...form, location: event.target.value }))} required />
                  <RichNotesEditor value={meetingForm.notes} onChange={(value) => setMeetingForm((form) => ({ ...form, notes: value }))} />
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <Button type="button" variant="secondary" onClick={() => setMeetingDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={meetingMutation.isPending}>{meetingMutation.isPending ? "Scheduling..." : "Create Meeting"}</Button>
                </div>
              </form>
            </div>
          )}

          {selectedMeeting && (
            <MeetingDetailsDialog
              meeting={selectedMeeting}
              timeZone={expoTimezone}
              deleting={meetingDeleteMutation.isPending}
              onClose={() => setSelectedMeeting(null)}
              onDelete={() => meetingDeleteMutation.mutate(selectedMeeting.id)}
            />
          )}
        </div>
      )}

      {activeTab === "conversations" && (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
            <Card className="overflow-hidden">
              <div className="border-b border-border/70 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Conversations</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Chat with visitors captured from this expo workspace. Messages are saved against the visitor lead so your team can continue follow-up after the expo.</p>
                  </div>
                  <label className="relative md:w-80">
                    <span className="sr-only">Search visitor conversations</span>
                    <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <Input
                      value={conversationSearch}
                      onChange={(event) => setConversationSearch(event.target.value)}
                      placeholder="Search visitor conversations"
                      className="pl-11"
                    />
                  </label>
                </div>
              </div>
              {filteredConversations.length ? (
                <div className="grid min-h-[520px] md:grid-cols-[300px_minmax(0,1fr)]">
                  <div className="border-b border-border/70 bg-elevated/40 md:border-b-0 md:border-r">
                    <div className="max-h-[520px] overflow-y-auto p-3">
                      {filteredConversations.map((thread) => {
                        const active = (selectedConversation?.id || "") === thread.id
                        return (
                          <button
                            key={thread.id}
                            type="button"
                            onClick={() => setSelectedConversationId(thread.id)}
                            className={cn("mb-2 w-full rounded-2xl border p-3 text-left transition", active ? "border-primary bg-primary text-white shadow-soft" : "border-border/70 bg-card hover:border-primary/40 hover:bg-primary/5")}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className={cn("truncate text-sm font-semibold", active ? "text-white" : "text-foreground")}>{thread.visitorName || "Visitor"}</p>
                                <p className={cn("mt-1 truncate text-xs", active ? "text-white/75" : "text-slate-500")}>{thread.visitorEmail || "Contact not shared"}</p>
                              </div>
                              {thread.unreadCount > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">{thread.unreadCount}</span>}
                            </div>
                            <p className={cn("mt-2 text-[11px] font-semibold", active ? "text-white/65" : "text-slate-400")}>{formatDate(thread.lastMessageAt)}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex min-h-[520px] flex-col">
                    {selectedConversation ? (
                      <>
                        <div className="border-b border-border/70 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-base font-semibold text-foreground">{selectedConversation.visitorName || "Visitor"}</p>
                              <p className="mt-1 text-sm text-slate-500">{selectedConversation.visitorEmail || "No email"}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedConversation.unreadCount > 0 && <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{selectedConversation.unreadCount} unread</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 space-y-3 overflow-y-auto bg-elevated/30 p-4">
                          {selectedConversationMessages.length ? selectedConversationMessages.map((message) => (
                            <div key={message.id} className={cn("max-w-[82%] rounded-2xl p-3", message.senderRole === "exhibitor" ? "ml-auto bg-primary text-white" : "bg-card text-foreground border border-border/70")}>
                              <p className={cn("text-xs font-semibold uppercase tracking-[0.16em]", message.senderRole === "exhibitor" ? "text-white/65" : "text-slate-400")}>{message.senderName || message.senderRole}</p>
                              <p className={cn("mt-2 text-sm leading-6", message.senderRole === "exhibitor" ? "text-white/90" : "text-slate-600")}>{message.message || "Message recorded."}</p>
                              <p className={cn("mt-2 text-[11px]", message.senderRole === "exhibitor" ? "text-white/60" : "text-slate-400")}>{formatDate(message.createdAt)}</p>
                            </div>
                          )) : (
                            <div className="rounded-2xl border border-dashed border-border/80 bg-card p-5 text-center text-sm text-slate-500">
                              No messages in this conversation yet.
                            </div>
                          )}
                        </div>
                        <form
                          className="border-t border-border/70 bg-card p-4"
                          onSubmit={(event) => {
                            event.preventDefault()
                            conversationMessageMutation.mutate()
                          }}
                        >
                          <div className="flex items-end gap-2 rounded-2xl border border-border/80 bg-elevated/50 p-2 transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
                            <textarea
                              value={conversationMessage}
                              onChange={(event) => setConversationMessage(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" && !event.shiftKey) {
                                  event.preventDefault()
                                  conversationMessageMutation.mutate()
                                }
                              }}
                              rows={1}
                              placeholder="Write a message..."
                              aria-label="Conversation message"
                              className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-foreground outline-none placeholder:text-slate-400"
                            />
                            <Button type="submit" size="sm" className="h-10 shrink-0 rounded-xl px-4" disabled={conversationMessageMutation.isPending || conversationMessage.trim().length < 3}>
                              <ChatIcon className="h-4 w-4" />
                              <span className="hidden sm:inline">{conversationMessageMutation.isPending ? "Sending" : "Send"}</span>
                            </Button>
                          </div>
                        </form>
                      </>
                    ) : (
                      <div className="flex min-h-[520px] items-center justify-center p-8 text-center">
                        <div>
                          <p className="text-sm font-semibold text-foreground">No conversation selected</p>
                          <p className="mt-1 text-xs text-slate-500">Choose a visitor from the conversation list.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm font-semibold text-foreground">No conversations yet</p>
                  <p className="mt-1 text-xs text-slate-500">When visitors share interest, request meetings, or submit pre-orders, their conversation threads will appear here.</p>
                </div>
              )}
            </Card>

            <Card className="p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Live stream</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Add a YouTube Live link for remote visitors. When enabled, it can be shown on the visitor-facing exhibitor profile.</p>
              </div>
              <form
                className="mt-4 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  liveStreamMutation.mutate()
                }}
              >
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500">Title</span>
                  <Input
                    className="mt-1"
                    value={liveStreamForm.title}
                    onChange={(event) => setLiveStreamForm((form) => ({ ...form, title: event.target.value }))}
                    placeholder="Expo live stream"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500">YouTube Live URL</span>
                  <Input
                    className="mt-1"
                    value={liveStreamForm.youtubeUrl}
                    onChange={(event) => setLiveStreamForm((form) => ({ ...form, youtubeUrl: event.target.value }))}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-elevated/50 p-3 text-sm font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={liveStreamForm.enabled}
                    onChange={(event) => setLiveStreamForm((form) => ({ ...form, enabled: event.target.checked }))}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  Show live stream to remote visitors
                </label>
                <Button type="submit" className="w-full" disabled={liveStreamMutation.isPending}>
                  Save live stream
                </Button>
              </form>
              {liveStream?.enabled && liveStream.embedUrl ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-border/70 bg-black">
                  <iframe
                    title={liveStream.title || "Expo live stream"}
                    src={liveStream.embedUrl}
                    className="aspect-video w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-border/80 p-4 text-sm text-slate-500">No active live stream is enabled for this workspace.</div>
              )}
            </Card>
          </div>
        </div>
      )}

      {activeTab === "feedback" && (
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="border-b border-border/70 bg-elevated/70 px-5 py-4">
              <p className="text-sm font-semibold text-foreground">Feedback for organizer</p>
              <p className="mt-1 text-xs text-slate-500">Share what worked, what did not, and what should improve for this expo.</p>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Rating</label>
                  <select
                    value={organizerFeedbackForm.rating}
                    onChange={(event) => setOrganizerFeedbackForm((value) => ({ ...value, rating: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-border/80 bg-elevated px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  >
                    {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} star{rating === 1 ? "" : "s"}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Category</label>
                  <select
                    value={organizerFeedbackForm.category}
                    onChange={(event) => setOrganizerFeedbackForm((value) => ({ ...value, category: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-border/80 bg-elevated px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  >
                    {ORGANIZER_FEEDBACK_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Overall feedback</label>
                <textarea
                  value={organizerFeedbackForm.comment}
                  onChange={(event) => setOrganizerFeedbackForm((value) => ({ ...value, comment: event.target.value }))}
                  placeholder="Tell the organizer how the expo experience was for your company."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-border/80 bg-elevated px-3 py-3 text-sm text-foreground outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Improvements</label>
                  <textarea
                    value={organizerFeedbackForm.improvements}
                    onChange={(event) => setOrganizerFeedbackForm((value) => ({ ...value, improvements: event.target.value }))}
                    placeholder="What should the organizer improve next time?"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-border/80 bg-elevated px-3 py-3 text-sm text-foreground outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Dislikes</label>
                  <textarea
                    value={organizerFeedbackForm.dislikes}
                    onChange={(event) => setOrganizerFeedbackForm((value) => ({ ...value, dislikes: event.target.value }))}
                    placeholder="What made the expo harder for your team?"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-border/80 bg-elevated px-3 py-3 text-sm text-foreground outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>
              <div className="flex justify-end border-t border-border/70 pt-4">
                <Button onClick={() => organizerFeedbackMutation.mutate()} disabled={organizerFeedbackMutation.isPending}>
                  {organizerFeedbackMutation.isPending ? "Sending..." : "Send Feedback"}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Visitor feedback</p>
                <p className="mt-1 text-xs text-slate-500">Ratings and comments submitted for this expo workspace.</p>
              </div>
              <select
                value={feedbackRatingFilter}
                onChange={(event) => setFeedbackRatingFilter(event.target.value)}
                className="h-11 rounded-xl border border-border/80 bg-elevated px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 sm:w-44"
              >
                <option value="all">All ratings</option>
                {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} star{rating === 1 ? "" : "s"}</option>)}
              </select>
            </div>
          </Card>
          <div className="grid gap-3">
            {filteredFeedback.length ? filteredFeedback.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{item.visitorName || "Visitor"}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{item.visitorEmail || "Email not shared"} · {formatDate(item.submittedAt)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-elevated/60 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Rating</p>
                    <div className="mt-1 flex text-sm font-bold text-primary" aria-label={`${item.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }, (_, index) => <span key={index} className={index < item.rating ? "text-primary" : "text-slate-300"}>★</span>)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-border/70 bg-card p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Comment</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.comment || "No comment shared."}</p>
                </div>
              </Card>
            )) : (
              <Card className="border-dashed border-border/80 p-8 text-center">
                <p className="text-sm font-semibold text-foreground">No feedback yet</p>
                <p className="mt-1 text-xs text-slate-500">Visitor feedback will appear here once visitors review this expo profile.</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Documents</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Upload PDF brochures, certificates, product sheets, and sales material for this workspace.</p>
            </div>
            {expoEnded ? (
              <span className="rounded-full border border-border/80 bg-elevated px-3 py-2 text-xs font-semibold text-slate-500">Document uploads closed after expo end date</span>
            ) : (
              <Button type="button" onClick={() => setDocumentDialogOpen(true)}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Document
              </Button>
            )}
          </div>
          <div className="space-y-3 md:hidden">
            {documents.length ? documents.map((document) => (
              <Card key={document.id} className="border-border/80 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{document.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatFileSize(document.size)} · Uploaded {new Date(document.uploadedAt).toLocaleDateString()}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">PDF</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <a
                    href={mediaUrl(document.url)}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                  >
                    <DownloadIcon className="mr-2 h-4 w-4" />
                    Download
                  </a>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    disabled={documentDeleteMutation.isPending}
                    onClick={() => documentDeleteMutation.mutate(document)}
                  >
                    <TrashIcon className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </Card>
            )) : (
              <Card className="border-dashed border-border/80 p-6 text-center shadow-sm">
                <p className="font-semibold text-foreground">No documents uploaded</p>
                <p className="mt-1 text-sm text-slate-500">Add your first PDF document for this expo workspace.</p>
              </Card>
            )}
          </div>

          <div className="hidden md:block">
            <DataTable<ExpoDocument>
              columns={[
                {
                  key: "name",
                  header: "Document",
                  sortable: true,
                  sortValue: (document) => document.name,
                  render: (document) => (
                    <div>
                      <p className="font-semibold text-foreground">{document.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatFileSize(document.size)} · Uploaded {new Date(document.uploadedAt).toLocaleDateString()}</p>
                    </div>
                  )
                },
                {
                  key: "download",
                  header: "Download",
                  className: "text-center",
                  render: (document) => (
                    <a
                      href={mediaUrl(document.url)}
                      download
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Download ${document.name}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-slate-600 shadow-sm transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    >
                      <DownloadIcon className="h-4 w-4" />
                    </a>
                  )
                },
                {
                  key: "actions",
                  header: "Actions",
                  className: "text-right",
                  render: (document) => (
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      disabled={documentDeleteMutation.isPending}
                      onClick={() => documentDeleteMutation.mutate(document)}
                    >
                      <TrashIcon className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  )
                }
              ]}
              rows={documents}
              emptyTitle="No documents uploaded"
              emptyDescription="Add your first PDF document for this expo workspace."
            />
          </div>

          {documentDialogOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="expo-document-dialog-title" onClick={() => !documentMutation.isPending && setDocumentDialogOpen(false)}>
              <form
                onSubmit={handleDocumentSubmit}
                className="w-full max-w-xl overflow-hidden rounded-2xl border border-border/80 bg-card shadow-shell"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="border-b border-border/70 bg-elevated/70 px-6 py-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary/80">Workspace Documents</p>
                  <h2 id="expo-document-dialog-title" className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Add Document</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Upload one PDF at a time. Use a clear name for quick access later.</p>
                </div>
                <div className="space-y-4 px-6 py-6">
                  <div className="space-y-2">
                    <label htmlFor="expo-document-name" className="text-sm font-semibold text-foreground">Document Name</label>
                    <Input
                      id="expo-document-name"
                      required
                      autoFocus
                      minLength={2}
                      maxLength={140}
                      placeholder="Product brochure"
                      value={documentForm.name}
                      onChange={(event) => setDocumentForm((current) => ({ ...current, name: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="expo-document-file" className="text-sm font-semibold text-foreground">PDF File</label>
                    <input
                      id="expo-document-file"
                      required
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(event) => setDocumentForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
                      className="block w-full rounded-xl border border-dashed border-border/80 bg-elevated px-4 py-5 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-primary/40"
                    />
                    <p className="text-xs leading-5 text-slate-500">{documentForm.file ? `${documentForm.file.name} · ${formatFileSize(documentForm.file.size)}` : "Only PDF files are accepted."}</p>
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-3 border-t border-border/70 bg-background/70 px-6 py-5 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" disabled={documentMutation.isPending} onClick={() => setDocumentDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={documentMutation.isPending}>{documentMutation.isPending ? "Uploading..." : "Upload Document"}</Button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
        </main>
      </div>
    </div>
  )
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB"
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString()} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function parseMoneyValue(value: string) {
  const number = Number(String(value).replace(/,/g, ""))
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0
}

function buildROIEstimatePayload(form: { estimatedSpend: string; booth: string; travel: string; staffing: string; marketing: string; other: string; notes: string }, currency: string): ROIEstimate | null {
  const breakdown = {
    booth: parseMoneyValue(form.booth),
    travel: parseMoneyValue(form.travel),
    staffing: parseMoneyValue(form.staffing),
    marketing: parseMoneyValue(form.marketing),
    other: parseMoneyValue(form.other)
  }
  const breakdownTotal = Object.values(breakdown).reduce((sum, value) => sum + value, 0)
  const estimatedSpend = parseMoneyValue(form.estimatedSpend) || breakdownTotal
  const notes = form.notes.trim()
  if (estimatedSpend <= 0 && breakdownTotal <= 0 && !notes) return null
  return { estimatedSpend, currency, breakdown, notes }
}

async function validateAdBannerFile(file: File) {
  if (!["image/png", "image/jpeg"].includes(file.type)) {
    throw new Error("Upload a PNG or JPG ad banner.")
  }
  if (file.size > AD_BANNER_MAX_SIZE_BYTES) {
    throw new Error(`Ad banner must be ${formatFileSize(AD_BANNER_MAX_SIZE_BYTES)} or smaller.`)
  }
  const dimensions = await imageDimensions(file)
  if (dimensions.width !== AD_BANNER_WIDTH || dimensions.height !== AD_BANNER_HEIGHT) {
    throw new Error(`Ad banner must be exactly ${AD_BANNER_WIDTH} x ${AD_BANNER_HEIGHT} px.`)
  }
}

function imageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: image.naturalWidth, height: image.naturalHeight })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Could not read image dimensions."))
    }
    image.src = url
  })
}

function ROIAmountInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder="0" inputMode="numeric" />
    </label>
  )
}

function showcaseKey(product: Product) {
  return `${product.name.trim().toLowerCase()}|${product.category.trim().toLowerCase()}`
}

function ProductThumb({ product, size = "default" }: { product: Product; size?: "default" | "large" }) {
  const src = mediaUrl(product.images?.[0] || product.mediaUrl)
  return (
    <div className={cn("shrink-0 overflow-hidden rounded-xl border border-border/70 bg-elevated", size === "large" ? "h-20 w-20" : "h-12 w-12")}>
      {src ? <img src={src} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400">{product.name.slice(0, 1).toUpperCase()}</div>}
    </div>
  )
}

function ProductPrice({ product }: { product: Product }) {
  const discountedPrice = Number(product.discountedPrice || 0)
  const hasDiscount = discountedPrice > 0 && discountedPrice < product.price
  return (
    <div className="space-y-1">
      <p className={cn("font-mono text-sm font-semibold", hasDiscount ? "text-slate-400 line-through" : "text-foreground")}>{formatCurrency(product.price, product.currency)}</p>
      {hasDiscount ? <p className="font-mono text-sm font-semibold text-primary">{formatCurrency(discountedPrice, product.currency)}</p> : null}
    </div>
  )
}

function isAfterExpoEndDate(value?: string) {
  if (!value) return false
  const end = new Date(value)
  if (Number.isNaN(end.getTime())) return false
  const today = new Date()
  const todayKey = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const endKey = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()
  return endKey < todayKey
}

function OverviewMetricCard({
  label,
  value,
  detail,
  action,
  onClick,
  tone = "default"
}: {
  label: string
  value: string
  detail: string
  action: string
  onClick: () => void
  tone?: "default" | "warning"
}) {
  return (
    <Card className={cn("border-border/80 p-5 shadow-sm", tone === "warning" && "border-amber-200 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/8")}>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
      <button type="button" onClick={onClick} className="mt-3 text-sm font-semibold text-primary">{action}</button>
    </Card>
  )
}

function ConversionLine({ label, value, suffix = "%" }: { label: string; value: number; suffix?: string }) {
  const safeValue = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-mono text-slate-500">{value}{suffix}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-elevated">
        <div className="h-full rounded-full bg-primary" style={{ width: safeValue ? `${Math.max(4, safeValue)}%` : "0%" }} />
      </div>
    </div>
  )
}

function ActionSignal({ label, value, helper, onClick }: { label: string; value: number; helper: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full rounded-2xl border border-border/70 bg-card p-3 text-left transition hover:border-primary/30 hover:bg-primary/5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="font-mono text-sm font-semibold text-primary">{value.toLocaleString()}</span>
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
    </button>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-elevated/65 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

function AnalyticsMetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="border-border/80 p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </Card>
  )
}

function AnalyticsValueBarCard({
  title,
  description,
  items,
  maxValue,
  currency
}: {
  title: string
  description: string
  items: Array<{ label: string; value: number }>
  maxValue: number
  currency: string
}) {
  return (
    <Card className="border-border/80 p-5 shadow-sm">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      <div className="mt-5 space-y-4">
        {items.length ? items.map((item) => (
          <div key={item.label}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-medium capitalize text-slate-600">{item.label}</span>
              <span className="font-mono text-slate-500">{formatCurrency(item.value, currency)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-elevated">
              <div className="h-full rounded-full bg-primary" style={{ width: item.value ? `${Math.max(4, (item.value / Math.max(maxValue, 1)) * 100)}%` : "0%" }} />
            </div>
          </div>
        )) : (
          <div className="rounded-2xl border border-dashed border-border/80 p-5 text-center text-sm text-slate-500">No pipeline value yet.</div>
        )}
      </div>
    </Card>
  )
}

function AnalyticsBarCard({
  title,
  description,
  items,
  maxValue,
  tone = "default"
}: {
  title: string
  description: string
  items: Array<{ label: string; value: number }>
  maxValue: number
  tone?: "default" | "temperature"
}) {
  const toneClass = (label: string) => {
    if (tone !== "temperature") return "bg-primary"
    const lower = label.toLowerCase()
    if (lower === "hot") return "bg-rose-500"
    if (lower === "warm") return "bg-amber-500"
    if (lower === "cold") return "bg-sky-500"
    return "bg-primary"
  }

  return (
    <Card className="border-border/80 p-5 shadow-sm">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-medium capitalize text-slate-600">{item.label}</span>
              <span className="font-mono text-slate-500">{item.value.toLocaleString()}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-elevated">
              <div
                className={cn("h-full rounded-full", toneClass(item.label))}
                style={{ width: item.value ? `${Math.max(4, (item.value / Math.max(maxValue, 1)) * 100)}%` : "0%" }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function TemperatureBadge({ value }: { value?: Lead["temperature"] | string | null }) {
  const temperature = value === "hot" || value === "cold" || value === "warm" ? value : "warm"
  const styles: Record<"hot" | "warm" | "cold", string> = {
    hot: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/12 dark:text-rose-300 dark:ring-rose-500/20",
    warm: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/12 dark:text-amber-300 dark:ring-amber-500/20",
    cold: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/12 dark:text-sky-300 dark:ring-sky-500/20"
  }
  const dots: Record<"hot" | "warm" | "cold", string> = {
    hot: "bg-rose-500 dark:bg-rose-400",
    warm: "bg-amber-500 dark:bg-amber-400",
    cold: "bg-sky-500 dark:bg-sky-400"
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1", styles[temperature])}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dots[temperature])} />
      {temperature}
    </span>
  )
}

function MobilePagination({ page, pageSize, total, onPageChange }: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void }) {
  if (total <= pageSize) return null
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-card px-3 py-2 text-sm md:hidden">
      <span className="text-xs font-semibold text-slate-500">Page {page} of {pageCount}</span>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>Previous</Button>
        <Button type="button" variant="secondary" disabled={page >= pageCount} onClick={() => onPageChange(Math.min(pageCount, page + 1))}>Next</Button>
      </div>
    </div>
  )
}

function preOrderStatusLabel(status: PreOrder["status"]) {
  return PRE_ORDER_STATUSES.find((item) => item.value === status)?.label || status
}

function preOrderStatusBadgeValue(status: PreOrder["status"]) {
  if (status === "delivered") return "completed"
  if (status === "cancelled") return "cancelled"
  if (status === "pending") return "pending"
  return "active"
}

function toCSV(rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return ""
  const headers = Object.keys(rows[0])
  const escape = (value: string | number) => `"${String(value ?? "").replace(/"/g, '""')}"`
  return [headers.map(escape).join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n")
}

function toExcelTable(rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return ""
  const headers = Object.keys(rows[0])
  const cell = (value: string | number) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  return `<table><thead><tr>${headers.map((header) => `<th>${cell(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((header) => `<td>${cell(row[header])}</td>`).join("")}</tr>`).join("")}</tbody></table>`
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function safeTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone }).format(new Date())
    return timeZone
  } catch {
    return "UTC"
  }
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date)
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0)
  const hour = value("hour")
  const asUTC = Date.UTC(value("year"), value("month") - 1, value("day"), hour === 24 ? 0 : hour, value("minute"), value("second"))
  return asUTC - date.getTime()
}

function zonedDateTimeToUtcISO(value: string, timeZone: string) {
  const [datePart, timePart = "00:00"] = value.split("T")
  const [year, month, day] = datePart.split("-").map(Number)
  const [hour, minute] = timePart.split(":").map(Number)
  if (![year, month, day, hour, minute].every(Number.isFinite)) return ""
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute)
  let corrected = utcGuess - timeZoneOffsetMs(new Date(utcGuess), timeZone)
  corrected = utcGuess - timeZoneOffsetMs(new Date(corrected), timeZone)
  return new Date(corrected).toISOString()
}

function dateTimeLocalFromISO(value: string, timeZone: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date)
  const part = (type: string) => parts.find((item) => item.type === type)?.value || ""
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour") === "24" ? "00" : part("hour")}:${part("minute")}`
}

function dateKeyInTimeZone(value: string, timeZone: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date)
  const part = (type: string) => parts.find((item) => item.type === type)?.value || ""
  return `${part("year")}-${part("month")}-${part("day")}`
}

function dateInputFromExpoDate(value: string, timeZone: string) {
  if (!value) return ""
  const dateOnly = value.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly
  return dateKeyInTimeZone(value, timeZone)
}

function buildExpoDayKeys(startDate: string, endDate: string, timeZone: string) {
  const start = dateInputFromExpoDate(startDate, timeZone)
  const end = dateInputFromExpoDate(endDate, timeZone)
  if (!start || !end) return []
  const startMs = Date.UTC(Number(start.slice(0, 4)), Number(start.slice(5, 7)) - 1, Number(start.slice(8, 10)))
  const endMs = Date.UTC(Number(end.slice(0, 4)), Number(end.slice(5, 7)) - 1, Number(end.slice(8, 10)))
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return [start]
  const totalDays = Math.min(31, Math.floor((endMs - startMs) / (24 * 60 * 60 * 1000)) + 1)
  return Array.from({ length: totalDays }, (_, index) => addDaysToDateInput(start, index))
}

function addDaysToDateInput(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return date.toISOString().slice(0, 10)
}

function localDateInputValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function startOfWeekDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return addDaysToDateInput(value, -date.getUTCDay())
}

function formatDateInputLabel(value: string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  const [year, month, day] = value.split("-").map(Number)
  return new Intl.DateTimeFormat(undefined, { timeZone: safeTimeZone(timeZone), ...options }).format(new Date(Date.UTC(year, month - 1, day, 12)))
}

function formatMeetingDateTime(value: string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(undefined, { timeZone: safeTimeZone(timeZone), ...options }).format(new Date(value))
}

function MeetingCard({ meeting, timeZone, compact = false, onClick }: { meeting: CalendarInvite; timeZone: string; compact?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border border-primary/10 bg-primary/[0.035] p-3 text-left transition hover:border-primary/30 hover:bg-primary/[0.06] focus:outline-none focus:ring-4 focus:ring-primary/10",
        compact && "bg-card"
      )}
    >
      <p className="text-[12px] font-semibold leading-4 text-foreground">{meeting.title || "Visitor meeting"}</p>
      <p className="mt-1 text-[11px] leading-4 text-slate-500">{meeting.visitorName || meeting.visitorEmail || "Visitor"}</p>
      <p className="mt-3 text-[11px] font-semibold leading-4 text-primary">
        {formatMeetingDateTime(meeting.scheduledAt, timeZone, { month: "short", day: "numeric", year: compact ? undefined : "numeric" })} · {formatMeetingDateTime(meeting.scheduledAt, timeZone, { hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}
      </p>
    </button>
  )
}

function MeetingDetailsDialog({ meeting, timeZone, deleting, onClose, onDelete }: { meeting: CalendarInvite; timeZone: string; deleting: boolean; onClose: () => void; onDelete: () => void }) {
  const canJoin = Boolean(meeting.locationOrLink)
  const [confirmDelete, setConfirmDelete] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={() => !deleting && onClose()}>
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-border/70 bg-elevated/70 px-6 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/80">Meeting details</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{meeting.title || "Visitor meeting"}</h3>
          <p className="mt-2 text-sm font-semibold text-primary">
            {formatMeetingDateTime(meeting.scheduledAt, timeZone, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · {formatMeetingDateTime(meeting.scheduledAt, timeZone, { hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}
          </p>
        </div>
        <div className="space-y-4 px-6 py-6">
          <MeetingInfoRow label="Visitor" value={meeting.visitorName || "Not provided"} />
          <MeetingInfoRow label="Email" value={meeting.visitorEmail || "Not provided"} />
          <MeetingInfoRow label="Phone" value={meeting.visitorPhone || "Not provided"} />
          <MeetingInfoRow label="Category" value={meeting.meetingType || "Meeting"} />
          {meeting.ccEmails?.length ? <MeetingInfoRow label="CC" value={meeting.ccEmails.join(", ")} /> : null}
          <div className="rounded-2xl border border-border/70 bg-elevated/60 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Meeting Link</p>
            {meeting.locationOrLink ? (
              <a href={meeting.locationOrLink} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm font-semibold text-primary hover:underline">
                {meeting.locationOrLink}
              </a>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No meeting link has been added.</p>
            )}
          </div>
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-border/70 bg-background/70 px-6 py-5 sm:flex-row sm:justify-between">
          <Button type="button" variant="danger" disabled={deleting} onClick={() => setConfirmDelete(true)}>Delete</Button>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" disabled={deleting} onClick={onClose}>Close</Button>
            <Button type="button" disabled={!canJoin} onClick={() => meeting.locationOrLink && window.open(meeting.locationOrLink, "_blank", "noopener,noreferrer")}>Join Meeting</Button>
          </div>
        </div>
      </div>
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={() => !deleting && setConfirmDelete(false)}>
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="px-6 py-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-500">Delete meeting</p>
              <h4 className="mt-2 text-xl font-semibold tracking-tight text-foreground">Delete this meeting?</h4>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                This will remove {meeting.title || "this visitor meeting"} from the expo calendar. This action cannot be undone.
              </p>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-border/70 bg-background/70 px-6 py-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" disabled={deleting} onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button type="button" variant="danger" disabled={deleting} onClick={onDelete}>{deleting ? "Deleting..." : "Delete Meeting"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MeetingInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-2xl border border-border/60 bg-card px-4 py-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="min-w-0 break-words text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

function RichNotesEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const editorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  function format(command: "bold" | "italic" | "insertUnorderedList") {
    document.execCommand(command)
    onChange(editorRef.current?.innerHTML || "")
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-foreground">Internal notes</label>
      <div className="flex gap-2">
        <button type="button" onClick={() => format("bold")} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold">B</button>
        <button type="button" onClick={() => format("italic")} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold italic">I</button>
        <button type="button" onClick={() => format("insertUnorderedList")} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">List</button>
      </div>
      <div
        ref={editorRef}
        role="textbox"
        aria-label="Internal meeting notes"
        contentEditable
        onInput={() => onChange(editorRef.current?.innerHTML || "")}
        className="min-h-28 rounded-xl border border-input bg-background px-3 py-3 text-sm leading-6 outline-none focus:border-primary"
        data-placeholder="Add internal context, agenda points, or follow-up notes"
      />
    </div>
  )
}
