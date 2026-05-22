import type { ComponentType, ReactNode, SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement>

function BaseIcon(props: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {props.children}
    </svg>
  )
}

export function OverviewIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="11" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="18" width="7" height="3" rx="1.5" />
    </BaseIcon>
  )
}

export function UsersIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M16 21V19C16 17.3431 14.6569 16 13 16H7C5.34315 16 4 17.3431 4 19V21" />
      <circle cx="10" cy="8" r="4" />
      <path d="M20 8V14" />
      <path d="M23 11H17" />
    </BaseIcon>
  )
}

export function VisitorIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21C4 17.6863 7.58172 15 12 15C16.4183 15 20 17.6863 20 21" />
      <path d="M18 6L20 8L24 4" />
    </BaseIcon>
  )
}

export function BriefcaseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" />
      <path d="M3 12H21" />
    </BaseIcon>
  )
}

export function StorefrontIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 10L5.5 4H18.5L20 10" />
      <path d="M4 10C4 11.6569 5.34315 13 7 13C8.65685 13 10 11.6569 10 10" />
      <path d="M10 10C10 11.6569 11.3431 13 13 13C14.6569 13 16 11.6569 16 10" />
      <path d="M16 10C16 11.6569 17.3431 13 19 13C20.6569 13 22 11.6569 22 10" />
      <path d="M5 13V20H19V13" />
      <path d="M9 20V16H15V20" />
    </BaseIcon>
  )
}

export function MegaphoneIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 11V13" />
      <path d="M21 8V16" />
      <path d="M7 10L21 6V18L7 14V10Z" />
      <path d="M7 14L9.5 20" />
    </BaseIcon>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3V7" />
      <path d="M8 3V7" />
      <path d="M3 10H21" />
    </BaseIcon>
  )
}

export function BellIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M15 18H9" />
      <path d="M18 16V11C18 7.68629 15.3137 5 12 5C8.68629 5 6 7.68629 6 11V16L4 18H20L18 16Z" />
    </BaseIcon>
  )
}

export function WalletIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 7C3 5.89543 3.89543 5 5 5H19C20.1046 5 21 5.89543 21 7V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z" />
      <path d="M3 9H21" />
      <circle cx="16" cy="14" r="1.5" />
    </BaseIcon>
  )
}

export function ReceiptIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 3H18V21L15.5 19.5L13 21L10.5 19.5L8 21L6 19.8V3Z" />
      <path d="M9 8H15" />
      <path d="M9 12H15" />
      <path d="M9 16H13" />
    </BaseIcon>
  )
}

export function HandshakeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 12L10 9L13 12C14.1046 13.1046 15.8954 13.1046 17 12L18 11" />
      <path d="M3 10L7 6L10 9" />
      <path d="M21 10L17 6L14 9" />
      <path d="M8 14L10 16" />
      <path d="M11 15L13 17" />
      <path d="M14 14L16 16" />
    </BaseIcon>
  )
}

export function LayersIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3L21 8L12 13L3 8L12 3Z" />
      <path d="M3 12L12 17L21 12" />
      <path d="M3 16L12 21L21 16" />
    </BaseIcon>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15A1.65 1.65 0 0 0 19.73 16.82L19.79 16.88A2 2 0 1 1 16.96 19.71L16.9 19.65A1.65 1.65 0 0 0 15.08 19.32A1.65 1.65 0 0 0 14 20.85V21A2 2 0 1 1 10 21V20.91A1.65 1.65 0 0 0 8.91 19.38A1.65 1.65 0 0 0 7.09 19.71L7.03 19.77A2 2 0 1 1 4.2 16.94L4.26 16.88A1.65 1.65 0 0 0 4.59 15.06A1.65 1.65 0 0 0 3.06 14H3A2 2 0 1 1 3 10H3.09A1.65 1.65 0 0 0 4.62 8.91A1.65 1.65 0 0 0 4.29 7.09L4.23 7.03A2 2 0 1 1 7.06 4.2L7.12 4.26A1.65 1.65 0 0 0 8.94 4.59H9A1.65 1.65 0 0 0 10 3.06V3A2 2 0 1 1 14 3V3.09A1.65 1.65 0 0 0 15.09 4.62A1.65 1.65 0 0 0 16.91 4.29L16.97 4.23A2 2 0 1 1 19.8 7.06L19.74 7.12A1.65 1.65 0 0 0 19.41 8.94V9A1.65 1.65 0 0 0 20.94 10H21A2 2 0 1 1 21 14H20.91A1.65 1.65 0 0 0 19.38 15Z" />
    </BaseIcon>
  )
}

export function ClipboardIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12H15" />
      <path d="M9 16H13" />
    </BaseIcon>
  )
}

export function TagsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M20 13L13 20L4 11V4H11L20 13Z" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M14 4L21 11" />
    </BaseIcon>
  )
}

