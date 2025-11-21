
import React, { useState, useRef, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, Stage } from '@react-three/drei';
import * as THREE from 'three';
import { Download, Settings2, Printer, Type, Palette, Shapes, Wifi } from 'lucide-react';
import QRModel from './components/QRModel';
import { DEFAULT_CONFIG, QRConfig, AVAILABLE_FONTS } from './types';
import { trackExport } from './utils/analytics';

const App: React.FC = () => {
  const [config, setConfig] = useState<QRConfig>(DEFAULT_CONFIG);
  const [unit, setUnit] = useState<'mm' | 'cm' | 'in'>('mm');
  const [qrMode, setQrMode] = useState<'text' | 'wifi'>('text');
  const [wifiConfig, setWifiConfig] = useState({ ssid: '', password: '', security: 'WPA' });

  // References to the 3D Objects (Base Mesh and Code Group)
  const baseRef = useRef<THREE.Object3D | null>(null);
  const codeRef = useRef<THREE.Object3D | null>(null);

  const handleUpdateMeshes = useCallback((base: THREE.Object3D, code: THREE.Object3D) => {
    console.log("Meshes updated:", { base, code });
    console.log("Base is Mesh?", base instanceof THREE.Mesh);
    console.log("Code is Group?", code instanceof THREE.Group);
    if (base instanceof THREE.Mesh) {
      console.log("Base geometry:", base.geometry);
      console.log("Base vertices:", base.geometry?.getAttribute('position')?.count);
    }
    baseRef.current = base;
    codeRef.current = code;
  }, []);

  const exportSTL = async (type: 'base' | 'code' | 'combined') => {
    if (!baseRef.current || !codeRef.current) {
      alert("Model not ready. Please wait for the 3D model to load.");
      return;
    }

    try {
      const { STLExporter } = await import('three-stdlib');
      const exporter = new STLExporter();

      const link = document.createElement('a');
      link.style.display = 'none';
      document.body.appendChild(link);

      const save = (blob: Blob, filename: string) => {
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        setTimeout(() => {
          URL.revokeObjectURL(link.href);
          document.body.removeChild(link);
        }, 100);
      };

      try {
          console.log("=== STL Export Started ===");
          console.log("Export type:", type);
          console.log("baseRef.current:", baseRef.current);
          console.log("codeRef.current:", codeRef.current);

          const exportGroup = new THREE.Group();
          let meshCount = 0;

          // Helper to add mesh with world transform applied
          const addMeshWithTransform = (mesh: THREE.Mesh) => {
            console.log("Processing mesh:", mesh);
            console.log("  - name:", mesh.name);
            console.log("  - type:", mesh.type);
            console.log("  - has geometry:", !!mesh.geometry);

            if (!mesh.geometry) {
              console.warn("Skipping mesh without geometry:", mesh.name);
              return;
            }

            console.log("  - geometry type:", mesh.geometry.type);
            console.log("  - geometry:", mesh.geometry);

            // Ensure geometry has position attribute
            const positionAttr = mesh.geometry.getAttribute('position');
            console.log("  - position attribute:", positionAttr);
            console.log("  - vertex count:", positionAttr?.count);

            if (!positionAttr || positionAttr.count === 0) {
              console.warn("Skipping mesh with empty geometry:", mesh.name);
              return;
            }

            console.log(`✓ Adding mesh: ${mesh.name || 'unnamed'}, vertices: ${positionAttr.count}`);

            // Clone mesh and apply transforms
            const clonedMesh = mesh.clone();
            clonedMesh.updateMatrixWorld(true);
            clonedMesh.geometry = clonedMesh.geometry.clone();
            clonedMesh.geometry.applyMatrix4(clonedMesh.matrixWorld);

            // Rotate geometry to lay flat on build plate (Y-up to Z-up)
            // Rotate -90 degrees around X axis so base sits on Z=0 plane
            const rotationMatrix = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
            clonedMesh.geometry.applyMatrix4(rotationMatrix);

            // Reset mesh transform
            clonedMesh.position.set(0, 0, 0);
            clonedMesh.rotation.set(0, 0, 0);
            clonedMesh.scale.set(1, 1, 1);
            clonedMesh.updateMatrix();

            exportGroup.add(clonedMesh);
            meshCount++;
          };

          // Collect meshes based on export type
          if (type === 'base') {
              console.log("Traversing base...");
              if (baseRef.current instanceof THREE.Mesh) {
                console.log("Base is a Mesh, processing directly");
                addMeshWithTransform(baseRef.current);
              } else {
                console.log("Base is not a Mesh, traversing children");
                baseRef.current.traverse((child) => {
                  console.log("Found child:", child.type, child.name);
                  if (child instanceof THREE.Mesh) {
                    addMeshWithTransform(child);
                  }
                });
              }
          } else if (type === 'code') {
              console.log("Traversing code...");
              codeRef.current.traverse((child) => {
                console.log("Found child:", child.type, child.name);
                if (child instanceof THREE.Mesh) {
                  addMeshWithTransform(child);
                }
              });
          } else {
              console.log("Traversing both base and code...");
              // Combined
              if (baseRef.current instanceof THREE.Mesh) {
                addMeshWithTransform(baseRef.current);
              } else {
                baseRef.current.traverse((child) => {
                  if (child instanceof THREE.Mesh) {
                    addMeshWithTransform(child);
                  }
                });
              }
              codeRef.current.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  addMeshWithTransform(child);
                }
              });
          }

          if (meshCount === 0) {
            alert("No valid geometry found to export. Please wait for the model to fully load.");
            document.body.removeChild(link);
            return;
          }

          console.log(`Exporting ${meshCount} meshes`);
          console.log("Export group children:", exportGroup.children.length);

          // Manual STL generation - STLExporter seems broken
          let stlString = 'solid model\n';
          let triangleCount = 0;

          try {
            console.log("Manually generating STL...");

            exportGroup.traverse((child) => {
              if (!(child instanceof THREE.Mesh) || !child.geometry) return;

              const geometry = child.geometry;
              const positionAttr = geometry.getAttribute('position');

              if (!positionAttr) {
                console.warn("No position attribute");
                return;
              }

              console.log(`Processing mesh with ${positionAttr.count} vertices`);

              // Get indices or create them
              const indices = geometry.index;
              const vertexCount = positionAttr.count;

              if (indices) {
                // Indexed geometry
                for (let i = 0; i < indices.count; i += 3) {
                  const i1 = indices.getX(i);
                  const i2 = indices.getX(i + 1);
                  const i3 = indices.getX(i + 2);

                  const v1 = new THREE.Vector3(positionAttr.getX(i1), positionAttr.getY(i1), positionAttr.getZ(i1));
                  const v2 = new THREE.Vector3(positionAttr.getX(i2), positionAttr.getY(i2), positionAttr.getZ(i2));
                  const v3 = new THREE.Vector3(positionAttr.getX(i3), positionAttr.getY(i3), positionAttr.getZ(i3));

                  // Calculate normal
                  const cb = new THREE.Vector3();
                  const ab = new THREE.Vector3();
                  cb.subVectors(v3, v2);
                  ab.subVectors(v1, v2);
                  cb.cross(ab);
                  cb.normalize();

                  stlString += `facet normal ${cb.x} ${cb.y} ${cb.z}\n`;
                  stlString += ` outer loop\n`;
                  stlString += `  vertex ${v1.x} ${v1.y} ${v1.z}\n`;
                  stlString += `  vertex ${v2.x} ${v2.y} ${v2.z}\n`;
                  stlString += `  vertex ${v3.x} ${v3.y} ${v3.z}\n`;
                  stlString += ` endloop\n`;
                  stlString += `endfacet\n`;
                  triangleCount++;
                }
              } else {
                // Non-indexed geometry
                for (let i = 0; i < vertexCount; i += 3) {
                  const v1 = new THREE.Vector3(positionAttr.getX(i), positionAttr.getY(i), positionAttr.getZ(i));
                  const v2 = new THREE.Vector3(positionAttr.getX(i + 1), positionAttr.getY(i + 1), positionAttr.getZ(i + 1));
                  const v3 = new THREE.Vector3(positionAttr.getX(i + 2), positionAttr.getY(i + 2), positionAttr.getZ(i + 2));

                  // Calculate normal
                  const cb = new THREE.Vector3();
                  const ab = new THREE.Vector3();
                  cb.subVectors(v3, v2);
                  ab.subVectors(v1, v2);
                  cb.cross(ab);
                  cb.normalize();

                  stlString += `facet normal ${cb.x} ${cb.y} ${cb.z}\n`;
                  stlString += ` outer loop\n`;
                  stlString += `  vertex ${v1.x} ${v1.y} ${v1.z}\n`;
                  stlString += `  vertex ${v2.x} ${v2.y} ${v2.z}\n`;
                  stlString += `  vertex ${v3.x} ${v3.y} ${v3.z}\n`;
                  stlString += ` endloop\n`;
                  stlString += `endfacet\n`;
                  triangleCount++;
                }
              }
            });

            stlString += 'endsolid model\n';

            console.log(`Generated ${triangleCount} triangles`);
            console.log(`STL size: ${stlString.length} bytes`);

          } catch (e) {
            console.error("Manual STL generation failed:", e);
            throw e;
          }

          const result = stlString;

          const filename = type === 'base' ? 'qr_base.stl' : type === 'code' ? 'qr_code.stl' : 'qr_combined.stl';
          const fileSize = result instanceof DataView ? result.byteLength : result.length;

          console.log(`Final STL file size: ${fileSize} bytes`);

          if (fileSize < 100) {
            console.error("STL export resulted in suspiciously small file!");
            console.error("Export group:", exportGroup);
            console.error("Result:", result);
            alert("Export may have failed - file is too small. Check console for details.");
          }

          // ASCII STL should always be a string
          if (typeof result !== 'string') {
            console.error("Expected string for ASCII STL, got:", typeof result);
            alert("Export failed - unexpected format");
            document.body.removeChild(link);
            return;
          }

          const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
          save(blob, filename);

          // Track the export
          trackExport(type);
      } catch (err) {
          console.error("Export failed", err);
          alert("Failed to export STL. Error: " + (err as Error).message);
      }
    } catch (e) {
      console.error("Failed to load exporter", e);
      alert("Could not load export module. Please try again.");
    }
  };

  // Generate WiFi QR code format
  const handleWifiChange = (updates: Partial<typeof wifiConfig>) => {
    const newWifiConfig = { ...wifiConfig, ...updates };
    setWifiConfig(newWifiConfig);
    if (qrMode === 'wifi' && newWifiConfig.ssid) {
      const wifiString = `WIFI:T:${newWifiConfig.security};S:${newWifiConfig.ssid};P:${newWifiConfig.password};;`;
      setConfig(prev => ({ ...prev, text: wifiString }));
    }
  };

  const handleModeChange = (mode: 'text' | 'wifi') => {
    setQrMode(mode);
    if (mode === 'wifi' && wifiConfig.ssid) {
      const wifiString = `WIFI:T:${wifiConfig.security};S:${wifiConfig.ssid};P:${wifiConfig.password};;`;
      setConfig(prev => ({ ...prev, text: wifiString }));
    } else if (mode === 'text') {
      setConfig(prev => ({ ...prev, text: '' }));
    }
  };

  const getDisplaySize = () => {
    if (unit === 'cm') return Math.round(config.size / 10 * 100) / 100;
    if (unit === 'in') return Math.round(config.size / 25.4 * 100) / 100;
    return config.size;
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden md:flex-row">
      
      {/* Left Panel: 3D Viewer */}
      <div className="flex-1 relative bg-gradient-to-b from-slate-900 to-slate-800 order-2 md:order-1">
        <div className="absolute top-4 left-4 z-10 bg-black/30 backdrop-blur-md p-2 rounded-lg border border-white/10">
           <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 flex items-center gap-2">
             <Printer className="w-6 h-6 text-blue-400" /> 3D QR Forge
           </h1>
           <p className="text-xs text-slate-400 mt-1">Visualize & Export for Multi-Color Printing</p>
        </div>
        
        <Canvas
          shadows
          camera={{ position: [0, 100, 100], fov: 45 }}
          onCreated={(state) => {
            console.log('WebGL Renderer created successfully', state.gl);
          }}
        >
          <Suspense fallback={null}>
            <Stage environment="city" intensity={0.5} adjustCamera={1.2}>
              <Center>
                  <QRModel config={config} onUpdateMeshes={handleUpdateMeshes} />
              </Center>
            </Stage>
          </Suspense>
          <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
        </Canvas>
        
        <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
            <span className="bg-black/50 text-white/50 text-[10px] px-2 py-1 rounded">
              Left Click to Rotate • Right Click to Pan • Scroll to Zoom
            </span>
        </div>
      </div>

      {/* Right Panel: Controls */}
      <div className="w-full md:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-1/2 md:h-full shadow-2xl z-20 order-1 md:order-2">
        <div className="p-6 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
          
          {/* Section: Content */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400 font-semibold border-b border-slate-800 pb-2">
              <Settings2 className="w-4 h-4" /> Content
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
              <button
                onClick={() => handleModeChange('text')}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded flex items-center justify-center gap-2 transition-all ${qrMode === 'text' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-300'}`}
              >
                <Type className="w-4 h-4" /> URL/Text
              </button>
              <button
                onClick={() => handleModeChange('wifi')}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded flex items-center justify-center gap-2 transition-all ${qrMode === 'wifi' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-300'}`}
              >
                <Wifi className="w-4 h-4" /> WiFi
              </button>
            </div>

            {qrMode === 'text' ? (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">QR Data (URL or Text)</label>
                <input
                  type="text"
                  value={config.text}
                  onChange={(e) => setConfig({...config, text: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="https://example.com"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">WiFi Network Name (SSID)</label>
                  <input
                    type="text"
                    value={wifiConfig.ssid}
                    onChange={(e) => handleWifiChange({ ssid: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="My WiFi Network"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
                  <input
                    type="text"
                    value={wifiConfig.password}
                    onChange={(e) => handleWifiChange({ password: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Enter WiFi password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Security Type</label>
                  <div className="flex gap-2">
                    {['WPA', 'WEP', 'nopass'].map((security) => (
                      <button
                        key={security}
                        onClick={() => handleWifiChange({ security })}
                        className={`flex-1 py-1.5 text-xs font-bold rounded ${wifiConfig.security === security ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                      >
                        {security === 'nopass' ? 'None' : security}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Error Correction</label>
              <div className="flex gap-2">
                {['L', 'M', 'Q', 'H'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setConfig({...config, errorCorrection: level as any})}
                    className={`flex-1 py-1.5 text-xs font-bold rounded ${config.errorCorrection === level ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Section: Dimensions */}
          <section className="space-y-4">
             <div className="flex items-center gap-2 text-purple-400 font-semibold border-b border-slate-800 pb-2">
              <Printer className="w-4 h-4" /> Dimensions
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-medium text-slate-400">Size</label>
                        <div className="flex bg-slate-800 rounded border border-slate-700 p-0.5">
                             {['mm', 'cm', 'in'].map(u => (
                                 <button 
                                    key={u}
                                    onClick={() => setUnit(u as any)}
                                    className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${unit === u ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}
                                 >
                                     {u}
                                 </button>
                             ))}
                        </div>
                    </div>
                    <input 
                        type="number" 
                        step={unit === 'in' ? "0.1" : "1"}
                        value={getDisplaySize()}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (isNaN(val)) return;
                            let mm = val;
                            if (unit === 'cm') mm = val * 10;
                            if (unit === 'in') mm = val * 25.4;
                            setConfig({...config, size: mm});
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Font Size (mm)</label>
                    <input 
                        type="number" 
                        value={config.fontSize}
                        onChange={(e) => setConfig({...config, fontSize: Number(e.target.value)})}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Base Height (mm)</label>
                    <input 
                        type="number" 
                        step="0.2"
                        value={config.baseHeight}
                        onChange={(e) => setConfig({...config, baseHeight: Number(e.target.value)})}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm"
                    />
                </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Code Height (mm)</label>
                    <input 
                        type="number" 
                        step="0.2"
                        value={config.codeHeight}
                        onChange={(e) => setConfig({...config, codeHeight: Number(e.target.value)})}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm"
                    />
                </div>
            </div>
          </section>

          {/* Section: Text & AI */}
          <section className="space-y-4">
             <div className="flex items-center gap-2 text-green-400 font-semibold border-b border-slate-800 pb-2">
              <Type className="w-4 h-4" /> Labeling
            </div>

            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Top Label</label>
                    <input
                        type="text"
                        value={config.topLabel}
                        onChange={(e) => setConfig({...config, topLabel: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
                        placeholder="e.g., SCAN ME"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Bottom Label</label>
                    <input
                        type="text"
                        value={config.bottomLabel}
                        onChange={(e) => setConfig({...config, bottomLabel: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
                        placeholder="e.g., WIFI"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Font Style</label>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(AVAILABLE_FONTS).map(([name, url]) => (
                            <button
                                key={name}
                                onClick={() => setConfig({...config, fontStyle: url})}
                                className={`py-2 px-3 text-xs font-semibold rounded transition-all ${config.fontStyle === url ? 'bg-green-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'}`}
                            >
                                {name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Text Alignment */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Text Alignment</label>
                    <div className="flex gap-2">
                        {[
                            { value: 'left', label: 'Left' },
                            { value: 'center', label: 'Center' },
                            { value: 'right', label: 'Right' }
                        ].map((align) => (
                            <button
                                key={align.value}
                                onClick={() => setConfig({...config, textAlignment: align.value as any})}
                                className={`flex-1 py-1.5 text-xs font-bold rounded ${config.textAlignment === align.value ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                            >
                                {align.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Top Label Position */}
                {config.topLabel && (
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                            Top Label Position: {config.topLabelOffset > 0 ? '+' : ''}{config.topLabelOffset.toFixed(1)}mm
                        </label>
                        <input
                            type="range"
                            min="-10"
                            max="10"
                            step="0.5"
                            value={config.topLabelOffset}
                            onChange={(e) => setConfig({...config, topLabelOffset: parseFloat(e.target.value)})}
                            className="w-full"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                            <span>Closer to QR</span>
                            <span>Further Away</span>
                        </div>
                    </div>
                )}

                {/* Bottom Label Position */}
                {config.bottomLabel && (
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                            Bottom Label Position: {config.bottomLabelOffset > 0 ? '+' : ''}{config.bottomLabelOffset.toFixed(1)}mm
                        </label>
                        <input
                            type="range"
                            min="-10"
                            max="10"
                            step="0.5"
                            value={config.bottomLabelOffset}
                            onChange={(e) => setConfig({...config, bottomLabelOffset: parseFloat(e.target.value)})}
                            className="w-full"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                            <span>Closer to QR</span>
                            <span>Further Away</span>
                        </div>
                    </div>
                )}
            </div>
          </section>

          {/* Section: Style */}
          <section className="space-y-4">
             <div className="flex items-center gap-2 text-orange-400 font-semibold border-b border-slate-800 pb-2">
              <Shapes className="w-4 h-4" /> Style
            </div>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                        QR Code Roundness: {(config.qrCornerRadius * 100).toFixed(0)}%
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={config.qrCornerRadius}
                        onChange={(e) => setConfig({...config, qrCornerRadius: parseFloat(e.target.value)})}
                        className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                        <span>Sharp Pixels</span>
                        <span>Rounded Pixels</span>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                        Base Plate Roundness: {(config.baseCornerRadius * 100).toFixed(0)}%
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={config.baseCornerRadius}
                        onChange={(e) => setConfig({...config, baseCornerRadius: parseFloat(e.target.value)})}
                        className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                        <span>Sharp Edges</span>
                        <span>Rounded Edges</span>
                    </div>
                </div>
            </div>
          </section>

           {/* Section: Appearance */}
           <section className="space-y-4">
             <div className="flex items-center gap-2 text-pink-400 font-semibold border-b border-slate-800 pb-2">
              <Palette className="w-4 h-4" /> Colors (Preview)
            </div>
            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Base</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="color" 
                            value={config.baseColor}
                            onChange={(e) => setConfig({...config, baseColor: e.target.value})}
                            className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                        />
                        <span className="text-xs text-slate-500 font-mono">{config.baseColor}</span>
                    </div>
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Code</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="color" 
                            value={config.codeColor}
                            onChange={(e) => setConfig({...config, codeColor: e.target.value})}
                            className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                        />
                         <span className="text-xs text-slate-500 font-mono">{config.codeColor}</span>
                    </div>
                </div>
            </div>
          </section>
        </div>

        {/* Footer: Export Actions */}
        <div className="p-6 bg-slate-900 border-t border-slate-800 space-y-2 z-30">
            <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={() => exportSTL('base')}
                    className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold py-2.5 rounded-lg transition-colors border border-slate-700"
                >
                    <Download className="w-4 h-4" /> Base STL
                </button>
                <button 
                    onClick={() => exportSTL('code')}
                    className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold py-2.5 rounded-lg transition-colors border border-slate-700"
                >
                    <Download className="w-4 h-4" /> Code STL
                </button>
            </div>
            <button 
                onClick={() => exportSTL('combined')}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold py-3 rounded-lg shadow-lg shadow-blue-900/20 transition-all"
            >
                <Download className="w-4 h-4" /> Download Combined STL
            </button>
            <p className="text-[10px] text-center text-slate-500 mt-2">
                For multi-color: Import Base & Code STLs into slicer as a single object or multipart object.
            </p>
        </div>
      </div>
    </div>
  );
};

export default App;
