export type Role = "visitor" | "exhibitor" | "organizer" | "sponsorship" | "administrator" | "super_administrator"

export type Trend = "up" | "down" | "neutral"

export type ExpoStatus =
  | "draft"
  | "submitted_for_review"
  | "needs_changes"
  | "approved"
  | "published"
  | "live"
  | "completed"
  | "settlement_pending"
  | "settled"
  | "archived"

export interface User {
  id: string
  name: string
  email: string
  role: Role
  avatarUrl: string
  companyName: string
  mustChangePassword?: boolean
}

export interface AuthResponse {
  token: string
  user: User
  redirectTo: string
}

export interface SessionResponse {
  user: User
}

export interface DashboardStat {
  id: string
  label: string
  value: string
  delta: string
  trend: Trend
}

export interface ActivityItem {
  id: string
  title: string
  description: string
  timestamp: string
  type: "user" | "system" | "traffic" | "finance" | "security"
}

export interface QuickAction {
  id: string
  label: string
  description: string
  href: string
}

export interface RoleDistributionItem {
  role: Role
  count: number
}

export interface SystemHealthItem {
  service: string
  status: "healthy" | "warning" | "degraded"
  responseTimeMs: number
}

export interface CountryRecord {
  code: string
  name: string
  defaultCurrency: string
  defaultTimezone: string
  paymentMethods: string[]
  active: boolean
}

export type CountryPayload = Omit<CountryRecord, "active">

export interface ReportMetric {
	label: string
	value: string
	delta: string
}

export interface ReportSeriesItem {
	label: string
	value: number
}

export interface ExpoRankingReport {
  expoId: string
  expoName: string
  revenue: number
  commission: number
  leads: number
  visitors: number
  exhibitors: number
  activeExhibitors: number
  interactions: number
  score: number
}

export interface AdministratorReportsResponse {
	performance: ReportMetric[]
	revenueSeries: ReportSeriesItem[]
	engagementSeries: ReportSeriesItem[]
	topInsights: string[]
}

export interface AdministratorOverviewResponse {
  stats: DashboardStat[]
  roleDistribution: RoleDistributionItem[]
  systemHealth: SystemHealthItem[]
  activities: ActivityItem[]
  quickActions: QuickAction[]
}

export interface OrganizerRecord {
  id: string
  name: string
  company: string
  email: string
  status: "verified" | "pending" | "suspended"
  expos: number
  createdAt: string
}

export interface VisitorRecord {
	id: string
	name: string
	email: string
	status: "active" | "inactive" | "flagged"
	lastActivity: string
	exposAttended: number
	visitedExpos?: Array<{
		id: string
		name: string
		interactions: number
		lastActivity: string
	}>
	interactions: number
	createdAt: string
}

export interface ExhibitorRecord {
  id: string
  company: string
  contact: string
  email: string
  assignedExpos: string
  assignedExpoCount?: number
  assignedExpoList?: Array<{
    id: string
    name: string
    status: string
    createdAt: string
  }>
  assignmentId?: string
  boothNumber?: string
  boothLabel?: string
  status: "active" | "pending" | "suspended" | "invited" | "pending_activation" | "pending_payment" | "disabled"
  createdAt: string
}

export interface ExpoExhibitorAssignment {
  id: string
  expoId: string
  expoName?: string
  exhibitorId: string
  exhibitorName?: string
  exhibitorEmail?: string
  boothNumber: string
  boothLabel?: string
  activationStatus: "invited" | "pending_activation" | "active" | "disabled" | string
  currencyCode?: string
  amountMinor?: number
  location?: string
  startDate?: string
  endDate?: string
  createdAt: string
}

export interface ExpoExhibitorAssignmentPayload {
  expoId: string
  exhibitorId: string
  boothNumber?: string
  boothLabel?: string
  status?: "invited" | "pending_activation" | "active" | "disabled"
}

export interface ExpoAnalyticsResponse {
  stats: DashboardStat[]
}

export interface SponsorRecord {
  id: string
  sponsor: string
  company: string
  email: string
  package: string
  campaignStatus: "active" | "draft" | "paused"
  createdAt: string
}

export interface PaymentRecord {
  id: string
  reference: string
  payerName: string
  payerRole: Role | "sponsorship"
  expoName: string
  currency: string
  amount: number
  processingFee?: number
  method: "paystack" | "card" | "bank"
  status: "paid" | "pending" | "failed" | "refunded" | "cancelled"
  paidAt: string
}

export interface AdRecord {
  id: string
  name?: string
  ownerName: string
  ownerRole: "exhibitor" | "sponsorship"
  countryCode?: string
  expoName: string
  campaignName: string
  placement: string
  dimensions?: string
  mediaUrl?: string
  mediaType?: "image" | "video" | string
  impressions: number
  clicks: number
  status: AdminAdStatus
  createdAt: string
}

export interface ExpoRecord {
  id: string
  name: string
  description?: string
  location: string
  city?: string
  venue?: string
  countryCode?: string
  dates: string
  organizerId?: string
  organizer: string
  startDate: string
  endDate: string
  currency: string
  timezone?: string
  coverImageUrl?: string
  coverImage?: string
  exhibitorFee: number
  exhibitorActivationFeeMinor?: number
  adsAddonFee?: number
  adsAddonFeeMinor?: number
  organizerCommissionBps?: number
  organizerCommissionRate?: number
  exhibitors: number
  status: ExpoStatus
  categories?: CategoryRecord[]
}

export interface CategoryRecord {
  id: string
  name: string
  slug: string
  icon?: string
  active: boolean
}

export type CategoryPayload = Omit<CategoryRecord, "id">

export interface ExpoPayload {
  name: string
  description: string
  organizerId?: string
  countryCode: string
  city: string
  venue: string
  currencyCode: string
  timezone: string
  coverImageUrl?: string
  exhibitorActivationFeeMinor?: number
  adsAddonFeeMinor?: number
  organizerCommissionBps?: number
  status?: ExpoStatus
  startDate: string
  endDate: string
  categoryIds: string[]
}

export interface NotificationRecord {
  id: string
  recipient: string
  role: Role
  channel: "email" | "sms" | "whatsapp" | "system" | "in_app" | "push"
  subject: string
  message: string
  status: "delivered" | "queued" | "failed"
  sentAt: string
  actionUrl?: string
  unread?: boolean
}

