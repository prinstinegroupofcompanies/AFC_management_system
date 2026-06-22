import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { Clock, LogIn, LogOut, QrCode } from 'lucide-react';
import { PERMISSIONS } from '@agbms/shared';
import { api } from '@/shared/lib/api';
import { formatDateTime } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { DataTable, Badge } from '@/shared/ui/table';
import { Card, CardHeader, CardTitle, KpiCard } from '@/shared/ui/card';
import { RoleGuard } from '@/core/auth/ProtectedRoute';
import { useAuthStore } from '@/core/auth/store';
import { toast } from '@/shared/ui/toast';

interface AttendanceRecord {
  id: string;
  checkIn: string;
  checkOut?: string;
  method: string;
  user: { name: string };
  branch?: { name: string };
  action?: string;
}

export function AttendancePage() {
  const [qrCode, setQrCode] = useState('');
  const { user, can } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => api.get<AttendanceRecord[]>('/food-center/attendance'),
    refetchInterval: 30000,
  });

  useEffect(() => {
    const socket = io('/', { path: '/socket.io' });
    socket.on('attendance:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });
    return () => { socket.disconnect(); };
  }, [queryClient]);

  const checkInMutation = useMutation({
    mutationFn: () => api.post<AttendanceRecord>('/food-center/attendance/check-in', { method: 'mobile' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success(data.action === 'checkout' ? 'Checked out successfully' : 'Checked in successfully');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const qrMutation = useMutation({
    mutationFn: (code: string) => api.post<AttendanceRecord>('/food-center/attendance/qr-check-in', { qrCode: code }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success(`${(data.user as { name: string }).name} — ${data.action === 'checkout' ? 'Checked out' : 'Checked in'}`);
      setQrCode('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const todayRecords = records.filter((r) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(r.checkIn) >= today;
  });

  const checkedIn = todayRecords.filter((r) => !r.checkOut).length;

  return (
    <RoleGuard permission={PERMISSIONS.ATTENDANCE_VIEW}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Attendance</h1>
          <p className="text-sm text-navy-500">Real-time staff attendance tracking</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard title="Today's Check-ins" value={todayRecords.length} icon={<Clock className="h-5 w-5" />} />
          <KpiCard title="Currently In" value={checkedIn} icon={<LogIn className="h-5 w-5" />} />
          <KpiCard title="Checked Out" value={todayRecords.length - checkedIn} icon={<LogOut className="h-5 w-5" />} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {can(PERMISSIONS.ATTENDANCE_CHECKIN) && (
            <Card>
              <CardHeader><CardTitle>Mobile Check-in</CardTitle></CardHeader>
              <p className="text-sm text-navy-500 mb-4">Tap to check in or check out</p>
              <Button
                size="lg"
                className="w-full"
                onClick={() => checkInMutation.mutate()}
                loading={checkInMutation.isPending}
              >
                <LogIn className="h-5 w-5" /> Check In / Out
              </Button>

              {user?.qrCode && (
                <div className="mt-6 rounded-lg bg-navy-50 p-4 text-center">
                  <QrCode className="h-8 w-8 mx-auto text-navy-400 mb-2" />
                  <p className="text-xs text-navy-500 mb-1">Your QR Code</p>
                  <p className="text-xs font-mono text-navy-700 break-all">{user.qrCode}</p>
                </div>
              )}
            </Card>
          )}

          {can(PERMISSIONS.ATTENDANCE_CHECKIN) && (
            <Card>
              <CardHeader><CardTitle>QR Code Scanner</CardTitle></CardHeader>
              <p className="text-sm text-navy-500 mb-4">Scan staff QR code to log attendance</p>
              <div className="flex gap-2">
                <Input
                  id="qr"
                  placeholder="Enter or scan QR code"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                />
                <Button
                  onClick={() => qrMutation.mutate(qrCode)}
                  loading={qrMutation.isPending}
                  disabled={!qrCode}
                >
                  Scan
                </Button>
              </div>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle>Attendance Records</CardTitle></CardHeader>
          <DataTable
            loading={isLoading}
            data={records as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'user', label: 'Staff', render: (_, row) => (row.user as { name: string })?.name },
              { key: 'checkIn', label: 'Check In', render: (v) => formatDateTime(v as string) },
              { key: 'checkOut', label: 'Check Out', render: (v) => (v ? formatDateTime(v as string) : '—') },
              { key: 'method', label: 'Method', render: (v) => <Badge variant="info">{v as string}</Badge> },
              { key: 'branch', label: 'Branch', render: (_, row) => (row.branch as { name: string })?.name || '—' },
            ]}
          />
        </Card>
      </div>
    </RoleGuard>
  );
}
