import {
  AdCampaign,
  AIAnalysis,
  AIAnalyticsSummary,
  AdRecord,
  AdminAdStatus,
  AdminSettlementStatus,
  AdminUserPayload,
  AdministratorOverviewResponse,
  ApiDriver,
  AuditLogRecord,
  AuthResponse,
  AvailableExpo,
  VisitorExpo,
  CalendarInvite,
  CategoryRecord,
  ChatMessage,
  ChatMessagePayload,
  CheckoutPaymentMethod,
  CompanyDocument,
  CompanyDocumentPayload,
  CountryRecord,
  EmailSettings,
  ExhibitorCampaignDraft,
  ExhibitorCampaignDraftPayload,
  ExhibitorConversationThread,
  ExhibitorFeedback,
  ExhibitorLiveStream,
  ExhibitorLiveStreamPayload,
  ExhibitorOverviewResponse,
  ExhibitorPaymentRecord,
  ExhibitorProfile,
  ExhibitorProfilePayload,
  ExhibitorRecord,
  ExhibitorTeamMember,
  ExhibitorTeamMemberPayload,
  ExpoExhibitorAssignment,
  ExpoDocument,
  ExpoAnalyticsResponse,
  ExpoPayload,
  ExpoRecord,
  ExpoStatus,
  ExpoVisitor,
  Lead,
  LeadActivityPayload,
  LeadActivityRecord,
  LeadCreatePayload,
  LeadMessagePayload,
  LeadUpdatePayload,
  MeetingSettings,
  MediaUpload,
  MyExpoRegistration,
  NotificationRecord,
  OrganizerFeedback,
  OrganizerFeedbackPayload,
  OrganizerFeedbackSubmission,
  OrganizerExhibitorInvitePayload,
  OrganizerOverviewResponse,
  OrganizerPaymentRecord,
  OrganizerProfile,
  OrganizerProfilePayload,
  OrganizerReportsResponse,
  OpenAISettings,
  OrganizerSettlementRecord,
  OrganizerSponsor,
  OrganizerSponsorPayload,
  OrganizerTeamMember,
  OrganizerTeamMemberPayload,
  OrganizerRecord,
  AdministratorReportsResponse,
  PaymentReceipt,
  PaymentRecord,
  PreOrder,
  GoogleSettings,
  PaystackSettings,
  PaystackPaymentChannel,
  Product,
  ProductPayload,
  Reminder,
  ResourceCollection,
  ROIEstimate,
  SessionResponse,
  SettlementRecord,
  SmsSettings,
  SponsorAccountRecord,
  SponsorPlan,
  SponsorPlanPayload,
  SponsorRecord,
  SponsorCampaign,
  SponsorAd,
  SponsorPayment,
  SponsorDashboardStats,
  VisitorRecord,
  VisitorDashboardStats,
  VisitorFavorite,
  VisitorExpoActionPayload,
  VisitorTimelineDay,
  VisitorCalendarItem,
  VisitorMessage,
  VisitorFeedback,
  VisitorPreOrder,
  VisitorSettings,
  WhatsappSettings,
  UserRecord
} from "@/lib/api/contracts"
import { httpOnlySessionToken } from "@/lib/auth/session-token"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"

