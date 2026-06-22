import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/shared/lib/utils';
import { useNotificationStore } from './store';

const TYPE_COLORS: Record<string, string> = {
  sales: 'bg-teal-100 text-teal-700',
  inventory: 'bg-amber-100 text-amber-700',
  booking: 'bg-purple-100 text-purple-700',
  room: 'bg-blue-100 text-blue-700',
  attendance: 'bg-green-100 text-green-700',
  housekeeping: 'bg-orange-100 text-orange-700',
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markRead, markAllRead } = useNotificationStore();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-navy-600 hover:bg-navy-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 rounded-xl border border-navy-100 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-navy-100 px-4 py-3">
              <h3 className="font-semibold text-navy-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead()}
                  className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-navy-400">No notifications yet</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => { if (!n.read) markRead(n.id); }}
                    className={cn(
                      'w-full text-left px-4 py-3 border-b border-navy-50 hover:bg-navy-50 transition-colors',
                      !n.read && 'bg-teal-50/50'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span className={cn('mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase', TYPE_COLORS[n.type] || 'bg-navy-100 text-navy-600')}>
                        {n.type}
                      </span>
                      {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-500" />}
                    </div>
                    <p className="mt-1 text-sm font-medium text-navy-900">{n.title}</p>
                    <p className="text-xs text-navy-500 line-clamp-2">{n.message}</p>
                    <p className="mt-1 text-[10px] text-navy-400">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
