export type HomeContentState = {
  slogan: { en: string; ar: string };
  featuredFabricIds: string[];
};

export const defaultHomeContent: HomeContentState = {
  slogan: {
    en: 'Where luxury meets care',
    ar: 'هنا حيث تلتقي الفخامة بالعناية',
  },
  featuredFabricIds: [
    'cotton',
    'egyptian-cotton',
    'linen',
    'terry-cloth',
    'percale',
    'sateen',
    'polyester',
    'denim',
    'silk',
    'jacquard',
    'poplin',
    'flannel',
  ],
};
