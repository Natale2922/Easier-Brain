import { Platform } from 'react-native';

export const displayFontFamily =
  Platform.select({
    ios: 'Georgia',
    android: 'serif',
    web: 'Georgia, "Times New Roman", serif',
    default: 'serif',
  }) ?? 'serif';
