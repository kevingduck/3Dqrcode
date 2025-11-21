export interface QRConfig {
  text: string;
  size: number; // in mm (internally we work in mm)
  baseHeight: number; // mm
  codeHeight: number; // mm
  margin: number; // modules
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
  topLabel: string;
  bottomLabel: string;
  fontSize: number; // mm approximate
  baseColor: string;
  codeColor: string;
  fontStyle: string; // Font URL or name
  qrCornerRadius: number; // 0-1, how rounded the QR modules are
  baseCornerRadius: number; // 0-1, how rounded the base plate is
  textAlignment: 'left' | 'center' | 'right';
  topLabelOffset: number; // mm offset from default position
  bottomLabelOffset: number; // mm offset from default position
}

export const AVAILABLE_FONTS = {
  helvetiker_bold: 'https://cdn.jsdelivr.net/npm/three/examples/fonts/helvetiker_bold.typeface.json',
  helvetiker_regular: 'https://cdn.jsdelivr.net/npm/three/examples/fonts/helvetiker_regular.typeface.json',
  optimer_bold: 'https://cdn.jsdelivr.net/npm/three/examples/fonts/optimer_bold.typeface.json',
  optimer_regular: 'https://cdn.jsdelivr.net/npm/three/examples/fonts/optimer_regular.typeface.json',
  gentilis_bold: 'https://cdn.jsdelivr.net/npm/three/examples/fonts/gentilis_bold.typeface.json',
  gentilis_regular: 'https://cdn.jsdelivr.net/npm/three/examples/fonts/gentilis_regular.typeface.json',
  droid_sans_bold: 'https://cdn.jsdelivr.net/npm/three/examples/fonts/droid/droid_sans_bold.typeface.json',
  droid_sans_regular: 'https://cdn.jsdelivr.net/npm/three/examples/fonts/droid/droid_sans_regular.typeface.json',
  droid_serif_bold: 'https://cdn.jsdelivr.net/npm/three/examples/fonts/droid/droid_serif_bold.typeface.json',
  droid_serif_regular: 'https://cdn.jsdelivr.net/npm/three/examples/fonts/droid/droid_serif_regular.typeface.json',
};

export const DEFAULT_CONFIG: QRConfig = {
  text: "https://example.com",
  size: 80, // 80mm = 8cm
  baseHeight: 2,
  codeHeight: 1.2,
  margin: 2,
  errorCorrection: 'M',
  topLabel: "",
  bottomLabel: "",
  fontSize: 5,
  baseColor: "#ffffff",
  codeColor: "#000000",
  fontStyle: AVAILABLE_FONTS.helvetiker_bold,
  qrCornerRadius: 0,
  baseCornerRadius: 0,
  textAlignment: 'center',
  topLabelOffset: 0,
  bottomLabelOffset: 0
};