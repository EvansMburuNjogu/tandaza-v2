export type AdminNavItem = {
  label: string
  href: string
  section: "Country Operations" | "Country Revenue" | "Global Platform" | "Operations" | "Revenue" | "Messaging" | "Control" | "Core" | "Configuration" | "Insights" | "Finance" | "Discover" | "Activity" | "My Items" | "Communication" | "Shopping" | "My Expos"
  icon: string
}

export const adminNavItems: AdminNavItem[] = [
  { label: "Overview", href: "/administrator", section: "Country Operations", icon: "overview" },
  { label: "Expos", href: "/administrator/expos", section: "Country Operations", icon: "expos" },
  { label: "Organizers", href: "/administrator/organizers", section: "Country Operations", icon: "organizers" },
  { label: "Exhibitors", href: "/administrator/exhibitors", section: "Country Operations", icon: "exhibitors" },
  { label: "Visitors", href: "/administrator/visitors", section: "Country Operations", icon: "visitors" },
  { label: "Reports & Analytics", href: "/administrator/reports", section: "Country Revenue", icon: "reports" },
  { label: "Payments", href: "/administrator/payments", section: "Country Revenue", icon: "payments" },
  { label: "Settlements", href: "/administrator/settlements", section: "Country Revenue", icon: "settlements" },
  { label: "Sponsors", href: "/administrator/sponsors", section: "Country Revenue", icon: "handshake" },
  { label: "Sponsor Plans", href: "/administrator/sponsor-plans", section: "Country Revenue", icon: "sponsorPlans" },
  { label: "Ads", href: "/administrator/ads", section: "Country Revenue", icon: "ads" },
  { label: "Global Functions", href: "/administrator/global", section: "Global Platform", icon: "global" },
  { label: "System Users", href: "/administrator/users", section: "Global Platform", icon: "users" },
  { label: "Notifications", href: "/administrator/notifications", section: "Global Platform", icon: "notifications" },
  { label: "Audit Logs", href: "/administrator/audit-logs", section: "Global Platform", icon: "audit" },
  { label: "Categories", href: "/administrator/categories", section: "Global Platform", icon: "categories" },
  { label: "Countries", href: "/administrator/countries", section: "Global Platform", icon: "countries" },
  { label: "Settings", href: "/administrator/settings", section: "Global Platform", icon: "controls" }
]

export function adminNavItemsForRole(role?: string | null) {
  if (role === "super_administrator") {
    return adminNavItems
  }
  return adminNavItems.filter((item) => item.section !== "Global Platform")
}

export const organizerNavItems: AdminNavItem[] = [
  { label: "Dashboard", href: "/organizer", section: "Core", icon: "overview" },
  { label: "Reports & Analytics", href: "/organizer/reports", section: "Insights", icon: "reports" },
  { label: "Expos", href: "/organizer/expos", section: "Operations", icon: "expos" },
  { label: "Exhibitors", href: "/organizer/exhibitors", section: "Operations", icon: "exhibitors" },
  { label: "Visitors", href: "/organizer/visitors", section: "Operations", icon: "visitors" },
  { label: "Feedback", href: "/organizer/feedback", section: "Operations", icon: "feedback" },
  { label: "Team", href: "/organizer/team", section: "Operations", icon: "team" },
  { label: "Sponsors", href: "/organizer/sponsors", section: "Operations", icon: "sponsors" },
  { label: "Payments", href: "/organizer/payments", section: "Finance", icon: "payments" },
  { label: "Settlements", href: "/organizer/settlements", section: "Finance", icon: "settlements" },
  { label: "Settings", href: "/organizer/settings", section: "Configuration", icon: "settings" }
]

export const exhibitorNavItems: AdminNavItem[] = [
  { label: "Dashboard", href: "/exhibitor", section: "Core", icon: "overview" },
  { label: "Browse Expos", href: "/exhibitor/expos", section: "Operations", icon: "expos" },
  { label: "My Expos", href: "/exhibitor/my-expos", section: "Operations", icon: "storefront" },
  { label: "Products", href: "/exhibitor/products", section: "Operations", icon: "products" },
  { label: "Payments", href: "/exhibitor/payments", section: "Finance", icon: "payments" },
  { label: "Settings", href: "/exhibitor/settings", section: "Configuration", icon: "settings" }
]