export interface SettlementRecord {
  id: string
  reference: string
  expo: string
  organizer: string
  currency: string
  amount: number
  commission: number
  status: "pending review" | "pending approval" | "approved" | "disbursed"
  payoutMethod?: "bank" | "mobile_money" | "manual" | ""
  accountName?: string
  bankName?: string
  accountNumber?: string
  bankBranch?: string
  swiftCode?: string
  mobileProvider?: string
  mobileNumber?: string
  payoutNotes?: string
  createdAt: string
}

export interface UserRecord {
  id: string
  name: string
  email: string
  role: Role
  status: "active" | "inactive" | "suspended"
  lastLogin: string
  createdAt: string
  mustChangePassword?: boolean
}

export interface AdminUserPayload {
  name: string
  email: string
  password?: string
  role: Role
  companyName?: string
  countryCode?: string
  status?: "active" | "inactive" | "suspended"
}

export interface AuditLogRecord {
  id: string
  actor: string
  actorRole: Role
  action: string
  entity: string
  target: string
  ipAddress: string
  timestamp: string
}

export interface EmailSettings {
  senderName: string
  senderEmail: string
  smtpHost: string
  smtpPort: number
  username: string
  password: string
  encryption: string
}

export interface SmsSettings {
  provider: string
  senderId: string
  apiKey: string
  baseUrl?: string
}

export interface PaystackSettings {
  publicKey: string
  secretKey: string
  callbackUrl: string
  processingFeeBps?: number
}

export interface GoogleSettings {
  clientId: string
  calendarIntegrationEnabled?: boolean
  calendarId?: string
  serviceAccountEmail?: string
  serviceAccountKey?: string
}

export interface MeetingSettings {
  categoryTypes: string[]
}

export interface OpenAISettings {
  enabled: boolean
  apiKey: string
  model: string
}

export interface WhatsappSettings {
  provider: string
  accountSid: string
  authToken: string
  fromNumber: string
  webhookUrl: string
}

export interface AIAnalyticsSummary {
  id?: string
  scope: "admin_country" | "organizer" | "exhibitor_expo" | "sponsor"
  scopeId: string
  countryCode: string
  summary: string
  risks: string[]
  opportunities: string[]
  recommendations: string[]
  nextActions: string[]
  confidenceNotes: string
  sourceMetrics: Record<string, unknown>
  generatedBy?: string
  generatedAt: string
  provider?: string
  model?: string
  status: "ready" | "fallback" | "failed"
  errorMessage?: string
}

export interface OrganizerTeamMember {
  id: string
  name: string
  email: string
  role: "owner" | "staff" | "assistant" | "manager"
  status: "active" | "inactive"
  permissions: string[]
  createdAt: string
}

export type OrganizerTeamMemberPayload = {
  name: string
  email: string
  role: "staff" | "assistant" | "manager"
  status?: "active" | "inactive"
  permissions?: string[]
  temporaryPassword?: string
}

export interface OrganizerProfile {
  id: string
  name: string
  email: string
  companyName: string
  countryCode: string
  logoUrl?: string
  phone: string
  address: string
  payoutMethod?: "bank" | "mobile_money" | "manual" | ""
  payoutAccountName?: string
  payoutBankName?: string
  payoutAccountNumber?: string
  payoutBankBranch?: string
  payoutSwiftCode?: string
  payoutMobileProvider?: string
  payoutMobileNumber?: string
  payoutNotes?: string
  emailNotifications: boolean
  smsNotifications: boolean
  pushNotifications: boolean
}

export type OrganizerProfilePayload = Omit<OrganizerProfile, "id" | "email" | "countryCode">

export interface OrganizerFeedback {
  id: string
  expoId: string
  expoName: string
  respondentName: string
  respondentRole: "visitor" | "exhibitor"
  category: "venue" | "logistics" | "marketing" | "communication" | "support" | "payments" | "overall"
  rating: number
  comment: string
  suggestions: string
  improvements?: string
  dislikes?: string
  createdAt: string
}

export interface OrganizerSponsor {
  id: string
  company: string
  contactName: string
  email: string
  phone?: string
  status: "active" | "pending" | "expired" | "cancelled"
  commissionedBy: string
  commissionRate: number
  commissionEarned: number
  totalPaid: number
  joinedAt: string
}

export type OrganizerSponsorPayload = {
  company: string
  contactName: string
  email: string
  phone?: string
  commissionRate?: number
  temporaryPassword?: string
  status?: "active" | "pending" | "expired" | "cancelled"
}

export type OrganizerExhibitorInvitePayload = {
  companyName: string
  contactName: string
  email: string
  phone?: string
  temporaryPassword: string
}

export interface OrganizerPaymentRecord {
  id: string
  reference: string
  payerName: string
  payerRole: Role | "sponsorship"
  expoName: string
  currency: string
  amount: number
  processingFee?: number
  method: "paystack" | "card" | "bank"
  status: "paid" | "pending" | "failed" | "refunded"
  paidAt: string
}

export interface OrganizerSettlementRecord {
  id: string
  reference: string
  expo: string
  period: string
  currency: string
  amount: number
  commissionRate: number
  commission: number
  netAmount: number
  status: "pending review" | "pending approval" | "approved" | "disbursed"
  payoutMethod?: "bank" | "mobile_money" | "manual" | ""
  accountName?: string
  bankName: string
  accountNumber: string
  bankBranch?: string
  swiftCode?: string
  mobileProvider?: string
  mobileNumber?: string
  payoutNotes?: string
  createdAt: string
}

export interface OrganizerReportsResponse {
  expoPerformance: ReportMetric[]
  revenueSeries: ReportSeriesItem[]
  engagementSeries: ReportSeriesItem[]
  visitorDemographics: ReportSeriesItem[]
  exhibitorSeries?: ReportSeriesItem[]
  leadStatusSeries?: ReportSeriesItem[]
  leadTemperatureSeries?: ReportSeriesItem[]
  paymentStatusSeries?: ReportSeriesItem[]
  settlementSeries?: ReportSeriesItem[]
  expoLifecycleSeries?: ReportSeriesItem[]
  expoDailySeries?: ReportSeriesItem[]
  expoRankings?: ExpoRankingReport[]
  topInsights: string[]
}

export interface OrganizerOverviewResponse {
  stats: DashboardStat[]
  activities: ActivityItem[]
  quickActions: QuickAction[]
  commissionEarnings: {
    total: number
    thisMonth: number
  }
}

