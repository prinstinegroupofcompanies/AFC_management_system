import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Users,
  AlertTriangle,
  Clock,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { api } from '@/shared/lib/api';
import { formatCurrency } from '@/shared/lib/utils';
import { KpiCard } from '@/shared/ui/card';
import { useAuthStore } from '@/core/auth/store';
import { subsidiaryConfig } from '@/core/layout/navConfig';
import type { SubsidiarySlug } from '@agbms/shared';

interface DashboardData {
  kpis: {
    totalSales: number;
    activeStaff: number;
    lowStockAlerts: number;
    todayAttendance: number;
  };
  subsidiaries: {
    id: string;
    slug: string;
    name: string;
    description: string;
    isActive: boolean;
  }[];
  lowStockItems: {
    id: string;
    productName: string;
    quantity: number;
    reorderLevel: number;
    branch: string;
  }[];
}

export function GroupDashboard() {
  const navigate = useNavigate();
  const { setActiveSubsidiary, user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'group'],
    queryFn: () => api.get<DashboardData>('/dashboard/group'),
  });

  const handleSubsidiaryClick = (sub: DashboardData['subsidiaries'][0]) => {
    if (!sub.isActive) return;
    const userSub = user?.subsidiaries.find((s) => s.id === sub.id);
    if (!userSub && user?.role !== 'super_admin') return;

    setActiveSubsidiary({
      id: sub.id,
      slug: sub.slug,
      name: sub.name,
      isActive: sub.isActive,
    });

    if (sub.slug === 'food_center') {
      navigate('/food-center');
    } else if (sub.slug === 'station') {
      navigate('/station');
    } else if (sub.slug === 'airbnb') {
      navigate('/airbnb');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-navy-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Atlantic Group Dashboard</h1>
        <p className="text-sm text-navy-500">Overview of all subsidiaries and operations</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Sales"
          value={formatCurrency(data?.kpis.totalSales || 0)}
          icon={<DollarSign className="h-5 w-5" />}
          delay={0}
        />
        <KpiCard
          title="Active Staff"
          value={data?.kpis.activeStaff || 0}
          icon={<Users className="h-5 w-5" />}
          delay={0.05}
        />
        <KpiCard
          title="Low Stock Alerts"
          value={data?.kpis.lowStockAlerts || 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          delay={0.1}
        />
        <KpiCard
          title="Today's Attendance"
          value={data?.kpis.todayAttendance || 0}
          icon={<Clock className="h-5 w-5" />}
          delay={0.15}
        />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-navy-900">Subsidiaries</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.subsidiaries.map((sub, i) => {
            const config = subsidiaryConfig[sub.slug as SubsidiarySlug];
            const hasAccess =
              user?.role === 'super_admin' ||
              user?.subsidiaries.some((s) => s.id === sub.id);

            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => handleSubsidiaryClick(sub)}
                className={`group relative overflow-hidden rounded-xl border bg-white p-6 shadow-sm transition-all duration-300 ${
                  sub.isActive && hasAccess
                    ? 'cursor-pointer border-navy-100 hover:shadow-lg hover:-translate-y-1'
                    : 'cursor-not-allowed opacity-70 border-navy-100'
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${config?.color || 'from-navy-500 to-navy-700'} opacity-5`} />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div className={`rounded-xl bg-gradient-to-br ${config?.color || 'from-navy-500 to-navy-700'} p-3 text-white`}>
                      {config?.icon}
                    </div>
                    {!sub.isActive && (
                      <span className="flex items-center gap-1 rounded-full bg-navy-100 px-2.5 py-1 text-xs font-medium text-navy-600">
                        <Lock className="h-3 w-3" />
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-navy-900">{sub.name}</h3>
                  <p className="mt-1 text-sm text-navy-500">{config?.description || sub.description}</p>
                  {sub.isActive && hasAccess && (
                    <div className="mt-4 flex items-center gap-1 text-sm font-medium text-teal-600 opacity-0 transition-opacity group-hover:opacity-100">
                      Open Portal <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {data?.lowStockItems && data.lowStockItems.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Low Stock Alerts
          </h3>
          <div className="mt-2 space-y-1">
            {data.lowStockItems.map((item) => (
              <p key={item.id} className="text-sm text-amber-700">
                {item.productName} — {item.quantity} left (reorder at {item.reorderLevel}) · {item.branch}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