export const sponsorNavItems: AdminNavItem[] = [
  { label: "Dashboard", href: "/sponsor", section: "Core", icon: "overview" },
  { label: "Reports & Analytics", href: "/sponsor/reports", section: "Insights", icon: "reports" },
  { label: "Campaigns", href: "/sponsor/campaigns", section: "Operations", icon: "campaigns" },
  { label: "Ads", href: "/sponsor/ads", section: "Operations", icon: "ads" },
  { label: "Payments", href: "/sponsor/payments", section: "Finance", icon: "payments" },
  { label: "Settings", href: "/sponsor/settings", section: "Configuration", icon: "settings" }
]

export const visitorNavItems: AdminNavItem[] = [
  { label: "Home", href: "/visitor", section: "Core", icon: "home" },
  { label: "Expos", href: "/visitor/expos", section: "Discover", icon: "explore" },
  { label: "Favorites", href: "/visitor/favorites", section: "Discover", icon: "favorite" },
  { label: "Calendar", href: "/visitor/calendar", section: "Activity", icon: "calendar" },
  { label: "Pre-orders", href: "/visitor/orders", section: "Activity", icon: "orders" },
  { label: "Settings", href: "/visitor/settings", section: "Configuration", icon: "settings" }
]

export const pageTitles: Record<string, { title: string; description: string }> = {
  "/administrator": {
    title: "Overview",
    description: "Country-scoped command center for Tandaza operations and revenue."
  },
  "/administrator/global": {
    title: "Global Functions",
    description: "Platform-wide controls that are not tied to a selected country."
  },
  "/administrator/reports": {
    title: "Reports & Analytics",
    description: "Track platform growth, expo performance, and revenue health across Tandaza operations."
  },
  "/administrator/visitors": {
    title: "Visitor Management",
    description: "Monitor platform visitors, engagement levels, and account activity."
  },
  "/administrator/payments": {
    title: "Payments",
    description: "Review all payments processed across expos, sponsorships, and platform activity."
  },
  "/administrator/organizers": {
    title: "Organizer Management",
    description: "Review organizer accounts, approvals, and expo assignments."
  },
  "/administrator/exhibitors": {
    title: "Exhibitor Management",
    description: "Control exhibitor profiles, statuses, and expo participation."
  },
  "/administrator/sponsors": {
    title: "Sponsor Management",
    description: "Track sponsor packages, campaign health, and account state."
  },
  "/administrator/expos": {
    title: "Expo Management",
    description: "Create, assign, and monitor expos from one operations console."
  },
  "/administrator/ads": {
    title: "Ads",
    description: "Inspect ad campaigns created by exhibitors and sponsors across the platform."
  },
  "/administrator/notifications": {
    title: "Notification Delivery",
    description: "Inspect all system messages sent to users across channels."
  },
  "/administrator/settlements": {
    title: "Settlement Review",
    description: "Monitor organizer settlements, commission exposure, and disbursement readiness."
  },
  "/administrator/settings": {
    title: "Global Settings",
    description: "Manage global email, WhatsApp, and Paystack configuration."
  },
  "/administrator/users": {
    title: "System Users",
    description: "Manage internal Tandaza operators, administrators, and support-level access."
  },
  "/administrator/audit-logs": {
    title: "Audit Logs",
    description: "Trace critical actions across admin operations and platform activity."
  },
  "/administrator/sponsor-plans": {
    title: "Sponsor Plans",
    description: "Manage country-scoped sponsor packages with tier-based pricing and commission settings."
  },
  "/administrator/categories": {
    title: "Categories",
    description: "Manage global expo categories used across Tandaza markets."
  },
  "/administrator/countries": {
    title: "Countries",
    description: "Onboard country markets, default currencies, timezones, and payment methods."
  }
}

