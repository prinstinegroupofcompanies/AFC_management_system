import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { PERMISSIONS } from '@agbms/shared';
import { api } from '@/shared/lib/api';
import { formatCurrency, formatDate } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge, Modal } from '@/shared/ui/table';
import { Card, KpiCard } from '@/shared/ui/card';
import { RoleGuard } from '@/core/auth/ProtectedRoute';
import { useAuthStore } from '@/core/auth/store';
import { toast } from '@/shared/ui/toast';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  amountOwed: number;
  invoices: { id: string; amount: number; paidAmount: number; status: string; dueDate: string; description?: string }[];
}

export function ARPage() {
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState('');
  const [customerForm, setCustomerForm] = useState({ name: '', email: '', phone: '' });
  const [invoiceForm, setInvoiceForm] = useState({ amount: '', dueDate: '', description: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'bank_transfer' });
  const can = useAuthStore((s) => s.can);
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['station-customers'],
    queryFn: () => api.get<Customer[]>('/station/ar/customers'),
  });

  const totalOwed = customers.reduce((s, c) => s + c.amountOwed, 0);

  const createCustomer = useMutation({
    mutationFn: (data: typeof customerForm) => api.post('/station/ar/customers', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['station-customers'] }); toast.success('Customer added'); setShowCustomerModal(false); },
    onError: (err: Error) => toast.error(err.message),
  });

  const createInvoice = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/station/ar/invoices', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['station-customers'] }); toast.success('Invoice created'); setShowInvoiceModal(false); },
    onError: (err: Error) => toast.error(err.message),
  });

  const recordPayment = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => api.post(`/station/ar/invoices/${id}/payments`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['station-customers'] }); toast.success('Payment recorded'); setShowPaymentModal(false); },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusVariant = (s: string) => s === 'paid' ? 'success' : s === 'partial' ? 'warning' : 'danger';

  return (
    <RoleGuard permission={PERMISSIONS.AR_VIEW}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Accounts Receivable</h1>
            <p className="text-sm text-navy-500">Customer invoices and payments</p>
          </div>
          {can(PERMISSIONS.AR_MANAGE) && (
            <Button onClick={() => setShowCustomerModal(true)}><Plus className="h-4 w-4" /> Add Customer</Button>
          )}
        </div>

        <KpiCard title="Total Receivable" value={formatCurrency(totalOwed)} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {isLoading ? Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-navy-100" />) :
            customers.map((c) => (
              <Card key={c.id}>
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-semibold text-navy-900">{c.name}</h3>
                    {c.email && <p className="text-sm text-navy-500">{c.email}</p>}
                  </div>
                  <Badge variant={c.amountOwed > 0 ? 'danger' : 'success'}>{formatCurrency(c.amountOwed)}</Badge>
                </div>
                {c.invoices.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {c.invoices.map((inv) => (
                      <div key={inv.id} className="flex justify-between rounded-lg bg-navy-50 px-3 py-2 text-sm">
                        <span>{formatCurrency(inv.amount)} · {formatDate(inv.dueDate)}</span>
                        <div className="flex gap-2 items-center">
                          <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
                          {inv.status !== 'paid' && can(PERMISSIONS.AR_MANAGE) && (
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedInvoice(inv.id); setShowPaymentModal(true); }}>Pay</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {can(PERMISSIONS.AR_MANAGE) && (
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => { setSelectedCustomer(c); setShowInvoiceModal(true); }}>Add Invoice</Button>
                )}
              </Card>
            ))}
        </div>

        <Modal open={showCustomerModal} onClose={() => setShowCustomerModal(false)} title="Add Customer">
          <form onSubmit={(e) => { e.preventDefault(); createCustomer.mutate(customerForm); }} className="space-y-4">
            <Input id="name" label="Customer Name" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} required />
            <Input id="email" label="Email" type="email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
            <Input id="phone" label="Phone" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} />
            <Button type="submit" loading={createCustomer.isPending} className="w-full">Add Customer</Button>
          </form>
        </Modal>

        <Modal open={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title="Create Invoice">
          <form onSubmit={(e) => { e.preventDefault(); if (selectedCustomer) createInvoice.mutate({ customerId: selectedCustomer.id, ...invoiceForm, dueDate: invoiceForm.dueDate || new Date().toISOString() }); }} className="space-y-4">
            <Input id="amount" label="Amount ($)" type="number" step="0.01" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} required />
            <Input id="dueDate" label="Due Date" type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} />
            <Input id="desc" label="Description" value={invoiceForm.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} />
            <Button type="submit" loading={createInvoice.isPending} className="w-full">Create Invoice</Button>
          </form>
        </Modal>

        <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Record Payment">
          <form onSubmit={(e) => { e.preventDefault(); recordPayment.mutate({ id: selectedInvoice, data: { ...paymentForm, amount: parseFloat(paymentForm.amount), date: new Date().toISOString() } }); }} className="space-y-4">
            <Input id="payAmt" label="Payment Amount ($)" type="number" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} required />
            <Button type="submit" loading={recordPayment.isPending} className="w-full">Record Payment</Button>
          </form>
        </Modal>
      </div>
    </RoleGuard>
  );
}
