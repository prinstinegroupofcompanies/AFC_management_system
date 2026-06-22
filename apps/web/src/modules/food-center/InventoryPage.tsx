import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
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

interface InventoryItem {
  id: string;
  productName: string;
  category: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;
  branch: { name: string };
}

interface Movement {
  id: string;
  type: string;
  quantity: number;
  status: string;
  notes?: string;
  item: { productName: string };
  staff?: { name: string };
  createdAt: string;
}

export function InventoryPage() {
  const [showItemModal, setShowItemModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveType, setMoveType] = useState<'in' | 'out'>('in');
  const can = useAuthStore((s) => s.can);
  const queryClient = useQueryClient();

  const [itemForm, setItemForm] = useState({
    productName: '', category: '', quantity: '0', costPrice: '0', sellingPrice: '0', branchId: '', reorderLevel: '10',
  });
  const [moveForm, setMoveForm] = useState({ itemId: '', quantity: '', notes: '' });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get<InventoryItem[]>('/food-center/inventory'),
  });

  const { data: movements = [] } = useQuery({
    queryKey: ['inventory-movements'],
    queryFn: () => api.get<Movement[]>('/food-center/inventory/movements'),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/branches'),
  });

  const createItemMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/food-center/inventory', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item added');
      setShowItemModal(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const moveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/food-center/inventory/movements', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      toast.success('Movement recorded');
      setShowMoveModal(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/food-center/inventory/movements/${id}/approve`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      toast.success('Movement processed');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <RoleGuard permission={PERMISSIONS.INVENTORY_VIEW}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Inventory</h1>
            <p className="text-sm text-navy-500">Stock management and tracking</p>
          </div>
          <div className="flex gap-2">
            {can(PERMISSIONS.INVENTORY_CREATE) && (
              <>
                <Button variant="outline" onClick={() => { setMoveType('in'); setShowMoveModal(true); }}>
                  <ArrowDownToLine className="h-4 w-4" /> Stock In
                </Button>
                <Button variant="outline" onClick={() => { setMoveType('out'); setShowMoveModal(true); }}>
                  <ArrowUpFromLine className="h-4 w-4" /> Stock Out
                </Button>
                <Button onClick={() => setShowItemModal(true)}>
                  <Plus className="h-4 w-4" /> Add Item
                </Button>
              </>
            )}
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Inventory Items</CardTitle></CardHeader>
          <DataTable
            loading={isLoading}
            data={items as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'productName', label: 'Product' },
              { key: 'category', label: 'Category' },
              {
                key: 'quantity',
                label: 'Qty',
                render: (v, row) => {
                  const qty = v as number;
                  const reorder = (row as unknown as InventoryItem).reorderLevel;
                  return (
                    <span className={qty <= reorder ? 'font-semibold text-amber-600' : ''}>
                      {qty}
                    </span>
                  );
                },
              },
              { key: 'costPrice', label: 'Cost', render: (v) => formatCurrency(v as number) },
              { key: 'sellingPrice', label: 'Price', render: (v) => formatCurrency(v as number) },
              { key: 'branch', label: 'Branch', render: (_, row) => (row.branch as { name: string })?.name },
            ]}
          />
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Movements</CardTitle></CardHeader>
          <DataTable
            data={movements as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'item', label: 'Item', render: (_, row) => (row.item as { productName: string })?.productName },
              { key: 'type', label: 'Type', render: (v) => <Badge variant={v === 'in' ? 'success' : 'warning'}>{v as string}</Badge> },
              { key: 'quantity', label: 'Qty' },
              { key: 'status', label: 'Status', render: (v) => <Badge variant={v === 'approved' ? 'success' : v === 'rejected' ? 'danger' : 'info'}>{v as string}</Badge> },
              { key: 'staff', label: 'Staff', render: (_, row) => (row.staff as { name: string })?.name || '—' },
              {
                key: 'actions',
                label: 'Actions',
                render: (_, row) =>
                  row.status === 'pending' && can(PERMISSIONS.INVENTORY_APPROVE) ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => approveMutation.mutate({ id: row.id as string, status: 'approved' })}>Approve</Button>
                      <Button size="sm" variant="ghost" onClick={() => approveMutation.mutate({ id: row.id as string, status: 'rejected' })}>Reject</Button>
                    </div>
                  ) : null,
              },
            ]}
          />
        </Card>

        <Modal open={showItemModal} onClose={() => setShowItemModal(false)} title="Add Inventory Item">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createItemMutation.mutate({
                ...itemForm,
                quantity: parseInt(itemForm.quantity),
                costPrice: parseFloat(itemForm.costPrice),
                sellingPrice: parseFloat(itemForm.sellingPrice),
                reorderLevel: parseInt(itemForm.reorderLevel),
                branchId: itemForm.branchId || branches[0]?.id,
              });
            }}
            className="space-y-4"
          >
            <Input id="productName" label="Product Name" value={itemForm.productName} onChange={(e) => setItemForm({ ...itemForm, productName: e.target.value })} required />
            <Input id="category" label="Category" value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })} required />
            <div className="grid grid-cols-2 gap-4">
              <Input id="quantity" label="Quantity" type="number" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} />
              <Input id="reorderLevel" label="Reorder Level" type="number" value={itemForm.reorderLevel} onChange={(e) => setItemForm({ ...itemForm, reorderLevel: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input id="costPrice" label="Cost Price" type="number" step="0.01" value={itemForm.costPrice} onChange={(e) => setItemForm({ ...itemForm, costPrice: e.target.value })} />
              <Input id="sellingPrice" label="Selling Price" type="number" step="0.01" value={itemForm.sellingPrice} onChange={(e) => setItemForm({ ...itemForm, sellingPrice: e.target.value })} />
            </div>
            <Select id="branch" label="Branch" value={itemForm.branchId || branches[0]?.id || ''} onChange={(e) => setItemForm({ ...itemForm, branchId: e.target.value })} options={branches.map((b) => ({ value: b.id, label: b.name }))} />
            <Button type="submit" loading={createItemMutation.isPending} className="w-full">Add Item</Button>
          </form>
        </Modal>

        <Modal open={showMoveModal} onClose={() => setShowMoveModal(false)} title={moveType === 'in' ? 'Stock In' : 'Stock Out'}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              moveMutation.mutate({
                itemId: moveForm.itemId || items[0]?.id,
                type: moveType,
                quantity: parseInt(moveForm.quantity),
                notes: moveForm.notes || undefined,
              });
            }}
            className="space-y-4"
          >
            <Select id="item" label="Item" value={moveForm.itemId || items[0]?.id || ''} onChange={(e) => setMoveForm({ ...moveForm, itemId: e.target.value })} options={items.map((i) => ({ value: i.id, label: i.productName }))} />
            <Input id="qty" label="Quantity" type="number" min="1" value={moveForm.quantity} onChange={(e) => setMoveForm({ ...moveForm, quantity: e.target.value })} required />
            <Input id="notes" label="Notes" value={moveForm.notes} onChange={(e) => setMoveForm({ ...moveForm, notes: e.target.value })} />
            <Button type="submit" loading={moveMutation.isPending} className="w-full">Submit</Button>
          </form>
        </Modal>
      </div>
    </RoleGuard>
  );
}
