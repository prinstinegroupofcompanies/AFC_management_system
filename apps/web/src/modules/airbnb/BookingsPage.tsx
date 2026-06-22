import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, LogIn, LogOut } from 'lucide-react';
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

interface Booking {
  id: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  guest: { name: string; email?: string };
  room: { number: string; type: string; rate: number };
}

interface Guest { id: string; name: string; }
interface Room { id: string; number: string; type: string; rate: number; status: string; }

export function BookingsPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ guestId: '', roomId: '', checkIn: '', checkOut: '', totalAmount: '', notes: '' });
  const can = useAuthStore((s) => s.can);
  const queryClient = useQueryClient();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => api.get<Booking[]>('/airbnb/bookings'),
  });

  const { data: guests = [] } = useQuery({ queryKey: ['guests'], queryFn: () => api.get<Guest[]>('/airbnb/guests') });
  const { data: rooms = [] } = useQuery({ queryKey: ['rooms'], queryFn: () => api.get<Room[]>('/airbnb/rooms') });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/airbnb/bookings', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bookings'] }); queryClient.invalidateQueries({ queryKey: ['rooms'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Booking created'); setShowModal(false); },
    onError: (err: Error) => toast.error(err.message),
  });

  const checkInMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/airbnb/bookings/${id}/check-in`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bookings'] }); toast.success('Guest checked in'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/airbnb/bookings/${id}/check-out`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bookings'] }); queryClient.invalidateQueries({ queryKey: ['rooms'] }); toast.success('Guest checked out'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusVariant = (s: string) => {
    const map: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'default'> = {
      checked_in: 'success', reserved: 'info', checked_out: 'default', cancelled: 'danger',
    };
    return map[s] || 'default';
  };

  return (
    <RoleGuard permission={PERMISSIONS.BOOKINGS_VIEW}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Bookings</h1>
            <p className="text-sm text-navy-500">Room reservations and check-in/out</p>
          </div>
          {can(PERMISSIONS.BOOKINGS_MANAGE) && (
            <Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4" /> New Booking</Button>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle>All Bookings</CardTitle></CardHeader>
          <DataTable
            loading={isLoading}
            data={bookings as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'guest', label: 'Guest', render: (_, row) => (row.guest as { name: string })?.name },
              { key: 'room', label: 'Room', render: (_, row) => `${(row.room as { number: string })?.number} (${(row.room as { type: string })?.type})` },
              { key: 'checkIn', label: 'Check In', render: (v) => formatDate(v as string) },
              { key: 'checkOut', label: 'Check Out', render: (v) => formatDate(v as string) },
              { key: 'totalAmount', label: 'Amount', render: (v) => formatCurrency(v as number) },
              { key: 'status', label: 'Status', render: (v) => <Badge variant={statusVariant(v as string)}>{(v as string).replace('_', ' ')}</Badge> },
              {
                key: 'actions', label: 'Actions',
                render: (_, row) => can(PERMISSIONS.BOOKINGS_MANAGE) ? (
                  <div className="flex gap-1">
                    {row.status === 'reserved' && <Button size="sm" variant="ghost" onClick={() => checkInMutation.mutate(row.id as string)}><LogIn className="h-4 w-4 text-green-600" /></Button>}
                    {row.status === 'checked_in' && <Button size="sm" variant="ghost" onClick={() => checkOutMutation.mutate(row.id as string)}><LogOut className="h-4 w-4 text-navy-600" /></Button>}
                  </div>
                ) : null,
              },
            ]}
          />
        </Card>

        <Modal open={showModal} onClose={() => setShowModal(false)} title="New Booking">
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, totalAmount: parseFloat(form.totalAmount), checkIn: form.checkIn, checkOut: form.checkOut }); }} className="space-y-4">
            <Select id="guest" label="Guest" value={form.guestId || guests[0]?.id || ''} onChange={(e) => setForm({ ...form, guestId: e.target.value })} options={guests.map((g) => ({ value: g.id, label: g.name }))} />
            <Select id="room" label="Room" value={form.roomId || rooms.filter(r => r.status === 'available')[0]?.id || ''} onChange={(e) => setForm({ ...form, roomId: e.target.value })} options={rooms.filter(r => r.status === 'available').map((r) => ({ value: r.id, label: `${r.number} - ${r.type} (${formatCurrency(r.rate)}/night)` }))} />
            <div className="grid grid-cols-2 gap-4">
              <Input id="checkIn" label="Check In" type="date" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} required />
              <Input id="checkOut" label="Check Out" type="date" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} required />
            </div>
            <Input id="amount" label="Total Amount ($)" type="number" step="0.01" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} required />
            <Button type="submit" loading={createMutation.isPending} className="w-full">Create Booking</Button>
          </form>
        </Modal>
      </div>
    </RoleGuard>
  );
}
