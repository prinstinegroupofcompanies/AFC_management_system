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

interface Room {
  id: string;
  number: string;
  type: string;
  rate: number;
  status: string;
  capacity: number;
  beds: number;
  property: { name: string };
  bookings?: { guest: { name: string } }[];
}

const ROOM_TYPES = ['standard', 'deluxe', 'suite'];
const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'default'> = {
  available: 'success', occupied: 'danger', cleaning: 'warning', maintenance: 'default',
};

export function RoomsPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ number: '', type: 'standard', rate: '', capacity: '2', beds: '1', propertyId: '' });
  const can = useAuthStore((s) => s.can);
  const queryClient = useQueryClient();

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.get<Room[]>('/airbnb/rooms'),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/airbnb/rooms', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rooms'] }); toast.success('Room added'); setShowModal(false); },
    onError: (err: Error) => toast.error(err.message),
  });

  const available = rooms.filter((r) => r.status === 'available').length;
  const occupied = rooms.filter((r) => r.status === 'occupied').length;

  return (
    <RoleGuard permission={PERMISSIONS.ROOMS_VIEW}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Rooms</h1>
            <p className="text-sm text-navy-500">{available} available · {occupied} occupied · {rooms.length} total</p>
          </div>
          {can(PERMISSIONS.ROOMS_MANAGE) && (
            <Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4" /> Add Room</Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
          {rooms.map((room) => (
            <Card key={room.id} className={`p-4 text-center ${room.status === 'occupied' ? 'border-red-200 bg-red-50/30' : room.status === 'available' ? 'border-green-200 bg-green-50/30' : ''}`}>
              <p className="text-2xl font-bold text-navy-900">{room.number}</p>
              <p className="text-xs text-navy-500 capitalize">{room.type} · {room.beds} bed{room.beds > 1 ? 's' : ''}</p>
              <Badge variant={STATUS_VARIANT[room.status] || 'default'}>{room.status}</Badge>
              <p className="mt-1 text-sm font-medium text-teal-600">{formatCurrency(room.rate)}/night</p>
              {room.bookings?.[0] && <p className="mt-1 text-xs text-navy-400">{room.bookings[0].guest.name}</p>}
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>Room List</CardTitle></CardHeader>
          <DataTable
            loading={isLoading}
            data={rooms as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'number', label: 'Room #' },
              { key: 'type', label: 'Type', render: (v) => <span className="capitalize">{v as string}</span> },
              { key: 'rate', label: 'Rate/Night', render: (v) => formatCurrency(v as number) },
              { key: 'capacity', label: 'Capacity' },
              { key: 'beds', label: 'Beds' },
              { key: 'status', label: 'Status', render: (v) => <Badge variant={STATUS_VARIANT[v as string] || 'default'}>{v as string}</Badge> },
              { key: 'property', label: 'Property', render: (_, row) => (row.property as { name: string })?.name },
            ]}
          />
        </Card>

        <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Room">
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, rate: parseFloat(form.rate), capacity: parseInt(form.capacity), beds: parseInt(form.beds), propertyId: form.propertyId || undefined }); }} className="space-y-4">
            <Input id="number" label="Room Number" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required />
            <Select id="type" label="Room Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={ROOM_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} />
            <Input id="rate" label="Nightly Rate ($)" type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} required />
            <Input id="capacity" label="Capacity (guests)" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            <Input id="beds" label="Number of Beds" type="number" min="1" value={form.beds} onChange={(e) => setForm({ ...form, beds: e.target.value })} required />
            <Button type="submit" loading={createMutation.isPending} className="w-full">Add Room</Button>
          </form>
        </Modal>
      </div>
    </RoleGuard>
  );
}