export function GlobeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12H21" />
      <path d="M12 3C14.5 5.5 15.7 8.5 15.7 12C15.7 15.5 14.5 18.5 12 21" />
      <path d="M12 3C9.5 5.5 8.3 8.5 8.3 12C8.3 15.5 9.5 18.5 12 21" />
    </BaseIcon>
  )
}

export function SlidersIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 6H14" />
      <path d="M18 6H20" />
      <circle cx="16" cy="6" r="2" />
      <path d="M4 12H8" />
      <path d="M12 12H20" />
      <circle cx="10" cy="12" r="2" />
      <path d="M4 18H13" />
      <path d="M17 18H20" />
      <circle cx="15" cy="18" r="2" />
    </BaseIcon>
  )
}

export function ChartIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 19H20" />
      <path d="M7 16V10" />
      <path d="M12 16V6" />
      <path d="M17 16V12" />
    </BaseIcon>
  )
}

export function UserCircleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="9" r="3" />
      <path d="M7.5 18C8.5 16 10 15 12 15C14 15 15.5 16 16.5 18" />
    </BaseIcon>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 9L12 15L18 9" />
    </BaseIcon>
  )
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M18 15L12 9L6 15" />
    </BaseIcon>
  )
}

export function ArrowsUpDownIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 7L12 3L16 7" />
      <path d="M12 3V21" />
      <path d="M16 17L12 21L8 17" />
    </BaseIcon>
  )
}

export function EllipsisIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </BaseIcon>
  )
}

export function DownloadIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3V15" />
      <path d="M7 10L12 15L17 10" />
      <path d="M4 21H20" />
    </BaseIcon>
  )
}

export function CsvFileIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 3H14L19 8V21H7V3Z" />
      <path d="M14 3V8H19" />
      <path d="M10 12H16" />
      <path d="M10 16H14" />
      <path d="M4 13H9" />
      <path d="M4 17H9" />
    </BaseIcon>
  )
}

export function ExcelFileIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 3H14L19 8V21H7V3Z" />
      <path d="M14 3V8H19" />
      <path d="M10 12H17" />
      <path d="M10 16H17" />
      <path d="M13.5 10V18" />
      <path d="M4 10L8 18" />
      <path d="M8 10L4 18" />
    </BaseIcon>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 7H20" />
      <path d="M10 11V17" />
      <path d="M14 11V17" />
      <path d="M6 7L7 21H17L18 7" />
      <path d="M9 7V4H15V7" />
    </BaseIcon>
  )
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M19 12H5" />
      <path d="M11 6L5 12L11 18" />
    </BaseIcon>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 7H20" />
      <path d="M4 12H20" />
      <path d="M4 17H20" />
    </BaseIcon>
  )
}

export function MoonIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3C11.5 3 11.67 3.33 11.46 3.57A7 7 0 0 0 20.43 12.54C20.67 12.33 21 12.5 21 12.79Z" />
    </BaseIcon>
  )
}

export function SunIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2V4" />
      <path d="M12 20V22" />
      <path d="M4.93 4.93L6.34 6.34" />
      <path d="M17.66 17.66L19.07 19.07" />
      <path d="M2 12H4" />
      <path d="M20 12H22" />
      <path d="M4.93 19.07L6.34 17.66" />
      <path d="M17.66 6.34L19.07 4.93" />
    </BaseIcon>
  )
}

export function PanelLeftOpenIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4V20" />
      <path d="M14 10L17 12L14 14" />
    </BaseIcon>
  )
}

export function PanelLeftCloseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4V20" />
      <path d="M17 10L14 12L17 14" />
    </BaseIcon>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </BaseIcon>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14M5 12h14" />
    </BaseIcon>
  )
}

export function FilterIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </BaseIcon>
  )
}

export function HeartIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </BaseIcon>
  )
}

export function ChatIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </BaseIcon>
  )
}

export function ShoppingCartIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </BaseIcon>
  )
}

export function HomeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </BaseIcon>
  )
}

export function PlatformIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="4" width="6" height="6" rx="1.5" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" />
      <path d="M10 7H14" />
      <path d="M7 10V14" />
      <path d="M17 10V14" />
      <path d="M10 17H14" />
    </BaseIcon>
  )
}

export function AuditTrailIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 3H17L21 7V21H7V3Z" />
      <path d="M17 3V7H21" />
      <path d="M3 7V17" />
      <path d="M3 17L5 15" />
      <path d="M3 17L1 15" />
      <path d="M10 12H17" />
      <path d="M10 16H15" />
    </BaseIcon>
  )
}

export function CampaignIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 21V4" />
      <path d="M5 5H18L16 10L18 15H5" />
      <path d="M9 8H14" />
    </BaseIcon>
  )
}

