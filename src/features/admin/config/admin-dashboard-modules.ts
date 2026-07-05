import {
  CalendarClock,
  CalendarOff,
  Droplets,
  FlaskConical,
  GraduationCap,
  Home,
  Package,
  Receipt,
  Settings,
  Shirt,
  Sparkles,
  Tags,
  Users,
  WashingMachine,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TranslationKey } from '@/types/language';

export type AdminDashboardModule = {
  icon: LucideIcon;
  labelKey: TranslationKey;
  path: string;
  descriptionKey: TranslationKey;
};

export const adminDashboardModules: AdminDashboardModule[] = [
  {
    icon: Package,
    labelKey: 'admin.dashboard.inventory',
    path: '/admin/inventory',
    descriptionKey: 'admin.dashboard.inventoryDesc',
  },
  {
    icon: Users,
    labelKey: 'admin.dashboard.employees',
    path: '/admin/employees',
    descriptionKey: 'admin.dashboard.employeesDesc',
  },
  {
    icon: CalendarClock,
    labelKey: 'admin.dashboard.shifts',
    path: '/admin/shifts',
    descriptionKey: 'admin.dashboard.shiftsDesc',
  },
  {
    icon: CalendarOff,
    labelKey: 'admin.leaves.title',
    path: '/admin/leaves',
    descriptionKey: 'admin.dashboard.leavesDesc',
  },
  {
    icon: Receipt,
    labelKey: 'admin.dashboard.priceList',
    path: '/admin/price-list',
    descriptionKey: 'admin.dashboard.priceListDesc',
  },
  {
    icon: FlaskConical,
    labelKey: 'admin.dashboard.chemicals',
    path: '/admin/chemicals',
    descriptionKey: 'admin.dashboard.chemicalsDesc',
  },
  {
    icon: Shirt,
    labelKey: 'admin.dashboard.fabrics',
    path: '/admin/fabrics',
    descriptionKey: 'admin.dashboard.fabricsDesc',
  },
  {
    icon: Droplets,
    labelKey: 'admin.dashboard.stains',
    path: '/admin/stains',
    descriptionKey: 'admin.dashboard.stainsDesc',
  },
  {
    icon: Tags,
    labelKey: 'admin.dashboard.careSymbols',
    path: '/admin/care-symbols',
    descriptionKey: 'admin.dashboard.careSymbolsDesc',
  },
  {
    icon: WashingMachine,
    labelKey: 'admin.dashboard.programs',
    path: '/admin/programs',
    descriptionKey: 'admin.dashboard.programsDesc',
  },
  {
    icon: GraduationCap,
    labelKey: 'admin.dashboard.training',
    path: '/admin/training',
    descriptionKey: 'admin.dashboard.trainingDesc',
  },
  {
    icon: Home,
    labelKey: 'admin.dashboard.homeContent',
    path: '/admin/home',
    descriptionKey: 'admin.dashboard.homeContentDesc',
  },
  {
    icon: Sparkles,
    labelKey: 'admin.dashboard.aiSettings',
    path: '/admin/ai',
    descriptionKey: 'admin.dashboard.aiSettingsDesc',
  },
  {
    icon: Settings,
    labelKey: 'admin.dashboard.settings',
    path: '/admin/settings',
    descriptionKey: 'admin.dashboard.settingsDesc',
  },
];