function countryQuery(countryCode?: string) {
  return countryCode && countryCode !== "ALL" ? `?country=${encodeURIComponent(countryCode)}` : ""
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
 const headers = new Headers(init?.headers)
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData
  const authorization = headers.get("Authorization")
  const useCookieProxy = authorization === `Bearer ${httpOnlySessionToken}`
  const useBrowserProxy = typeof window !== "undefined"
  const useProxy = useCookieProxy || useBrowserProxy
  if (useCookieProxy) {
    headers.delete("Authorization")
  }

  const response = await fetch(`${useProxy ? "" : API_BASE_URL}${useProxy ? `/api/backend${path}` : path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...Object.fromEntries(headers.entries())
    },
    cache: "no-store"
  })

  if (!response.ok) {
    throw new Error(await errorMessage(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return sanitizeProtectedPII(await response.json()) as T
}

async function requestBlob(path: string, init?: RequestInit): Promise<Blob> {
  const headers = new Headers(init?.headers)
  const authorization = headers.get("Authorization")
  const useCookieProxy = authorization === `Bearer ${httpOnlySessionToken}`
  const useBrowserProxy = typeof window !== "undefined"
  const useProxy = useCookieProxy || useBrowserProxy
  if (useCookieProxy) headers.delete("Authorization")
  const response = await fetch(`${useProxy ? "" : API_BASE_URL}${useProxy ? `/api/backend${path}` : path}`, {
    ...init,
    headers: Object.fromEntries(headers.entries()),
    cache: "no-store"
  })
  if (!response.ok) {
    throw new Error(await errorMessage(response))
  }
  return response.blob()
}

async function errorMessage(response: Response) {
  const fallback = "Request failed. Please try again."
  const text = await response.text()
  if (!text) return fallback
  try {
    const payload = JSON.parse(text) as { message?: string; error?: string }
    return payload.message || payload.error || fallback
  } catch {
    return text
  }
}

function sanitizeProtectedPII(value: unknown): unknown {
  if (typeof value === "string") {
    return /^pii:[a-f0-9]+$/i.test(value.trim()) ? "" : value
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeProtectedPII(item))
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeProtectedPII(item)])
    )
  }
  return value
}

type ItemsEnvelope<T> = { items: T[] }

async function requestItems<T>(path: string, init?: RequestInit): Promise<T[]> {
  const payload = await request<T[] | ItemsEnvelope<T>>(path, init)
  return Array.isArray(payload) ? payload : payload.items
}

export const httpApi: ApiDriver = {
  login(email, password): Promise<AuthResponse> {
    return request("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) })
  },
  getCurrentUser(token): Promise<SessionResponse> {
    return request("/api/v1/auth/me", { headers: { Authorization: `Bearer ${token}` } })
  },
  logout(): Promise<{ success: boolean }> {
    return request("/api/v1/auth/logout", { method: "POST" })
  },
  getCountries(): Promise<ResourceCollection<CountryRecord>> {
    return request("/api/v1/platform/countries")
  },
  getAdminCountries(token): Promise<ResourceCollection<CountryRecord>> {
    return request("/api/v1/admin/countries", { headers: { Authorization: `Bearer ${token}` } })
  },
  createAdminCountry(token, data): Promise<CountryRecord> {
    return request("/api/v1/admin/countries", { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  updateAdminCountryStatus(token, code, active): Promise<CountryRecord> {
    return request(`/api/v1/admin/countries/${encodeURIComponent(code)}/status`, { method: "PATCH", body: JSON.stringify({ active }), headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminCategories(token): Promise<ResourceCollection<CategoryRecord>> {
    return request("/api/v1/admin/categories", { headers: { Authorization: `Bearer ${token}` } })
  },
  createAdminCategory(token, data): Promise<CategoryRecord> {
    return request("/api/v1/admin/categories", { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  updateAdminCategoryStatus(token, id, active): Promise<CategoryRecord> {
    return request(`/api/v1/admin/categories/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ active }), headers: { Authorization: `Bearer ${token}` } })
  },
  getAdministratorOverview(token, countryCode): Promise<AdministratorOverviewResponse> {
    return request(`/api/v1/admin/overview${countryQuery(countryCode)}`, { headers: { Authorization: `Bearer ${token}` } })
  },
  getAdministratorReports(token, countryCode): Promise<AdministratorReportsResponse> {
    return request(`/api/v1/admin/reports${countryQuery(countryCode)}`, { headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminReportsAISummary(token, countryCode): Promise<AIAnalyticsSummary> {
    return request(`/api/v1/admin/reports/ai-summary${countryQuery(countryCode)}`, { headers: { Authorization: `Bearer ${token}` } })
  },
  generateAdminReportsAISummary(token, countryCode): Promise<AIAnalyticsSummary> {
    return request(`/api/v1/admin/reports/ai-summary${countryQuery(countryCode)}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminVisitors(token, countryCode): Promise<ResourceCollection<VisitorRecord>> {
    return request(`/api/v1/admin/visitors${countryQuery(countryCode)}`, { headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminOrganizers(token, countryCode): Promise<ResourceCollection<OrganizerRecord>> {
    return request(`/api/v1/admin/organizers${countryQuery(countryCode)}`, { headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminExhibitors(token, countryCode): Promise<ResourceCollection<ExhibitorRecord>> {
    return request(`/api/v1/admin/exhibitors${countryQuery(countryCode)}`, { headers: { Authorization: `Bearer ${token}` } })
  },
  createAdminOrganizer(token, data: AdminUserPayload): Promise<UserRecord> {
    return request("/api/v1/admin/organizers", { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  createAdminExhibitor(token, data: AdminUserPayload): Promise<UserRecord> {
    return request("/api/v1/admin/exhibitors", { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  updateAdminExhibitor(token, id, data: AdminUserPayload): Promise<UserRecord> {
    return request(`/api/v1/admin/exhibitors/${id}`, { method: "PATCH", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  assignAdminExhibitor(token, data): Promise<ExpoExhibitorAssignment> {
    return request("/api/v1/admin/exhibitor-assignments", { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminSponsors(token, countryCode): Promise<ResourceCollection<SponsorRecord>> {
    return request(`/api/v1/admin/sponsors${countryQuery(countryCode)}`, { headers: { Authorization: `Bearer ${token}` } })
  },
  createAdminSponsor(token, data: AdminUserPayload): Promise<UserRecord> {
    return request("/api/v1/admin/sponsors", { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  updateAdminSponsor(token, id, data: AdminUserPayload): Promise<UserRecord> {
    return request(`/api/v1/admin/sponsors/${id}`, { method: "PATCH", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminExpos(token, countryCode): Promise<ResourceCollection<ExpoRecord>> {
    return request(`/api/v1/admin/expos${countryQuery(countryCode)}`, { headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminExpo(token, id): Promise<ExpoRecord> {
    return request(`/api/v1/admin/expos/${id}`, { headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminExpoExhibitors(token, id): Promise<ResourceCollection<ExhibitorRecord>> {
    return request(`/api/v1/admin/expos/${id}/exhibitors`, { headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminExpoVisitors(token, id): Promise<ResourceCollection<VisitorRecord>> {
    return request(`/api/v1/admin/expos/${id}/visitors`, { headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminExpoPayments(token, id): Promise<ResourceCollection<PaymentRecord>> {
    return request(`/api/v1/admin/expos/${id}/payments`, { headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminExpoAnalytics(token, id): Promise<ExpoAnalyticsResponse> {
    return request(`/api/v1/admin/expos/${id}/analytics`, { headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminExpoAds(token, id): Promise<ResourceCollection<AdRecord>> {
    return request(`/api/v1/admin/expos/${id}/ads`, { headers: { Authorization: `Bearer ${token}` } })
  },
  createAdminExpo(token, data: ExpoPayload): Promise<ExpoRecord> {
    return request("/api/v1/admin/expos", { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  updateAdminExpo(token, id, data: ExpoPayload): Promise<ExpoRecord> {
    return request(`/api/v1/admin/expos/${id}`, { method: "PATCH", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  updateAdminExpoStatus(token, id, status: ExpoStatus, note?: string): Promise<ExpoRecord> {
    return request(`/api/v1/admin/expos/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, note }), headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminPayments(token, countryCode): Promise<ResourceCollection<PaymentRecord>> {
    return request(`/api/v1/admin/payments${countryQuery(countryCode)}`, { headers: { Authorization: `Bearer ${token}` } })
  },
  updateAdminPaymentStatus(token, id, status, reason): Promise<PaymentRecord> {
    return request(`/api/v1/admin/payments/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, reason }), headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminAds(token, countryCode): Promise<ResourceCollection<AdRecord>> {
    return request(`/api/v1/admin/ads${countryQuery(countryCode)}`, { headers: { Authorization: `Bearer ${token}` } })
  },
  updateAdminAdStatus(token, id, status: AdminAdStatus, note?: string): Promise<AdRecord> {
    return request(`/api/v1/admin/ads/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, note }), headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminNotifications(token): Promise<ResourceCollection<NotificationRecord>> {
    return request("/api/v1/admin/notifications", { headers: { Authorization: `Bearer ${token}` } })
  },
  getMyNotifications(token): Promise<ResourceCollection<NotificationRecord>> {
    return request("/api/v1/notifications", { headers: { Authorization: `Bearer ${token}` } })
  },
  markNotificationRead(token, id): Promise<{ status: string }> {
    return request(`/api/v1/notifications/${id}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } })
  },
  markAllNotificationsRead(token): Promise<{ status: string; count: number }> {
    return request("/api/v1/notifications/read-all", { method: "PATCH", headers: { Authorization: `Bearer ${token}` } })
  },
  clearNotification(token, id): Promise<{ status: string }> {
    return request(`/api/v1/notifications/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
  },
  retryAdminNotification(token, id): Promise<{ status: string }> {
    return request(`/api/v1/admin/notifications/${id}/retry`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
  },
  testAdminNotification(token, data): Promise<{ status: string }> {
    return request("/api/v1/admin/notifications/test-send", { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminSettlements(token, countryCode): Promise<ResourceCollection<SettlementRecord>> {
    return request(`/api/v1/admin/settlements${countryQuery(countryCode)}`, { headers: { Authorization: `Bearer ${token}` } })
  },
  updateAdminSettlementStatus(token, id, status: AdminSettlementStatus, note?: string): Promise<{ id: string; status: string }> {
    return request(`/api/v1/admin/settlements/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, note }), headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminUsers(token): Promise<ResourceCollection<UserRecord>> {
    return request("/api/v1/admin/users", { headers: { Authorization: `Bearer ${token}` } })
  },
  createAdminUser(token, data: AdminUserPayload): Promise<UserRecord> {
    return request("/api/v1/admin/users", { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  updateAdminUser(token, id, data: AdminUserPayload): Promise<UserRecord> {
    return request(`/api/v1/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  deleteAdminUser(token, id): Promise<void> {
    return request(`/api/v1/admin/users/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
  },
  async getAdminAuditLogs(token): Promise<ResourceCollection<AuditLogRecord>> {
    const payload = await request<ResourceCollection<any>>("/api/v1/admin/audit-logs", { headers: { Authorization: `Bearer ${token}` } })
    return {
      ...payload,
      items: payload.items.map((item) => ({
        id: item.id,
        actor: item.actor || item.actorId || "System",
        actorRole: item.actorRole || "administrator",
        action: item.action || "unknown_action",
        entity: item.entity || item.entityType || "system",
        target: item.target || item.entityId || "unknown",
        ipAddress: item.ipAddress || "Not available",
        timestamp: item.timestamp || item.createdAt || ""
      }))
    }
  },
  getAdminEmailSettings(token): Promise<EmailSettings> {
    return request("/api/v1/admin/settings/email", { headers: { Authorization: `Bearer ${token}` } })
  },
  updateAdminEmailSettings(token, data: EmailSettings): Promise<EmailSettings> {
    return request("/api/v1/admin/settings/email", { method: "PATCH", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminSmsSettings(token): Promise<SmsSettings> {
    return request("/api/v1/admin/settings/sms", { headers: { Authorization: `Bearer ${token}` } })
  },
  updateAdminSmsSettings(token, data: SmsSettings): Promise<SmsSettings> {
    return request("/api/v1/admin/settings/sms", { method: "PATCH", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminPaystackSettings(token): Promise<PaystackSettings> {
    return request("/api/v1/admin/settings/paystack", { headers: { Authorization: `Bearer ${token}` } })
  },
  updateAdminPaystackSettings(token, data: PaystackSettings): Promise<PaystackSettings> {
    return request("/api/v1/admin/settings/paystack", { method: "PATCH", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminGoogleSettings(token): Promise<GoogleSettings> {
    return request("/api/v1/admin/settings/google", { headers: { Authorization: `Bearer ${token}` } })
  },
  updateAdminGoogleSettings(token, data: GoogleSettings): Promise<GoogleSettings> {
    return request("/api/v1/admin/settings/google", { method: "PATCH", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminMeetingSettings(token): Promise<MeetingSettings> {
    return request("/api/v1/admin/settings/meeting-categories", { headers: { Authorization: `Bearer ${token}` } })
  },
  updateAdminMeetingSettings(token, data: MeetingSettings): Promise<MeetingSettings> {
    return request("/api/v1/admin/settings/meeting-categories", { method: "PATCH", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminOpenAISettings(token): Promise<OpenAISettings> {
    return request("/api/v1/admin/settings/openai", { headers: { Authorization: `Bearer ${token}` } })
  },
  updateAdminOpenAISettings(token, data: OpenAISettings): Promise<OpenAISettings> {
    return request("/api/v1/admin/settings/openai", { method: "PATCH", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  testAdminOpenAISettings(token): Promise<{ status: string }> {
    return request("/api/v1/admin/settings/openai/test", { method: "POST", headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminWhatsappSettings(token): Promise<WhatsappSettings> {
    return request("/api/v1/admin/settings/whatsapp", { headers: { Authorization: `Bearer ${token}` } })
  },
  updateAdminWhatsappSettings(token, data: WhatsappSettings): Promise<WhatsappSettings> {
    return request("/api/v1/admin/settings/whatsapp", { method: "PATCH", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminSponsorPlans(token, countryCode): Promise<SponsorPlan[]> {
    return requestItems(`/api/v1/admin/sponsor-plans${countryQuery(countryCode)}`, { headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminSponsorPlan(token, id): Promise<SponsorPlan> {
    return request(`/api/v1/admin/sponsor-plans/${id}`, { headers: { Authorization: `Bearer ${token}` } })
  },
  createAdminSponsorPlan(token, data: SponsorPlanPayload): Promise<SponsorPlan> {
    return request("/api/v1/admin/sponsor-plans", { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  updateAdminSponsorPlan(token, id, data: Partial<SponsorPlanPayload>): Promise<SponsorPlan> {
    return request(`/api/v1/admin/sponsor-plans/${id}`, { method: "PATCH", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  updateAdminSponsorPlanStatus(token, id, status: SponsorPlan["status"], note?: string): Promise<SponsorPlan> {
    return request(`/api/v1/admin/sponsor-plans/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, note }), headers: { Authorization: `Bearer ${token}` } })
  },
  getAdminSponsorAccounts(token): Promise<ResourceCollection<SponsorAccountRecord>> {
    return request("/api/v1/admin/sponsor-accounts", { headers: { Authorization: `Bearer ${token}` } })
  },
  getOrganizerOverview(token): Promise<OrganizerOverviewResponse> {
    return request("/api/v1/organizer/overview", { headers: { Authorization: `Bearer ${token}` } })
  },
  getOrganizerExpos(token): Promise<ResourceCollection<ExpoRecord>> {
    return request("/api/v1/organizer/expos", { headers: { Authorization: `Bearer ${token}` } })
  },
  getOrganizerExpo(token, id): Promise<ExpoRecord> {
    return request(`/api/v1/organizer/expos/${id}`, { headers: { Authorization: `Bearer ${token}` } })
  },
  createOrganizerExpo(token, data: ExpoPayload): Promise<ExpoRecord> {
    return request("/api/v1/organizer/expos", { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  updateOrganizerExpo(token, id, data: ExpoPayload): Promise<ExpoRecord> {
    return request(`/api/v1/organizer/expos/${id}`, { method: "PATCH", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  submitOrganizerExpo(token, id): Promise<ExpoRecord> {
    return request(`/api/v1/organizer/expos/${id}/submit`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
  },
  getCategories(token?: string) {
    return request("/api/v1/categories", { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
  },
  getMeetingCategories(): Promise<MeetingSettings> {
    return request("/api/v1/meeting-categories")
  },
  getExhibitorMeetingCategories(token): Promise<MeetingSettings> {
    return request("/api/v1/exhibitor/settings/meeting-categories", { headers: { Authorization: `Bearer ${token}` } })
  },
  updateExhibitorMeetingCategories(token, data: MeetingSettings): Promise<MeetingSettings> {
    return request("/api/v1/exhibitor/settings/meeting-categories", { method: "PATCH", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  getOrganizerExhibitors(token): Promise<ResourceCollection<ExhibitorRecord>> {
    return request("/api/v1/organizer/exhibitors", { headers: { Authorization: `Bearer ${token}` } })
  },
  inviteOrganizerExhibitor(token: string, data: OrganizerExhibitorInvitePayload): Promise<UserRecord> {
    return request("/api/v1/organizer/exhibitors", { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  getOrganizerVisitors(token): Promise<ResourceCollection<VisitorRecord>> {
    return request("/api/v1/organizer/visitors", { headers: { Authorization: `Bearer ${token}` } })
  },
  getOrganizerFeedback(token): Promise<OrganizerFeedback[]> {
    return request("/api/v1/organizer/feedback", { headers: { Authorization: `Bearer ${token}` } })
  },
  getOrganizerProfile(token): Promise<OrganizerProfile> {
    return request("/api/v1/organizer/profile", { headers: { Authorization: `Bearer ${token}` } })
  },
  updateOrganizerProfile(token, data: OrganizerProfilePayload): Promise<OrganizerProfile> {
    return request("/api/v1/organizer/profile", { method: "PATCH", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  getOrganizerTeam(token): Promise<OrganizerTeamMember[]> {
    return request("/api/v1/organizer/team", { headers: { Authorization: `Bearer ${token}` } })
  },
  getOrganizerTeamMember(token, id): Promise<OrganizerTeamMember> {
    return request(`/api/v1/organizer/team/${id}`, { headers: { Authorization: `Bearer ${token}` } })
  },
  createOrganizerTeamMember(token, data: OrganizerTeamMemberPayload): Promise<OrganizerTeamMember> {
    return request("/api/v1/organizer/team", { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  updateOrganizerTeamMember(token, id, data: OrganizerTeamMemberPayload): Promise<OrganizerTeamMember> {
    return request(`/api/v1/organizer/team/${id}`, { method: "PATCH", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  deleteOrganizerTeamMember(token, id): Promise<void> {
    return request(`/api/v1/organizer/team/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
  },
  getOrganizerSponsors(token): Promise<OrganizerSponsor[]> {
    return request("/api/v1/organizer/sponsors", { headers: { Authorization: `Bearer ${token}` } })
  },
  getOrganizerSponsor(token, id): Promise<OrganizerSponsor> {
    return request(`/api/v1/organizer/sponsors/${id}`, { headers: { Authorization: `Bearer ${token}` } })
  },
  createOrganizerSponsor(token, data: OrganizerSponsorPayload): Promise<OrganizerSponsor> {
    return request("/api/v1/organizer/sponsors", { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  updateOrganizerSponsor(token, id, data: OrganizerSponsorPayload): Promise<OrganizerSponsor> {
    return request(`/api/v1/organizer/sponsors/${id}`, { method: "PATCH", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  getOrganizerPayments(token): Promise<ResourceCollection<OrganizerPaymentRecord>> {
    return request("/api/v1/organizer/payments", { headers: { Authorization: `Bearer ${token}` } })
  },
  getOrganizerPaymentReceipt(token, id): Promise<PaymentReceipt> {
    return request(`/api/v1/organizer/payments/${id}/receipt`, { headers: { Authorization: `Bearer ${token}` } })
  },
  getOrganizerSettlements(token): Promise<OrganizerSettlementRecord[]> {
    return requestItems("/api/v1/organizer/settlements", { headers: { Authorization: `Bearer ${token}` } })
  },
  getOrganizerReports(token): Promise<OrganizerReportsResponse> {
    return request("/api/v1/organizer/reports", { headers: { Authorization: `Bearer ${token}` } })
  },
  getOrganizerReportsAISummary(token): Promise<AIAnalyticsSummary> {
    return request("/api/v1/organizer/reports/ai-summary", { headers: { Authorization: `Bearer ${token}` } })
  },
  generateOrganizerReportsAISummary(token): Promise<AIAnalyticsSummary> {
    return request("/api/v1/organizer/reports/ai-summary", { method: "POST", headers: { Authorization: `Bearer ${token}` } })
  },
  getExhibitorOverview(token): Promise<ExhibitorOverviewResponse> {
    return request("/api/v1/exhibitor/overview", { headers: { Authorization: `Bearer ${token}` } })
  },
  getExhibitorPayments(token): Promise<ExhibitorPaymentRecord[]> {
    return requestItems("/api/v1/exhibitor/payments", { headers: { Authorization: `Bearer ${token}` } })
  },
  getExhibitorPaymentReceipt(token: string, id: string): Promise<PaymentReceipt> {
    return request(`/api/v1/exhibitor/payments/${id}/receipt`, { headers: { Authorization: `Bearer ${token}` } })
  },
  getExhibitorProfile(token): Promise<ExhibitorProfile> {
    return request("/api/v1/exhibitor/profile", { headers: { Authorization: `Bearer ${token}` } })
  },
  updateExhibitorProfile(token: string, data: ExhibitorProfilePayload): Promise<ExhibitorProfile> {
    return request("/api/v1/exhibitor/profile", { method: "PATCH", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  getExhibitorDocuments(token): Promise<CompanyDocument[]> {
    return request("/api/v1/exhibitor/documents", { headers: { Authorization: `Bearer ${token}` } })
  },
  createExhibitorDocument(token: string, data: CompanyDocumentPayload): Promise<CompanyDocument> {
    return request("/api/v1/exhibitor/documents", { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  deleteExhibitorDocument(token: string, id: string): Promise<void> {
    return request(`/api/v1/exhibitor/documents/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
  },
  getExhibitorTeam(token): Promise<ExhibitorTeamMember[]> {
    return request("/api/v1/exhibitor/team", { headers: { Authorization: `Bearer ${token}` } })
  },
  createExhibitorTeamMember(token: string, data: ExhibitorTeamMemberPayload): Promise<ExhibitorTeamMember> {
    return request("/api/v1/exhibitor/team", { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  updateExhibitorTeamMember(token: string, id: string, data: ExhibitorTeamMemberPayload): Promise<ExhibitorTeamMember> {
    return request(`/api/v1/exhibitor/team/${id}`, { method: "PATCH", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  deleteExhibitorTeamMember(token: string, id: string): Promise<void> {
    return request(`/api/v1/exhibitor/team/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
  },
  uploadMedia(token: string, file: File, purpose?: string): Promise<MediaUpload> {
    const body = new FormData()
    body.append("file", file)
    if (purpose) body.append("purpose", purpose)
    return request("/api/v1/media", { method: "POST", body, headers: { Authorization: `Bearer ${token}` } })
  },
  getExhibitorProducts(token, expoId): Promise<Product[]> {
    const query = expoId ? `?expoId=${encodeURIComponent(expoId)}` : ""
    return request(`/api/v1/exhibitor/products${query}`, { headers: { Authorization: `Bearer ${token}` } })
  },
  getExhibitorProduct(token: string, id: string): Promise<Product> {
    return request(`/api/v1/exhibitor/products/${id}`, { headers: { Authorization: `Bearer ${token}` } })
  },
  createExhibitorProduct(token: string, data: ProductPayload): Promise<Product> {
    return request("/api/v1/exhibitor/products", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data)
    })
  },
  updateExhibitorProduct(token: string, id: string, data: ProductPayload): Promise<Product> {
    return request(`/api/v1/exhibitor/products/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data)
    })
  },
  deleteExhibitorProduct(token: string, id: string): Promise<void> {
    return request(`/api/v1/exhibitor/products/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
  },
  showcaseExpoProducts(token: string, expoId: string, productIds: string[]): Promise<{ products: Product[] }> {
    return request(`/api/v1/exhibitor/expos/${expoId}/products/showcase`, { method: "POST", body: JSON.stringify({ productIds }), headers: { Authorization: `Bearer ${token}` } })
  },
  removeExpoShowcaseProduct(token: string, expoId: string, productId: string): Promise<{ status: string }> {
    return request(`/api/v1/exhibitor/expos/${expoId}/products/${productId}/showcase`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
  },
  getAvailableExpos(token): Promise<AvailableExpo[]> {
    return requestItems("/api/v1/expos/available", { headers: { Authorization: `Bearer ${token}` } })
  },
  getMyExpos(token): Promise<MyExpoRegistration[]> {
    return requestItems("/api/v1/exhibitor/my-expos", { headers: { Authorization: `Bearer ${token}` } })
  },
  createExhibitorActivationPayment(token: string, expoId: string, idempotencyKey?: string, includeAdsAddon?: boolean, roiEstimate?: ROIEstimate, paymentChannels?: PaystackPaymentChannel[], paymentMethods?: CheckoutPaymentMethod[]): Promise<{ payment: ExhibitorPaymentRecord; authorizationUrl: string; reference?: string; requiresRedirect?: boolean }> {
    return request(`/api/v1/exhibitor/expos/${expoId}/activation-payments`, { method: "POST", body: JSON.stringify({ idempotencyKey: idempotencyKey || `${expoId}_${Date.now()}`, includeAdsAddon: Boolean(includeAdsAddon), roiEstimate, paymentChannels, paymentMethods }), headers: { Authorization: `Bearer ${token}` } })
  },
  verifyExhibitorPaystackPayment(token: string, reference: string): Promise<{ payment: ExhibitorPaymentRecord; commissionSplit: unknown; redirectTo: string }> {
    return request("/api/v1/exhibitor/payments/paystack/verify", { method: "POST", body: JSON.stringify({ reference }), headers: { Authorization: `Bearer ${token}` } })
  },
  confirmExhibitorPayment(token: string, paymentId: string): Promise<{ payment: ExhibitorPaymentRecord; commissionSplit: unknown }> {
    return request(`/api/v1/exhibitor/payments/${paymentId}/confirm`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
  },
  getExpoQRCode(token: string, expoId: string): Promise<{ id: string; expoId: string; expoExhibitorId: string; code: string; targetPath: string; type: string; active: boolean; createdAt: string }> {
    return request(`/api/v1/exhibitor/expos/${expoId}/qrcode`, { headers: { Authorization: `Bearer ${token}` } })
  },
  downloadExpoQRCode(token: string, expoId: string): Promise<Blob> {
    return requestBlob(`/api/v1/exhibitor/expos/${expoId}/qrcode.svg`, { headers: { Authorization: `Bearer ${token}` } })
  },
  getExpoLeads(token: string, expoId: string): Promise<Lead[]> {
    return requestItems(`/api/v1/exhibitor/expos/${expoId}/leads`, { headers: { Authorization: `Bearer ${token}` } })
  },
  createExpoLead(token: string, expoId: string, data: LeadCreatePayload): Promise<Lead> {
    return request(`/api/v1/exhibitor/expos/${expoId}/leads`, { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  updateExpoLead(token: string, leadId: string, data: LeadUpdatePayload): Promise<Lead> {
    return request(`/api/v1/exhibitor/leads/${leadId}`, { method: "PATCH", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  recordExpoLeadActivity(token: string, leadId: string, data: LeadActivityPayload): Promise<LeadActivityRecord> {
    return request(`/api/v1/exhibitor/leads/${leadId}/activities`, { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  sendExpoLeadMessage(token: string, leadId: string, data: LeadMessagePayload): Promise<{ notification: NotificationRecord; activity: LeadActivityRecord; lead: Lead }> {
    return request(`/api/v1/exhibitor/leads/${leadId}/messages`, { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  getExpoConversations(token: string, expoId: string): Promise<ExhibitorConversationThread[]> {
    return requestItems(`/api/v1/exhibitor/expos/${expoId}/conversations`, { headers: { Authorization: `Bearer ${token}` } })
  },
  sendExpoChatMessage(token: string, expoId: string, threadId: string, data: ChatMessagePayload): Promise<{ thread: ExhibitorConversationThread; message: ChatMessage }> {
    return request(`/api/v1/exhibitor/expos/${expoId}/conversations/${threadId}/messages`, { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  getExpoLiveStream(token: string, expoId: string): Promise<ExhibitorLiveStream> {
    return request(`/api/v1/exhibitor/expos/${expoId}/live-stream`, { headers: { Authorization: `Bearer ${token}` } })
  },
  updateExpoLiveStream(token: string, expoId: string, data: ExhibitorLiveStreamPayload): Promise<ExhibitorLiveStream> {
    return request(`/api/v1/exhibitor/expos/${expoId}/live-stream`, { method: "PATCH", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  exportExpoLeads(token: string, expoId: string): Promise<Blob> {
    return requestBlob(`/api/v1/exhibitor/expos/${expoId}/leads/export`, { headers: { Authorization: `Bearer ${token}` } })
  },
  getExpoPreOrders(token: string, expoId: string): Promise<PreOrder[]> {
    return request(`/api/v1/exhibitor/expos/${expoId}/orders`, { headers: { Authorization: `Bearer ${token}` } })
  },
  updateExpoPreOrderStatus(token: string, expoId: string, orderId: string, status: PreOrder["status"]): Promise<PreOrder> {
    return request(`/api/v1/exhibitor/expos/${expoId}/orders/${orderId}`, { method: "PATCH", body: JSON.stringify({ status }), headers: { Authorization: `Bearer ${token}` } })
  },
  getExpoReminders(token: string, expoId: string): Promise<Reminder[]> {
    return request(`/api/v1/exhibitor/expos/${expoId}/reminders`, { headers: { Authorization: `Bearer ${token}` } })
  },
  getExpoCalendarInvites(token: string, expoId: string): Promise<CalendarInvite[]> {
    return request(`/api/v1/exhibitor/expos/${expoId}/meetings`, { headers: { Authorization: `Bearer ${token}` } })
  },
  createExpoMeeting(token: string, expoId: string, data): Promise<CalendarInvite> {
    return request(`/api/v1/exhibitor/expos/${expoId}/meetings`, { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  deleteExpoMeeting(token: string, expoId: string, meetingId: string): Promise<{ status: string }> {
    return request(`/api/v1/exhibitor/expos/${expoId}/meetings/${meetingId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
  },
  getExpoAIAnalysis(token: string, expoId: string): Promise<AIAnalysis> {
    return request(`/api/v1/exhibitor/expos/${expoId}/analytics`, { headers: { Authorization: `Bearer ${token}` } })
  },
  getExpoROI(token: string, expoId: string): Promise<ROIEstimate> {
    return request(`/api/v1/exhibitor/expos/${expoId}/roi`, { headers: { Authorization: `Bearer ${token}` } })
  },
  updateExpoROI(token: string, expoId: string, data: ROIEstimate): Promise<ROIEstimate> {
    return request(`/api/v1/exhibitor/expos/${expoId}/roi`, { method: "PATCH", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  getExpoAIAnalyticsSummary(token: string, expoId: string): Promise<AIAnalyticsSummary> {
    return request(`/api/v1/exhibitor/expos/${expoId}/analytics/ai-summary`, { headers: { Authorization: `Bearer ${token}` } })
  },
  generateExpoAIAnalyticsSummary(token: string, expoId: string): Promise<AIAnalyticsSummary> {
    return request(`/api/v1/exhibitor/expos/${expoId}/analytics/ai-summary`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
  },
  getExpoVisitors(token: string, expoId: string): Promise<ExpoVisitor[]> {
    return request(`/api/v1/exhibitor/expos/${expoId}/visitors`, { headers: { Authorization: `Bearer ${token}` } })
  },
  getExpoFeedback(token: string, expoId: string): Promise<ExhibitorFeedback[]> {
    return requestItems(`/api/v1/exhibitor/expos/${expoId}/feedback`, { headers: { Authorization: `Bearer ${token}` } })
  },
  submitOrganizerFeedback(token: string, expoId: string, data: OrganizerFeedbackPayload): Promise<OrganizerFeedbackSubmission> {
    return request(`/api/v1/exhibitor/expos/${expoId}/organizer-feedback`, { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  getExpoCampaignDrafts(token: string, expoId: string): Promise<ExhibitorCampaignDraft[]> {
    return requestItems(`/api/v1/exhibitor/expos/${expoId}/campaigns`, { headers: { Authorization: `Bearer ${token}` } })
  },
  createExpoCampaignDraft(token: string, expoId: string, data: ExhibitorCampaignDraftPayload): Promise<ExhibitorCampaignDraft> {
    return request(`/api/v1/exhibitor/expos/${expoId}/campaigns`, { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  getExpoDocuments(token: string, expoId: string): Promise<ExpoDocument[]> {
    return request(`/api/v1/exhibitor/expos/${expoId}/documents`, { headers: { Authorization: `Bearer ${token}` } })
  },
  createExpoDocument(token: string, expoId: string, data: CompanyDocumentPayload): Promise<ExpoDocument> {
    return request(`/api/v1/exhibitor/expos/${expoId}/documents`, { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  deleteExpoDocument(token: string, expoId: string, id: string): Promise<void> {
    return request(`/api/v1/exhibitor/expos/${expoId}/documents/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
  },
  getExpoAdCampaigns(token: string, expoId: string): Promise<AdCampaign[]> {
    return request(`/api/v1/exhibitor/expos/${expoId}/ads`, { headers: { Authorization: `Bearer ${token}` } })
  },
  createExpoAdCampaign(token: string, expoId: string, data: Partial<AdCampaign>): Promise<AdCampaign> {
    return request(`/api/v1/exhibitor/expos/${expoId}/ads`, {
      method: "POST",
      body: JSON.stringify({
        name: data.name,
        placement: data.placement || data.type || "banner",
        dimensions: "728x90",
        mediaUrl: data.imageUrl,
        mediaType: "image",
        budget: data.budget || 0,
        status: "pending_payment"
      }),
      headers: { Authorization: `Bearer ${token}` }
    })
  },
  updateExpoAdCampaign(token: string, expoId: string, adId: string, data: Partial<AdCampaign>): Promise<AdCampaign> {
    return request(`/api/v1/exhibitor/expos/${expoId}/ads/${adId}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: data.name,
        placement: data.placement || data.type || "banner",
        dimensions: "728x90",
        mediaUrl: data.imageUrl || data.mediaUrl,
        mediaType: "image",
        budget: data.budget || 0
      }),
      headers: { Authorization: `Bearer ${token}` }
    })
  },
  // Sponsor APIs
  getSponsorDashboard(token): Promise<SponsorDashboardStats> {
    return request("/api/v1/sponsor/dashboard", { headers: { Authorization: `Bearer ${token}` } })
  },
  getSponsorReports(token): Promise<any> {
    return request("/api/v1/sponsor/reports", { headers: { Authorization: `Bearer ${token}` } })
  },
  getSponsorReportsAISummary(token): Promise<AIAnalyticsSummary> {
    return request("/api/v1/sponsor/reports/ai-summary", { headers: { Authorization: `Bearer ${token}` } })
  },
  generateSponsorReportsAISummary(token): Promise<AIAnalyticsSummary> {
    return request("/api/v1/sponsor/reports/ai-summary", { method: "POST", headers: { Authorization: `Bearer ${token}` } })
  },
  getSponsorCampaigns(token): Promise<SponsorCampaign[]> {
    return requestItems("/api/v1/sponsor/campaigns", { headers: { Authorization: `Bearer ${token}` } })
  },
  getSponsorCampaign(token, id): Promise<SponsorCampaign> {
    return request(`/api/v1/sponsor/campaigns/${id}`, { headers: { Authorization: `Bearer ${token}` } })
  },
  createSponsorCampaign(token, data): Promise<SponsorCampaign> {
    return request("/api/v1/sponsor/campaigns", { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  getSponsorAds(token): Promise<SponsorAd[]> {
    return requestItems("/api/v1/sponsor/ads", { headers: { Authorization: `Bearer ${token}` } })
  },
  getSponsorAd(token, id): Promise<SponsorAd> {
    return request(`/api/v1/sponsor/ads/${id}`, { headers: { Authorization: `Bearer ${token}` } })
  },
  createSponsorAd(token, data): Promise<SponsorAd> {
    return request("/api/v1/sponsor/ads", { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  createSponsorAdPayment(token, adId): Promise<{ payment: SponsorPayment; authorizationUrl: string }> {
    return request(`/api/v1/sponsor/ads/${adId}/payments`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
  },
  confirmSponsorAdPayment(token, paymentId): Promise<{ payment: SponsorPayment; ad: SponsorAd }> {
    return request(`/api/v1/sponsor/payments/${paymentId}/confirm`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
  },
  trackSponsorAd(adId, event): Promise<{ ad: SponsorAd }> {
    return request(`/api/v1/ads/${adId}/track`, { method: "POST", body: JSON.stringify({ event }) })
  },
  getSponsorPayments(token): Promise<SponsorPayment[]> {
    return requestItems("/api/v1/sponsor/payments", { headers: { Authorization: `Bearer ${token}` } })
  },
  getSponsorPaymentReceipt(token, id): Promise<PaymentReceipt> {
    return request(`/api/v1/sponsor/payments/${id}/receipt`, { headers: { Authorization: `Bearer ${token}` } })
  },
  // Visitor APIs
  async getVisitorDashboard(token): Promise<VisitorDashboardStats> {
    const dashboard = await request<any>("/api/v1/visitor/dashboard", { headers: { Authorization: `Bearer ${token}` } })
    return {
      ...dashboard,
      upcomingExposCount: dashboard.upcomingExposCount ?? 0,
      upcomingExpos: dashboard.upcomingExpos ?? []
    }
  },
  getVisitorExpos(token): Promise<VisitorExpo[]> {
    return requestItems("/api/v1/visitor/expos", { headers: { Authorization: `Bearer ${token}` } })
  },
  getVisitorExpoDetails(token, id): Promise<VisitorExpo> {
    return request(`/api/v1/visitor/expos/${id}`, { headers: { Authorization: `Bearer ${token}` } })
  },
  createVisitorExpoAction(token: string, expoId: string, data: VisitorExpoActionPayload): Promise<Lead> {
    const { boothId, ...payload } = data
    return request(`/api/v1/visitor/expos/${expoId}/actions?exhibitor=${encodeURIComponent(boothId)}`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { Authorization: `Bearer ${token}` }
    })
  },
  getVisitorFavorites(token): Promise<VisitorFavorite[]> {
    return requestItems("/api/v1/visitor/favorites", { headers: { Authorization: `Bearer ${token}` } })
  },
  addFavorite(token, type, itemId): Promise<VisitorFavorite> {
    return request("/api/v1/visitor/favorites", { method: "POST", body: JSON.stringify({ type, itemId }), headers: { Authorization: `Bearer ${token}` } })
  },
  removeFavorite(token, favoriteId): Promise<void> {
    return request(`/api/v1/visitor/favorites/${favoriteId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
  },
  getVisitorTimeline(token): Promise<VisitorTimelineDay[]> {
    return requestItems("/api/v1/visitor/timeline", { headers: { Authorization: `Bearer ${token}` } })
  },
  getVisitorCalendar(token): Promise<VisitorCalendarItem[]> {
    return request("/api/v1/visitor/calendar", { headers: { Authorization: `Bearer ${token}` } })
  },
  getVisitorMessages(token): Promise<VisitorMessage[]> {
    return request("/api/v1/visitor/messages", { headers: { Authorization: `Bearer ${token}` } })
  },
  sendMessage(token, exhibitorId, message): Promise<void> {
    return request(`/api/v1/visitor/messages/${exhibitorId}`, { method: "POST", body: JSON.stringify({ message }), headers: { Authorization: `Bearer ${token}` } })
  },
  getVisitorExpoConversations(token: string, expoId: string): Promise<ExhibitorConversationThread[]> {
    return requestItems(`/api/v1/visitor/expos/${expoId}/conversations`, { headers: { Authorization: `Bearer ${token}` } })
  },
  sendVisitorExpoChatMessage(token: string, expoId: string, exhibitorId: string, data: ChatMessagePayload): Promise<{ thread: ExhibitorConversationThread; message: ChatMessage }> {
    return request(`/api/v1/visitor/expos/${expoId}/conversations/${exhibitorId}/messages`, { method: "POST", body: JSON.stringify(data), headers: { Authorization: `Bearer ${token}` } })
  },
  getVisitorFeedback(token): Promise<VisitorFeedback[]> {
    return request("/api/v1/visitor/feedback", { headers: { Authorization: `Bearer ${token}` } })
  },
  submitFeedback(token, expoId, rating, comment, exhibitorId): Promise<VisitorFeedback> {
    return request("/api/v1/visitor/feedback", { method: "POST", body: JSON.stringify({ expoId, exhibitorId, rating, comment }), headers: { Authorization: `Bearer ${token}` } })
  },
  getVisitorPreOrders(token): Promise<VisitorPreOrder[]> {
    return request("/api/v1/visitor/orders", { headers: { Authorization: `Bearer ${token}` } })
  },
  createPreOrder(token, exhibitorId, productName, quantity): Promise<VisitorPreOrder> {
    return request("/api/v1/visitor/orders", { method: "POST", body: JSON.stringify({ exhibitorId, productName, quantity }), headers: { Authorization: `Bearer ${token}` } })
  },
  getVisitorSettings(token): Promise<VisitorSettings> {
    return request("/api/v1/visitor/settings", { headers: { Authorization: `Bearer ${token}` } })
  },
  updateVisitorSettings(token, settings): Promise<VisitorSettings> {
    return request("/api/v1/visitor/settings", { method: "PUT", body: JSON.stringify(settings), headers: { Authorization: `Bearer ${token}` } })
  }
}
