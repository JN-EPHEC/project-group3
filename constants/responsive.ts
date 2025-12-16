import { Dimensions, Platform, StatusBar } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Dimensions de référence (iPhone 11 Pro)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Facteur de scaling pour s'adapter aux différentes tailles d'écran
const WIDTH_SCALE = SCREEN_WIDTH / BASE_WIDTH;
const HEIGHT_SCALE = SCREEN_HEIGHT / BASE_HEIGHT;

// Fonction pour mettre à l'échelle les tailles basées sur la largeur de l'écran
export const wp = (percentage: number): number => {
  return (SCREEN_WIDTH * percentage) / 100;
};

// Fonction pour mettre à l'échelle les tailles basées sur la hauteur de l'écran
export const hp = (percentage: number): number => {
  return (SCREEN_HEIGHT * percentage) / 100;
};

// Fonction pour mettre à l'échelle les polices proportionnellement
export const rf = (size: number): number => {
  // Adaptation proportionnelle mais avec limites pour éviter trop petit ou trop grand
  const scale = Math.min(Math.max(WIDTH_SCALE, 0.8), 1.2);
  return Math.round(size * scale);
};

// Fonction pour les espacements horizontaux
export const hs = (size: number): number => {
  const scale = Math.min(Math.max(WIDTH_SCALE, 0.85), 1.15);
  return Math.round(size * scale);
};

// Fonction pour les espacements verticaux
export const vs = (size: number): number => {
  const scale = Math.min(Math.max(HEIGHT_SCALE, 0.85), 1.15);
  return Math.round(size * scale);
};

// Récupérer la hauteur de la barre de statut Android
export const getStatusBarHeight = (): number => {
  return Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
};

// Dimensions de l'écran
export const screenWidth = SCREEN_WIDTH;
export const screenHeight = SCREEN_HEIGHT;

// Vérifier si c'est un petit écran (< 360px)
export const isSmallDevice = SCREEN_WIDTH < 360;

// Vérifier si c'est un grand écran (> 768px, tablette)
export const isTablet = SCREEN_WIDTH >= 768;

// Font sizes avec adaptation pour petits écrans
export const FONT_SIZES = {
  tiny: rf(10),
  small: rf(12),
  regular: rf(14),
  medium: rf(16),
  large: rf(18),
  xlarge: rf(20),
  xxlarge: rf(24),
  huge: rf(28),
  massive: rf(32),
};

// Spacing adaptatif
export const SPACING = {
  tiny: hs(4),
  small: hs(8),
  medium: hs(12),
  regular: hs(16),
  large: hs(20),
  xlarge: hs(24),
  xxlarge: hs(32),
  huge: hs(40),
};

// Vertical spacing adaptatif
export const V_SPACING = {
  tiny: vs(4),
  small: vs(8),
  medium: vs(12),
  regular: vs(16),
  large: vs(20),
  xlarge: vs(24),
  xxlarge: vs(28),
  huge: vs(40),
};

// Border radius adaptatif
export const BORDER_RADIUS = {
  small: hs(8),
  medium: hs(12),
  large: hs(16),
  xlarge: hs(20),
  round: hs(50),
};

// Icon sizes adaptatif
export const ICON_SIZES = {
  tiny: hs(16),
  small: hs(20),
  medium: hs(24),
  large: hs(28),
  xlarge: hs(32),
  xxlarge: hs(40),
};

// Tab bar height
export const TAB_BAR_HEIGHT = vs(70);

// Safe bottom spacing for tab bar
export const SAFE_BOTTOM_SPACING = vs(100);
