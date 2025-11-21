# 3D QR Forge

A powerful web app for generating customizable 3D-printable QR codes with advanced styling and multi-color printing support.

![3D QR Code Generator](https://img.shields.io/badge/React-18-61dafb?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript) ![Three.js](https://img.shields.io/badge/Three.js-3D-black?logo=three.js)

## Features

### QR Code Generation
- **Dual Mode Support**: Create QR codes for URLs/text or WiFi networks
- **WiFi QR Codes**: Instant WiFi sharing with SSID, password, and security type selection
- **Error Correction**: Choose from L, M, Q, or H levels for optimal scanning reliability

### Customization
- **Text Labels**: Add top and bottom labels with 10 professional fonts
- **Text Alignment**: Left, center, or right alignment with 3mm safety margins
- **Text Positioning**: Independent sliders for fine-tuning top and bottom label positions
- **Corner Rounding**:
  - QR pixel rounding (0-100%)
  - Base plate rounding (0-100%, creates perfect circles at 100%)
- **Dynamic Scaling**: QR code automatically scales to fit within circular bases
- **Color Preview**: Customize base and code colors for visualization

### 3D Printing
- **Multi-Color Support**: Export separate STL files for base and code
- **Export Options**:
  - Base only (for first color)
  - Code only (for second color)
  - Combined (single-color print)
- **Optimized Orientation**: STL files automatically oriented flat for easy printing
- **Precise Dimensions**: Full control over size, base height, and code height with mm/cm/inch units

## Quick Start

**Prerequisites:** Node.js (v16 or higher)

1. **Clone the repository**
   ```bash
   git clone git@github.com:kevingduck/3Dqrcode.git
   cd 3Dqrcode
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3001
   ```

## Usage Guide

### Creating a Standard QR Code
1. Select **URL/Text** mode
2. Enter your URL or text
3. Customize dimensions, colors, and styling
4. Add optional labels
5. Export STL files

### Creating a WiFi QR Code
1. Select **WiFi** mode
2. Enter network name (SSID)
3. Enter password
4. Select security type (WPA/WEP/None)
5. Customize and export

### Multi-Color 3D Printing
1. Design your QR code with desired colors (for preview only)
2. Export **Base STL** and **Code STL** separately
3. In your slicer (PrusaSlicer, Cura, etc.):
   - Import both STL files as a single object/assembly
   - Assign different colors/filaments to each part
   - Slice and print with automatic color changes

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Three.js** - 3D rendering engine
- **React Three Fiber** - React renderer for Three.js
- **React Three Drei** - Helpers for 3D text and controls
- **qrcode** - QR code generation library

## Project Structure

```
├── App.tsx                 # Main application component
├── components/
│   ├── QRModel.tsx        # 3D QR code model with geometry
│   └── ErrorBoundary.tsx  # WebGL error handling
├── utils/
│   └── qrHelper.ts        # QR code generation utilities
├── types.ts               # TypeScript interfaces and config
└── vite.config.ts         # Vite configuration
```

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment.

## Tips for Best Results

- **Scanning**: Use M or Q error correction for reliable scanning
- **Printing**:
  - Minimum QR size: 50mm for reliable scanning
  - Base height: 2-3mm recommended
  - Code height: 1-2mm for clear contrast
- **Circular Bases**: Enable roundness past 50% for automatic QR scaling
- **Text**: Use 3-6mm font size for clear, printable labels

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