export interface SponsorPlan {
  id: string
  name: string
  description: string
  countryCode: string
  tier: "bronze" | "silver" | "gold" | "platinum"
  price: number
  currency: string
  billingCycle: "monthly" | "annual"
  features: {
    logoPlacement: boolean
    bannerAds: boolean
    socialMedia: boolean
    boothSize: "small" | "medium" | "large" | "premium"
    speakingSlot: boolean
    dedicatedPage: boolean
    emailBlast: boolean
    videoAd: boolean
  }
  organizerCommissionPercent: number
  status: "active" | "inactive" | "archived"
  createdAt: string
}

export type SponsorPlanPayload = Omit<SponsorPlan, "id" | "createdAt">
export type AdminAdStatus = "draft" | "pending_payment" | "active" | "paused" | "rejected"
export type AdminSettlementStatus = "pending_review" | "approved" | "rejected" | "disbursed"

export interface ExhibitorOverviewResponse {
  stats: DashboardStat[]
  activities: ActivityItem[]
  quickActions: QuickAction[]
}

export interface ExhibitorPaymentRecord {
  id: string
  reference: string
  expoName: string
  currency: string
  amount: number
  processingFee?: number
  description: string
  status: "paid" | "pending" | "failed"
  paidAt: string
  paymentMethod?: string
}

export interface PaymentReceipt {
  id: string
  reference: string
  type: "payment"
  entityId: string
  expoName: string
  payerName: string
  payerEmail: string
  payeeName: string
  description: string
  amount: number
  currency: string
  tax: number
  total: number
  adsAddonPaid?: boolean
  adsAddonFee?: number
  processingFee?: number
  platformFee: number
  paymentMethod: string
  status: "paid" | "pending" | "failed" | "refunded"
  paidAt: string
  issuedAt: string
  organizerShare: number
  platformShare: number
  commissionRate: number
}

export interface SettlementInvoice {
  id: string
  reference: string
  type: "settlement"
  expoName: string
  organizerName: string
  organizerEmail: string
  expoStartDate: string
  expoEndDate: string
  collectedRevenue: number
  commissionPercent: number
  commission: number
  netPayout: number
  currency: string
  status: "pending" | "approved" | "disbursed"
  createdAt: string
  paidAt?: string
}

export interface Product {
  id: string
  exhibitorId: string
  expoId?: string
  name: string
  description: string
  price: number
  discountedPrice?: number
  currency: string
  images: string[]
  mediaType?: "image" | "video"
  mediaUrl?: string
  demoVideoUrl?: string
  presentationUrl?: string
  specifications?: string
  category: string
  status: "available" | "out_of_stock" | "discontinued"
  featured: boolean
  createdAt: string
}

export interface ProductPayload {
  expoId?: string
  name: string
  description: string
  price: number
  discountedPrice?: number
  currency?: string
  mediaType?: "image" | "video"
  mediaUrl?: string
  demoVideoUrl?: string
  presentationUrl?: string
  imageUrls?: string[]
  specifications?: string
  category: string
  status: "available" | "out_of_stock" | "discontinued"
  featured: boolean
}

export interface AvailableExpo {
  id: string
  assignmentId?: string
  name: string
  description: string
  coverImage: string
  bannerImage: string
  startDate: string
  endDate: string
  venue: { name: string; address: string }
  boothOptions: { size: string; price: number; available: number }[]
  pricing: { baseFee: number; adsAddonFee?: number; processingFee?: number; processingFeeBps?: number; earlyBird?: { fee: number; deadline: string } }
  status: "open" | "closed" | "sold_out" | "pending_activation" | "active"
  registrationDeadline: string
  visitorCount: number
  boothNumber?: string
  boothLabel?: string
  activationStatus?: "invited" | "pending_activation" | "active" | "disabled"
  currency?: string
  countryCode?: string
}

export interface MyExpoRegistration {
  id: string
  expoId: string
  expoName: string
  expoDescription: string
  coverImage: string
  location: string
  timezone?: string
  startDate: string
  endDate: string
  boothNumber: string
  boothSize: string
  amount: number
  currency: string
  adsAddonEnabled?: boolean
  adsAddonFee?: number
  status: "invited" | "pending" | "confirmed" | "cancelled"
  paidAt: string
}

export interface Lead {
  id: string
  expoId: string
  expoName: string
  exhibitorId: string
  visitorName: string
  visitorEmail: string
  visitorPhone: string
  notes: string
  source?: string
  temperature: "hot" | "warm" | "cold"
  status: "new" | "contacted" | "meeting_booked" | "proposal_sent" | "won" | "lost"
  nextFollowUpAt?: string
  lastContactedAt?: string
  followUpNotes?: string
  interestedProductIds?: string[]
  lastActivity?: string
  activities?: LeadActivityRecord[]
  capturedAt: string
}

export interface LeadUpdatePayload {
  status: Lead["status"]
  temperature: Lead["temperature"]
  followUpNotes?: string
  nextFollowUpAt?: string
  interestedProductIds?: string[]
}

export interface LeadCreatePayload {
  name: string
  email?: string
  phone?: string
  notes?: string
  source?: string
  temperature: Lead["temperature"]
  status?: Lead["status"]
  action?: "interest" | "meeting" | "pre_order" | "call"
  scheduledAt?: string
  title?: string
  location?: string
  ccEmails?: string[]
  productId?: string
  productName?: string
  productPrice?: number
  productCurrency?: string
  quantity?: number
}

export interface LeadActivityPayload {
  type: "call" | "email" | "whatsapp" | "meeting" | "note" | "follow_up" | "status" | "temperature"
  notes?: string
  scheduledAt?: string
}

export interface LeadActivityRecord {
  id: string
  leadId: string
  type: LeadActivityPayload["type"]
  notes: string
  scheduledAt?: string
  createdAt: string
}

export interface PreOrder {
  id: string
  expoId: string
  expoName: string
  exhibitorId: string
  productId: string
  productName: string
  visitorName: string
  visitorEmail: string
  visitorPhone?: string
  quantity: number
  unitPrice?: number
  amount: number
  currency?: string
  status: "pending" | "confirmed" | "processing" | "ready_for_delivery" | "delivered" | "cancelled"
  createdAt: string
}

export interface Reminder {
  id: string
  expoId: string
  exhibitorId: string
  title: string
  description: string
  dueAt: string
  completed: boolean
}

