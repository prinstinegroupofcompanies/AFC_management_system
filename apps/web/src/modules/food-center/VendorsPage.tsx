import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, DollarSign } from 'lucide-react';
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

interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  goodsSupplied?: string;
  amountOwed: number;
  invoices: {
    id: string;
    amount: number;
    paidAmount: number;
    status: string;
    deliveryDate: string;
    description?: string;
    payments: { amount: number; date: string }[];
  }[];
}

export function VendorsPage() {
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<string>('');
  const can = useAuthStore((s) => s.can);
  const queryClient = useQueryClient();

  const [vendorForm, setVendorForm] = useState({ name: '', email: '', phone: '', goodsSupplied: '', address: '' });
  const [invoiceForm, setInvoiceForm] = useState({ amount: '', deliveryDate: '', description: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', notes: '' });

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => api.get<Vendor[]>('/food-center/vendors'),
  });

  const totalOwed = vendors.reduce((sum, v) => sum + v.amountOwed, 0);

  const createVendorMutation = useMutation({
    mutationFn: (data: Record<string, string>) => api.post('/food-center/vendors', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor added');
      setShowVendorModal(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createInvoiceMutation = useMutation({
    mutationFn: ({ vendorId, data }: { vendorId: string; data: Record<string, string> }) =>
      api.post(`/food-center/vendors/${vendorId}/invoices`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Invoice added');
      setShowInvoiceModal(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const paymentMutation = useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: Record<string, string> }) =>
      api.post(`/food-center/vendors/invoices/${invoiceId}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Payment recorded');
      setShowPaymentModal(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusVariant = (s: string) =>
    s === 'paid' ? 'success' : s === 'partial' ? 'warning' : 'danger';

  return (
    <RoleGuard permission={PERMISSIONS.VENDORS_VIEW}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Vendors</h1>
            <p className="text-sm text-navy-500">Supplier management and payments</p>
          </div>
          {can(PERMISSIONS.VENDORS_MANAGE) && (
            <Button onClick={() => setShowVendorModal(true)}>
              <Plus className="h-4 w-4" /> Add Vendor
            </Button>
          )}
        </div>

        <KpiCard title="Total Amount Owed" value={formatCurrency(totalOwed)} icon={<DollarSign className="h-5 w-5" />} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {isLoading
            ? Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-navy-100" />)
            : vendors.map((vendor) => (
                <Card key={vendor.id} hover>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-navy-900">{vendor.name}</h3>
                      <p className="text-sm text-navy-500">{vendor.goodsSupplied}</p>
                      {vendor.phone && <p className="text-xs text-navy-400 mt-1">{vendor.phone}</p>}
                    </div>
                    <Badge variant={vendor.amountOwed > 0 ? 'danger' : 'success'}>
                      {formatCurrency(vendor.amountOwed)} owed
                    </Badge>
                  </div>

                  {vendor.invoices.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-semibold uppercase text-navy-400">Invoices</p>
                      {vendor.invoices.slice(0, 3).map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between rounded-lg bg-navy-50 px-3 py-2 text-sm">
                          <div>
                            <span className="font-medium">{formatCurrency(inv.amount)}</span>
                            <span className="text-navy-400 ml-2">{formatDate(inv.deliveryDate)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
                            {inv.status !== 'paid' && can(PERMISSIONS.VENDORS_MANAGE) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedInvoice(inv.id);
                                  setShowPaymentModal(true);
                                }}
                              >
                                Pay
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {can(PERMISSIONS.VENDORS_MANAGE) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setSelectedVendor(vendor);
                        setShowInvoiceModal(true);
                      }}
                    >
                      Add Invoice
                    </Button>
                  )}
                </Card>
              ))}
        </div>

        <Modal open={showVendorModal} onClose={() => setShowVendorModal(false)} title="Add Vendor">
          <form onSubmit={(e) => { e.preventDefault(); createVendorMutation.mutate(vendorForm); }} className="space-y-4">
            <Input id="name" label="Vendor Name" value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} required />
            <Input id="email" label="Email" type="email" value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} />
            <Input id="phone" label="Phone" value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} />
            <Input id="goods" label="Goods Supplied" value={vendorForm.goodsSupplied} onChange={(e) => setVendorForm({ ...vendorForm, goodsSupplied: e.target.value })} />
            <Button type="submit" loading={createVendorMutation.isPending} className="w-full">Add Vendor</Button>
          </form>
        </Modal>

        <Modal open={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title="Add Invoice">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (selectedVendor) {
                createInvoiceMutation.mutate({
                  vendorId: selectedVendor.id,
                  data: { ...invoiceForm, deliveryDate: invoiceForm.deliveryDate || new Date().toISOString() },
                });
              }
            }}
            className="space-y-4"
          >
            <Input id="amount" label="Amount ($)" type="number" step="0.01" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} required />
            <Input id="deliveryDate" label="Delivery Date" type="date" value={invoiceForm.deliveryDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, deliveryDate: e.target.value })} />
            <Input id="desc" label="Description" value={invoiceForm.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} />
            <Button type="submit" loading={createInvoiceMutation.isPending} className="w-full">Add Invoice</Button>
          </form>
        </Modal>

        <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Record Payment">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              paymentMutation.mutate({
                invoiceId: selectedInvoice,
                data: { ...paymentForm, date: new Date().toISOString() },
              });
            }}
            className="space-y-4"
          >
            <Input id="payAmount" label="Payment Amount ($)" type="number" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} required />
            <Input id="payNotes" label="Notes" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
            <Button type="submit" loading={paymentMutation.isPending} className="w-full">Record Payment</Button>
          </form>
        </Modal>
      </div>
    </RoleGuard>
  );
}
