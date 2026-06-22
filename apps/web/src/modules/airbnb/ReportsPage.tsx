import { useQuery } from '@tanstack/react-query';
import { PERMISSIONS } from '@agbms/shared';
import { api } from '@/shared/lib/api';
import { formatCurrency } from '@/shared/lib/utils';
import { KpiCard, Card, CardHeader, CardTitle } from '@/shared/ui/card';
import { RoleGuard } from '@/core/auth/ProtectedRoute';

interface OccupancyReport {
  occupied: number;
  available: number;
  cleaning: number;
  maintenance: number;
  total: number;
  occupancyRate: number;
  todayRevenue: number;
  pendingPayments: number;
}

export function AirbnbReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['airbnb-occupancy'],
    queryFn: () => api.get<OccupancyReport>('/airbnb/reports/occupancy'),
  });

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-xl bg-navy-100" />;
  }

  return (
    <RoleGuard permission={PERMISSIONS.REPORTS_VIEW}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Occupancy Reports</h1>
          <p className="text-sm text-navy-500">Revenue and occupancy analytics</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="Occupancy Rate" value={`${data?.occupancyRate || 0}%`} />
          <KpiCard title="Today's Revenue" value={formatCurrency(data?.todayRevenue || 0)} />
          <KpiCard title="Pending Payments" value={formatCurrency(data?.pendingPayments || 0)} />
          <KpiCard title="Total Rooms" value={data?.total || 0} />
        </div>

        <Card>
          <CardHeader><CardTitle>Room Status Breakdown</CardTitle></CardHeader>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-red-50 p-4 text-center">
              <p className="text-2xl font-bold text-red-700">{data?.occupied}</p>
              <p className="text-sm text-red-600">Occupied</p>
            </div>
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{data?.available}</p>
              <p className="text-sm text-green-600">Available</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-4 text-center">
              <p className="text-2xl font-bold text-amber-700">{data?.cleaning}</p>
              <p className="text-sm text-amber-600">Cleaning</p>
            </div>
            <div className="rounded-lg bg-navy-50 p-4 text-center">
              <p className="text-2xl font-bold text-navy-700">{data?.maintenance}</p>
              <p className="text-sm text-navy-600">Maintenance</p>
            </div>
          </div>
        </Card>
      </div>
    </RoleGuard>
  );
}
