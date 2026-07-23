import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef } from 'react';
import { FontSize } from '@/features/training/editor/extensions/font-size';
import { TrainingImage } from '@/features/training/editor/extensions/TrainingImage';
import { TrainingVideoEmbed } from '@/features/training/editor/extensions/TrainingVideoEmbed';
import { TableCellStyle } from '@/features/training/editor/extensions/table-cell-style';
import { TrainingEditorToolbar } from '@/features/training/editor/TrainingEditorToolbar';
import {
  optimizeTrainingImage,
  optimizeTrainingImageFromDataUrl,
} from '@/features/training/image-optimize';
import '@/features/training/editor/training-editor.css';

type TrainingRichEditorInnerProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
};

export function TrainingRichEditorInner({
  value,
  onChange,
  placeholder = 'ابدأ بكتابة محتوى التدريب هنا…',
  editable = true,
}: TrainingRichEditorInnerProps) {
  const lastEmitted = useRef(value);

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Underline,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'training-editor-table',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      TableCellStyle,
      TrainingImage,
      TrainingVideoEmbed,
    ],
    content: value || '<p></p>',
    editorProps: {
      attributes: {
        class: 'training-editor__prose',
        spellcheck: 'true',
        dir: 'rtl',
        lang: 'ar',
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files?.length) {
          return false;
        }
        const imageFiles = Array.from(files).filter((file) =>
          file.type.startsWith('image/'),
        );
        if (!imageFiles.length) {
          return false;
        }
        event.preventDefault();
        void (async () => {
          for (const file of imageFiles) {
            const optimized = await optimizeTrainingImage(file);
            const node = view.state.schema.nodes.trainingImage?.create({
              src: optimized.dataUrl,
              width: '100%',
              align: 'center',
            });
            if (!node) continue;
            const pos = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            const tr = view.state.tr.insert(
              pos?.pos ?? view.state.selection.from,
              node,
            );
            view.dispatch(tr);
          }
        })();
        return true;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) {
          return false;
        }
        const imageItems = Array.from(items).filter(
          (item) => item.type.indexOf('image') === 0,
        );
        if (!imageItems.length) {
          return false;
        }
        event.preventDefault();
        void (async () => {
          for (const item of imageItems) {
            const file = item.getAsFile();
            if (!file) continue;
            const optimized = await optimizeTrainingImage(file);
            const node = view.state.schema.nodes.trainingImage?.create({
              src: optimized.dataUrl,
              width: '100%',
              align: 'center',
            });
            if (!node) continue;
            const tr = view.state.tr.replaceSelectionWith(node);
            view.dispatch(tr);
          }
        })();
        return true;
      },
    },
    onUpdate: ({ editor: current }) => {
      const html = current.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    if (value === lastEmitted.current) {
      return;
    }
    lastEmitted.current = value;
    editor.commands.setContent(value || '<p></p>', { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const onPasteCapture = (event: ClipboardEvent) => {
      const html = event.clipboardData?.getData('text/html') || '';
      if (!html.includes('<img')) {
        return;
      }
      // Optimize any pasted remote/base64 images after TipTap inserts them.
      window.setTimeout(() => {
        void (async () => {
          const imgs = Array.from(
            editor.view.dom.querySelectorAll('img[src^="data:"], img[src^="blob:"]'),
          ) as HTMLImageElement[];
          for (const img of imgs) {
            try {
              const optimized = await optimizeTrainingImageFromDataUrl(img.src);
              if (img.src !== optimized.dataUrl) {
                img.src = optimized.dataUrl;
              }
            } catch {
              // Keep original if optimization fails.
            }
          }
        })();
      }, 0);
    };
    const dom = editor.view.dom;
    dom.addEventListener('paste', onPasteCapture);
    return () => dom.removeEventListener('paste', onPasteCapture);
  }, [editor]);

  return (
    <div className="training-editor">
      {editable ? <TrainingEditorToolbar editor={editor} /> : null}
      <EditorContent editor={editor} />
    </div>
  );
}
