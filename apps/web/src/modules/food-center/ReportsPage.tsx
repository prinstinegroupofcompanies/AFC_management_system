import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText } from 'lucide-react';
import { PERMISSIONS } from '@agbms/shared';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '@/shared/lib/api';
import { formatCurrency } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Select } from '@/shared/ui/input';
import { Card, CardHeader, CardTitle, KpiCard } from '@/shared/ui/card';
import { RoleGuard } from '@/core/auth/ProtectedRoute';

interface PnlData {
  period: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  expensesByCategory: { category: string; amount: number }[];
}

const COLORS = ['#14919b', '#627d98', '#243b53', '#2cb1bc', '#486581', '#0e7c86'];

export function ReportsPage() {
  const [period, setPeriod] = useState('monthly');

  const { data: pnl, isLoading } = useQuery({
    queryKey: ['reports', 'pnl', period],
    queryFn: () => api.get<PnlData>(`/food-center/reports/pnl?period=${period}`),
  });

  const { data: salesReport } = useQuery({
    queryKey: ['reports', 'sales'],
    queryFn: () => api.get<{ total: number; count: number }>('/food-center/reports/sales'),
  });

  const handleExport = (type: string, format: string) => {
    window.open(`/api/food-center/reports/${type}?format=${format}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-navy-100" />
        ))}
      </div>
    );
  }

  return (
    <RoleGuard permission={PERMISSIONS.REPORTS_VIEW}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Reports</h1>
            <p className="text-sm text-navy-500">Financial and operational analytics</p>
          </div>
          <div className="flex gap-2">
            <Select
              id="period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'yearly', label: 'Yearly' },
              ]}
            />
            <Button variant="outline" onClick={() => handleExport('sales', 'csv')}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport('sales', 'xlsx')}>
              <Download className="h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" onClick={() => window.open(`/api/food-center/reports/pnl/pdf?period=${period}`, '_blank')}>
              <FileText className="h-4 w-4" /> PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="Revenue" value={formatCurrency(pnl?.revenue || 0)} />
          <KpiCard title="COGS" value={formatCurrency(pnl?.cogs || 0)} />
          <KpiCard title="Expenses" value={formatCurrency(pnl?.totalExpenses || 0)} />
          <KpiCard
            title="Net Profit"
            value={formatCurrency(pnl?.netProfit || 0)}
            trend={pnl && pnl.netProfit >= 0 ? 'Profitable' : 'Loss'}
            trendUp={pnl ? pnl.netProfit >= 0 : undefined}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>P&L Breakdown</CardTitle></CardHeader>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Revenue', value: pnl?.revenue || 0 },
                    { name: 'COGS', value: pnl?.cogs || 0 },
                    { name: 'Expenses', value: pnl?.totalExpenses || 0 },
                    { name: 'Net Profit', value: pnl?.netProfit || 0 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#627d98' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#627d98' }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" fill="#14919b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Expenses by Category</CardTitle></CardHeader>
            <div className="h-64">
              {pnl?.expensesByCategory && pnl.expensesByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pnl.expensesByCategory}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pnl.expensesByCategory.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="flex h-full items-center justify-center text-sm text-navy-500">No expense data</p>
              )}
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Sales Summary</CardTitle></CardHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-navy-500">Total Sales</p>
              <p className="text-2xl font-bold text-navy-900">{formatCurrency(salesReport?.total || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-navy-500">Transactions</p>
              <p className="text-2xl font-bold text-navy-900">{salesReport?.count || 0}</p>
            </div>
          </div>
        </Card>
      </div>
    </RoleGuard>
  );
}
