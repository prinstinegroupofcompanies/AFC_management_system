import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ToastContainer } from '@/shared/ui/toast-container';
import type { NavItem } from './navConfig';

interface AppShellProps {
  navItems: NavItem[];
  title?: string;
  sidebarTitle?: string;
  logoSrc: string;
  logoAlt?: string;
}

export function AppShell({ navItems, title, sidebarTitle, logoSrc, logoAlt }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-navy-50">
      <Sidebar
        items={navItems}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        title={sidebarTitle}
        logoSrc={logoSrc}
        logoAlt={logoAlt}
      />

      <div
        className="transition-all duration-300"
        style={{ marginLeft: typeof window !== 'undefined' && window.innerWidth >= 1024 ? (collapsed ? 64 : 256) : 0 }}
      >
        <TopBar onMenuClick={() => setSidebarOpen(true)} title={title} logoSrc={logoSrc} logoAlt={logoAlt} />

        <main className="p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
