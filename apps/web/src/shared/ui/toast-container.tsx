import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useToastStore, type ToastType } from './toast';

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-green-500" />,
  error: <XCircle className="h-5 w-5 text-red-500" />,
  info: <Info className="h-5 w-5 text-teal-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, x: 50, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 50 }}
          className={cn(
            'flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg',
            'min-w-[280px] max-w-sm'
          )}
        >
          {icons[t.type]}
          <p className="flex-1 text-sm text-navy-700">{t.message}</p>
          <button
            onClick={() => removeToast(t.id)}
            className="text-navy-400 hover:text-navy-600"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      ))}
    </div>
  );
}
