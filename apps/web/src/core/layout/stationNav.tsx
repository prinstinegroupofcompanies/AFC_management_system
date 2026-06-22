import { PERMISSIONS } from '@agbms/shared';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Users,
  BarChart3,
  Landmark,
  Receipt,
} from 'lucide-react';
import type { NavItem } from './navConfig';

export const stationNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/station', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Chart of Accounts', path: '/station/accounts', icon: <BookOpen className="h-5 w-5" />, permission: PERMISSIONS.ACCOUNTS_VIEW },
  { label: 'Journal Entries', path: '/station/journal', icon: <FileText className="h-5 w-5" />, permission: PERMISSIONS.JOURNAL_VIEW },
  { label: 'Accounts Receivable', path: '/station/ar', icon: <Receipt className="h-5 w-5" />, permission: PERMISSIONS.AR_VIEW },
  { label: 'Financial Reports', path: '/station/reports', icon: <BarChart3 className="h-5 w-5" />, permission: PERMISSIONS.FINANCIAL_REPORTS },
  { label: 'Staff', path: '/station/staff', icon: <Users className="h-5 w-5" />, permission: PERMISSIONS.USERS_VIEW },
];

export const airbnbNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/airbnb', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Bookings', path: '/airbnb/bookings', icon: <BookOpen className="h-5 w-5" />, permission: PERMISSIONS.BOOKINGS_VIEW },
  { label: 'Guests', path: '/airbnb/guests', icon: <Users className="h-5 w-5" />, permission: PERMISSIONS.GUESTS_VIEW },
  { label: 'Rooms', path: '/airbnb/rooms', icon: <Landmark className="h-5 w-5" />, permission: PERMISSIONS.ROOMS_VIEW },
  { label: 'Housekeeping', path: '/airbnb/housekeeping', icon: <Receipt className="h-5 w-5" />, permission: PERMISSIONS.HOUSEKEEPING_VIEW },
  { label: 'Reports', path: '/airbnb/reports', icon: <BarChart3 className="h-5 w-5" />, permission: PERMISSIONS.REPORTS_VIEW },
];
