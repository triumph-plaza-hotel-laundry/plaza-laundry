import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { TrainingLessonRecord } from '@/data/training-cms';
import {
  buildLessonPrintHtml,
  downloadBlob,
} from '@/features/training/export/print-lesson';

export async function downloadLessonsPdf(
  lessons: Array<Pick<TrainingLessonRecord, 'title' | 'content_html' | 'updated_at'>>,
  filename = 'training-lessons.pdf',
  options?: { logoUrl?: string; heading?: string },
): Promise<void> {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = '794px';
  host.style.background = '#fff';
  host.style.zIndex = '-1';
  host.innerHTML = buildLessonPrintHtml(lessons, options);
  document.body.appendChild(host);

  try {
    const canvas = await html2canvas(host, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const total = pdf.getNumberOfPages();
    for (let i = 1; i <= total; i += 1) {
      pdf.setPage(i);
      pdf.setFontSize(9);
      pdf.setTextColor(100);
      pdf.text(`Page ${i} / ${total}`, pageWidth / 2, pageHeight - 6, {
        align: 'center',
      });
    }

    const blob = pdf.output('blob');
    await downloadBlob(filename, blob);
  } finally {
    host.remove();
  }
}
