import { Printer } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks';
import {
  printEnterpriseDocument,
  type EnterprisePrintOptions,
} from '@/features/enterprise-print/printEnterpriseDocument';
import '@/features/enterprise-print/enterprise-print.css';

type EnterprisePrintButtonProps = {
  title: string;
  subtitle?: string;
  /** CSS selector or callback returning the element/HTML to print */
  getSource: () => HTMLElement | string | null;
  dir?: 'ltr' | 'rtl';
  className?: string;
  label?: string;
  disabled?: boolean;
};

export function EnterprisePrintButton({
  title,
  subtitle,
  getSource,
  dir,
  className,
  label = 'Print',
  disabled,
}: EnterprisePrintButtonProps) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const handlePrint = () => {
    if (busy) return;
    try {
      const source = getSource();
      if (!source) {
        window.alert('Nothing to print yet.');
        return;
      }
      setBusy(true);
      const options: EnterprisePrintOptions = {
        title,
        subtitle,
        printedBy: user?.displayName || user?.username || 'Staff',
        source,
        dir,
      };
      printEnterpriseDocument(options);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : 'Print failed.',
      );
    } finally {
      window.setTimeout(() => setBusy(false), 800);
    }
  };

  return (
    <button
      aria-busy={busy || undefined}
      aria-label={busy ? 'Preparing print' : label}
      className={`enterprise-print-btn${className ? ` ${className}` : ''}`}
      disabled={disabled || busy}
      onClick={handlePrint}
      type="button"
    >
      <Printer aria-hidden className="enterprise-print-btn__icon" strokeWidth={1.75} />
      <span className="enterprise-print-btn__label">
        {busy ? '…' : label}
      </span>
    </button>
  );
}
