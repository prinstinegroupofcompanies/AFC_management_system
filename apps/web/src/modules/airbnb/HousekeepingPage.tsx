import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react';
import { PERMISSIONS } from '@agbms/shared';
import { api } from '@/shared/lib/api';
import { formatDate } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { DataTable, Badge } from '@/shared/ui/table';
import { Card, CardHeader, CardTitle } from '@/shared/ui/card';
import { RoleGuard } from '@/core/auth/ProtectedRoute';
import { useAuthStore } from '@/core/auth/store';
import { toast } from '@/shared/ui/toast';

interface Task {
  id: string;
  status: string;
  notes?: string;
  scheduledDate: string;
  completedAt?: string;
  room: { number: string; type: string };
}

export function HousekeepingPage() {
  const can = useAuthStore((s) => s.can);
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['housekeeping'],
    queryFn: () => api.get<Task[]>('/airbnb/housekeeping'),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/airbnb/housekeeping/${id}`, { status: 'completed' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['housekeeping'] }); queryClient.invalidateQueries({ queryKey: ['rooms'] }); toast.success('Task completed'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const pending = tasks.filter((t) => t.status === 'pending').length;
  const completed = tasks.filter((t) => t.status === 'completed').length;

  return (
    <RoleGuard permission={PERMISSIONS.HOUSEKEEPING_VIEW}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Housekeeping</h1>
          <p className="text-sm text-navy-500">{pending} pending · {completed} completed</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Cleaning Tasks</CardTitle></CardHeader>
          <DataTable
            loading={isLoading}
            data={tasks as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'room', label: 'Room', render: (_, row) => `Room ${(row.room as { number: string })?.number}` },
              { key: 'scheduledDate', label: 'Scheduled', render: (v) => formatDate(v as string) },
              { key: 'notes', label: 'Notes', render: (v) => (v as string) || '—' },
              { key: 'status', label: 'Status', render: (v) => <Badge variant={v === 'completed' ? 'success' : v === 'in_progress' ? 'info' : 'warning'}>{v as string}</Badge> },
              {
                key: 'actions', label: 'Actions',
                render: (_, row) => row.status !== 'completed' && can(PERMISSIONS.HOUSEKEEPING_MANAGE) ? (
                  <Button size="sm" variant="ghost" onClick={() => completeMutation.mutate(row.id as string)}>
                    <CheckCircle className="h-4 w-4 text-green-600" /> Complete
                  </Button>
                ) : null,
              },
            ]}
          />
        </Card>
      </div>
    </RoleGuard>
  );
}
