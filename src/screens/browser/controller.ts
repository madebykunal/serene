import type { ComponentRef } from 'react';
import type { WebView } from 'react-native-webview';

export type LinkInfo = { link: string; text: string; img: string; alt: string; x?: number; y?: number };

type Controller = {
  view: ComponentRef<typeof WebView> | null;
  canBack: boolean;
  load: (url: string) => void;
  capture: () => void;
  find: () => void;
  userAgent: string;
};

export const web: Controller = { view: null, canBack: false, load: () => {}, capture: () => {}, find: () => {}, userAgent: '' };
