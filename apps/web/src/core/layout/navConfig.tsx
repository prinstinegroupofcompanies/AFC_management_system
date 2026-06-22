import { PERMISSIONS } from '@agbms/shared';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Truck,
  Users,
  BarChart3,
  Settings,
  Building2,
  Clock,
  Wrench,
  Home,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  permission?: string;
}

export const groupNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="h-5 w-5" />, permission: PERMISSIONS.DASHBOARD_GROUP },
  { label: 'Subsidiaries', path: '/subsidiaries', icon: <Building2 className="h-5 w-5" /> },
  { label: 'Staff Management', path: '/staff', icon: <Users className="h-5 w-5" />, permission: PERMISSIONS.USERS_VIEW },
  { label: 'Reports', path: '/reports', icon: <BarChart3 className="h-5 w-5" />, permission: PERMISSIONS.REPORTS_VIEW },
  { label: 'Settings', path: '/settings', icon: <Settings className="h-5 w-5" />, permission: PERMISSIONS.SETTINGS_VIEW },
];

export const foodCenterNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/food-center', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Sales', path: '/food-center/sales', icon: <ShoppingCart className="h-5 w-5" />, permission: PERMISSIONS.SALES_VIEW },
  { label: 'Inventory', path: '/food-center/inventory', icon: <Package className="h-5 w-5" />, permission: PERMISSIONS.INVENTORY_VIEW },
  { label: 'Expenses', path: '/food-center/expenses', icon: <Receipt className="h-5 w-5" />, permission: PERMISSIONS.EXPENSES_VIEW },
  { label: 'Vendors', path: '/food-center/vendors', icon: <Truck className="h-5 w-5" />, permission: PERMISSIONS.VENDORS_VIEW },
  { label: 'Attendance', path: '/food-center/attendance', icon: <Clock className="h-5 w-5" />, permission: PERMISSIONS.ATTENDANCE_VIEW },
  { label: 'Assets', path: '/food-center/assets', icon: <Wrench className="h-5 w-5" />, permission: PERMISSIONS.ASSETS_VIEW },
  { label: 'Reports', path: '/food-center/reports', icon: <BarChart3 className="h-5 w-5" />, permission: PERMISSIONS.REPORTS_VIEW },
  { label: 'Staff', path: '/food-center/staff', icon: <Users className="h-5 w-5" />, permission: PERMISSIONS.USERS_VIEW },
];

export const subsidiaryConfig = {
  food_center: {
    name: 'Atlantic Food Center',
    color: 'from-teal-500 to-teal-700',
    icon: <ShoppingCart className="h-8 w-8" />,
    description: 'Daily sales, inventory, expenses & attendance',
  },
  station: {
    name: 'Atlantic Station',
    color: 'from-navy-600 to-navy-800',
    icon: <Building2 className="h-8 w-8" />,
    description: 'Full accounting & financial management',
  },
  airbnb: {
    name: 'Atlantic Air BNB',
    color: 'from-purple-500 to-purple-700',
    icon: <Home className="h-8 w-8" />,
    description: 'Room booking & guest management',
  },
};
