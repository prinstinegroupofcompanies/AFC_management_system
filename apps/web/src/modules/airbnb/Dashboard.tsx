import { useQuery } from '@tanstack/react-query';
import { BedDouble, DollarSign, Users, TrendingUp } from 'lucide-react';
import { api } from '@/shared/lib/api';
import { formatCurrency } from '@/shared/lib/utils';
import { KpiCard, Card, CardHeader, CardTitle } from '@/shared/ui/card';

interface AirbnbDashboard {
  kpis: {
    occupiedRooms: number;
    availableRooms: number;
    totalRooms: number;
    todayRevenue: number;
    pendingPayments: number;
    activeGuests: number;
    occupancyRate: number;
  };
}

export function AirbnbDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'airbnb'],
    queryFn: () => api.get<AirbnbDashboard>('/dashboard/airbnb'),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-navy-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Air BNB Dashboard</h1>
        <p className="text-sm text-navy-500">Occupancy and revenue overview</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Occupied Rooms" value={data?.kpis.occupiedRooms || 0} icon={<BedDouble className="h-5 w-5" />} />
        <KpiCard title="Available Rooms" value={data?.kpis.availableRooms || 0} icon={<BedDouble className="h-5 w-5" />} />
        <KpiCard title="Today's Revenue" value={formatCurrency(data?.kpis.todayRevenue || 0)} icon={<DollarSign className="h-5 w-5" />} />
        <KpiCard title="Pending Payments" value={formatCurrency(data?.kpis.pendingPayments || 0)} icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard title="Active Guests" value={data?.kpis.activeGuests || 0} icon={<Users className="h-5 w-5" />} />
        <KpiCard title="Total Rooms" value={data?.kpis.totalRooms || 0} />
        <KpiCard title="Occupancy Rate" value={`${data?.kpis.occupancyRate || 0}%`} trend={data && data.kpis.occupancyRate >= 70 ? 'High demand' : 'Normal'} trendUp={data ? data.kpis.occupancyRate >= 50 : undefined} />
      </div>

      <Card>
        <CardHeader><CardTitle>Quick Stats</CardTitle></CardHeader>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-center">
          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-2xl font-bold text-green-700">{data?.kpis.occupiedRooms}</p>
            <p className="text-xs text-green-600">Occupied</p>
          </div>
          <div className="rounded-lg bg-teal-50 p-4">
            <p className="text-2xl font-bold text-teal-700">{data?.kpis.availableRooms}</p>
            <p className="text-xs text-teal-600">Available</p>
          </div>
          <div className="rounded-lg bg-purple-50 p-4">
            <p className="text-2xl font-bold text-purple-700">{formatCurrency(data?.kpis.todayRevenue || 0)}</p>
            <p className="text-xs text-purple-600">Revenue Today</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-4">
            <p className="text-2xl font-bold text-amber-700">{formatCurrency(data?.kpis.pendingPayments || 0)}</p>
            <p className="text-xs text-amber-600">Outstanding</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
