export type Palette = {
  bg: string;
  ink: string;
  muted: string;
  line: string;
  panel: string;
  panelAlt: string;
  accent: string;
  accentSoft: string;
  caution: string;
  cautionSoft: string;
  nav: string;
  shadow: string;
};

export const LIGHT: Palette = {
  bg: '#F4F7F6',
  ink: '#102A2E',
  muted: '#607174',
  line: '#D7E1DF',
  panel: '#FFFFFF',
  panelAlt: '#EAF2EF',
  accent: '#087A74',
  accentSoft: '#DDF2EC',
  caution: '#A94B31',
  cautionSoft: '#F7E6DF',
  nav: '#FBFDFC',
  shadow: '#102A2E',
};

export const DARK: Palette = {
  bg: '#0B1414',
  ink: '#F1F6F3',
  muted: '#A9BCB7',
  line: '#29403C',
  panel: '#13211F',
  panelAlt: '#1B2D2A',
  accent: '#65D0BE',
  accentSoft: '#1E4039',
  caution: '#E99A70',
  cautionSoft: '#452A22',
  nav: '#10201E',
  shadow: '#000000',
};
