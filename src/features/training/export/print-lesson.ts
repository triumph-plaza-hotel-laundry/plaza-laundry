import { logoUrl } from '@/assets/images';
import type { TrainingLessonRecord } from '@/data/training-cms';
import { sanitizeTrainingHtml } from '@/features/training/sanitize';
import { printEnterpriseDocument } from '@/features/enterprise-print';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function buildLessonPrintHtml(
  lessons: Array<Pick<TrainingLessonRecord, 'title' | 'content_html' | 'updated_at'>>,
  options?: { logoUrl?: string; heading?: string },
): string {
  void options?.logoUrl;
  const bodies = lessons
    .map(
      (lesson) => `
      <section class="training-print-lesson">
        <h2>${escapeHtml(lesson.title || 'Untitled Lesson')}</h2>
        <p class="training-print-meta">Updated: ${escapeHtml(
          new Date(lesson.updated_at).toLocaleDateString('en-GB'),
        )}</p>
        <div class="training-rich">${sanitizeTrainingHtml(
          lesson.content_html || '',
        )}</div>
      </section>`,
    )
    .join('<hr style="margin:18px 0;border:0;border-top:1px solid #ddd" />');

  return `<div class="training-print-body">${bodies}</div>`;
}

export function printTrainingLessons(
  lessons: Array<Pick<TrainingLessonRecord, 'title' | 'content_html' | 'updated_at'>>,
  options?: { logoUrl?: string; heading?: string; printedBy?: string },
): void {
  printEnterpriseDocument({
    title: options?.heading || 'Training Lesson',
    printedBy: options?.printedBy || 'Staff',
    source: buildLessonPrintHtml(lessons, {
      logoUrl: options?.logoUrl || logoUrl,
      heading: options?.heading,
    }),
    dir: 'rtl',
  });
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
