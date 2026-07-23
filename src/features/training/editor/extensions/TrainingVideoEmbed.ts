import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    trainingVideoEmbed: {
      setTrainingVideoEmbed: (options: {
        src: string;
        provider: 'youtube' | 'mp4';
      }) => ReturnType;
    };
  }
}

export const TrainingVideoEmbed = Node.create({
  name: 'trainingVideoEmbed',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      provider: { default: 'youtube' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-training-video]',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }
          const iframe = node.querySelector('iframe');
          const video = node.querySelector('video');
          if (iframe?.src) {
            return { src: iframe.src, provider: 'youtube' };
          }
          if (video?.src) {
            return { src: video.getAttribute('src'), provider: 'mp4' };
          }
          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const src = String(HTMLAttributes.src || '');
    const provider = HTMLAttributes.provider === 'mp4' ? 'mp4' : 'youtube';
    const wrap = mergeAttributes({
      'data-training-video': 'true',
      'data-provider': provider,
      class: 'training-embed-video',
    });

    if (provider === 'mp4') {
      return [
        'div',
        wrap,
        [
          'video',
          {
            src,
            controls: 'true',
            playsinline: 'true',
            preload: 'metadata',
            style: 'width:100%;border-radius:0.75rem;aspect-ratio:16/9;background:#000;',
          },
        ],
      ];
    }

    return [
      'div',
      wrap,
      [
        'iframe',
        {
          src,
          title: 'Training video',
          allow:
            'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
          allowfullscreen: 'true',
          loading: 'lazy',
          style: 'width:100%;border:0;border-radius:0.75rem;aspect-ratio:16/9;',
        },
      ],
    ];
  },

  addCommands() {
    return {
      setTrainingVideoEmbed:
        (options) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              provider: options.provider,
            },
          }),
    };
  },
});
