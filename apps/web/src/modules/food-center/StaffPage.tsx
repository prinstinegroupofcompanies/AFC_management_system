import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { PERMISSIONS } from '@agbms/shared';
import { api } from '@/shared/lib/api';
import { formatDate } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input, Select } from '@/shared/ui/input';
import { DataTable, Badge, Modal } from '@/shared/ui/table';
import { Card, CardHeader, CardTitle } from '@/shared/ui/card';
import { RoleGuard } from '@/core/auth/ProtectedRoute';
import { useAuthStore } from '@/core/auth/store';
import { toast } from '@/shared/ui/toast';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  status: string;
  role: { slug: string; name: string };
  subsidiaries: { name: string; slug: string }[];
  staffProfile?: { department?: string; hireDate?: string };
  createdAt: string;
}

interface Role {
  id: string;
  slug: string;
  name: string;
}

interface Subsidiary {
  id: string;
  name: string;
}

export function StaffPage() {
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();
  const activeSubsidiary = useAuthStore((s) => s.activeSubsidiary);

  const [form, setForm] = useState({
    name: '', email: '', roleId: '', subsidiaryIds: [] as string[], department: '',
  });

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<StaffUser[]>('/users'),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get<Role[]>('/users/roles'),
  });

  const { data: subsidiaries = [] } = useQuery({
    queryKey: ['subsidiaries'],
    queryFn: () => api.get<Subsidiary[]>('/subsidiaries'),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<{ tempPassword?: string }>('/users', data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(data.tempPassword ? `Staff created. Temp password: ${data.tempPassword}` : 'Staff created');
      setShowModal(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filteredStaff = activeSubsidiary
    ? staff.filter((s) => s.subsidiaries.some((sub) => sub.slug === activeSubsidiary.slug) || s.role.slug === 'super_admin')
    : staff;

  return (
    <RoleGuard permission={PERMISSIONS.USERS_VIEW}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Staff Management</h1>
            <p className="text-sm text-navy-500">Manage team members and roles</p>
          </div>
          <Button onClick={() => {
            setForm({ ...form, subsidiaryIds: activeSubsidiary ? [activeSubsidiary.id] : [subsidiaries[0]?.id].filter(Boolean) });
            setShowModal(true);
          }}>
            <Plus className="h-4 w-4" /> Add Staff
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle>Team Members</CardTitle></CardHeader>
          <DataTable
            loading={isLoading}
            data={filteredStaff as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'role', label: 'Role', render: (_, row) => (row.role as { name: string })?.name },
              { key: 'staffProfile', label: 'Department', render: (_, row) => (row.staffProfile as { department?: string })?.department || '—' },
              {
                key: 'status',
                label: 'Status',
                render: (v) => <Badge variant={v === 'active' ? 'success' : 'danger'}>{v as string}</Badge>,
              },
              { key: 'createdAt', label: 'Joined', render: (v) => formatDate(v as string) },
            ]}
          />
        </Card>

        <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Staff Member">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                ...form,
                subsidiaryIds: form.subsidiaryIds.length ? form.subsidiaryIds : [subsidiaries[0]?.id],
              });
            }}
            className="space-y-4"
          >
            <Input id="name" label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input id="email" label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Select
              id="role"
              label="Role"
              value={form.roleId || roles[0]?.id || ''}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              options={roles.map((r) => ({ value: r.id, label: r.name }))}
            />
            <Input id="dept" label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            <Button type="submit" loading={createMutation.isPending} className="w-full">Create Staff</Button>
          </form>
        </Modal>
      </div>
    </RoleGuard>
  );
}
