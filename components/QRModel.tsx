// @ts-nocheck - React Three Fiber JSX elements are typed dynamically
import React, { useMemo, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { mergeBufferGeometries, RoundedBoxGeometry } from 'three-stdlib';
import { Text3D } from '@react-three/drei';
import { generateQRMatrix } from '../utils/qrHelper';
import { QRConfig } from '../types';

interface QRModelProps {
  config: QRConfig;
  onUpdateMeshes: (base: THREE.Object3D, code: THREE.Object3D) => void;
}

const QRModel: React.FC<QRModelProps> = ({ config, onUpdateMeshes }) => {
  const [matrix, setMatrix] = useState<boolean[][]>([]);
  const baseRef = useRef<THREE.Mesh>(null);
  const codeGroupRef = useRef<THREE.Group>(null);

  // Generate Matrix
  useEffect(() => {
    generateQRMatrix(config.text, config.errorCorrection).then(setMatrix);
  }, [config.text, config.errorCorrection]);

  // Notify parent of the new meshes/groups for export
  useEffect(() => {
    if (baseRef.current && codeGroupRef.current) {
      onUpdateMeshes(baseRef.current, codeGroupRef.current);
    }
  }, [matrix, config, onUpdateMeshes]);

  // Calculate Layout
  const { moduleSize, plateWidth, topOffset, bottomOffset, totalPlateHeight, baseHeight, qrCodeScale } = useMemo(() => {
    const moduleCount = matrix.length || 21; // Default to 21 if empty to prevent NaN
    const width = config.size;

    // Calculate QR code scaling based on base roundness
    // When roundness > 50%, start scaling down the QR code to fit in circular base
    let qrScale = 1.0;
    if (config.baseCornerRadius > 0.5) {
      // Interpolate from 1.0 at 50% to 0.707 (1/√2) at 100%
      // 0.707 is the ratio of inscribed square in a circle
      const t = (config.baseCornerRadius - 0.5) / 0.5; // 0 to 1 as roundness goes 50% to 100%
      qrScale = 1.0 - t * (1.0 - 0.707);
    }

    const effectiveWidth = width * qrScale;
    const modSize = effectiveWidth / (moduleCount + config.margin * 2);

    let tOffset = 0;
    let bOffset = 0;
    let heightExt = 0;

    if (config.topLabel) {
        heightExt += config.fontSize * 2.2;
        tOffset = config.fontSize * 2.2;
    }
    if (config.bottomLabel) {
        heightExt += config.fontSize * 2.2;
        bOffset = config.fontSize * 2.2;
    }

    return {
        moduleSize: modSize,
        plateWidth: width,
        topOffset: tOffset,
        bottomOffset: bOffset,
        totalPlateHeight: width + heightExt,
        baseHeight: config.baseHeight,
        qrCodeScale: qrScale
    };
  }, [matrix.length, config]);

  // 1. Base Geometry (Simple Box)
  // We position it so the top surface is at y = baseHeight
  // And centered in X/Z
  
  // 2. QR Code Geometry (Merged Cubes or Rounded Boxes)
  const qrMeshGeometry = useMemo(() => {
    if (!matrix.length) return null;

    const moduleCount = matrix.length;
    const pixelGeometries: THREE.BufferGeometry[] = [];

    // Use rounded box if qrCornerRadius > 0, otherwise use regular box
    const createPixelGeometry = () => {
      if (config.qrCornerRadius > 0) {
        // Calculate radius based on the smaller dimension to avoid overlap
        const maxRadius = Math.min(moduleSize, config.codeHeight) * 0.45;
        const radius = maxRadius * config.qrCornerRadius;
        const segments = Math.max(1, Math.floor(config.qrCornerRadius * 8)); // More segments for smoother corners

        return new RoundedBoxGeometry(
          moduleSize,
          config.codeHeight,
          moduleSize,
          segments,
          radius
        );
      }
      return new THREE.BoxGeometry(moduleSize, config.codeHeight, moduleSize);
    };

    const pixelGeoPrototype = createPixelGeometry();

    // Start positions (centered around 0,0)
    const startX = - (moduleCount * moduleSize) / 2 + moduleSize / 2;
    const startZ = - (moduleCount * moduleSize) / 2 + moduleSize / 2;

    // The geometry itself should be positioned relative to the group
    // We want the bottom of the code to be at y = baseHeight
    // The BoxGeometry is centered at 0,0,0.
    // So y position should be baseHeight + codeHeight/2
    const yPos = baseHeight + config.codeHeight / 2;

    matrix.forEach((row, rI) => {
      row.forEach((isBlack, cI) => {
        if (isBlack) {
          const clone = pixelGeoPrototype.clone();
          clone.translate(
            startX + cI * moduleSize,
            yPos,
            startZ + rI * moduleSize
          );
          pixelGeometries.push(clone);
        }
      });
    });

    if (pixelGeometries.length === 0) return null;
    const merged = mergeBufferGeometries(pixelGeometries);
    return merged;
  }, [matrix, moduleSize, config.codeHeight, config.qrCornerRadius, baseHeight]);

  // Base Plate Geometry (with optional rounded corners on XZ plane - top view)
  const baseGeometry = useMemo(() => {
    if (config.baseCornerRadius > 0) {
      // Create a rounded rectangle in XZ plane, then extrude vertically
      // At 100%, should be a perfect circle
      const smallerDimension = Math.min(plateWidth, totalPlateHeight);

      // At 100%, radius should be half the smaller dimension (making a circle)
      const maxRadius = smallerDimension / 2;
      const radius = maxRadius * config.baseCornerRadius;

      // Many segments for smooth circles at high roundness
      const segments = Math.max(8, Math.floor(config.baseCornerRadius * 32));

      // Create rounded rectangle shape
      const shape = new THREE.Shape();
      const width = plateWidth;
      const height = totalPlateHeight;
      const x = -width / 2;
      const y = -height / 2;

      // If radius is large enough to make a circle/ellipse
      if (radius >= Math.min(width, height) / 2) {
        // Create ellipse or circle
        const radiusX = width / 2;
        const radiusY = height / 2;
        shape.ellipse(0, 0, radiusX, radiusY, 0, Math.PI * 2, false, 0);
      } else {
        // Draw rounded rectangle
        shape.moveTo(x + radius, y);
        shape.lineTo(x + width - radius, y);
        shape.quadraticCurveTo(x + width, y, x + width, y + radius);
        shape.lineTo(x + width, y + height - radius);
        shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        shape.lineTo(x + radius, y + height);
        shape.quadraticCurveTo(x, y + height, x, y + height - radius);
        shape.lineTo(x, y + radius);
        shape.quadraticCurveTo(x, y, x + radius, y);
      }

      // Extrude the shape vertically
      const extrudeSettings = {
        depth: baseHeight,
        bevelEnabled: false,
        steps: 1,
        curveSegments: segments
      };

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

      // Rotate to correct orientation (extrude is in Z, we want Y)
      geometry.rotateX(Math.PI / 2);

      return geometry;
    }
    return new THREE.BoxGeometry(plateWidth, baseHeight, totalPlateHeight);
  }, [plateWidth, baseHeight, totalPlateHeight, config.baseCornerRadius]);

  return (
    <group>
        {/* Base Plate */}
        <mesh
            ref={baseRef}
            name="Base_Plate"
            position={[0, baseHeight / 2, (bottomOffset - topOffset) / 2]}
            geometry={baseGeometry}
        >
            <meshStandardMaterial color={config.baseColor} />
        </mesh>

        {/* Code Group (Pixels + Text) */}
        <group ref={codeGroupRef} name="Code_Group">
            {/* QR Pixels */}
            {qrMeshGeometry && (
                <mesh geometry={qrMeshGeometry}>
                    <meshStandardMaterial color={config.codeColor} />
                </mesh>
            )}

            {/* Top Label */}
            {config.topLabel && (
                <CenterTop
                    text={config.topLabel}
                    config={config}
                    fontUrl={config.fontStyle}
                    zPos={- (plateWidth * qrCodeScale / 2) - (config.fontSize * 0.6) - config.topLabelOffset}
                    yPos={baseHeight}
                    plateWidth={plateWidth * qrCodeScale}
                />
            )}

            {/* Bottom Label */}
            {config.bottomLabel && (
                <CenterTop
                    text={config.bottomLabel}
                    config={config}
                    fontUrl={config.fontStyle}
                    zPos={(plateWidth * qrCodeScale / 2) + (config.fontSize * 0.6) + config.bottomLabelOffset}
                    yPos={baseHeight}
                    plateWidth={plateWidth * qrCodeScale}
                />
            )}
        </group>
    </group>
  );
};

// Helper component to position and align text
const CenterTop: React.FC<{text: string, config: QRConfig, fontUrl: string, zPos: number, yPos: number, plateWidth: number}> = ({ text, config, fontUrl, zPos, yPos, plateWidth }) => {
    const textRef = useRef<THREE.Mesh>(null);

    useEffect(() => {
        if (textRef.current && textRef.current.geometry) {
            // Compute bounding box to get actual dimensions
            textRef.current.geometry.computeBoundingBox();
            const bbox = textRef.current.geometry.boundingBox;

            if (bbox) {
                let xOffset = 0;
                const textWidth = bbox.max.x - bbox.min.x;

                // Calculate alignment offset with margin
                const margin = 3; // 3mm margin from edges

                if (config.textAlignment === 'center') {
                    // Center the text
                    xOffset = -(bbox.max.x + bbox.min.x) / 2;
                } else if (config.textAlignment === 'left') {
                    // Align to left edge of plate with margin
                    xOffset = -plateWidth / 2 + margin - bbox.min.x;
                } else if (config.textAlignment === 'right') {
                    // Align to right edge of plate with margin
                    xOffset = plateWidth / 2 - margin - bbox.max.x;
                }

                // Translate geometry to align it
                textRef.current.geometry.translate(xOffset, 0, 0);
            }
        }
    }, [text, fontUrl, config.fontSize, config.textAlignment, config.codeHeight, plateWidth]); // Re-align when text, font, fontSize, alignment, or codeHeight changes

    return (
        <Text3D
            ref={textRef}
            font={fontUrl}
            size={config.fontSize}
            height={config.codeHeight}
            curveSegments={4}
            bevelEnabled={false}
            position={[0, yPos + config.codeHeight / 2, zPos]}
            rotation={[-Math.PI / 2, 0, 0]} // Rotate to lay flat on the base
        >
            {text}
            <meshStandardMaterial color={config.codeColor} />
        </Text3D>
    )
}

export default QRModel;