export interface CalendarInvite {
  id: string
  leadId?: string
  expoId: string
  exhibitorId: string
  visitorId?: string
  visitorName: string
  visitorEmail: string
  visitorPhone?: string
  title: string
  meetingType?: string
  scheduledAt: string
  locationOrLink?: string
  ccEmails?: string[]
  status: "scheduled" | "completed" | "cancelled" | "no_show"
  createdAt?: string
}

export interface MeetingPayload {
  leadId?: string
  visitorName: string
  visitorEmail: string
  visitorPhone?: string
  title: string
  meetingType: string
  scheduledAt: string
  location: string
  notes?: string
  ccEmails?: string[]
}

export interface AIAnalysis {
  expoId: string
  exhibitorId: string
  overview?: {
    totalLeads: number
    uniqueVisitors: number
    meetings: number
    upcomingMeetings?: number
    completedMeetings?: number
    cancelledMeetings?: number
    preOrders: number
    preOrderValue: number
    leadTemperature: Record<string, number>
    leadStatus: Record<string, number>
    preOrderStatus: Record<string, number>
  }
  visitorInsights: {
    peakHours: string[]
    demographics: Record<string, number>
    leadQualityScore: number
  }
  roi?: ExhibitorROIAnalytics
  performanceSummary: string
  recommendations: string[]
  generatedAt: string
}

export type PaystackPaymentChannel = "card" | "bank" | "ussd" | "qr" | "mobile_money" | "bank_transfer"
export type CheckoutPaymentMethod = "card" | "mpesa_ke" | "airtel_money_ug" | "mtn_mobile_money_ug" | "mtn_mobile_money_gh" | "vodafone_cash_gh" | "airtel_money_tz" | "mpesa_tz" | "mtn_mobile_money_rw" | "airtel_money_rw"

export interface ROIEstimate {
  estimatedSpend: number
  currency: string
  breakdown?: Record<string, number>
  notes?: string
}

export interface ExhibitorROIAnalytics {
  currency: string
  baseLeadValue: number
  calculationMethod: string
  estimatedSpend: number
  tandazaSpend: number
  totalInvestment: number
  preOrderValue: number
  preOrderQuantity?: number
  realizedReturn: number
  projectedPipelineValue: number
  projectedReturn: number
  realizedNetReturn?: number
  projectedNetReturn?: number
  realizedROI: number
  projectedROI: number
  realizedRecoveredPercent?: number
  projectedRecoveredPercent?: number
  realizedRevenueMultiple?: number
  projectedRevenueMultiple?: number
  costPerLead: number
  costPerMeeting: number
  costPerPreOrder?: number
  averagePreOrderValue?: number
  averageLeadValue?: number
  breakEvenLeadsNeeded?: number
  breakEvenPreOrdersNeeded?: number
  hotLeads: number
  warmLeads?: number
  coldLeads?: number
  wonLeads: number
  lostLeads?: number
  contactedLeads?: number
  meetingBookedLeads?: number
  proposalSentLeads?: number
  pipelineByTemperature?: Record<string, number>
  pipelineByStatus?: Record<string, number>
  projectedStatus: string
  recommendations: string[]
  breakdown?: Record<string, number>
  notes?: string
}

export interface ExpoVisitor {
  id: string
  name: string
  email: string
  phone: string
  company?: string
  source?: string
  sourceLabel?: string
  engagementCount?: number
  registeredAt: string
  lastSeenAt?: string
}

export interface ExpoDocument {
  id: string
  expoId: string
  exhibitorId: string
  name: string
  url: string
  type: "document" | "video"
  size: number
  uploadedAt: string
}

export interface AdCampaign {
  id: string
  expoId?: string
  expoName?: string
  exhibitorId?: string
  name: string
  type: "banner" | "sidebar" | "popup" | "featured"
  placement: string
  imageUrl?: string
  mediaUrl?: string
  headline?: string
  description?: string
  ctaLink?: string
  budget: number
  spent?: number
  dailySpend?: number
  impressions: number
  clicks: number
  ctr: number
  startDate?: string
  endDate?: string
  status: "draft" | "pending_payment" | "active" | "paused" | "completed" | "rejected"
  createdAt: string
}

export interface ExhibitorFeedback {
  id: string
  expoId: string
  exhibitorId: string
  visitorId?: string
  visitorName: string
  visitorEmail?: string
  rating: number
  comment: string
  submittedAt: string
}

export interface OrganizerFeedbackPayload {
  rating: number
  category: "venue" | "logistics" | "communication" | "support" | "payments" | "overall"
  comment: string
  improvements?: string
  dislikes?: string
}

export interface OrganizerFeedbackSubmission {
  id: string
  expoId: string
  expoName: string
  exhibitorId: string
  exhibitorName: string
  rating: number
  category: string
  comment: string
  improvements: string
  dislikes: string
  submittedAt: string
}

export interface ExhibitorCampaignDraft {
  id: string
  expoId: string
  exhibitorId: string
  channel: "email" | "sms" | "whatsapp"
  name: string
  audience: "all_leads" | "hot_leads" | "warm_leads" | "cold_leads" | "visitors" | "pre_orders"
  subject: string
  message: string
  status: "draft"
  createdAt: string
  updatedAt: string
}

export interface ExhibitorCampaignDraftPayload {
  channel: ExhibitorCampaignDraft["channel"]
  name: string
  audience: ExhibitorCampaignDraft["audience"]
  subject: string
  message: string
}

export interface MediaUpload {
  id: string
  url: string
  name: string
  mimeType: string
  size: number
  width?: number
  height?: number
}

export interface LeadMessagePayload {
  channel: "email" | "sms" | "whatsapp"
  message: string
}

export interface ExhibitorConversationThread {
  id: string
  expoId: string
  exhibitorId: string
  exhibitorName: string
  visitorId: string
  visitorName: string
  visitorEmail: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  messages: ChatMessage[]
  createdAt: string
}

export interface ChatMessage {
  id: string
  threadId: string
  expoId: string
  exhibitorId: string
  visitorId: string
  senderId: string
  senderRole: Role
  senderName: string
  message: string
  createdAt: string
  readByVisitor: boolean
  readByExhibitor: boolean
}

export interface ChatMessagePayload {
  threadId?: string
  message: string
}

export interface ExhibitorLiveStream {
  expoId: string
  exhibitorId: string
  title: string
  youtubeUrl: string
  embedUrl: string
  enabled: boolean
  updatedAt?: string
}

export interface ExhibitorLiveStreamPayload {
  title: string
  youtubeUrl: string
  enabled: boolean
}

