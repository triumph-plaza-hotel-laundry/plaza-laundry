import {
  BarChart3,
  CalendarClock,
  ClipboardList,
  FlaskConical,
  Shirt,
  Sparkles,
  Tag,
  Users,
  Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type DashboardCardItem = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
};

export const dashboardCards: DashboardCardItem[] = [
  {
    title: "Today's Orders",
    subtitle: 'Prepared for order activity.',
    icon: ClipboardList,
  },
  {
    title: 'Quick Statistics',
    subtitle: 'Prepared for operational metrics.',
    icon: BarChart3,
  },
  {
    title: 'Employees',
    subtitle: 'Prepared for team management.',
    icon: Users,
  },
  {
    title: 'Shifts',
    subtitle: 'Prepared for shift planning.',
    icon: CalendarClock,
  },
  {
    title: 'Price Lists',
    subtitle: 'Prepared for service pricing.',
    icon: Tag,
  },
  {
    title: 'Chemicals',
    subtitle: 'Prepared for chemical references.',
    icon: FlaskConical,
  },
  {
    title: 'Washing Programs',
    subtitle: 'Prepared for laundry programs.',
    icon: Sparkles,
  },
  {
    title: 'Fabric Types',
    subtitle: 'Prepared for fabric knowledge.',
    icon: Shirt,
  },
  {
    title: 'Stains',
    subtitle: 'Prepared for stain treatment.',
    icon: Waves,
  },
];
