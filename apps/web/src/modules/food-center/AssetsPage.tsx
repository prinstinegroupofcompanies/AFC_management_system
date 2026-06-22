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

interface Asset {
  id: string;
  name: string;
  category: string;
  value: number;
  status: string;
  description?: string;
  branch: { name: string };
}

const ASSET_CATEGORIES = ['Equipment', 'Electronics', 'Vehicle', 'Furniture', 'Other'];
const ASSET_STATUSES = ['active', 'maintenance', 'retired'];

export function AssetsPage() {
  const [showModal, setShowModal] = useState(false);
  const can = useAuthStore((s) => s.can);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: '', category: ASSET_CATEGORIES[0], value: '', status: 'active', description: '', branchId: '',
  });

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.get<Asset[]>('/food-center/assets'),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/branches'),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/food-center/assets', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset added');
      setShowModal(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusVariant = (s: string) =>
    s === 'active' ? 'success' : s === 'maintenance' ? 'warning' : 'default';

  const totalValue = assets.reduce((sum, a) => sum + a.value, 0);

  return (
    <RoleGuard permission={PERMISSIONS.ASSETS_VIEW}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Assets</h1>
            <p className="text-sm text-navy-500">Asset register — {formatCurrency(totalValue)} total value</p>
          </div>
          {can(PERMISSIONS.ASSETS_MANAGE) && (
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4" /> Add Asset
            </Button>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle>Asset Register</CardTitle></CardHeader>
          <DataTable
            loading={isLoading}
            data={assets as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'category', label: 'Category' },
              { key: 'value', label: 'Value', render: (v) => formatCurrency(v as number) },
              { key: 'status', label: 'Status', render: (v) => <Badge variant={statusVariant(v as string)}>{v as string}</Badge> },
              { key: 'branch', label: 'Branch', render: (_, row) => (row.branch as { name: string })?.name },
              { key: 'description', label: 'Description', render: (v) => (v as string) || '—' },
            ]}
          />
        </Card>

        <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Asset">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                ...form,
                value: parseFloat(form.value),
                branchId: form.branchId || branches[0]?.id,
              });
            }}
            className="space-y-4"
          >
            <Input id="name" label="Asset Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Select id="category" label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={ASSET_CATEGORIES.map((c) => ({ value: c, label: c }))} />
            <Input id="value" label="Value ($)" type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
            <Select id="status" label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={ASSET_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
            <Select id="branch" label="Branch" value={form.branchId || branches[0]?.id || ''} onChange={(e) => setForm({ ...form, branchId: e.target.value })} options={branches.map((b) => ({ value: b.id, label: b.name }))} />
            <Input id="desc" label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Button type="submit" loading={createMutation.isPending} className="w-full">Add Asset</Button>
          </form>
        </Modal>
      </div>
    </RoleGuard>
  );
}