export interface ExhibitorProfile {
  id: string
  companyName: string
  logo: string
  logoUrl?: string
  description: string
  website: string
  phone: string
  email?: string
  address: string
  categories: string[]
  socialLinks: {
    linkedin?: string
    twitter?: string
    instagram?: string
  }
  teamMembers: { id: string; name: string; email: string; role: string }[]
}

export interface ExhibitorProfilePayload {
  companyName: string
  description: string
  website: string
  phone: string
  address: string
  logoUrl: string
  categories?: string[]
  socialLinks: {
    linkedin?: string
    twitter?: string
    instagram?: string
  }
}

export interface CompanyDocument {
  id: string
  exhibitorId: string
  name: string
  url: string
  mimeType: string
  size: number
  uploadedAt: string
}

export interface CompanyDocumentPayload {
  name: string
  url: string
  mimeType: string
  size: number
}

export interface ExhibitorTeamMember {
  id: string
  name: string
  email: string
  role: "owner" | "staff" | "assistant" | "manager" | string
  status: "active" | "inactive" | string
  permissions?: string[]
  createdAt?: string
}

export interface ExhibitorTeamMemberPayload {
  name: string
  email: string
  temporaryPassword: string
  role?: "staff" | "assistant" | "manager"
  status?: "active" | "inactive"
  permissions?: string[]
}

export interface SponsorAccountRecord {
  id: string
  company: string
  contactName: string
  email: string
  planName: string
  planTier: "bronze" | "silver" | "gold" | "platinum"
  status: "active" | "pending" | "expired" | "cancelled"
  commissionedBy: string
  totalPaid: number
  renewalDate: string
  createdAt: string
}

export interface ResourceCollection<T> {
  stats: DashboardStat[]
  items: T[]
  page?: number
  pageSize?: number
  total?: number
  totalPages?: number
}

