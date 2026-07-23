import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableCellStyle: {
      setCellBackground: (color: string) => ReturnType;
      setCellBorderColor: (color: string) => ReturnType;
      setCellBorderWidth: (width: string) => ReturnType;
      setCellHorizontalAlign: (align: string) => ReturnType;
      setCellVerticalAlign: (align: string) => ReturnType;
    };
  }
}

function mergeInlineStyle(
  current: string | null | undefined,
  patch: Record<string, string | null>,
): string | null {
  const map = new Map<string, string>();
  String(current || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [key, ...rest] = part.split(':');
      if (key && rest.length) {
        map.set(key.trim(), rest.join(':').trim());
      }
    });
  Object.entries(patch).forEach(([key, value]) => {
    if (!value) {
      map.delete(key);
    } else {
      map.set(key, value);
    }
  });
  const next = Array.from(map.entries())
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
  return next || null;
}

export const TableCellStyle = Extension.create({
  name: 'tableCellStyle',

  addGlobalAttributes() {
    return [
      {
        types: ['tableCell', 'tableHeader'],
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: (element) =>
              element.style.backgroundColor ||
              element.getAttribute('data-bg') ||
              null,
            renderHTML: (attributes) => {
              if (!attributes.backgroundColor) {
                return {};
              }
              return {
                'data-bg': attributes.backgroundColor,
                style: `background-color: ${attributes.backgroundColor}`,
              };
            },
          },
          style: {
            default: null,
            parseHTML: (element) => element.getAttribute('style'),
            renderHTML: (attributes) => {
              if (!attributes.style) {
                return {};
              }
              return { style: attributes.style };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setCellBackground:
        (color: string) =>
        ({ chain }) =>
          chain()
            .updateAttributes('tableCell', {
              backgroundColor: color,
              style: null,
            })
            .updateAttributes('tableHeader', {
              backgroundColor: color,
            })
            .run(),
      setCellBorderColor:
        (color: string) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
            const node = selection.$from.node(depth);
            if (
              node.type.name === 'tableCell' ||
              node.type.name === 'tableHeader'
            ) {
              const pos = selection.$from.before(depth);
              if (dispatch) {
                dispatch(
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    style: mergeInlineStyle(node.attrs.style as string, {
                      'border-color': color,
                      'border-style': 'solid',
                    }),
                  }),
                );
              }
              return true;
            }
          }
          return false;
        },
      setCellBorderWidth:
        (width: string) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
            const node = selection.$from.node(depth);
            if (
              node.type.name === 'tableCell' ||
              node.type.name === 'tableHeader'
            ) {
              const pos = selection.$from.before(depth);
              if (dispatch) {
                dispatch(
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    style: mergeInlineStyle(node.attrs.style as string, {
                      'border-width': width,
                      'border-style': 'solid',
                    }),
                  }),
                );
              }
              return true;
            }
          }
          return false;
        },
      setCellHorizontalAlign:
        (align: string) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
            const node = selection.$from.node(depth);
            if (
              node.type.name === 'tableCell' ||
              node.type.name === 'tableHeader'
            ) {
              const pos = selection.$from.before(depth);
              if (dispatch) {
                dispatch(
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    style: mergeInlineStyle(node.attrs.style as string, {
                      'text-align': align,
                    }),
                  }),
                );
              }
              return true;
            }
          }
          return false;
        },
      setCellVerticalAlign:
        (align: string) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
            const node = selection.$from.node(depth);
            if (
              node.type.name === 'tableCell' ||
              node.type.name === 'tableHeader'
            ) {
              const pos = selection.$from.before(depth);
              if (dispatch) {
                dispatch(
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    style: mergeInlineStyle(node.attrs.style as string, {
                      'vertical-align': align,
                    }),
                  }),
                );
              }
              return true;
            }
          }
          return false;
        },
    };
  },
});
