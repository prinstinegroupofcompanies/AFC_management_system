import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useAuthStore } from '@/core/auth/store';
import { BrandLogo } from '@/shared/ui/brand-logo';
import type { NavItem } from './navConfig';

interface SidebarProps {
  items: NavItem[];
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  title?: string;
  logoSrc: string;
  logoAlt?: string;
}

export function Sidebar({
  items,
  open,
  onClose,
  collapsed,
  onToggleCollapse,
  title = 'Atlantic Group',
  logoSrc,
  logoAlt = 'Atlantic Food Center',
}: SidebarProps) {
  const can = useAuthStore((s) => s.can);

  const filteredItems = items.filter(
    (item) => !item.permission || can(item.permission as Parameters<typeof can>[0])
  );

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className={cn('flex items-center gap-3 border-b border-navy-700/50 px-4 py-5', collapsed && 'justify-center px-2')}>
        <BrandLogo src={logoSrc} alt={logoAlt} collapsed={collapsed} />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{title}</p>
            <p className="truncate text-xs text-navy-300">Management System</p>
          </div>
        )}
        <button
          onClick={onClose}
          className="ml-auto rounded-lg p-1 text-navy-300 hover:bg-navy-700 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/' || item.path === '/food-center'}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-navy-300 hover:bg-navy-700/50 hover:text-white',
                collapsed && 'justify-center px-2'
              )
            }
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="hidden border-t border-navy-700/50 p-3 lg:block">
        <button
          onClick={onToggleCollapse}
          className="flex w-full items-center justify-center rounded-lg p-2 text-navy-400 hover:bg-navy-700/50 hover:text-white transition-colors"
        >
          <ChevronLeft className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-navy-900/50 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 256 }}
        className={cn(
          'fixed inset-y-0 left-0 z-50 hidden bg-navy-900 lg:block',
          'transition-all duration-300'
        )}
      >
        {sidebarContent}
      </motion.aside>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: -256 }}
            animate={{ x: 0 }}
            exit={{ x: -256 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-navy-900 lg:hidden"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
