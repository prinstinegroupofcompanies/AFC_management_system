import { useQuery } from '@tanstack/react-query';
import { Settings, Database, Users, Building2 } from 'lucide-react';
import { PERMISSIONS } from '@agbms/shared';
import { api } from '@/shared/lib/api';
import { Card, CardHeader, CardTitle, KpiCard } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/table';
import { RoleGuard } from '@/core/auth/ProtectedRoute';

interface SettingsData {
  subsidiaries: { id: string; slug: string; name: string; isActive: boolean; description?: string }[];
  stats: { activeUsers: number; roles: number; auditLogs: number };
  system: { version: string; environment: string; database: string };
}

export function SettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<SettingsData>('/settings'),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-navy-100" />
        ))}
      </div>
    );
  }

  return (
    <RoleGuard permission={PERMISSIONS.SETTINGS_VIEW}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Settings</h1>
          <p className="text-sm text-navy-500">System configuration and overview</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard title="Active Users" value={data?.stats.activeUsers || 0} icon={<Users className="h-5 w-5" />} />
          <KpiCard title="Roles" value={data?.stats.roles || 0} icon={<Settings className="h-5 w-5" />} />
          <KpiCard title="Audit Logs" value={data?.stats.auditLogs || 0} icon={<Database className="h-5 w-5" />} />
        </div>

        <Card>
          <CardHeader><CardTitle>Subsidiaries</CardTitle></CardHeader>
          <div className="space-y-3">
            {data?.subsidiaries.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between rounded-lg bg-navy-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-navy-400" />
                  <div>
                    <p className="font-medium text-navy-900">{sub.name}</p>
                    <p className="text-xs text-navy-500">{sub.description || sub.slug}</p>
                  </div>
                </div>
                <Badge variant={sub.isActive ? 'success' : 'default'}>{sub.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle>System Information</CardTitle></CardHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
            <div><span className="text-navy-500">Version:</span> <span className="font-medium text-navy-900">{data?.system.version}</span></div>
            <div><span className="text-navy-500">Environment:</span> <span className="font-medium text-navy-900 capitalize">{data?.system.environment}</span></div>
            <div><span className="text-navy-500">Database:</span> <span className="font-medium text-navy-900">{data?.system.database}</span></div>
          </div>
        </Card>
      </div>
    </RoleGuard>
  );
}
