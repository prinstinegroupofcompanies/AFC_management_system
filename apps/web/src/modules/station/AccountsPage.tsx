import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { PERMISSIONS } from '@agbms/shared';
import { api } from '@/shared/lib/api';
import { formatCurrency } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input, Select } from '@/shared/ui/input';
import { DataTable, Badge, Modal } from '@/shared/ui/table';
import { Card, CardHeader, CardTitle } from '@/shared/ui/card';
import { RoleGuard } from '@/core/auth/ProtectedRoute';
import { useAuthStore } from '@/core/auth/store';
import { toast } from '@/shared/ui/toast';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
  isActive: boolean;
}

const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'];

export function AccountsPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', type: 'asset' });
  const can = useAuthStore((s) => s.can);
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['station-accounts'],
    queryFn: () => api.get<Account[]>('/station/accounts'),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/station/accounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['station-accounts'] });
      toast.success('Account created');
      setShowModal(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const typeVariant = (t: string) => {
    const map: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'default'> = {
      asset: 'info', liability: 'warning', equity: 'default', revenue: 'success', expense: 'danger',
    };
    return map[t] || 'default';
  };

  return (
    <RoleGuard permission={PERMISSIONS.ACCOUNTS_VIEW}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Chart of Accounts</h1>
            <p className="text-sm text-navy-500">Manage your general ledger accounts</p>
          </div>
          {can(PERMISSIONS.ACCOUNTS_MANAGE) && (
            <Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4" /> Add Account</Button>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle>All Accounts ({accounts.length})</CardTitle></CardHeader>
          <DataTable
            loading={isLoading}
            data={accounts as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Account Name' },
              { key: 'type', label: 'Type', render: (v) => <Badge variant={typeVariant(v as string)}>{v as string}</Badge> },
              { key: 'balance', label: 'Balance', render: (v) => formatCurrency(v as number) },
              { key: 'isActive', label: 'Status', render: (v) => <Badge variant={v ? 'success' : 'default'}>{v ? 'Active' : 'Inactive'}</Badge> },
            ]}
          />
        </Card>

        <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Account">
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
            <Input id="code" label="Account Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            <Input id="name" label="Account Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Select id="type" label="Account Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={ACCOUNT_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} />
            <Button type="submit" loading={createMutation.isPending} className="w-full">Create Account</Button>
          </form>
        </Modal>
      </div>
    </RoleGuard>
  );
}
