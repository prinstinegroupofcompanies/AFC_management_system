export const SUBSIDIARIES = {
  FOOD_CENTER: 'food_center',
  STATION: 'station',
  AIRBNB: 'airbnb',
} as const;

export type SubsidiarySlug = (typeof SUBSIDIARIES)[keyof typeof SUBSIDIARIES];

export const SUBSIDIARY_LABELS: Record<SubsidiarySlug, string> = {
  food_center: 'Atlantic Food Center',
  station: 'Atlantic Station',
  airbnb: 'Atlantic Air BNB',
};

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  SALES_AGENT: 'sales_agent',
  ACCOUNTANT: 'accountant',
  INVENTORY_OFFICER: 'inventory_officer',
  SECURITY: 'security',
  HR: 'hr',
  GUEST_MANAGER: 'guest_manager',
  RECEPTIONIST: 'receptionist',
} as const;

export type RoleSlug = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<RoleSlug, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  sales_agent: 'Sales Agent',
  accountant: 'Accountant',
  inventory_officer: 'Inventory Officer',
  security: 'Security',
  hr: 'HR',
  guest_manager: 'Guest Manager',
  receptionist: 'Receptionist',
};
