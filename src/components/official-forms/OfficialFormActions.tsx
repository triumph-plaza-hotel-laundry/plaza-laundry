import { Cloud, CloudOff, Loader2, Printer } from 'lucide-react';
import type { FormSaveStatus } from '@/hooks/useFormAutoSave';
import { useLanguage } from '@/hooks';

type OfficialFormActionsProps = {
  onPrint: () => void;
  saveStatus: FormSaveStatus;
  printLabelEn?: string;
  printLabelAr?: string;
};

export function OfficialFormActions({
  onPrint,
  saveStatus,
  printLabelEn = 'Print Form',
  printLabelAr = 'طباعة النموذج',
}: OfficialFormActionsProps) {
  const { language } = useLanguage();

  return (
    <div aria-live="polite" className="tpl-form-page__toolbar">
      <div className="tpl-form-page__sync">
        {saveStatus === 'saving' ? (
          <>
            <Loader2 aria-hidden="true" className="tpl-form-page__sync-icon tpl-form-page__sync-icon--spin" />
            <span>{language === 'ar' ? 'جاري الحفظ…' : 'Saving…'}</span>
          </>
        ) : saveStatus === 'saved' ? (
          <>
            <Cloud aria-hidden="true" className="tpl-form-page__sync-icon" />
            <span>{language === 'ar' ? 'تم الحفظ — مزامنة مباشرة' : 'Saved — live sync active'}</span>
          </>
        ) : saveStatus === 'error' ? (
          <>
            <CloudOff aria-hidden="true" className="tpl-form-page__sync-icon" />
            <span>{language === 'ar' ? 'تعذر الحفظ' : 'Save failed'}</span>
          </>
        ) : (
          <>
            <Cloud aria-hidden="true" className="tpl-form-page__sync-icon" />
            <span>{language === 'ar' ? 'مزامنة تلقائية مباشرة' : 'Auto-save & live sync'}</span>
          </>
        )}
      </div>

      <button className="tpl-form-page__print" onClick={onPrint} type="button">
        <Printer aria-hidden="true" strokeWidth={1.6} />
        <span className="tpl-form-page__print-en">{printLabelEn}</span>
        <span className="tpl-form-page__print-ar">{printLabelAr}</span>
      </button>
    </div>
  );
}
