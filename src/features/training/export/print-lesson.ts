import type { TrainingLessonRecord } from '@/data/training-cms';
import { sanitizeTrainingHtml } from '@/features/training/sanitize';

const PRINT_STYLES = `
@page { size: A4; margin: 16mm 14mm 18mm; }
@media print {
  body * { visibility: hidden !important; }
  #training-print-root, #training-print-root * { visibility: visible !important; }
  #training-print-root {
    position: absolute;
    inset: 0;
    width: 100%;
    color: #111 !important;
    background: #fff !important;
  }
  .training-print-nav { display: none !important; }
  table { page-break-inside: avoid; break-inside: avoid; }
  img, figure { max-width: 100% !important; page-break-inside: avoid; break-inside: avoid; }
  h1, h2, h3 { page-break-after: avoid; }
  .training-print-footer {
    position: fixed;
    bottom: 0;
    inset-inline: 0;
    text-align: center;
    font-size: 10px;
    color: #666;
  }
}
.training-print-shell {
  font-family: "Noto Kufi Arabic", Tahoma, sans-serif;
  color: #111;
  direction: rtl;
}
.training-print-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border-bottom: 2px solid #c9a54c;
  padding-bottom: 10px;
  margin-bottom: 16px;
}
.training-print-header img {
  height: 48px;
  width: auto;
}
.training-print-meta {
  color: #555;
  font-size: 12px;
  margin: 0 0 14px;
}
.training-print-body img {
  max-width: 100%;
  height: auto;
}
.training-print-body table {
  width: 100%;
  border-collapse: collapse;
}
.training-print-body th,
.training-print-body td {
  border: 1px solid #ccc;
  padding: 6px;
}
`;

function ensurePrintRoot(): HTMLElement {
  let root = document.getElementById('training-print-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'training-print-root';
    document.body.appendChild(root);
  }
  return root;
}

function ensurePrintStyle(): void {
  if (document.getElementById('training-print-style')) return;
  const style = document.createElement('style');
  style.id = 'training-print-style';
  style.textContent = PRINT_STYLES;
  document.head.appendChild(style);
}

export function buildLessonPrintHtml(
  lessons: Array<Pick<TrainingLessonRecord, 'title' | 'content_html' | 'updated_at'>>,
  options?: { logoUrl?: string; heading?: string },
): string {
  const logo = options?.logoUrl
    ? `<img alt="Triumph Plaza" src="${options.logoUrl}" />`
    : `<strong>Triumph Plaza Hotel Laundry</strong>`;
  const date = new Date().toLocaleDateString('en-GB');
  const bodies = lessons
    .map(
      (lesson) => `
      <section class="training-print-lesson">
        <h1>${escapeHtml(lesson.title || 'Untitled Lesson')}</h1>
        <p class="training-print-meta">Updated: ${escapeHtml(
          new Date(lesson.updated_at).toLocaleDateString('en-GB'),
        )} · Printed: ${date}</p>
        <div class="training-print-body training-rich">${sanitizeTrainingHtml(
          lesson.content_html || '',
        )}</div>
      </section>`,
    )
    .join('<hr style="margin:24px 0;border:0;border-top:1px solid #ddd" />');

  return `
    <div class="training-print-shell">
      <header class="training-print-header">
        ${logo}
        <div>
          <div>${escapeHtml(options?.heading || 'Training Lesson')}</div>
          <div style="font-size:12px;color:#666">${date}</div>
        </div>
      </header>
      ${bodies}
      <div class="training-print-footer">Triumph Plaza Hotel Laundry · Training</div>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function printTrainingLessons(
  lessons: Array<Pick<TrainingLessonRecord, 'title' | 'content_html' | 'updated_at'>>,
  options?: { logoUrl?: string; heading?: string },
): void {
  ensurePrintStyle();
  const root = ensurePrintRoot();
  root.innerHTML = buildLessonPrintHtml(lessons, options);
  window.print();
}

export async function downloadBlob(filename: string, blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function downloadUrl(filename: string, url: string): Promise<void> {
  const response = await fetch(url);
  const blob = await response.blob();
  await downloadBlob(filename, blob);
}
