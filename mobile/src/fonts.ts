import { Platform } from 'react-native';

export type FontPlatform = 'native' | 'web';

const LATIN_FALLBACK = '"Manrope", "Segoe UI", system-ui, -apple-system, sans-serif';
const ARABIC_FALLBACK = '"Noto Sans Arabic", Tahoma, Arial, sans-serif';

/**
 * Native font names must stay identical to the names registered by Expo.
 * Web styles can safely add a system fallback so a delayed or failed font
 * load never falls through to the browser's serif default.
 */
export function fontFamilyForPlatform(
  family: string,
  fallback: string,
  platform: FontPlatform = Platform.OS === 'web' ? 'web' : 'native',
): string {
  return platform === 'web' ? `"${family}", ${fallback}` : family;
}

const latin = (family: string) => fontFamilyForPlatform(family, LATIN_FALLBACK);
const arabic = (family: string) => fontFamilyForPlatform(family, ARABIC_FALLBACK);

export const FONT_REGULAR = latin('Manrope_400Regular');
export const FONT_MEDIUM = latin('Manrope_500Medium');
export const FONT_SEMIBOLD = latin('Manrope_600SemiBold');
export const FONT_BOLD = latin('Manrope_700Bold');
export const FONT_EXTRABOLD = latin('Manrope_800ExtraBold');
export const FONT_ARABIC_REGULAR = arabic('NotoSansArabic_400Regular');
export const FONT_ARABIC_MEDIUM = arabic('NotoSansArabic_500Medium');
export const FONT_ARABIC_SEMIBOLD = arabic('NotoSansArabic_600SemiBold');
export const FONT_ARABIC_BOLD = arabic('NotoSansArabic_700Bold');
