import { motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { InventoryToastState } from '@/hooks/useInventoryManagement';

type InventoryToastProps = {
  toast: InventoryToastState;
};

export function InventoryToast({ toast }: InventoryToastProps) {
  if (!toast) {
    return null;
  }

  const Icon = toast.tone === 'success' ? CheckCircle2 : XCircle;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={`inv-toast inv-toast--${toast.tone}`}
      exit={{ opacity: 0, y: 12 }}
      initial={{ opacity: 0, y: 16 }}
      role="status"
    >
      <Icon aria-hidden="true" size={18} strokeWidth={1.75} />
      <span>{toast.message}</span>
    </motion.div>
  );
}

export function InventoryTableSkeleton() {
  return (
    <div aria-hidden="true" className="inv-skeleton inv-skeleton--erp">
      <div className="inv-skeleton__search" />
      <div className="inv-skeleton__search" />
      <div className="inv-skeleton__table-head" />
      {Array.from({ length: 8 }).map((_, index) => (
        <div className="inv-skeleton__table-row" key={index} />
      ))}
    </div>
  );
}
