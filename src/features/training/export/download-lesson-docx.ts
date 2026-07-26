import {
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import type { TrainingLessonRecord } from '@/data/training-cms';
import { downloadBlob } from '@/features/training/export/print-lesson';

function stripToParagraphs(html: string): string[] {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  const blocks = [...doc.body.querySelectorAll('p, h1, h2, h3, li, td, th')];
  if (blocks.length === 0) {
    const text = doc.body.textContent?.trim();
    return text ? [text] : [];
  }
  return blocks
    .map((el) => el.textContent?.replace(/\s+/g, ' ').trim() || '')
    .filter(Boolean);
}

async function fetchImageBytes(src: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

export async function downloadLessonDocx(
  lesson: Pick<TrainingLessonRecord, 'title' | 'content_html' | 'updated_at'>,
  filename?: string,
): Promise<void> {
  const children: Paragraph[] = [
    new Paragraph({
      text: lesson.title || 'Untitled Lesson',
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Updated: ${new Date(lesson.updated_at).toLocaleDateString('en-GB')}`,
          italics: true,
          size: 20,
        }),
      ],
    }),
  ];

  for (const text of stripToParagraphs(lesson.content_html)) {
    children.push(new Paragraph({ children: [new TextRun(text)] }));
  }

  const docHtml = new DOMParser().parseFromString(
    lesson.content_html || '',
    'text/html',
  );
  const images = [...docHtml.querySelectorAll('img')].slice(0, 8);
  for (const img of images) {
    const src = img.getAttribute('src');
    if (!src) continue;
    const bytes = await fetchImageBytes(src);
    if (!bytes) continue;
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: bytes,
            transformation: { width: 480, height: 270 },
            type: 'jpg',
          }),
        ],
      }),
    );
  }

  const document = new Document({
    sections: [{ children }],
  });
  const blob = await Packer.toBlob(document);
  await downloadBlob(
    filename || `${(lesson.title || 'lesson').replace(/\s+/g, '-')}.docx`,
    blob,
  );
}