export function AdPanelIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 15L9.2 9H10.8L13 15" />
      <path d="M8 13H12" />
      <path d="M15 9V15H17C18.1046 15 19 14.1046 19 13V11C19 9.89543 18.1046 9 17 9H15Z" />
    </BaseIcon>
  )
}

export function FeedbackIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 5H20V16H8L4 20V5Z" />
      <path d="M8 9H16" />
      <path d="M8 13H13" />
      <path d="M17 13L18 14L20 12" />
    </BaseIcon>
  )
}

export function TeamIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="10" r="2.5" />
      <path d="M3 20C3 16.7 5.7 14 9 14C12.3 14 15 16.7 15 20" />
      <path d="M14.5 15C16.7 15.2 19 17.1 19 20" />
    </BaseIcon>
  )
}

export function ProductBoxIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3L21 8L12 13L3 8L12 3Z" />
      <path d="M3 8V16L12 21L21 16V8" />
      <path d="M12 13V21" />
      <path d="M7.5 5.5L16.5 10.5" />
    </BaseIcon>
  )
}

export function TimelineIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 4V20" />
      <circle cx="6" cy="7" r="2" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="6" cy="17" r="2" />
      <path d="M10 7H20" />
      <path d="M10 12H17" />
      <path d="M10 17H19" />
    </BaseIcon>
  )
}

export function CompassIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5L13.5 13.5L8.5 15.5L10.5 10.5L15.5 8.5Z" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </BaseIcon>
  )
}

export function StarIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3L14.7 8.7L21 9.6L16.5 14L17.6 20.3L12 17.3L6.4 20.3L7.5 14L3 9.6L9.3 8.7L12 3Z" />
    </BaseIcon>
  )
}

export function CountryIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 4.5C9.4 7 10 9.5 10 12C10 14.5 9.4 17 8 19.5" />
      <path d="M16 4.5C14.6 7 14 9.5 14 12C14 14.5 14.6 17 16 19.5" />
      <path d="M3.5 9H20.5" />
      <path d="M3.5 15H20.5" />
    </BaseIcon>
  )
}

export function SponsorPlanIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 9H16" />
      <path d="M8 13H12" />
      <path d="M15 13L16.2 15.2L18.5 15.5L16.8 17.1L17.2 19.4L15 18.2L12.8 19.4L13.2 17.1L11.5 15.5L13.8 15.2L15 13Z" />
    </BaseIcon>
  )
}

export function iconForKey(key: string) {
  const icons: Record<string, ComponentType<IconProps>> = {
    overview: OverviewIcon,
    visitors: VisitorIcon,
    payments: WalletIcon,
    users: UsersIcon,
    reports: ChartIcon,
    audit: AuditTrailIcon,
    categories: TagsIcon,
    countries: CountryIcon,
    global: PlatformIcon,
    organizers: BriefcaseIcon,
    exhibitors: StorefrontIcon,
    sponsors: MegaphoneIcon,
    sponsorPlans: SponsorPlanIcon,
    campaigns: CampaignIcon,
    expos: CalendarIcon,
    ads: AdPanelIcon,
    notifications: BellIcon,
    settlements: ReceiptIcon,
    settings: SettingsIcon,
    controls: SlidersIcon,
    handshake: HandshakeIcon,
    feedback: FeedbackIcon,
    team: TeamIcon,
    products: ProductBoxIcon,
    storefront: StorefrontIcon,
    explore: CompassIcon,
    timeline: TimelineIcon,
    favorite: StarIcon,
    favorites: StarIcon,
    messages: ChatIcon,
    orders: ShoppingCartIcon,
    home: HomeIcon,
    tag: ClipboardIcon,
    laptop: OverviewIcon,
    leaf: HeartIcon,
    factory: StorefrontIcon,
    bolt: SettingsIcon,
    heart: HeartIcon,
    book: ClipboardIcon,
    hardhat: BriefcaseIcon,
    truck: StorefrontIcon,
    hotel: HomeIcon,
    utensils: StorefrontIcon,
    "shopping-cart": ShoppingCartIcon,
    sparkle: SunIcon,
    car: StorefrontIcon,
    pickaxe: SettingsIcon,
    droplet: FilterIcon,
    radio: BellIcon,
    film: OverviewIcon,
    activity: ChartIcon,
    landmark: HomeIcon,
    "hand-heart": HeartIcon,
    globe: OverviewIcon,
    shield: SettingsIcon,
    scale: ClipboardIcon,
    palette: OverviewIcon,
    sofa: HomeIcon,
    monitor: OverviewIcon,
    code: ClipboardIcon,
    cpu: SettingsIcon,
    bot: UserCircleIcon,
    package: StorefrontIcon,
    scissors: SettingsIcon,
    pill: HeartIcon,
    stethoscope: HeartIcon,
    banknote: WalletIcon,
    sun: SunIcon
  }

  return icons[key] || OverviewIcon
}