export interface ApiDriver {
  login(email: string, password: string): Promise<AuthResponse>
  getCurrentUser(token: string): Promise<SessionResponse>
  logout(): Promise<{ success: boolean }>
  getCountries(): Promise<ResourceCollection<CountryRecord>>
  getAdminCountries(token: string): Promise<ResourceCollection<CountryRecord>>
  createAdminCountry(token: string, data: CountryPayload): Promise<CountryRecord>
  updateAdminCountryStatus(token: string, code: string, active: boolean): Promise<CountryRecord>
  getAdminCategories(token: string): Promise<ResourceCollection<CategoryRecord>>
  createAdminCategory(token: string, data: CategoryPayload): Promise<CategoryRecord>
  updateAdminCategoryStatus(token: string, id: string, active: boolean): Promise<CategoryRecord>
  getAdministratorOverview(token: string, countryCode?: string): Promise<AdministratorOverviewResponse>
  getAdministratorReports(token: string, countryCode?: string): Promise<AdministratorReportsResponse>
  getAdminVisitors(token: string, countryCode?: string): Promise<ResourceCollection<VisitorRecord>>
  getAdminOrganizers(token: string, countryCode?: string): Promise<ResourceCollection<OrganizerRecord>>
  getAdminExhibitors(token: string, countryCode?: string): Promise<ResourceCollection<ExhibitorRecord>>
  createAdminOrganizer(token: string, data: AdminUserPayload): Promise<UserRecord>
  createAdminExhibitor(token: string, data: AdminUserPayload): Promise<UserRecord>
  updateAdminExhibitor(token: string, id: string, data: AdminUserPayload): Promise<UserRecord>
  assignAdminExhibitor(token: string, data: ExpoExhibitorAssignmentPayload): Promise<ExpoExhibitorAssignment>
  getAdminSponsors(token: string, countryCode?: string): Promise<ResourceCollection<SponsorRecord>>
  createAdminSponsor(token: string, data: AdminUserPayload): Promise<UserRecord>
  updateAdminSponsor(token: string, id: string, data: AdminUserPayload): Promise<UserRecord>
  getAdminSponsorAccounts(token: string): Promise<ResourceCollection<SponsorAccountRecord>>
  getAdminSponsorPlans(token: string, countryCode?: string): Promise<SponsorPlan[]>
  getAdminSponsorPlan(token: string, id: string): Promise<SponsorPlan>
  createAdminSponsorPlan(token: string, data: SponsorPlanPayload): Promise<SponsorPlan>
  updateAdminSponsorPlan(token: string, id: string, data: Partial<SponsorPlanPayload>): Promise<SponsorPlan>
  updateAdminSponsorPlanStatus(token: string, id: string, status: SponsorPlan["status"], note?: string): Promise<SponsorPlan>
  getAdminExpos(token: string, countryCode?: string): Promise<ResourceCollection<ExpoRecord>>
  getAdminExpo(token: string, id: string): Promise<ExpoRecord>
  getAdminExpoExhibitors(token: string, id: string): Promise<ResourceCollection<ExhibitorRecord>>
  getAdminExpoVisitors(token: string, id: string): Promise<ResourceCollection<VisitorRecord>>
  getAdminExpoPayments(token: string, id: string): Promise<ResourceCollection<PaymentRecord>>
  getAdminExpoAnalytics(token: string, id: string): Promise<ExpoAnalyticsResponse>
  getAdminExpoAds(token: string, id: string): Promise<ResourceCollection<AdRecord>>
  createAdminExpo(token: string, data: ExpoPayload): Promise<ExpoRecord>
  updateAdminExpo(token: string, id: string, data: ExpoPayload): Promise<ExpoRecord>
  updateAdminExpoStatus(token: string, id: string, status: ExpoStatus, note?: string): Promise<ExpoRecord>
  getAdminPayments(token: string, countryCode?: string): Promise<ResourceCollection<PaymentRecord>>
  updateAdminPaymentStatus(token: string, id: string, status: "failed" | "refunded" | "cancelled", reason?: string): Promise<PaymentRecord>
  getAdminAds(token: string, countryCode?: string): Promise<ResourceCollection<AdRecord>>
  updateAdminAdStatus(token: string, id: string, status: AdminAdStatus, note?: string): Promise<AdRecord>
  getAdminNotifications(token: string): Promise<ResourceCollection<NotificationRecord>>
  getMyNotifications(token: string): Promise<ResourceCollection<NotificationRecord>>
  markNotificationRead(token: string, id: string): Promise<{ status: string }>
  markAllNotificationsRead(token: string): Promise<{ status: string; count: number }>
  clearNotification(token: string, id: string): Promise<{ status: string }>
  retryAdminNotification(token: string, id: string): Promise<{ status: string }>
  testAdminNotification(token: string, data: Partial<NotificationRecord> & { userId?: string; expoId?: string; templateKey?: string; payload?: Record<string, unknown> }): Promise<{ status: string }>
  getAdminSettlements(token: string, countryCode?: string): Promise<ResourceCollection<SettlementRecord>>
  updateAdminSettlementStatus(token: string, id: string, status: AdminSettlementStatus, note?: string): Promise<{ id: string; status: string }>
  getAdminUsers(token: string): Promise<ResourceCollection<UserRecord>>
  createAdminUser(token: string, data: AdminUserPayload): Promise<UserRecord>
  updateAdminUser(token: string, id: string, data: AdminUserPayload): Promise<UserRecord>
  deleteAdminUser(token: string, id: string): Promise<void>
  getAdminAuditLogs(token: string): Promise<ResourceCollection<AuditLogRecord>>
  getAdminEmailSettings(token: string): Promise<EmailSettings>
  getAdminSmsSettings(token: string): Promise<SmsSettings>
  getAdminPaystackSettings(token: string): Promise<PaystackSettings>
  getAdminGoogleSettings(token: string): Promise<GoogleSettings>
  getAdminMeetingSettings(token: string): Promise<MeetingSettings>
  getAdminOpenAISettings(token: string): Promise<OpenAISettings>
  getAdminWhatsappSettings(token: string): Promise<WhatsappSettings>
  updateAdminEmailSettings(token: string, data: EmailSettings): Promise<EmailSettings>
  updateAdminSmsSettings(token: string, data: SmsSettings): Promise<SmsSettings>
  updateAdminPaystackSettings(token: string, data: PaystackSettings): Promise<PaystackSettings>
  updateAdminGoogleSettings(token: string, data: GoogleSettings): Promise<GoogleSettings>
  updateAdminMeetingSettings(token: string, data: MeetingSettings): Promise<MeetingSettings>
  updateAdminOpenAISettings(token: string, data: OpenAISettings): Promise<OpenAISettings>
  testAdminOpenAISettings(token: string): Promise<{ status: string }>
  updateAdminWhatsappSettings(token: string, data: WhatsappSettings): Promise<WhatsappSettings>
  getAdminReportsAISummary(token: string, countryCode?: string): Promise<AIAnalyticsSummary>
  generateAdminReportsAISummary(token: string, countryCode?: string): Promise<AIAnalyticsSummary>
  getOrganizerOverview(token: string): Promise<OrganizerOverviewResponse>
  getOrganizerExpos(token: string): Promise<ResourceCollection<ExpoRecord>>
  getOrganizerExpo(token: string, id: string): Promise<ExpoRecord>
  createOrganizerExpo(token: string, data: ExpoPayload): Promise<ExpoRecord>
  updateOrganizerExpo(token: string, id: string, data: ExpoPayload): Promise<ExpoRecord>
  submitOrganizerExpo(token: string, id: string): Promise<ExpoRecord>
  getCategories(token?: string): Promise<{ items: CategoryRecord[] }>
  getMeetingCategories(): Promise<MeetingSettings>
  getExhibitorMeetingCategories(token: string): Promise<MeetingSettings>
  updateExhibitorMeetingCategories(token: string, data: MeetingSettings): Promise<MeetingSettings>
  getOrganizerExhibitors(token: string): Promise<ResourceCollection<ExhibitorRecord>>
  inviteOrganizerExhibitor(token: string, data: OrganizerExhibitorInvitePayload): Promise<UserRecord>
  getOrganizerVisitors(token: string): Promise<ResourceCollection<VisitorRecord>>
  getOrganizerFeedback(token: string): Promise<OrganizerFeedback[]>
  getOrganizerProfile(token: string): Promise<OrganizerProfile>
  updateOrganizerProfile(token: string, data: OrganizerProfilePayload): Promise<OrganizerProfile>
  getOrganizerTeam(token: string): Promise<OrganizerTeamMember[]>
  getOrganizerTeamMember(token: string, id: string): Promise<OrganizerTeamMember>
  createOrganizerTeamMember(token: string, data: OrganizerTeamMemberPayload): Promise<OrganizerTeamMember>
  updateOrganizerTeamMember(token: string, id: string, data: OrganizerTeamMemberPayload): Promise<OrganizerTeamMember>
  deleteOrganizerTeamMember(token: string, id: string): Promise<void>
  getOrganizerSponsors(token: string): Promise<OrganizerSponsor[]>
  getOrganizerSponsor(token: string, id: string): Promise<OrganizerSponsor>
  createOrganizerSponsor(token: string, data: OrganizerSponsorPayload): Promise<OrganizerSponsor>
  updateOrganizerSponsor(token: string, id: string, data: OrganizerSponsorPayload): Promise<OrganizerSponsor>
  getOrganizerPayments(token: string): Promise<ResourceCollection<OrganizerPaymentRecord>>
  getOrganizerPaymentReceipt(token: string, id: string): Promise<PaymentReceipt>
  getOrganizerSettlements(token: string): Promise<OrganizerSettlementRecord[]>
  getOrganizerReports(token: string): Promise<OrganizerReportsResponse>
  getOrganizerReportsAISummary(token: string): Promise<AIAnalyticsSummary>
  generateOrganizerReportsAISummary(token: string): Promise<AIAnalyticsSummary>
  getExhibitorOverview(token: string): Promise<ExhibitorOverviewResponse>
  getExhibitorPayments(token: string): Promise<ExhibitorPaymentRecord[]>
  getExhibitorPaymentReceipt(token: string, id: string): Promise<PaymentReceipt>
  getExhibitorProfile(token: string): Promise<ExhibitorProfile>
  updateExhibitorProfile(token: string, data: ExhibitorProfilePayload): Promise<ExhibitorProfile>
  getExhibitorDocuments(token: string): Promise<CompanyDocument[]>
  createExhibitorDocument(token: string, data: CompanyDocumentPayload): Promise<CompanyDocument>
  deleteExhibitorDocument(token: string, id: string): Promise<void>
  getExhibitorTeam(token: string): Promise<ExhibitorTeamMember[]>
  createExhibitorTeamMember(token: string, data: ExhibitorTeamMemberPayload): Promise<ExhibitorTeamMember>
  updateExhibitorTeamMember(token: string, id: string, data: ExhibitorTeamMemberPayload): Promise<ExhibitorTeamMember>
  deleteExhibitorTeamMember(token: string, id: string): Promise<void>
  uploadMedia(token: string, file: File, purpose?: string): Promise<MediaUpload>
  getExhibitorProducts(token: string, expoId?: string): Promise<Product[]>
  getExhibitorProduct(token: string, id: string): Promise<Product>
  createExhibitorProduct(token: string, data: ProductPayload): Promise<Product>
  updateExhibitorProduct(token: string, id: string, data: ProductPayload): Promise<Product>
  deleteExhibitorProduct(token: string, id: string): Promise<void>
  showcaseExpoProducts(token: string, expoId: string, productIds: string[]): Promise<{ products: Product[] }>
  removeExpoShowcaseProduct(token: string, expoId: string, productId: string): Promise<{ status: string }>
  getAvailableExpos(token: string): Promise<AvailableExpo[]>
  getMyExpos(token: string): Promise<MyExpoRegistration[]>
  createExhibitorActivationPayment(token: string, expoId: string, idempotencyKey?: string, includeAdsAddon?: boolean, roiEstimate?: ROIEstimate, paymentChannels?: PaystackPaymentChannel[], paymentMethods?: CheckoutPaymentMethod[]): Promise<{ payment: ExhibitorPaymentRecord; authorizationUrl: string; reference?: string; requiresRedirect?: boolean }>
  verifyExhibitorPaystackPayment(token: string, reference: string): Promise<{ payment: ExhibitorPaymentRecord; commissionSplit: unknown; redirectTo: string }>
  confirmExhibitorPayment(token: string, paymentId: string): Promise<{ payment: ExhibitorPaymentRecord; commissionSplit: unknown }>
  getExpoQRCode(token: string, expoId: string): Promise<{ id: string; expoId: string; expoExhibitorId: string; code: string; targetPath: string; type: string; active: boolean; createdAt: string }>
  downloadExpoQRCode(token: string, expoId: string): Promise<Blob>
  getExpoLeads(token: string, expoId: string): Promise<Lead[]>
  createExpoLead(token: string, expoId: string, data: LeadCreatePayload): Promise<Lead>
  updateExpoLead(token: string, leadId: string, data: LeadUpdatePayload): Promise<Lead>
  recordExpoLeadActivity(token: string, leadId: string, data: LeadActivityPayload): Promise<LeadActivityRecord>
  sendExpoLeadMessage(token: string, leadId: string, data: LeadMessagePayload): Promise<{ notification: NotificationRecord; activity: LeadActivityRecord; lead: Lead }>
  getExpoConversations(token: string, expoId: string): Promise<ExhibitorConversationThread[]>
  sendExpoChatMessage(token: string, expoId: string, threadId: string, data: ChatMessagePayload): Promise<{ thread: ExhibitorConversationThread; message: ChatMessage }>
  getExpoLiveStream(token: string, expoId: string): Promise<ExhibitorLiveStream>
  updateExpoLiveStream(token: string, expoId: string, data: ExhibitorLiveStreamPayload): Promise<ExhibitorLiveStream>
  exportExpoLeads(token: string, expoId: string): Promise<Blob>
  getExpoPreOrders(token: string, expoId: string): Promise<PreOrder[]>
  updateExpoPreOrderStatus(token: string, expoId: string, orderId: string, status: PreOrder["status"]): Promise<PreOrder>
  getExpoReminders(token: string, expoId: string): Promise<Reminder[]>
  getExpoCalendarInvites(token: string, expoId: string): Promise<CalendarInvite[]>
  createExpoMeeting(token: string, expoId: string, data: MeetingPayload): Promise<CalendarInvite>
  deleteExpoMeeting(token: string, expoId: string, meetingId: string): Promise<{ status: string }>
  getExpoAIAnalysis(token: string, expoId: string): Promise<AIAnalysis>
  getExpoROI(token: string, expoId: string): Promise<ROIEstimate>
  updateExpoROI(token: string, expoId: string, data: ROIEstimate): Promise<ROIEstimate>
  getExpoAIAnalyticsSummary(token: string, expoId: string): Promise<AIAnalyticsSummary>
  generateExpoAIAnalyticsSummary(token: string, expoId: string): Promise<AIAnalyticsSummary>
  getExpoVisitors(token: string, expoId: string): Promise<ExpoVisitor[]>
  getExpoFeedback(token: string, expoId: string): Promise<ExhibitorFeedback[]>
  submitOrganizerFeedback(token: string, expoId: string, data: OrganizerFeedbackPayload): Promise<OrganizerFeedbackSubmission>
  getExpoCampaignDrafts(token: string, expoId: string): Promise<ExhibitorCampaignDraft[]>
  createExpoCampaignDraft(token: string, expoId: string, data: ExhibitorCampaignDraftPayload): Promise<ExhibitorCampaignDraft>
  getExpoDocuments(token: string, expoId: string): Promise<ExpoDocument[]>
  createExpoDocument(token: string, expoId: string, data: CompanyDocumentPayload): Promise<ExpoDocument>
  deleteExpoDocument(token: string, expoId: string, id: string): Promise<void>
  getExpoAdCampaigns(token: string, expoId: string): Promise<AdCampaign[]>
  createExpoAdCampaign(token: string, expoId: string, data: Partial<AdCampaign>): Promise<AdCampaign>
  updateExpoAdCampaign(token: string, expoId: string, adId: string, data: Partial<AdCampaign>): Promise<AdCampaign>
  // Sponsor APIs
  getSponsorCampaigns(token: string): Promise<SponsorCampaign[]>
  getSponsorCampaign(token: string, id: string): Promise<SponsorCampaign>
  createSponsorCampaign(token: string, data: Partial<SponsorCampaign>): Promise<SponsorCampaign>
  getSponsorAds(token: string): Promise<SponsorAd[]>
  getSponsorAd(token: string, id: string): Promise<SponsorAd>
  createSponsorAd(token: string, data: Partial<SponsorAd>): Promise<SponsorAd>
  createSponsorAdPayment(token: string, adId: string): Promise<{ payment: SponsorPayment; authorizationUrl: string }>
  confirmSponsorAdPayment(token: string, paymentId: string): Promise<{ payment: SponsorPayment; ad: SponsorAd }>
  trackSponsorAd(adId: string, event: "impression" | "click"): Promise<{ ad: SponsorAd }>
  getSponsorPayments(token: string): Promise<SponsorPayment[]>
  getSponsorPaymentReceipt(token: string, id: string): Promise<PaymentReceipt>
  getSponsorDashboard(token: string): Promise<SponsorDashboardStats>
  getSponsorReports(token: string): Promise<any>
  getSponsorReportsAISummary(token: string): Promise<AIAnalyticsSummary>
  generateSponsorReportsAISummary(token: string): Promise<AIAnalyticsSummary>
  // Visitor APIs
  getVisitorDashboard(token: string): Promise<VisitorDashboardStats>
  getVisitorExpos(token: string): Promise<VisitorExpo[]>
  getVisitorExpoDetails(token: string, id: string): Promise<VisitorExpo>
  createVisitorExpoAction(token: string, expoId: string, data: VisitorExpoActionPayload): Promise<Lead>
  getVisitorFavorites(token: string): Promise<VisitorFavorite[]>
  addFavorite(token: string, type: "expo" | "exhibitor", itemId: string): Promise<void>
  removeFavorite(token: string, favoriteId: string): Promise<void>
  getVisitorTimeline(token: string): Promise<VisitorTimelineDay[]>
  getVisitorCalendar(token: string): Promise<VisitorCalendarItem[]>
  getVisitorMessages(token: string): Promise<VisitorMessage[]>
  sendMessage(token: string, exhibitorId: string, message: string): Promise<void>
  getVisitorExpoConversations(token: string, expoId: string): Promise<ExhibitorConversationThread[]>
  sendVisitorExpoChatMessage(token: string, expoId: string, exhibitorId: string, data: ChatMessagePayload): Promise<{ thread: ExhibitorConversationThread; message: ChatMessage }>
  getVisitorFeedback(token: string): Promise<VisitorFeedback[]>
  submitFeedback(token: string, expoId: string, rating: number, comment: string, exhibitorId?: string): Promise<VisitorFeedback>
  getVisitorPreOrders(token: string): Promise<VisitorPreOrder[]>
  createPreOrder(token: string, exhibitorId: string, productName: string, quantity: number): Promise<VisitorPreOrder>
  getVisitorSettings(token: string): Promise<VisitorSettings>
  updateVisitorSettings(token: string, settings: Partial<VisitorSettings>): Promise<VisitorSettings>
}

