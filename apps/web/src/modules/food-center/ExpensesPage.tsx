import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload } from 'lucide-react';
import { PERMISSIONS } from '@agbms/shared';
import { api } from '@/shared/lib/api';
import { formatCurrency, formatDate } from '@/shared/lib/utils';
import { resolveApiAssetUrl } from '@/shared/lib/env';
import { Button } from '@/shared/ui/button';
import { Input, Select } from '@/shared/ui/input';
import { DataTable, Modal } from '@/shared/ui/table';
import { Card, CardHeader, CardTitle } from '@/shared/ui/card';
import { RoleGuard } from '@/core/auth/ProtectedRoute';
import { useAuthStore } from '@/core/auth/store';
import { toast } from '@/shared/ui/toast';

const EXPENSE_CATEGORIES = [
  'Utilities', 'Rent', 'Supplies', 'Salaries', 'Transport', 'Marketing', 'Maintenance', 'Other',
];

interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  description?: string;
  receiptUrl?: string;
  enteredBy: { name: string };
  branch: { name: string };
}

export function ExpensesPage() {
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const can = useAuthStore((s) => s.can);
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => api.get<Expense[]>('/food-center/expenses'),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/branches'),
  });

  const createMutation = useMutation({
    mutationFn: (formData: FormData) => api.post('/food-center/expenses', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Expense recorded');
      setShowModal(false);
      setAmount('');
      setDescription('');
      setReceipt(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('category', category);
    formData.append('amount', amount);
    formData.append('date', new Date().toISOString());
    formData.append('branchId', branches[0]?.id || '');
    if (description) formData.append('description', description);
    if (receipt) formData.append('receipt', receipt);
    createMutation.mutate(formData);
  };

  return (
    <RoleGuard permission={PERMISSIONS.EXPENSES_VIEW}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Expenses</h1>
            <p className="text-sm text-navy-500">Track and manage business expenses</p>
          </div>
          {can(PERMISSIONS.EXPENSES_CREATE) && (
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4" /> Add Expense
            </Button>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle>All Expenses</CardTitle></CardHeader>
          <DataTable
            loading={isLoading}
            data={expenses as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'date', label: 'Date', render: (v) => formatDate(v as string) },
              { key: 'category', label: 'Category' },
              { key: 'amount', label: 'Amount', render: (v) => formatCurrency(v as number) },
              { key: 'description', label: 'Description', render: (v) => (v as string) || '—' },
              { key: 'enteredBy', label: 'Entered By', render: (_, row) => (row.enteredBy as { name: string })?.name },
              {
                key: 'receiptUrl',
                label: 'Receipt',
                render: (v) => {
                  const href = resolveApiAssetUrl(v as string);
                  return href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline text-sm">
                      View
                    </a>
                  ) : '—';
                },
              },
            ]}
          />
        </Card>

        <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Expense">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select id="category" label="Category" value={category} onChange={(e) => setCategory(e.target.value)} options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))} />
            <Input id="amount" label="Amount ($)" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <Input id="description" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1.5">Receipt (optional)</label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-navy-200 px-4 py-3 text-sm text-navy-500 hover:border-teal-400 transition-colors">
                <Upload className="h-4 w-4" />
                {receipt ? receipt.name : 'Upload receipt (PDF, JPG, PNG)'}
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => setReceipt(e.target.files?.[0] || null)} />
              </label>
            </div>
            <Button type="submit" loading={createMutation.isPending} className="w-full">Save Expense</Button>
          </form>
        </Modal>
      </div>
    </RoleGuard>
  );
}
