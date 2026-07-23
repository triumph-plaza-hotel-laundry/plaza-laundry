import type { Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import { useState } from 'react';
import { InsertImageDialog } from '@/features/training/editor/InsertImageDialog';
import { InsertTableDialog } from '@/features/training/editor/InsertTableDialog';
import { InsertVideoDialog } from '@/features/training/editor/InsertVideoDialog';
import { TableFloatingToolbar } from '@/features/training/editor/TableFloatingToolbar';

type TrainingEditorToolbarProps = {
  editor: Editor | null;
};

function ToolButton({
  active,
  disabled,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={`training-toolbar__btn${active ? ' is-active' : ''}`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

export function TrainingEditorToolbar({ editor }: TrainingEditorToolbarProps) {
  const [showMore, setShowMore] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  if (!editor) {
    return null;
  }

  const headingValue = editor.isActive('heading', { level: 1 })
    ? '1'
    : editor.isActive('heading', { level: 2 })
      ? '2'
      : editor.isActive('heading', { level: 3 })
        ? '3'
        : editor.isActive('heading', { level: 4 })
          ? '4'
          : editor.isActive('heading', { level: 5 })
            ? '5'
            : editor.isActive('heading', { level: 6 })
              ? '6'
              : 'paragraph';

  return (
    <>
      <div
        className="training-toolbar training-toolbar--luxury"
        role="toolbar"
        aria-label="شريط أدوات المحرر"
      >
        <div className="training-toolbar__group">
          <ToolButton
            label="تراجع"
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 size={16} />
          </ToolButton>
          <ToolButton
            label="إعادة"
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 size={16} />
          </ToolButton>
        </div>

        <div className="training-toolbar__group">
          <ToolButton
            active={editor.isActive('bold')}
            label="عريض"
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold size={16} />
          </ToolButton>
          <ToolButton
            active={editor.isActive('italic')}
            label="مائل"
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic size={16} />
          </ToolButton>
          <ToolButton
            active={editor.isActive('underline')}
            label="تسطير"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon size={16} />
          </ToolButton>
        </div>

        <div className="training-toolbar__group">
          <select
            aria-label="العناوين"
            className="training-toolbar__select"
            onChange={(event) => {
              const value = event.target.value;
              const chain = editor.chain().focus();
              if (value === 'paragraph') {
                chain.setParagraph().run();
                return;
              }
              chain
                .toggleHeading({ level: Number(value) as 1 | 2 | 3 | 4 | 5 | 6 })
                .run();
            }}
            value={headingValue}
          >
            <option value="paragraph">فقرة</option>
            <option value="1">عنوان 1</option>
            <option value="2">عنوان 2</option>
            <option value="3">عنوان 3</option>
            <option value="4">عنوان 4</option>
            <option value="5">عنوان 5</option>
            <option value="6">عنوان 6</option>
          </select>
        </div>

        <div className="training-toolbar__group">
          <ToolButton
            active={editor.isActive('bulletList')}
            label="قائمة نقطية"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List size={16} />
          </ToolButton>
          <ToolButton
            active={editor.isActive('orderedList')}
            label="قائمة مرقمة"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered size={16} />
          </ToolButton>
          <ToolButton
            active={editor.isActive('link')}
            label="رابط"
            onClick={() => {
              const previous = editor.getAttributes('link').href as
                | string
                | undefined;
              const nextUrl = window.prompt('الرابط', previous || 'https://');
              if (nextUrl === null) return;
              if (nextUrl === '') {
                editor.chain().focus().extendMarkRange('link').unsetLink().run();
                return;
              }
              editor
                .chain()
                .focus()
                .extendMarkRange('link')
                .setLink({ href: nextUrl, target: '_blank' })
                .run();
            }}
          >
            <Link2 size={16} />
          </ToolButton>
        </div>

        <div className="training-toolbar__group training-toolbar__group--media">
          <button
            className="training-toolbar__chip"
            onClick={() => setTableOpen(true)}
            type="button"
          >
            📊 إدراج جدول
          </button>
          <button
            className="training-toolbar__chip"
            onClick={() => setImageOpen(true)}
            type="button"
          >
            🖼 إضافة صورة
          </button>
          <button
            className="training-toolbar__chip"
            onClick={() => setVideoOpen(true)}
            type="button"
          >
            🎥 إضافة فيديو
          </button>
        </div>

        <div className="training-toolbar__group">
          <button
            aria-expanded={showMore}
            className={`training-toolbar__more${showMore ? ' is-open' : ''}`}
            onClick={() => setShowMore((value) => !value)}
            type="button"
          >
            المزيد…
          </button>
        </div>
      </div>

      {showMore ? (
        <div className="training-toolbar training-toolbar--more" role="toolbar">
          <div className="training-toolbar__group">
            <ToolButton
              active={editor.isActive('strike')}
              label="يتوسطه خط"
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough size={15} />
            </ToolButton>
            <ToolButton
              active={editor.isActive('taskList')}
              label="قائمة مهام"
              onClick={() => editor.chain().focus().toggleTaskList().run()}
            >
              <CheckSquare size={15} />
            </ToolButton>
            <ToolButton
              active={editor.isActive('blockquote')}
              label="اقتباس"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
              <Quote size={15} />
            </ToolButton>
            <ToolButton
              label="فاصل"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
            >
              <Minus size={15} />
            </ToolButton>
          </div>

          <div className="training-toolbar__group">
            <select
              aria-label="حجم الخط"
              className="training-toolbar__select"
              defaultValue=""
              onChange={(event) => {
                const value = event.target.value;
                if (!value) {
                  editor.chain().focus().unsetFontSize().run();
                  return;
                }
                editor.chain().focus().setFontSize(value).run();
              }}
            >
              <option value="">حجم الخط</option>
              <option value="12px">12</option>
              <option value="14px">14</option>
              <option value="16px">16</option>
              <option value="18px">18</option>
              <option value="20px">20</option>
              <option value="24px">24</option>
              <option value="32px">32</option>
            </select>
            <label className="training-toolbar__color" title="لون النص">
              لون
              <input
                defaultValue="#f5f5f5"
                onChange={(event) =>
                  editor.chain().focus().setColor(event.target.value).run()
                }
                type="color"
              />
            </label>
            <label className="training-toolbar__color" title="تظليل">
              <Highlighter size={14} />
              <input
                defaultValue="#d6b76e"
                onChange={(event) =>
                  editor
                    .chain()
                    .focus()
                    .toggleHighlight({ color: event.target.value })
                    .run()
                }
                type="color"
              />
            </label>
          </div>

          <div className="training-toolbar__group">
            <ToolButton
              active={editor.isActive({ textAlign: 'right' })}
              label="يمين"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
            >
              <AlignRight size={15} />
            </ToolButton>
            <ToolButton
              active={editor.isActive({ textAlign: 'center' })}
              label="وسط"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
            >
              <AlignCenter size={15} />
            </ToolButton>
            <ToolButton
              active={editor.isActive({ textAlign: 'left' })}
              label="يسار"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
            >
              <AlignLeft size={15} />
            </ToolButton>
          </div>

          <div className="training-toolbar__group">
            <ToolButton
              label="نسخ"
              onClick={() => {
                const text =
                  window.getSelection()?.toString() || editor.getText();
                void navigator.clipboard.writeText(text);
              }}
            >
              نسخ
            </ToolButton>
            <ToolButton
              label="تحديد الكل"
              onClick={() => editor.chain().focus().selectAll().run()}
            >
              تحديد الكل
            </ToolButton>
          </div>
        </div>
      ) : null}

      <TableFloatingToolbar editor={editor} />

      <InsertTableDialog
        editor={editor}
        onClose={() => setTableOpen(false)}
        open={tableOpen}
      />
      <InsertImageDialog
        editor={editor}
        onClose={() => setImageOpen(false)}
        open={imageOpen}
      />
      <InsertVideoDialog
        editor={editor}
        onClose={() => setVideoOpen(false)}
        open={videoOpen}
      />
    </>
  );
}
