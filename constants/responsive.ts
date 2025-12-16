import { Dimensions, Platform, StatusBar } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Dimensions de référence (iPhone 11 Pro)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Facteur de scaling limité pour éviter un effet de zoom excessif
const WIDTH_SCALE = Math.min(SCREEN_WIDTH / BASE_WIDTH, 1.2);
const HEIGHT_SCALE = Math.min(SCREEN_HEIGHT / BASE_HEIGHT, 1.2);

// Fonction pour mettre à l'échelle les tailles basées sur la largeur de l'écran
export const wp = (percentage: number): number => {
  return (SCREEN_WIDTH * percentage) / 100;
};

// Fonction pour mettre à l'échelle les tailles basées sur la hauteur de l'écran
export const hp = (percentage: number): number => {
  return (SCREEN_HEIGHT * percentage) / 100;
};

// Fonction pour mettre à l'échelle les polices de manière très modérée
export const rf = (size: number): number => {
  // Scaling très modéré pour les polices (max 10% de variation)
  const scale = 1 + (WIDTH_SCALE - 1) * 0.3;
  return Math.round(size * scale);
};

// Fonction pour les espacements horizontaux (scaling limité)
export const hs = (size: number): number => {
  // Scaling limité à 15% maximum
  const scale = 1 + (WIDTH_SCALE - 1) * 0.5;
  return Math.round(size * scale);
};

// Fonction pour les espacements verticaux (scaling limité)
export const vs = (size: number): number => {
  // Scaling limité à 15% maximum
  const scale = 1 + (HEIGHT_SCALE - 1) * 0.5;
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

// Font sizes standards avec scaling minimal
export const FONT_SIZES = {
  tiny: isSmallDevice ? 9 : 10,
  small: isSmallDevice ? 11 : 12,
  regular: isSmallDevice ? 13 : 14,
  medium: isSmallDevice ? 15 : 16,
  large: isSmallDevice ? 17 : 18,
  xlarge: isSmallDevice ? 19 : 20,
  xxlarge: isSmallDevice ? 22 : 24,
  huge: isSmallDevice ? 26 : 28,
  massive: isSmallDevice ? 30 : 32,
};

// Spacing standards
export const SPACING = {
  tiny: 4,
  small: 8,
  medium: 12,
  regular: 16,
  large: 20,
  xlarge: 24,
  xxlarge: 32,
  huge: 40,
};

// Vertical spacing standards
export const V_SPACING = {
  tiny: 4,
  small: 8,
  medium: 12,
  regular: 16,
  large: 20,
  xlarge: 24,
  xxlarge: 28,
  huge: 40,
};

// Border radius standards
export const BORDER_RADIUS = {
  small: 8,
  medium: 12,
  large: 16,
  xlarge: 20,
  round: 50,
};

// Icon sizes standards
export const ICON_SIZES = {
  tiny: 16,
  small: 20,
  medium: 24,
  large: 28,
  xlarge: 32,
  xxlarge: 40,
};

// Tab bar height
export const TAB_BAR_HEIGHT = 70;

// Safe bottom spacing for tab bar
export const SAFE_BOTTOM_SPACING = 100;
