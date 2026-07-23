import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ResizableImageView } from '@/features/training/editor/extensions/ResizableImageView';

export type TrainingImageAttrs = {
  src: string | null;
  alt: string | null;
  title: string | null;
  width: string | null;
  align: 'left' | 'center' | 'right' | null;
  wrap: 'none' | 'left' | 'right' | null;
  caption: string | null;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    trainingImage: {
      setTrainingImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        width?: string;
        align?: 'left' | 'center' | 'right';
        wrap?: 'none' | 'left' | 'right';
        caption?: string;
      }) => ReturnType;
      updateTrainingImage: (options: Partial<TrainingImageAttrs>) => ReturnType;
    };
  }
}

export const TrainingImage = Node.create({
  name: 'trainingImage',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: '100%' },
      align: { default: 'center' },
      wrap: { default: 'none' },
      caption: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-training-image]',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }
          const img = node.querySelector('img');
          if (!img) {
            return false;
          }
          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
            title: img.getAttribute('title'),
            width:
              node.getAttribute('data-width') ||
              img.getAttribute('width') ||
              '100%',
            align: node.getAttribute('data-align') || 'center',
            wrap: node.getAttribute('data-wrap') || 'none',
            caption: node.querySelector('figcaption')?.textContent || '',
          };
        },
      },
      {
        tag: 'img[src]',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }
          return {
            src: node.getAttribute('src'),
            alt: node.getAttribute('alt'),
            title: node.getAttribute('title'),
            width: node.getAttribute('width') || node.style.width || '100%',
            align: node.getAttribute('data-align') || 'center',
            wrap: node.getAttribute('data-wrap') || 'none',
            caption: node.getAttribute('data-caption') || '',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const {
      src,
      alt,
      title,
      width,
      align,
      wrap,
      caption,
      ...rest
    } = HTMLAttributes as TrainingImageAttrs & Record<string, unknown>;

    const figureAttrs = mergeAttributes(rest, {
      'data-training-image': 'true',
      'data-align': align || 'center',
      'data-wrap': wrap || 'none',
      'data-width': width || '100%',
      class: `training-image training-image--${align || 'center'} training-image-wrap--${wrap || 'none'}`,
      style: `width: ${width || '100%'}; max-width: 100%;`,
    });

    const imgAttrs = mergeAttributes({
      src,
      alt: alt || '',
      title: title || '',
      loading: 'lazy',
      decoding: 'async',
      style: 'width: 100%; height: auto; display: block;',
    });

    if (caption) {
      return [
        'figure',
        figureAttrs,
        ['img', imgAttrs],
        ['figcaption', {}, String(caption)],
      ];
    }

    return ['figure', figureAttrs, ['img', imgAttrs]];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },

  addCommands() {
    return {
      setTrainingImage:
        (options) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              alt: options.alt ?? '',
              title: options.title ?? '',
              width: options.width ?? '100%',
              align: options.align ?? 'center',
              wrap: options.wrap ?? 'none',
              caption: options.caption ?? '',
            },
          }),
      updateTrainingImage:
        (options) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, options),
    };
  },
});
