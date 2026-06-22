import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, X } from 'lucide-react';
import { PERMISSIONS } from '@agbms/shared';
import { api } from '@/shared/lib/api';
import { formatCurrency, formatDate } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input, Select } from '@/shared/ui/input';
import { DataTable, Badge, Modal } from '@/shared/ui/table';
import { Card, CardHeader, CardTitle } from '@/shared/ui/card';
import { RoleGuard } from '@/core/auth/ProtectedRoute';
import { useAuthStore } from '@/core/auth/store';
import { toast } from '@/shared/ui/toast';

interface Sale {
  id: string;
  amount: number;
  date: string;
  status: string;
  notes?: string;
  staff: { name: string };
  branch: { name: string };
}

interface Branch {
  id: string;
  name: string;
}

export function SalesPage() {
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [branchId, setBranchId] = useState('');
  const [notes, setNotes] = useState('');
  const can = useAuthStore((s) => s.can);
  const queryClient = useQueryClient();

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: () => api.get<Sale[]>('/food-center/sales'),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<Branch[]>('/branches'),
  });

  const createMutation = useMutation({
    mutationFn: (data: { amount: number; date: string; branchId: string; notes?: string }) =>
      api.post('/food-center/sales', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Sale recorded successfully');
      setShowModal(false);
      setAmount('');
      setNotes('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/food-center/sales/${id}/approve`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Sale updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      amount: parseFloat(amount),
      date: new Date().toISOString(),
      branchId: branchId || branches[0]?.id,
      notes: notes || undefined,
    });
  };

  const statusVariant = (s: string) =>
    s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : 'warning';

  return (
    <RoleGuard permission={PERMISSIONS.SALES_VIEW}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Sales</h1>
            <p className="text-sm text-navy-500">Daily sales entry and management</p>
          </div>
          {can(PERMISSIONS.SALES_CREATE) && (
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4" /> Record Sale
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Sales</CardTitle>
          </CardHeader>
          <DataTable
            loading={isLoading}
            data={sales as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'date', label: 'Date', render: (v) => formatDate(v as string) },
              { key: 'staff', label: 'Staff', render: (_, row) => (row.staff as { name: string })?.name },
              { key: 'branch', label: 'Branch', render: (_, row) => (row.branch as { name: string })?.name },
              { key: 'amount', label: 'Amount', render: (v) => formatCurrency(v as number) },
              {
                key: 'status',
                label: 'Status',
                render: (v) => <Badge variant={statusVariant(v as string)}>{v as string}</Badge>,
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (_, row) =>
                  row.status === 'pending' && can(PERMISSIONS.SALES_APPROVE) ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => approveMutation.mutate({ id: row.id as string, status: 'approved' })}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => approveMutation.mutate({ id: row.id as string, status: 'rejected' })}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ) : null,
              },
            ]}
          />
        </Card>

        <Modal open={showModal} onClose={() => setShowModal(false)} title="Record Daily Sale">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="amount"
              label="Sales Amount ($)"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <Select
              id="branch"
              label="Branch"
              value={branchId || branches[0]?.id || ''}
              onChange={(e) => setBranchId(e.target.value)}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
            <Input
              id="notes"
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending} className="flex-1">
                Save Sale
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </RoleGuard>
  );
}
