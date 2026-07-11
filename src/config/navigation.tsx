import {
  CalendarClock,
  Droplets,
  FlaskConical,
  GraduationCap,
  Home,
  Package,
  Receipt,
  Shirt,
  Tags,
  Users,
  WashingMachine,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AdminIronIcon } from '@/components/icons/AdminIronIcon';
import type { PermissionResource } from '@/features/auth/types';
import type { TranslationKey } from '@/types/language';

export type NavigationItem = {
  labelKey: TranslationKey;
  path: string;
  icon: LucideIcon;
  end?: boolean;
  resource: PermissionResource;
};

export const navigationItems: NavigationItem[] = [
  {
    labelKey: 'nav.home',
    path: '/',
    icon: Home,
    end: true,
    resource: 'dashboard',
  },
  {
    labelKey: 'nav.programs',
    path: '/programs',
    icon: WashingMachine,
    resource: 'programs',
  },
  {
    labelKey: 'nav.chemicals',
    path: '/chemicals',
    icon: FlaskConical,
    resource: 'chemicals',
  },
  {
    labelKey: 'nav.fabrics',
    path: '/fabrics',
    icon: Shirt,
    resource: 'fabrics',
  },
  {
    labelKey: 'nav.stains',
    path: '/stains',
    icon: Droplets,
    resource: 'stains',
  },
  {
    labelKey: 'nav.careSymbols',
    path: '/care-symbols',
    icon: Tags,
    resource: 'careSymbols',
  },
  {
    labelKey: 'nav.priceList',
    path: '/price-list',
    icon: Receipt,
    resource: 'priceList',
  },
  {
    labelKey: 'nav.employees',
    path: '/employees',
    icon: Users,
    resource: 'employees',
  },
  {
    labelKey: 'nav.shifts',
    path: '/shifts',
    icon: CalendarClock,
    resource: 'shifts',
  },
  {
    labelKey: 'nav.training',
    path: '/training',
    icon: GraduationCap,
    resource: 'training',
  },
  {
    labelKey: 'nav.inventory',
    path: '/inventory',
    icon: Package,
    resource: 'inventory',
  },
  {
    labelKey: 'nav.admin',
    path: '/admin',
    icon: AdminIronIcon,
    resource: 'admin',
  },
];

export const appName = 'Triumph Plaza Hotel Laundry';
export const appTagline = 'Luxury Laundry Operations';
