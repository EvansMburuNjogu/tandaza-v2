import { api } from "@/lib/api"
import {
  AdRecord,
  AuditLogRecord,
  ExhibitorRecord,
  ExpoRecord,
  NotificationRecord,
  OrganizerRecord,
  PaymentRecord,
  SettlementRecord,
  SponsorRecord,
  UserRecord,
  VisitorRecord
} from "@/lib/api/contracts"

export async function getOrganizerByID(token: string, id: string): Promise<OrganizerRecord | null> {
  const response = await api.getAdminOrganizers(token)
  return response.items.find((item) => item.id === id) || null
}

export async function getExhibitorByID(token: string, id: string): Promise<ExhibitorRecord | null> {
  const response = await api.getAdminExhibitors(token)
  return response.items.find((item) => item.id === id) || null
}
  
export async function getExpoByID(token: string, id: string): Promise<ExpoRecord | null> {
  const response = await api.getAdminExpos(token)
  return response.items.find((item) => item.id === id) || null
}

export async function getSystemUserByID(token: string, id: string): Promise<UserRecord | null> {
  const response = await api.getAdminUsers(token)
  return response.items.find((item) => item.id === id) || null
}

export async function getSponsorByID(token: string, id: string): Promise<SponsorRecord | null> {
  const response = await api.getAdminSponsors(token)
  return response.items.find((item) => item.id === id) || null
}

export async function getVisitorByID(token: string, id: string): Promise<VisitorRecord | null> {
  const response = await api.getAdminVisitors(token)
  return response.items.find((item) => item.id === id) || null
}

export async function getNotificationByID(token: string, id: string): Promise<NotificationRecord | null> {
  const response = await api.getAdminNotifications(token)
  return response.items.find((item) => item.id === id) || null
}

export async function getSettlementByID(token: string, id: string): Promise<SettlementRecord | null> {
  const response = await api.getAdminSettlements(token)
  return response.items.find((item) => item.id === id) || null
}

export async function getAuditLogByID(token: string, id: string): Promise<AuditLogRecord | null> {
  const response = await api.getAdminAuditLogs(token)
  return response.items.find((item) => item.id === id) || null
}

export async function getPayments(token: string): Promise<PaymentRecord[]> {
  const response = await api.getAdminPayments(token)
  return response.items
}

export async function getAds(token: string): Promise<AdRecord[]> {
  const response = await api.getAdminAds(token)
  return response.items
}

export async function getOrganizerDetailView(token: string, id: string) {
  const organizer = await getOrganizerByID(token, id)
  if (!organizer) return null

  const [allExpos, allSettlements, allPayments] = await Promise.all([
    api.getAdminExpos(token),
    api.getAdminSettlements(token),
    api.getAdminPayments(token)
  ])

  const expos = allExpos.items.filter((expo) => expo.organizer === organizer.company)
  const settlements = allSettlements.items.filter((settlement) => settlement.organizer === organizer.company)
  const expoNames = expos.map((expo) => expo.name)
  const payments = allPayments.items.filter((payment) => expoNames.includes(payment.expoName) && payment.status === "paid")

  return { organizer, expos, settlements, payments, visitors: [] as VisitorRecord[] }
}

export async function getExhibitorDetailView(token: string, id: string) {
  const exhibitor = await getExhibitorByID(token, id)
  if (!exhibitor) return null

  const [allExpos, allPayments, allAds] = await Promise.all([
    api.getAdminExpos(token),
    api.getAdminPayments(token),
    api.getAdminAds(token)
  ])

  const expoAssignments = await Promise.all(
    allExpos.items.map(async (expo) => {
      try {
        const response = await api.getAdminExpoExhibitors(token, expo.id)
        return response.items
          .filter((item) => item.id === exhibitor.id)
          .map((item) => ({ ...item, expoId: expo.id, expoName: expo.name, expo }))
      } catch {
        return []
      }
    })
  )
  const assignments = expoAssignments.flat()
  const assignedExpoNames = new Set(assignments.map((item) => item.expoName))
  const expos = allExpos.items.filter((expo) => assignedExpoNames.has(expo.name))
  const payments = allPayments.items.filter((item) => item.payerName === exhibitor.company || item.payerName === exhibitor.contact || item.payerName === exhibitor.email)
  const ads = allAds.items.filter((item) => item.ownerName === exhibitor.company || item.ownerName === exhibitor.contact || item.ownerName === exhibitor.email)
  const analytics = expos.map((expo) => {
    const expoPayments = payments.filter((item) => item.expoName === expo.name)
    const expoAds = ads.filter((item) => item.expoName === expo.name)
    const assignment = assignments.find((item) => item.expoId === expo.id || item.expoName === expo.name)
    return {
      id: expo.id,
      expo,
      assignmentStatus: assignment?.status || "not assigned",
      booth: "Expo workspace",
      paidTotal: expoPayments.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0),
      paymentCount: expoPayments.length,
      impressions: expoAds.reduce((sum, item) => sum + item.impressions, 0),
      clicks: expoAds.reduce((sum, item) => sum + item.clicks, 0)
    }
  })

  return { exhibitor, assignments, expos, payments, ads, analytics }
}

export async function getExpoDetailView(token: string, id: string) {
  const expo = await getExpoByID(token, id)
  if (!expo) return null

  const [allExhibitors, allPayments, allAds] = await Promise.all([
    api.getAdminExhibitors(token),
    api.getAdminPayments(token),
    api.getAdminAds(token)
  ])

  const exhibitors = allExhibitors.items.filter((item) => item.assignedExpos.includes(expo.name))
  const payments = allPayments.items.filter((item) => item.expoName === expo.name)
  const ads = allAds.items.filter((item) => item.expoName === expo.name)
  const metrics = { visitorIDs: [] as string[], leads: 0, engagements: ads.reduce((sum, item) => sum + item.clicks, 0) }

  return { expo, exhibitors, visitors: [] as VisitorRecord[], payments, ads, metrics }
}

export async function getSponsorDetailView(token: string, id: string) {
  const sponsor = await getSponsorByID(token, id)
  if (!sponsor) return null

  const [allPayments, allAds] = await Promise.all([api.getAdminPayments(token), api.getAdminAds(token)])
  const payments = allPayments.items.filter((item) => item.payerName === sponsor.company)
  const ads = allAds.items.filter((item) => item.ownerName === sponsor.company)
  const engagements = ads.reduce((sum, item) => sum + item.clicks, 0)

  return { sponsor, payments, ads, engagements }
}

export async function getSettlementDetailView(token: string, id: string) {
  const settlement = await getSettlementByID(token, id)
  if (!settlement) return null

  const allPayments = await api.getAdminPayments(token)
  const exhibitorPayments = allPayments.items.filter((item) => item.expoName === settlement.expo && item.payerRole === "exhibitor" && item.status === "paid")
  const paidExhibitorCount = new Set(exhibitorPayments.map((item) => item.payerName)).size
  const collected = exhibitorPayments.reduce((sum, item) => sum + item.amount, 0)

  return { settlement, exhibitorPayments, paidExhibitorCount, collected }
}
