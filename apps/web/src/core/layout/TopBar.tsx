import { Menu, Search, LogOut, User, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import { useAuthStore } from '@/core/auth/store';
import { NotificationBell } from '@/core/notifications/NotificationBell';
import { useRealtimeNotifications } from '@/core/notifications/useRealtimeNotifications';

interface TopBarProps {
  onMenuClick: () => void;
  title?: string;
}

export function TopBar({ onMenuClick, title }: TopBarProps) {
  const { user, logout, activeSubsidiary } = useAuthStore();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  useRealtimeNotifications();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-navy-100 bg-white/80 px-4 backdrop-blur-md lg:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-navy-600 hover:bg-navy-100 transition-colors lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1">
        {title && (
          <h1 className="text-lg font-semibold text-navy-900">{title}</h1>
        )}
        {activeSubsidiary && !title && (
          <p className="text-sm text-navy-500">
            <span className="font-medium text-navy-700">{activeSubsidiary.name}</span>
          </p>
        )}
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
          <input
            type="search"
            placeholder="Search..."
            className="w-64 rounded-lg border border-navy-200 bg-navy-50 py-2 pl-9 pr-4 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
          />
        </div>
      </div>

      <NotificationBell />

      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-navy-100 transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-700">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden text-left md:block">
            <p className="text-sm font-medium text-navy-900">{user?.name}</p>
            <p className="text-xs text-navy-500">{user?.roleName}</p>
          </div>
          <ChevronDown className={cn('hidden h-4 w-4 text-navy-400 md:block transition-transform', showMenu && 'rotate-180')} />
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-navy-100 bg-white py-1 shadow-lg">
              <div className="border-b border-navy-100 px-4 py-2 md:hidden">
                <p className="text-sm font-medium text-navy-900">{user?.name}</p>
                <p className="text-xs text-navy-500">{user?.roleName}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
