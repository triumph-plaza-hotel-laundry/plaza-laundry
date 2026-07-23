import type { Editor } from '@tiptap/react';
import { ChevronDown, Minus, Plus, X } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';

type InsertTableDialogProps = {
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
};

type WidthMode = 'auto' | '100' | 'custom';

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="training-table-drawer__stepper">
      <span className="training-table-drawer__label">{label}</span>
      <div className="training-table-drawer__stepper-controls">
        <button
          aria-label={`إنقاص ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          type="button"
        >
          <Minus size={16} />
        </button>
        <strong>{value}</strong>
        <button
          aria-label={`زيادة ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          type="button"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

export function InsertTableDialog({
  open,
  onClose,
  editor,
}: InsertTableDialogProps) {
  const titleId = useId();
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [widthMode, setWidthMode] = useState<WidthMode>('100');
  const [customPercent, setCustomPercent] = useState('80');
  const [withHeader, setWithHeader] = useState(true);
  const [withBorders, setWithBorders] = useState(true);
  const [striped, setStriped] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRows(3);
    setCols(3);
    setWidthMode('100');
    setCustomPercent('80');
    setWithHeader(true);
    setWithBorders(true);
    setStriped(true);
    setAdvancedOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const safeRows = Math.min(12, Math.max(1, rows || 1));
  const safeCols = Math.min(8, Math.max(1, cols || 1));

  const previewWidth = useMemo(() => {
    if (widthMode === 'auto') return 'auto';
    if (widthMode === '100') return '100%';
    const pct = Math.min(100, Math.max(20, Number(customPercent) || 80));
    return `${pct}%`;
  }, [widthMode, customPercent]);

  const insert = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({
        rows: safeRows,
        cols: safeCols,
        withHeaderRow: withHeader,
      })
      .run();

    requestAnimationFrame(() => {
      const table = editor.view.dom.querySelector(
        '.tableWrapper table, table.training-editor-table',
      ) as HTMLTableElement | null;
      if (!table) return;

      table.classList.add('training-editor-table');
      table.classList.toggle('training-editor-table--bordered', withBorders);
      table.classList.toggle('training-editor-table--striped', striped);
      table.classList.toggle('training-editor-table--no-border', !withBorders);

      if (widthMode === 'auto') {
        table.style.width = '';
        table.style.maxWidth = '100%';
      } else {
        table.style.width = previewWidth;
        table.style.maxWidth = '100%';
      }
    });

    onClose();
  };

  if (!open) {
    return null;
  }

  return (
    <div className="training-table-drawer-root" dir="rtl" lang="ar">
      <button
        aria-label="إغلاق لوحة إدراج الجدول"
        className="training-table-drawer__scrim"
        onClick={onClose}
        type="button"
      />

      <aside
        aria-labelledby={titleId}
        aria-modal="true"
        className="training-table-drawer"
        role="dialog"
      >
        <header className="training-table-drawer__header">
          <div>
            <h3 id={titleId}>📊 إدراج جدول</h3>
            <p>إنشاء جدول جديد</p>
          </div>
          <button
            aria-label="إغلاق"
            className="training-table-drawer__close"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </header>

        <div className="training-table-drawer__body">
          <Stepper
            label="عدد الصفوف"
            max={12}
            min={1}
            onChange={setRows}
            value={safeRows}
          />

          <div className="training-table-drawer__divider" />

          <Stepper
            label="عدد الأعمدة"
            max={8}
            min={1}
            onChange={setCols}
            value={safeCols}
          />

          <div className="training-table-drawer__divider" />

          <label className="training-table-drawer__field">
            عرض الجدول
            <select
              onChange={(event) =>
                setWidthMode(event.target.value as WidthMode)
              }
              value={widthMode}
            >
              <option value="auto">تلقائي</option>
              <option value="100">100%</option>
              <option value="custom">مخصص</option>
            </select>
          </label>

          {widthMode === 'custom' ? (
            <label className="training-table-drawer__field">
              نسبة العرض (%)
              <input
                max={100}
                min={20}
                onChange={(event) => setCustomPercent(event.target.value)}
                type="number"
                value={customPercent}
              />
            </label>
          ) : null}

          <div className="training-table-drawer__divider" />

          <section className="training-table-drawer__preview">
            <p className="training-table-drawer__section-title">معاينة</p>
            <div
              className="training-table-drawer__preview-frame"
              style={{
                width: previewWidth === 'auto' ? '78%' : previewWidth,
              }}
            >
              <table
                className={`training-table-drawer__preview-table${withBorders ? ' is-bordered' : ''}${striped ? ' is-striped' : ''}`}
              >
                <tbody>
                  {Array.from({ length: safeRows }).map((_, rowIndex) => (
                    <tr key={`r-${rowIndex}`}>
                      {Array.from({ length: safeCols }).map((__, colIndex) => {
                        const isHeader = withHeader && rowIndex === 0;
                        const Tag = isHeader ? 'th' : 'td';
                        return (
                          <Tag key={`c-${rowIndex}-${colIndex}`}>
                            {isHeader
                              ? `عنوان ${colIndex + 1}`
                              : `${rowIndex},${colIndex + 1}`}
                          </Tag>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="training-table-drawer__divider" />

          <div className="training-table-drawer__advanced">
            <button
              aria-expanded={advancedOpen}
              className="training-table-drawer__advanced-toggle"
              onClick={() => setAdvancedOpen((value) => !value)}
              type="button"
            >
              <span>⚙️ خيارات متقدمة</span>
              <ChevronDown
                className={advancedOpen ? 'is-open' : ''}
                size={16}
              />
            </button>

            {advancedOpen ? (
              <div className="training-table-drawer__checks">
                <label>
                  <input
                    checked={withHeader}
                    onChange={(event) => setWithHeader(event.target.checked)}
                    type="checkbox"
                  />
                  أول صف عنوان
                </label>
                <label>
                  <input
                    checked={withBorders}
                    onChange={(event) => setWithBorders(event.target.checked)}
                    type="checkbox"
                  />
                  حدود الجدول
                </label>
                <label>
                  <input
                    checked={striped}
                    onChange={(event) => setStriped(event.target.checked)}
                    type="checkbox"
                  />
                  تلوين الصفوف بالتبادل
                </label>
              </div>
            ) : null}
          </div>
        </div>

        <footer className="training-table-drawer__footer">
          <button
            className="training-lux-btn training-lux-btn--ghost"
            onClick={onClose}
            type="button"
          >
            إلغاء
          </button>
          <button
            className="training-lux-btn training-lux-btn--gold"
            onClick={insert}
            type="button"
          >
            إدراج الجدول
          </button>
        </footer>
      </aside>
    </div>
  );
}
