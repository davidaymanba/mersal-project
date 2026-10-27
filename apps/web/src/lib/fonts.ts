import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic, Readex_Pro } from 'next/font/google';

export const readex = Readex_Pro({
  subsets: ['latin', 'arabic'],
  variable: '--font-readex',
  display: 'swap',
});

export const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex',
  display: 'swap',
});

export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-ar',
  display: 'swap',
});

export const fontVariables = `${readex.variable} ${plex.variable} ${plexArabic.variable}`;
