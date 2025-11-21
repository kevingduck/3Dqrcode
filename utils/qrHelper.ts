import * as QRCodeLib from 'qrcode';

// Reliable way to get the library instance from various CDN bundle formats
// If QRCodeLib is the module namespace, .default might be the library or QRCodeLib itself might be the library
let QRCode: any = QRCodeLib;

// Check for default export (common in ESM bundles)
if ((QRCodeLib as any).default) {
  QRCode = (QRCodeLib as any).default;
}

// Fallback: Check if it attached to window (common in UMD bundles)
if (typeof window !== 'undefined' && (window as any).QRCode) {
    QRCode = (window as any).QRCode;
}

export const generateQRMatrix = async (text: string, errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'M'): Promise<boolean[][]> => {
  try {
    if (!text) return [];
    
    // Ensure create exists before calling
    if (!QRCode || (typeof QRCode.create !== 'function' && typeof QRCode !== 'function')) {
        console.error("QRCode library not loaded correctly. Instance:", QRCode);
        return [];
    }

    const qrFunc = typeof QRCode.create === 'function' ? QRCode.create : QRCode;

    // The library 'qrcode' 'create' method is synchronous.
    const qrData = qrFunc(text, {
      errorCorrectionLevel,
    });
    
    // The library returns a flat array and size, we convert to 2D boolean array
    const size = qrData.modules.size;
    const data = qrData.modules.data;
    const matrix: boolean[][] = [];

    for (let y = 0; y < size; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < size; x++) {
        row.push(!!data[y * size + x]);
      }
      matrix.push(row);
    }
    return matrix;
  } catch (e) {
    console.error("QR Generation failed", e);
    return [];
  }
};