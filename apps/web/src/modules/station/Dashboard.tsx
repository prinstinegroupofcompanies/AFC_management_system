import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, Landmark, FileText } from 'lucide-react';
import { api } from '@/shared/lib/api';
import { formatCurrency } from '@/shared/lib/utils';
import { KpiCard, Card, CardHeader, CardTitle } from '@/shared/ui/card';
import { formatDate } from '@/shared/lib/utils';

interface StationDashboard {
  kpis: {
    totalAssets: number;
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    accountsReceivable: number;
    cashBalance: number;
    accountCount: number;
  };
  recentJournal: {
    id: string;
    date: string;
    description: string;
    lines: { debit: number; credit: number; account: { name: string } }[];
  }[];
}

export function StationDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'station'],
    queryFn: () => api.get<StationDashboard>('/dashboard/station'),
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
        <h1 className="text-2xl font-bold text-navy-900">Atlantic Station</h1>
        <p className="text-sm text-navy-500">Financial management & accounting overview</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Assets" value={formatCurrency(data?.kpis.totalAssets || 0)} icon={<Landmark className="h-5 w-5" />} />
        <KpiCard title="Total Revenue" value={formatCurrency(data?.kpis.totalRevenue || 0)} icon={<DollarSign className="h-5 w-5" />} />
        <KpiCard title="Net Income" value={formatCurrency(data?.kpis.netIncome || 0)} icon={<TrendingUp className="h-5 w-5" />} trend={data && data.kpis.netIncome >= 0 ? 'Profitable' : 'Loss'} trendUp={data ? data.kpis.netIncome >= 0 : undefined} />
        <KpiCard title="Cash Balance" value={formatCurrency(data?.kpis.cashBalance || 0)} icon={<FileText className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard title="Accounts Receivable" value={formatCurrency(data?.kpis.accountsReceivable || 0)} />
        <KpiCard title="Total Expenses" value={formatCurrency(data?.kpis.totalExpenses || 0)} />
        <KpiCard title="Chart of Accounts" value={data?.kpis.accountCount || 0} />
      </div>

      {data?.recentJournal && data.recentJournal.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Journal Entries</CardTitle></CardHeader>
          <div className="space-y-3">
            {data.recentJournal.map((txn) => (
              <div key={txn.id} className="rounded-lg bg-navy-50 px-4 py-3">
                <div className="flex justify-between">
                  <span className="font-medium text-navy-900">{txn.description}</span>
                  <span className="text-sm text-navy-500">{formatDate(txn.date)}</span>
                </div>
                <div className="mt-1 text-xs text-navy-500">
                  {txn.lines.map((l, i) => (
                    <span key={i}>{l.account.name}: {l.debit > 0 ? `Dr ${formatCurrency(l.debit)}` : `Cr ${formatCurrency(l.credit)}`}{i < txn.lines.length - 1 ? ' · ' : ''}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
