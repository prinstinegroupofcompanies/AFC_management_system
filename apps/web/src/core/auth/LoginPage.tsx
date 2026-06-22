import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/core/auth/store';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { toast } from '@/shared/ui/toast';
import { BRAND_LOGOS } from '@/shared/lib/branding';
import { BrandLogo } from '@/shared/ui/brand-logo';
import {
  API_URL,
  checkApiHealth,
  IS_API_CONFIGURED,
  IS_PRODUCTION,
  type ApiHealthStatus,
} from '@/shared/lib/env';

export function LoginPage() {
  const [email, setEmail] = useState(import.meta.env.DEV ? 'admin@atlanticgroup.com' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? 'password123' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<ApiHealthStatus | 'checking'>(
    IS_PRODUCTION && IS_API_CONFIGURED ? 'checking' : 'ok'
  );
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  useEffect(() => {
    if (!IS_PRODUCTION || !IS_API_CONFIGURED) return;

    checkApiHealth().then(setServerStatus);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-navy-900 via-navy-800 to-teal-800 p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo src={BRAND_LOGOS.default} alt="Atlantic Food Center" size="lg" />
          <span className="text-xl font-bold text-white">Atlantic Group</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-4xl font-bold text-white leading-tight">
            Business Management<br />System
          </h1>
          <p className="mt-4 text-lg text-navy-200">
            Centralized platform for managing all Atlantic Group subsidiaries
          </p>
        </motion.div>

        <p className="text-sm text-navy-400">
          Atlantic Food Center · Atlantic Station · Atlantic Air BNB
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 lg:hidden flex items-center gap-3">
            <BrandLogo src={BRAND_LOGOS.default} alt="Atlantic Food Center" size="md" />
            <span className="text-xl font-bold text-navy-900">Atlantic Group</span>
          </div>

          <h2 className="text-2xl font-bold text-navy-900">Sign in</h2>
          <p className="mt-1 text-sm text-navy-500">Enter your email and password to access the system</p>

          {IS_PRODUCTION && !IS_API_CONFIGURED && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Server connection is not configured. Contact your administrator.
            </div>
          )}

          {IS_PRODUCTION && IS_API_CONFIGURED && serverStatus === 'checking' && (
            <div className="mt-4 rounded-lg border border-navy-200 bg-navy-50 p-3 text-sm text-navy-600">
              Checking server connection…
            </div>
          )}

          {IS_PRODUCTION && serverStatus === 'slow' && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Server is waking up. Sign in may take a few extra seconds on first try.
            </div>
          )}

          {IS_PRODUCTION && serverStatus === 'unreachable' && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              Cannot reach the server right now. Check your connection (Orange, Lonestar, or Wi‑Fi) and try again.
              {API_URL && <span className="block mt-1 text-xs opacity-80">API: {API_URL}</span>}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@atlanticgroup.com"
              required
              autoComplete="email"
            />

            <div className="relative">
              <Input
                id="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-navy-400 hover:text-navy-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={loading}
              disabled={IS_PRODUCTION && !IS_API_CONFIGURED}
            >
              Sign In
            </Button>
          </form>

          {import.meta.env.DEV && (
            <div className="mt-6 rounded-lg bg-navy-50 p-4 text-xs text-navy-500">
              <p className="font-medium text-navy-700 mb-1">Demo Accounts (development only)</p>
              <p>admin@atlanticgroup.com · manager@atlanticgroup.com</p>
              <p>sales@atlanticgroup.com · receptionist@atlanticgroup.com</p>
              <p>guest@atlanticgroup.com · inventory@atlanticgroup.com</p>
              <p className="mt-1">Password: password123</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
