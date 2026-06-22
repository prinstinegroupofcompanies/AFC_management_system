import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { PERMISSIONS } from '@agbms/shared';
import { api } from '@/shared/lib/api';
import { formatCurrency, formatDate } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { DataTable, Modal } from '@/shared/ui/table';
import { Card, CardHeader, CardTitle } from '@/shared/ui/card';
import { RoleGuard } from '@/core/auth/ProtectedRoute';
import { useAuthStore } from '@/core/auth/store';
import { toast } from '@/shared/ui/toast';

interface JournalTxn {
  id: string;
  date: string;
  description: string;
  reference?: string;
  lines: { id: string; debit: number; credit: number; account: { code: string; name: string } }[];
}

interface Account {
  id: string;
  code: string;
  name: string;
}

interface JournalLine {
  accountId: string;
  debit: string;
  credit: string;
  description: string;
}

export function JournalPage() {
  const [showModal, setShowModal] = useState(false);
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([
    { accountId: '', debit: '', credit: '', description: '' },
    { accountId: '', debit: '', credit: '', description: '' },
  ]);
  const can = useAuthStore((s) => s.can);
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['station-journal'],
    queryFn: () => api.get<JournalTxn[]>('/station/journal'),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['station-accounts'],
    queryFn: () => api.get<Account[]>('/station/accounts'),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/station/journal', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['station-journal'] });
      queryClient.invalidateQueries({ queryKey: ['station-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Journal entry posted');
      setShowModal(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanced) { toast.error('Debits and credits must balance'); return; }
    createMutation.mutate({
      date: new Date().toISOString(),
      description,
      reference: reference || undefined,
      lines: lines.map((l) => ({
        accountId: l.accountId,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        description: l.description || undefined,
      })),
    });
  };

  return (
    <RoleGuard permission={PERMISSIONS.JOURNAL_VIEW}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Journal Entries</h1>
            <p className="text-sm text-navy-500">General ledger transactions</p>
          </div>
          {can(PERMISSIONS.JOURNAL_CREATE) && (
            <Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4" /> New Entry</Button>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle>Journal Transactions</CardTitle></CardHeader>
          <DataTable
            loading={isLoading}
            data={transactions as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'date', label: 'Date', render: (v) => formatDate(v as string) },
              { key: 'description', label: 'Description' },
              { key: 'reference', label: 'Reference', render: (v) => (v as string) || '—' },
              {
                key: 'lines',
                label: 'Lines',
                render: (_, row) => {
                  const txn = row as unknown as JournalTxn;
                  return (
                    <div className="text-xs space-y-0.5">
                      {txn.lines?.map((l) => (
                        <div key={l.id}>{l.account.code} {l.account.name}: {l.debit > 0 ? `Dr ${formatCurrency(l.debit)}` : `Cr ${formatCurrency(l.credit)}`}</div>
                      ))}
                    </div>
                  );
                },
              },
            ]}
          />
        </Card>

        <Modal open={showModal} onClose={() => setShowModal(false)} title="New Journal Entry">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input id="desc" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} required />
            <Input id="ref" label="Reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)} />

            <div className="space-y-2">
              <p className="text-sm font-medium text-navy-700">Entry Lines</p>
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <select
                      className="w-full rounded-lg border border-navy-200 px-2 py-2 text-sm"
                      value={line.accountId}
                      onChange={(e) => { const n = [...lines]; n[i].accountId = e.target.value; setLines(n); }}
                      required
                    >
                      <option value="">Select account</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input type="number" step="0.01" placeholder="Debit" className="w-full rounded-lg border border-navy-200 px-2 py-2 text-sm" value={line.debit} onChange={(e) => { const n = [...lines]; n[i].debit = e.target.value; n[i].credit = ''; setLines(n); }} />
                  </div>
                  <div className="col-span-3">
                    <input type="number" step="0.01" placeholder="Credit" className="w-full rounded-lg border border-navy-200 px-2 py-2 text-sm" value={line.credit} onChange={(e) => { const n = [...lines]; n[i].credit = e.target.value; n[i].debit = ''; setLines(n); }} />
                  </div>
                  <div className="col-span-1">
                    {lines.length > 2 && (
                      <button type="button" onClick={() => setLines(lines.filter((_, j) => j !== i))} className="p-2 text-red-500"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, { accountId: '', debit: '', credit: '', description: '' }])}>Add Line</Button>
            </div>

            <div className={`rounded-lg p-3 text-sm ${balanced ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              Debits: {formatCurrency(totalDebit)} · Credits: {formatCurrency(totalCredit)} · {balanced ? 'Balanced ✓' : 'Must balance'}
            </div>

            <Button type="submit" loading={createMutation.isPending} disabled={!balanced} className="w-full">Post Entry</Button>
          </form>
        </Modal>
      </div>
    </RoleGuard>
  );
}