export interface SponsorCampaign {
  id: string
  name: string
  objective: string
  budget: number
  status: "draft" | "active" | "paused" | "completed"
  startDate: string
  endDate: string
  adsCount: number
  totalImpressions: number
  totalClicks: number
  totalSpend: number
  createdAt: string
}

export interface SponsorAd {
  id: string
  expoId?: string
  sponsorId?: string
  sponsorName?: string
  campaignId: string
  campaignName: string
  name: string
  placement: "banner" | "sidebar" | "popup" | "video"
  dimensions: string
  mediaUrl: string
  mediaType: "image" | "video"
  budget: number
  dailySpend: number
  impressions: number
  clicks: number
  ctr: number
  status: "draft" | "pending_payment" | "active" | "paused" | "rejected"
  paymentStatus: "unpaid" | "paid" | "refunded"
  createdAt: string
}

export interface SponsorPayment {
  id: string
  reference: string
  adId: string
  adName: string
  amount: number
  currency: string
  paymentMethod: string
  status: "pending" | "paid" | "failed" | "refunded"
  paidAt: string
}

export interface SponsorDashboardStats {
  totalCampaigns: number
  activeCampaigns: number
  totalAds: number
  activeAds: number
  totalImpressions: number
  totalClicks: number
  averageCtr: number
  totalSpend: number
  recentAds: SponsorAd[]
}

