/**
 * Campulator design token'ları — docs/05_mobil_ui_promptu.md
 * Semantik token yapısı: v1'de yalnızca koyu tema; açık tema sonradan eklenebilir.
 */

export const palette = {
  background: '#08131F',
  surface: '#0E1B2B',
  elevatedSurface: '#122338',
  primary: '#78C043',
  primaryBright: '#8ED14F',
  textPrimary: '#F4F7FA',
  textSecondary: '#A7B3C2',
  border: 'rgba(255,255,255,0.08)',
  fireAccent: '#FF8A3D',
  danger: '#E5534B',
  warning: '#E3B341',
  success: '#78C043',
  overlay: 'rgba(0,0,0,0.55)',
  navy: '#1E3A5F',
} as const;

export interface Theme {
  colors: {
    background: string;
    surface: string;
    elevatedSurface: string;
    primary: string;
    primaryBright: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
    fireAccent: string;
    danger: string;
    warning: string;
    success: string;
    overlay: string;
    tabBarBackground: string;
    tabBarActive: string;
    tabBarInactive: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  typography: {
    title: { fontSize: number; fontWeight: '700' };
    heading: { fontSize: number; fontWeight: '700' };
    subheading: { fontSize: number; fontWeight: '600' };
    body: { fontSize: number; fontWeight: '400' };
    caption: { fontSize: number; fontWeight: '400' };
  };
}

export const darkTheme: Theme = {
  colors: {
    background: palette.background,
    surface: palette.surface,
    elevatedSurface: palette.elevatedSurface,
    primary: palette.primary,
    primaryBright: palette.primaryBright,
    textPrimary: palette.textPrimary,
    textSecondary: palette.textSecondary,
    border: palette.border,
    fireAccent: palette.fireAccent,
    danger: palette.danger,
    warning: palette.warning,
    success: palette.success,
    overlay: palette.overlay,
    tabBarBackground: palette.surface,
    tabBarActive: palette.primary,
    tabBarInactive: palette.textSecondary,
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 8, md: 12, lg: 16, xl: 24, full: 999 },
  typography: {
    title: { fontSize: 28, fontWeight: '700' },
    heading: { fontSize: 22, fontWeight: '700' },
    subheading: { fontSize: 17, fontWeight: '600' },
    body: { fontSize: 15, fontWeight: '400' },
    caption: { fontSize: 13, fontWeight: '400' },
  },
};

/** v1'de tek tema; açık tema eklendiğinde burada seçim yapılacak. */
export const useTheme = (): Theme => darkTheme;
