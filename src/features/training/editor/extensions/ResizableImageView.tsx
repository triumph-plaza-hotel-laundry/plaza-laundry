import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { useCallback, useRef, useState, type PointerEvent } from 'react';

export function ResizableImageView({
  node,
  updateAttributes,
  selected,
  deleteNode,
}: NodeViewProps) {
  const wrapRef = useRef<HTMLElement | null>(null);
  const [draftWidth, setDraftWidth] = useState<string | null>(null);
  const width = draftWidth ?? String(node.attrs.width || '100%');
  const align = String(node.attrs.align || 'center');
  const caption = String(node.attrs.caption || '');

  const startResize = useCallback(
    (event: PointerEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const parent = wrapRef.current?.parentElement;
      const startX = event.clientX;
      const startWidthPx = wrapRef.current?.getBoundingClientRect().width ?? 0;
      const parentWidth = parent?.getBoundingClientRect().width || startWidthPx;

      const onMove = (moveEvent: globalThis.PointerEvent) => {
        const delta = moveEvent.clientX - startX;
        const nextPx = Math.max(80, Math.min(parentWidth, startWidthPx + delta));
        const pct = Math.round((nextPx / parentWidth) * 100);
        setDraftWidth(`${pct}%`);
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        setDraftWidth((current) => {
          if (current) {
            updateAttributes({ width: current });
          }
          return null;
        });
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [updateAttributes],
  );

  return (
    <NodeViewWrapper
      as="figure"
      className={`training-image training-image--${align}${selected ? ' is-selected' : ''}`}
      data-align={align}
      data-drag-handle
      data-training-image="true"
      data-width={width}
      ref={wrapRef}
      style={{ width, maxWidth: '100%' }}
    >
      <div className="training-image__frame">
        <img
          alt={node.attrs.alt || ''}
          decoding="async"
          draggable={false}
          loading="lazy"
          src={node.attrs.src}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
        {selected ? (
          <>
            <span
              aria-hidden="true"
              className="training-image__handle training-image__handle--se"
              onPointerDown={startResize}
            />
            <div className="training-image__controls" contentEditable={false}>
              <button
                onClick={() => updateAttributes({ align: 'right' })}
                type="button"
              >
                يمين
              </button>
              <button
                onClick={() => updateAttributes({ align: 'center' })}
                type="button"
              >
                وسط
              </button>
              <button
                onClick={() => updateAttributes({ align: 'left' })}
                type="button"
              >
                يسار
              </button>
              <button
                onClick={() => {
                  const next =
                    window.prompt('تعليق الصورة (اختياري)', caption) ?? caption;
                  updateAttributes({ caption: next });
                }}
                type="button"
              >
                تعليق
              </button>
              <button
                className="is-danger"
                onClick={() => deleteNode()}
                type="button"
              >
                حذف
              </button>
            </div>
          </>
        ) : null}
      </div>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </NodeViewWrapper>
  );
}
