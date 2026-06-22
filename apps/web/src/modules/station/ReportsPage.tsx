import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PERMISSIONS } from '@agbms/shared';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/shared/lib/api';
import { formatCurrency } from '@/shared/lib/utils';
import { Select } from '@/shared/ui/input';
import { Card, CardHeader, CardTitle, KpiCard } from '@/shared/ui/card';
import { DataTable, Badge } from '@/shared/ui/table';
import { RoleGuard } from '@/core/auth/ProtectedRoute';

export function StationReportsPage() {
  const [report, setReport] = useState('trial-balance');

  const { data: trialBalance } = useQuery({
    queryKey: ['station-report', 'trial-balance'],
    queryFn: () => api.get<{ accounts: { code: string; name: string; type: string; debit: number; credit: number }[]; totalDebit: number; totalCredit: number }>('/station/reports/trial-balance'),
    enabled: report === 'trial-balance',
  });

  const { data: balanceSheet } = useQuery({
    queryKey: ['station-report', 'balance-sheet'],
    queryFn: () => api.get<{ assets: { total: number }; liabilities: { total: number }; equity: { total: number }; totalLiabilitiesAndEquity: number }>('/station/reports/balance-sheet'),
    enabled: report === 'balance-sheet',
  });

  const { data: pnl } = useQuery({
    queryKey: ['station-report', 'profit-loss'],
    queryFn: () => api.get<{ revenue: number; expenses: number; netIncome: number; revenueAccounts: { name: string; balance: number }[]; expenseAccounts: { name: string; balance: number }[] }>('/station/reports/profit-loss'),
    enabled: report === 'profit-loss',
  });

  const { data: cashFlow } = useQuery({
    queryKey: ['station-report', 'cash-flow'],
    queryFn: () => api.get<{ cashBalance: number; bankAccounts: { name: string; balance: number }[] }>('/station/reports/cash-flow'),
    enabled: report === 'cash-flow',
  });

  return (
    <RoleGuard permission={PERMISSIONS.FINANCIAL_REPORTS}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Financial Reports</h1>
            <p className="text-sm text-navy-500">QuickBooks-style financial statements</p>
          </div>
          <Select
            id="report"
            value={report}
            onChange={(e) => setReport(e.target.value)}
            options={[
              { value: 'trial-balance', label: 'Trial Balance' },
              { value: 'balance-sheet', label: 'Balance Sheet' },
              { value: 'profit-loss', label: 'Profit & Loss' },
              { value: 'cash-flow', label: 'Cash Flow' },
            ]}
          />
        </div>

        {report === 'trial-balance' && trialBalance && (
          <Card>
            <CardHeader>
              <CardTitle>Trial Balance</CardTitle>
              <div className="text-sm text-navy-500">
                Debits: {formatCurrency(trialBalance.totalDebit)} · Credits: {formatCurrency(trialBalance.totalCredit)}
              </div>
            </CardHeader>
            <DataTable
              data={trialBalance.accounts as unknown as Record<string, unknown>[]}
              columns={[
                { key: 'code', label: 'Code' },
                { key: 'name', label: 'Account' },
                { key: 'type', label: 'Type', render: (v) => <Badge variant="info">{v as string}</Badge> },
                { key: 'debit', label: 'Debit', render: (v) => (v as number) > 0 ? formatCurrency(v as number) : '—' },
                { key: 'credit', label: 'Credit', render: (v) => (v as number) > 0 ? formatCurrency(v as number) : '—' },
              ]}
            />
          </Card>
        )}

        {report === 'balance-sheet' && balanceSheet && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <KpiCard title="Total Assets" value={formatCurrency(balanceSheet.assets.total)} />
            <KpiCard title="Total Liabilities" value={formatCurrency(balanceSheet.liabilities.total)} />
            <KpiCard title="Total Equity" value={formatCurrency(balanceSheet.equity.total)} />
            <Card className="lg:col-span-3">
              <CardHeader><CardTitle>Balance Sheet Summary</CardTitle></CardHeader>
              <p className="text-lg font-semibold text-navy-900">
                Liabilities + Equity: {formatCurrency(balanceSheet.totalLiabilitiesAndEquity)}
              </p>
            </Card>
          </div>
        )}

        {report === 'profit-loss' && pnl && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiCard title="Revenue" value={formatCurrency(pnl.revenue)} />
              <KpiCard title="Expenses" value={formatCurrency(pnl.expenses)} />
              <KpiCard title="Net Income" value={formatCurrency(pnl.netIncome)} trend={pnl.netIncome >= 0 ? 'Profit' : 'Loss'} trendUp={pnl.netIncome >= 0} />
            </div>
            <Card>
              <CardHeader><CardTitle>P&L Breakdown</CardTitle></CardHeader>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: 'Revenue', value: pnl.revenue }, { name: 'Expenses', value: pnl.expenses }, { name: 'Net Income', value: pnl.netIncome }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="value" fill="#14919b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </>
        )}

        {report === 'cash-flow' && cashFlow && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <KpiCard title="Total Cash" value={formatCurrency(cashFlow.cashBalance)} />
            {cashFlow.bankAccounts.map((b) => (
              <KpiCard key={b.name} title={b.name} value={formatCurrency(b.balance)} />
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