// Visitor Interfaces
export interface VisitorDashboardStats {
  upcomingExposCount: number
  totalVisits: number
  favoritesCount: number
  recentActivity: VisitorActivityItem[]
  upcomingExpos: VisitorExpoSummary[]
}

export interface VisitorActivityItem {
  id: string
  type: "visited" | "saved" | "contact" | "feedback" | "preorder"
  title: string
  description: string
  timestamp: string
  expoId?: string
  exhibitorId?: string
}

export interface VisitorExpoSummary {
  id: string
  expoId: string
  expoName: string
  expoDate: string
  venue: string
  status: "upcoming" | "completed" | "cancelled"
  qrCode: string
}

export interface VisitorExpo {
  id: string
  name: string
  description: string
  startDate: string
  endDate: string
  venue: string
  venueAddress: string
  bannerImage: string
  category: string
  organizerName: string
  isBookmarked: boolean
  booths?: VisitorBooth[]
  ads?: SponsorAd[]
}

export interface VisitorBooth {
  id: string
  expoId: string
  exhibitorId: string
  exhibitorName: string
  exhibitorLogo?: string
  description?: string
  email?: string
  phone?: string
  address?: string
  categories?: string[]
  boothNumber: string
  boothLabel: string
  products: Product[]
  companyDocuments?: CompanyDocument[]
  expoDocuments?: ExpoDocument[]
}

export interface VisitorExpoActionPayload {
  boothId: string
  action: "interest" | "meeting" | "pre_order" | "visit"
  name?: string
  email?: string
  phone?: string
  source?: string
  notes?: string
  productId?: string
  productName?: string
  productPrice?: number
  productCurrency?: string
  quantity?: number
  scheduledAt?: string
}

export interface VisitorFavorite {
  id: string
  type: "expo" | "exhibitor"
  itemId: string
  name: string
  image: string
  addedAt: string
}

export interface VisitorTimelineDay {
  date: string
  activities: VisitorActivityItem[]
}

export interface VisitorCalendarItem {
  id: string
  expoId: string
  expoName: string
  date: string
  time: string
  venue: string
  type: "expo" | "meeting" | "reminder"
}

export interface VisitorMessage {
  id: string
  exhibitorId: string
  exhibitorName: string
  exhibitorLogo: string
  lastMessage: string
  timestamp: string
  unread: boolean
}

export interface VisitorFeedback {
  id: string
  expoId: string
  expoName: string
  rating: number
  comment: string
  submittedAt: string
}

export interface VisitorPreOrder {
  id: string
  exhibitorId: string
  exhibitorName: string
  productName: string
  quantity: number
  price: number
  status: "pending" | "confirmed" | "completed"
  orderedAt: string
}

export interface VisitorSettings {
  name: string
  email: string
  phone: string
  company?: string
  notifications: {
    email: boolean
    push: boolean
    expoUpdates: boolean
    reminders: boolean
  }
}