const dynamicPageTitles: Array<{ test: RegExp; meta: { title: string; description: string } }> = [
  { test: /^\/administrator\/organizers\/new$/, meta: { title: "New Organizer", description: "Create a new organizer record and prepare it for expo assignments." } },
  { test: /^\/administrator\/organizers\/[^/]+$/, meta: { title: "Organizer Details", description: "Inspect organizer details, status, and key profile information." } },
  { test: /^\/administrator\/organizers\/[^/]+\/edit$/, meta: { title: "Edit Organizer", description: "Update organizer details, account state, and core business information." } },
  { test: /^\/administrator\/exhibitors\/new$/, meta: { title: "New Exhibitor", description: "Create a new exhibitor record and prepare it for expo participation." } },
  { test: /^\/administrator\/exhibitors\/[^/]+$/, meta: { title: "Exhibitor Details", description: "Inspect exhibitor company details, contact information, and account state." } },
  { test: /^\/administrator\/exhibitors\/[^/]+\/edit$/, meta: { title: "Edit Exhibitor", description: "Update exhibitor details, assignments, and status settings." } },
  { test: /^\/administrator\/sponsors\/new$/, meta: { title: "New Sponsor", description: "Create a sponsor profile and prepare it for package and campaign activity." } },
  { test: /^\/administrator\/sponsors\/[^/]+$/, meta: { title: "Sponsor Details", description: "Inspect sponsor account details, package level, and campaign readiness." } },
  { test: /^\/administrator\/sponsors\/[^/]+\/edit$/, meta: { title: "Edit Sponsor", description: "Update sponsor details, package assignment, and account status." } },
  { test: /^\/administrator\/sponsor-plans\/new$/, meta: { title: "Create Sponsor Plan", description: "Create a new subscription plan with tier-based pricing and features." } },
  { test: /^\/administrator\/sponsor-plans\/[^/]+$/, meta: { title: "Plan Details", description: "View sponsor plan details, features, and commission settings." } },
  { test: /^\/administrator\/sponsor-plans\/[^/]+\/edit$/, meta: { title: "Edit Plan", description: "Update sponsor plan pricing, features, and commission settings." } },
  { test: /^\/administrator\/expos\/new$/, meta: { title: "Create Expo", description: "Create a new expo and set its primary organizer and operating details." } },
  { test: /^\/administrator\/expos\/[^/]+$/, meta: { title: "Expo Details", description: "Inspect expo information, current status, and organizer ownership." } },
  { test: /^\/administrator\/expos\/[^/]+\/edit$/, meta: { title: "Edit Expo", description: "Update expo scheduling, location, and assignment information." } },
  { test: /^\/administrator\/users\/new$/, meta: { title: "New System User", description: "Add a new internal Tandaza operator account with controlled access." } },
  { test: /^\/administrator\/users\/[^/]+$/, meta: { title: "System User Details", description: "Review internal operator account information and recent access context." } },
  { test: /^\/administrator\/users\/[^/]+\/edit$/, meta: { title: "Edit System User", description: "Update internal user details, role, and account state." } },
  { test: /^\/administrator\/visitors\/[^/]+$/, meta: { title: "Visitor Details", description: "Inspect visitor account details, engagement metrics, and platform activity." } },
  { test: /^\/administrator\/notifications\/[^/]+$/, meta: { title: "Notification Detail", description: "Review delivery metadata, channel status, and recipient context for a sent notification." } },
  { test: /^\/administrator\/settlements\/[^/]+$/, meta: { title: "Settlement Detail", description: "Inspect the settlement breakdown, payout values, and approval state." } },
  { test: /^\/administrator\/audit-logs\/[^/]+$/, meta: { title: "Audit Entry", description: "Inspect the full metadata behind a recorded admin or platform activity entry." } },
  // Organizer routes
  { test: /^\/organizer$/, meta: { title: "Dashboard", description: "Overview of your expos, visitors, revenue, and performance metrics." } },
  { test: /^\/organizer\/reports$/, meta: { title: "Reports & Analytics", description: "Track your expo performance, revenue, visitor engagement, and export reports." } },
  { test: /^\/organizer\/expos$/, meta: { title: "My Expos", description: "Manage your expos, schedules, and exhibitor assignments." } },
  { test: /^\/organizer\/expos\/new$/, meta: { title: "Create Expo", description: "Create a new expo and set its details." } },
  { test: /^\/organizer\/expos\/[^/]+$/, meta: { title: "Expo Details", description: "View expo details, exhibitors, visitors, and performance." } },
  { test: /^\/organizer\/expos\/[^/]+\/edit$/, meta: { title: "Edit Expo", description: "Update expo details, schedule, and settings." } },
  { test: /^\/organizer\/exhibitors$/, meta: { title: "Exhibitors", description: "View and manage exhibitors participating in your expos." } },
  { test: /^\/organizer\/visitors$/, meta: { title: "Visitors", description: "Track visitors attending your expos and their engagement." } },
  { test: /^\/organizer\/feedback$/, meta: { title: "Feedback", description: "View feedback from visitors and exhibitors to improve your expos." } },
  { test: /^\/organizer\/feedback\/[^/]+$/, meta: { title: "Feedback Details", description: "View detailed feedback and improvement suggestions." } },
  { test: /^\/organizer\/team$/, meta: { title: "Team", description: "Manage your team members and their permissions." } },
  { test: /^\/organizer\/team\/new$/, meta: { title: "Add Team Member", description: "Add a new team member to your organization." } },
  { test: /^\/organizer\/team\/[^/]+$/, meta: { title: "Team Member Details", description: "View team member details and permissions." } },
  { test: /^\/organizer\/team\/[^/]+\/edit$/, meta: { title: "Edit Team Member", description: "Update team member role and permissions." } },
  { test: /^\/organizer\/sponsors$/, meta: { title: "Sponsors", description: "Manage your invited sponsors and track commission earnings." } },
  { test: /^\/organizer\/sponsors\/invite$/, meta: { title: "Invite Sponsor", description: "Invite a new sponsor to join your expos." } },
  { test: /^\/organizer\/sponsors\/[^/]+$/, meta: { title: "Sponsor Details", description: "View sponsor details and commission earnings." } },
  { test: /^\/organizer\/payments$/, meta: { title: "Payments", description: "View payments received for your expos." } },
  { test: /^\/organizer\/settlements$/, meta: { title: "Settlements", description: "Track your earnings, commissions, and payout status." } },
  { test: /^\/organizer\/settlements\/[^/]+$/, meta: { title: "Settlement Invoice", description: "View settlement details and download invoice." } },
  { test: /^\/organizer\/payments\/[^/]+$/, meta: { title: "Payment Details", description: "View payment details and receipt." } },
  { test: /^\/organizer\/payments\/[^/]+\/receipt$/, meta: { title: "Payment Receipt", description: "View and download payment receipt." } },
  { test: /^\/organizer\/settings$/, meta: { title: "Settings", description: "Manage your profile and account settings." } },
  // Exhibitor routes
  { test: /^\/exhibitor$/, meta: { title: "Dashboard", description: "Overview of your expo registrations, payments, and lead activity." } },
  { test: /^\/exhibitor\/expos$/, meta: { title: "Browse Expos", description: "Browse expos available for digital workspace activation." } },
  { test: /^\/exhibitor\/expos\/[^/]+$/, meta: { title: "Expo Details", description: "View expo details and activate your exhibitor workspace." } },
  { test: /^\/exhibitor\/products$/, meta: { title: "Products", description: "Manage your product catalog for exhibitions." } },
  { test: /^\/exhibitor\/products\/new$/, meta: { title: "Add Product", description: "Add a new product to your catalog." } },
  { test: /^\/exhibitor\/products\/[^/]+\/edit$/, meta: { title: "Edit Product", description: "Edit product details." } },
  { test: /^\/exhibitor\/products\/[^/]+$/, meta: { title: "Edit Product", description: "Edit product details." } },
  { test: /^\/exhibitor\/my-expos$/, meta: { title: "My Expos", description: "View your registered expos and manage them." } },
  { test: /^\/exhibitor\/my-expos\/[^/]+$/, meta: { title: "Expo Dashboard", description: "Manage your expo: leads, ads, analytics, and more." } },
  { test: /^\/exhibitor\/my-expos\/[^/]+\/ads\/new$/, meta: { title: "Create Ad Campaign", description: "Create a new advertising campaign for your expo." } },
  { test: /^\/exhibitor\/payments$/, meta: { title: "Payments", description: "View your payment history and make payments for expos." } },
  { test: /^\/exhibitor\/payments\/[^/]+$/, meta: { title: "Payment Details", description: "View payment details and download receipt." } },
  { test: /^\/exhibitor\/settings$/, meta: { title: "Settings", description: "Manage your exhibitor profile and account settings." } },
  // Sponsor routes
  { test: /^\/sponsor$/, meta: { title: "Dashboard", description: "Overview of your campaigns, ads, and performance metrics." } },
  { test: /^\/sponsor\/reports$/, meta: { title: "Reports & Analytics", description: "Track your campaign performance, impressions, clicks, and ROI." } },
  { test: /^\/sponsor\/campaigns$/, meta: { title: "Campaigns", description: "Manage your advertising campaigns." } },
  { test: /^\/sponsor\/campaigns\/new$/, meta: { title: "Create Campaign", description: "Create a new advertising campaign." } },
  { test: /^\/sponsor\/campaigns\/[^/]+$/, meta: { title: "Campaign Details", description: "View campaign details and performance." } },
  { test: /^\/sponsor\/ads$/, meta: { title: "Ads", description: "Manage your advertisements across placements." } },
  { test: /^\/sponsor\/ads\/new$/, meta: { title: "Create Ad", description: "Create a new advertisement with payment." } },
  { test: /^\/sponsor\/ads\/[^/]+$/, meta: { title: "Ad Details", description: "View ad performance and details." } },
  { test: /^\/sponsor\/payments$/, meta: { title: "Payments", description: "View your payment history for ads." } },
  { test: /^\/sponsor\/payments\/[^/]+$/, meta: { title: "Payment Details", description: "View payment details and download receipt." } },
  { test: /^\/sponsor\/payments\/[^/]+\/receipt$/, meta: { title: "Payment Receipt", description: "View and download payment receipt." } },
  { test: /^\/sponsor\/settings$/, meta: { title: "Settings", description: "Manage your sponsor profile and account settings." } },
  // Visitor routes
  { test: /^\/visitor$/, meta: { title: "Home", description: "Your quick view of expos, meetings, and recent activity." } },
  { test: /^\/visitor\/explore$/, meta: { title: "Explore", description: "Discover expos and exhibitors." } },
  { test: /^\/visitor\/expos$/, meta: { title: "Expos", description: "Find expos and open exhibitor profiles." } },
  { test: /^\/visitor\/expos\/[^/]+$/, meta: { title: "Expo Details", description: "View exhibitors, products, chat, and visitor actions." } },
  { test: /^\/visitor\/expos\/[^/]+\/exhibitors\/[^/]+$/, meta: { title: "Exhibitor", description: "View company details, products, downloads, and visitor actions." } },
  { test: /^\/visitor\/expos\/[^/]+\/exhibitors\/[^/]+\/chat$/, meta: { title: "Chat", description: "Chat with an exhibitor." } },
  { test: /^\/visitor\/expos\/[^/]+\/exhibitors\/[^/]+\/meeting$/, meta: { title: "Request Meeting", description: "Request a meeting with an exhibitor." } },
  { test: /^\/visitor\/expos\/[^/]+\/exhibitors\/[^/]+\/feedback$/, meta: { title: "Feedback", description: "Share exhibitor feedback." } },
  { test: /^\/visitor\/expos\/[^/]+\/exhibitors\/[^/]+\/pre-order$/, meta: { title: "Pre-order", description: "Send product pre-order interest." } },
  { test: /^\/visitor\/expos\/[^/]+\/exhibitors\/[^/]+\/live-stream$/, meta: { title: "Live Stream", description: "Watch exhibitor live stream content." } },
  { test: /^\/visitor\/expos\/[^/]+\/exhibitors\/[^/]+\/products\/[^/]+$/, meta: { title: "Product", description: "View product details, media, pricing, and pre-order action." } },
  { test: /^\/visitor\/favorites$/, meta: { title: "Favorites", description: "Your saved expos and exhibitors." } },
  { test: /^\/visitor\/messages$/, meta: { title: "Messages", description: "Chat with exhibitors and manage contacts." } },
  { test: /^\/visitor\/calendar$/, meta: { title: "Calendar", description: "Your expo schedule, meetings, and reminders." } },
  { test: /^\/visitor\/orders$/, meta: { title: "Pre-orders", description: "Your product pre-orders from exhibitors." } },
  { test: /^\/visitor\/feedback$/, meta: { title: "Feedback", description: "Your submitted reviews and ratings." } },
  { test: /^\/visitor\/settings$/, meta: { title: "Settings", description: "Manage your profile and notification preferences." } }
]

export function resolvePageMeta(pathname: string) {
  if (pageTitles[pathname]) return pageTitles[pathname]
  return dynamicPageTitles.find((entry) => entry.test.test(pathname))?.meta || pageTitles["/administrator"]
}
