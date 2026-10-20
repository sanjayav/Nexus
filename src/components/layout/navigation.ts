import {
  Home,
  Database,
  CheckSquare,
  Box,
  Shield,
  Activity,
  Layers,
  FileText,
  BarChart3,
  Focus,
  Calculator,
  Settings2,
  Sparkles,
  Plug,
  KeyRound,
  Award,
  FileSpreadsheet,
  Truck,
  PackageCheck,
  Coins,
  type LucideIcon,
} from 'lucide-react'
import type { shellStrings } from './shell.strings'

export type NavKey = keyof typeof shellStrings.en.nav
export type GroupKey = keyof typeof shellStrings.en.groups
export type RouteKey = keyof typeof shellStrings.en.routes

export type NavItem = { key: NavKey; icon: LucideIcon; path: string; match: RegExp; badge?: 'tasks' }

/** Sidebar information architecture: the reporting cycle, top to bottom. */
export const NAV_GROUPS: { key: GroupKey; items: NavItem[] }[] = [
  {
    key: 'overview',
    items: [
      { key: 'command', icon: Home, path: '/executive', match: /^\/(executive)?$/ },
      { key: 'analytics', icon: BarChart3, path: '/analytics', match: /^\/analytics/ },
      { key: 'ratings', icon: Award, path: '/ratings', match: /^\/ratings/ },
      { key: 'portfolio', icon: Layers, path: '/portfolio', match: /^\/portfolio/ },
    ],
  },
  {
    key: 'workspace',
    items: [
      { key: 'modules', icon: Box, path: '/modules', match: /^\/(modules|frameworks|workbench)/ },
      { key: 'tasks', icon: CheckSquare, path: '/tasks', match: /^\/tasks/, badge: 'tasks' },
      { key: 'import', icon: FileSpreadsheet, path: '/import', match: /^\/import/ },
      { key: 'evidence', icon: Database, path: '/evidence', match: /^\/evidence/ },
    ],
  },
  {
    key: 'measure',
    items: [
      { key: 'carbon', icon: Activity, path: '/carbon', match: /^\/(carbon(?!\/assets)|ghg)/ },
      { key: 'carbonAssets', icon: Coins, path: '/carbon/assets', match: /^\/carbon\/assets/ },
      { key: 'scope3', icon: Calculator, path: '/scope3', match: /^\/scope3/ },
      { key: 'products', icon: PackageCheck, path: '/products', match: /^\/products/ },
      { key: 'suppliers', icon: Truck, path: '/suppliers', match: /^\/suppliers/ },
      { key: 'dma', icon: Focus, path: '/dma', match: /^\/dma/ },
      { key: 'ai', icon: Sparkles, path: '/ai', match: /^\/ai/ },
    ],
  },
  {
    key: 'trust',
    items: [
      { key: 'verify', icon: Shield, path: '/verify', match: /^\/(verify|anchors|events|timeline)/ },
      { key: 'publish', icon: FileText, path: '/publish', match: /^\/(publish|reports)/ },
    ],
  },
  {
    key: 'settings',
    items: [
      { key: 'connectors', icon: Plug, path: '/connectors', match: /^\/connectors/ },
      { key: 'workflow', icon: Settings2, path: '/workflow', match: /^\/workflow/ },
      { key: 'iam', icon: KeyRound, path: '/iam', match: /^\/(iam|roles|admin)/ },
    ],
  },
]

/** Routes outside the sidebar, for breadcrumbs. Checked before the sidebar. */
export const EXTRA_ROUTES: { key: RouteKey; match: RegExp; parent?: NavKey }[] = [
  { key: 'gaps', match: /^\/analytics\/gaps/, parent: 'analytics' },
  { key: 'benchmark', match: /^\/analytics\/benchmark/, parent: 'analytics' },
  { key: 'questionnaire', match: /^\/modules\/[^/]+\/questionnaire/, parent: 'modules' },
  { key: 'review', match: /^\/modules\/[^/]+\/review/, parent: 'modules' },
  { key: 'workbench', match: /^\/workbench/, parent: 'modules' },
  { key: 'events', match: /^\/events/, parent: 'verify' },
  { key: 'timeline', match: /^\/timeline/, parent: 'verify' },
  { key: 'ghg', match: /^\/ghg/, parent: 'carbon' },
  { key: 'organization', match: /^\/admin\/organization/ },
  { key: 'admin', match: /^\/admin/ },
  { key: 'periodCreate', match: /^\/period\/create/ },
  { key: 'indexTable', match: /^\/publish\/index/, parent: 'publish' },
  { key: 'roles', match: /^\/roles/, parent: 'iam' },
  { key: 'settingsAnalytics', match: /^\/settings\/analytics/ },
]

/** Pages that manage their own width and padding. */
export const FULL_BLEED = /^\/publish$|^\/reports\/|\/questionnaire/
