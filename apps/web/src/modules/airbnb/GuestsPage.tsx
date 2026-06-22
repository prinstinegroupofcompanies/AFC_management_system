import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { PERMISSIONS } from '@agbms/shared';
import { api } from '@/shared/lib/api';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { DataTable, Modal } from '@/shared/ui/table';
import { Card, CardHeader, CardTitle } from '@/shared/ui/card';
import { RoleGuard } from '@/core/auth/ProtectedRoute';
import { useAuthStore } from '@/core/auth/store';
import { toast } from '@/shared/ui/toast';
import { formatDate } from '@/shared/lib/utils';

interface Guest {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  bookings: { checkIn: string; room: { number: string } }[];
}

export function GuestsPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', idNumber: '' });
  const can = useAuthStore((s) => s.can);
  const queryClient = useQueryClient();

  const { data: guests = [], isLoading } = useQuery({
    queryKey: ['guests'],
    queryFn: () => api.get<Guest[]>('/airbnb/guests'),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/airbnb/guests', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['guests'] }); toast.success('Guest added'); setShowModal(false); },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <RoleGuard permission={PERMISSIONS.GUESTS_VIEW}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Guests</h1>
            <p className="text-sm text-navy-500">Guest records and history</p>
          </div>
          {can(PERMISSIONS.GUESTS_MANAGE) && (
            <Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4" /> Add Guest</Button>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle>Guest Directory ({guests.length})</CardTitle></CardHeader>
          <DataTable
            loading={isLoading}
            data={guests as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email', render: (v) => (v as string) || '—' },
              { key: 'phone', label: 'Phone', render: (v) => (v as string) || '—' },
              {
                key: 'bookings', label: 'Recent Stay',
                render: (_, row) => {
                  const g = row as unknown as Guest;
                  const last = g.bookings?.[0];
                  return last ? `Room ${last.room.number} · ${formatDate(last.checkIn)}` : '—';
                },
              },
            ]}
          />
        </Card>

        <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Guest">
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
            <Input id="name" label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input id="email" label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input id="phone" label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input id="idNumber" label="ID Number" value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} />
            <Button type="submit" loading={createMutation.isPending} className="w-full">Add Guest</Button>
          </form>
        </Modal>
      </div>
    </RoleGuard>
  );
}
