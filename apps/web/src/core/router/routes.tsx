import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/core/layout/AppShell';
import { groupNavItems, foodCenterNavItems } from '@/core/layout/navConfig';
import { stationNavItems, airbnbNavItems } from '@/core/layout/stationNav';
import { GroupDashboard } from '@/modules/group/Dashboard';
import { SettingsPage } from '@/modules/group/SettingsPage';
import { FoodCenterDashboard } from '@/modules/food-center/Dashboard';
import { SalesPage } from '@/modules/food-center/SalesPage';
import { InventoryPage } from '@/modules/food-center/InventoryPage';
import { ExpensesPage } from '@/modules/food-center/ExpensesPage';
import { VendorsPage } from '@/modules/food-center/VendorsPage';
import { AttendancePage } from '@/modules/food-center/AttendancePage';
import { AssetsPage } from '@/modules/food-center/AssetsPage';
import { ReportsPage as FoodCenterReportsPage } from '@/modules/food-center/ReportsPage';
import { StaffPage } from '@/modules/food-center/StaffPage';
import { StationDashboard } from '@/modules/station/Dashboard';
import { AccountsPage } from '@/modules/station/AccountsPage';
import { JournalPage } from '@/modules/station/JournalPage';
import { ARPage } from '@/modules/station/ARPage';
import { StationReportsPage } from '@/modules/station/ReportsPage';
import { AirbnbDashboard } from '@/modules/airbnb/Dashboard';
import { BookingsPage } from '@/modules/airbnb/BookingsPage';
import { GuestsPage } from '@/modules/airbnb/GuestsPage';
import { RoomsPage } from '@/modules/airbnb/RoomsPage';
import { HousekeepingPage } from '@/modules/airbnb/HousekeepingPage';
import { AirbnbReportsPage } from '@/modules/airbnb/ReportsPage';
import { useAuthStore } from '@/core/auth/store';

function GroupLayout() {
  return <AppShell navItems={groupNavItems} sidebarTitle="Atlantic Group" />;
}

function useSubsidiaryLayout(slug: string, title: string, navItems: typeof foodCenterNavItems) {
  const setActiveSubsidiary = useAuthStore((s) => s.setActiveSubsidiary);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const sub = user?.subsidiaries.find((s) => s.slug === slug);
    if (sub) setActiveSubsidiary(sub);
  }, [user, slug, setActiveSubsidiary]);

  return <AppShell navItems={navItems} sidebarTitle={title} />;
}

function FoodCenterLayout() {
  return useSubsidiaryLayout('food_center', 'Food Center', foodCenterNavItems);
}

function StationLayout() {
  return useSubsidiaryLayout('station', 'Atlantic Station', stationNavItems);
}

function AirbnbLayout() {
  return useSubsidiaryLayout('airbnb', 'Air BNB', airbnbNavItems);
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<GroupLayout />}>
        <Route index element={<GroupDashboard />} />
        <Route path="subsidiaries" element={<GroupDashboard />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="reports" element={<FoodCenterReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="food-center" element={<FoodCenterLayout />}>
        <Route index element={<FoodCenterDashboard />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="vendors" element={<VendorsPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="reports" element={<FoodCenterReportsPage />} />
        <Route path="staff" element={<StaffPage />} />
      </Route>

      <Route path="station" element={<StationLayout />}>
        <Route index element={<StationDashboard />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="journal" element={<JournalPage />} />
        <Route path="ar" element={<ARPage />} />
        <Route path="reports" element={<StationReportsPage />} />
        <Route path="staff" element={<StaffPage />} />
      </Route>

      <Route path="airbnb" element={<AirbnbLayout />}>
        <Route index element={<AirbnbDashboard />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="guests" element={<GuestsPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="housekeeping" element={<HousekeepingPage />} />
        <Route path="reports" element={<AirbnbReportsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
