import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  Receipt,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api } from '@/shared/lib/api';
import { formatCurrency } from '@/shared/lib/utils';
import { KpiCard, Card, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/table';

interface FoodCenterDashboard {
  kpis: {
    todaySales: number;
    pendingSales: number;
    totalExpenses: number;
    lowStockCount: number;
    todayCheckIns: number;
  };
  salesTrend: { date: string; amount: number }[];
  lowStockItems: {
    id: string;
    productName: string;
    quantity: number;
    reorderLevel: number;
  }[];
}

export function FoodCenterDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'food-center'],
    queryFn: () => api.get<FoodCenterDashboard>('/dashboard/food-center'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-navy-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Food Center Dashboard</h1>
        <p className="text-sm text-navy-500">Daily operations overview</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          title="Today's Sales"
          value={formatCurrency(data?.kpis.todaySales || 0)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KpiCard
          title="Pending Sales"
          value={data?.kpis.pendingSales || 0}
          icon={<Clock className="h-5 w-5" />}
        />
        <KpiCard
          title="Total Expenses"
          value={formatCurrency(data?.kpis.totalExpenses || 0)}
          icon={<Receipt className="h-5 w-5" />}
        />
        <KpiCard
          title="Low Stock"
          value={data?.kpis.lowStockCount || 0}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <KpiCard
          title="Check-ins Today"
          value={data?.kpis.todayCheckIns || 0}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales Trend (7 Days)</CardTitle>
          </CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.salesTrend || []}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14919b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#14919b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#627d98' }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12, fill: '#627d98' }} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Sales']}
                  labelFormatter={(label) => formatCurrency(0).replace('$0.00', new Date(label).toLocaleDateString())}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#14919b"
                  strokeWidth={2}
                  fill="url(#salesGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Stock Items</CardTitle>
          </CardHeader>
          {data?.lowStockItems && data.lowStockItems.length > 0 ? (
            <div className="space-y-3">
              {data.lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-navy-900">{item.productName}</p>
                    <p className="text-xs text-navy-500">Reorder at {item.reorderLevel}</p>
                  </div>
                  <Badge variant="warning">{item.quantity} left</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-navy-500">All items are well stocked</p>
          )}
        </Card>
      </div>
    </div>
  );
}
