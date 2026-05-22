import { Role } from "@/lib/api/contracts"

export const roleRedirectMap: Record<Role, string> = {
  visitor: "/visitor",
  exhibitor: "/exhibitor",
  organizer: "/organizer",
  sponsorship: "/sponsor",
  administrator: "/administrator",
  super_administrator: "/administrator"
}

export function getRedirectForRole(role: Role) {
  return roleRedirectMap[role]
}
