import type { Editor } from '@tiptap/react';
import { useEffect, useState } from 'react';

type TableFloatingToolbarProps = {
  editor: Editor;
};

export function TableFloatingToolbar({ editor }: TableFloatingToolbarProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const update = () => {
      if (!editor.isActive('table')) {
        setVisible(false);
        return;
      }
      const { view } = editor;
      const domAtPos = view.domAtPos(view.state.selection.from);
      let node: Node | null = domAtPos.node;
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentElement;
      }
      const cell = (node as HTMLElement | null)?.closest?.('td, th');
      const table = cell?.closest('table');
      if (!table) {
        setVisible(false);
        return;
      }
      const rect = table.getBoundingClientRect();
      setPos({
        top: Math.max(12, rect.top - 52),
        left: Math.min(
          window.innerWidth - 320,
          Math.max(12, rect.left + rect.width / 2 - 150),
        ),
      });
      setVisible(true);
    };

    update();
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [editor]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="training-table-float"
      dir="rtl"
      style={{ top: pos.top, left: pos.left }}
    >
      <button
        disabled={!editor.can().addRowAfter()}
        onClick={() => editor.chain().focus().addRowAfter().run()}
        type="button"
      >
        ➕ إضافة صف
      </button>
      <button
        disabled={!editor.can().addColumnAfter()}
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        type="button"
      >
        ➕ إضافة عمود
      </button>
      <button
        disabled={!editor.can().deleteRow()}
        onClick={() => editor.chain().focus().deleteRow().run()}
        type="button"
      >
        ➖ حذف صف
      </button>
      <button
        disabled={!editor.can().deleteColumn()}
        onClick={() => editor.chain().focus().deleteColumn().run()}
        type="button"
      >
        ➖ حذف عمود
      </button>
      <label className="training-table-float__color" title="لون الخلية">
        🎨
        <input
          defaultValue="#1a1a1a"
          onChange={(event) =>
            editor.chain().focus().setCellBackground(event.target.value).run()
          }
          type="color"
        />
      </label>
      <button
        className="is-danger"
        disabled={!editor.can().deleteTable()}
        onClick={() => editor.chain().focus().deleteTable().run()}
        type="button"
      >
        🗑 حذف الجدول
      </button>
    </div>
  );
}
