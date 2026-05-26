import React, { useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, Float, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Safe GLTF loader sub-component to prevent canvas crashes on loading states
function GLTFObject({ url, scale = 1 }: { url: string; scale?: number }) {
  try {
    const { scene } = useGLTF(url);
    const clonedScene = React.useMemo(() => scene.clone(), [scene]);
    return <primitive object={clonedScene} scale={scale} />;
  } catch (err) {
    console.warn("Failed to compile 3D asset:", url, err);
    return (
      <mesh>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial wireframe color="#ef4444" />
      </mesh>
    );
  }
}

// Props interface for the floating object
interface FloatingObjectProps {
  position: [number, number, number];
  baseScale: number;
  scrollTriggerPercent: number; // Normalized scroll position (0 to 1) instead of pixel heights
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
  color: string;
  type: 
    | 'torus' 
    | 'dodecahedron' 
    | 'ring' 
    | 'astronaut' 
    | 'pikachu' 
    | 'satellite' 
    | 'rocket' 
    | 'laptop' 
    | 'microchip'
    | 'car';
  materialType: 'glass' | 'metal' | 'wireframe' | 'glow';
  theme: 'dark' | 'light';
}

// Modular individual floating object managing its own scroll scale & mouse drift
function FloatingObject({
  position,
  baseScale,
  scrollTriggerPercent,
  mouseRef,
  color,
  type,
  materialType,
  theme
}: FloatingObjectProps) {
  const meshRef = useRef<THREE.Group>(null);
  
  // Align object Y coordinate along the total scroll depth span of 28 units
  const targetY = -(scrollTriggerPercent * 28) + position[1];

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const group = meshRef.current;
    if (!group) return;

    // 1. Smoothly spin/rotate shape
    group.rotation.x = time * 0.18 + (scrollTriggerPercent * 0.1);
    group.rotation.y = time * 0.12 + (scrollTriggerPercent * 0.05);

    // 2. Responsive Viewport Width scaling (prevent side clipping on mobile)
    const viewportWidth = state.viewport.width;
    const widthFactor = Math.min(1.0, viewportWidth / 7.5);

    // 3. Local coordinate offsets (X base position pulled inwards on narrow viewports)
    const responsiveBaseX = position[0] * widthFactor;
    let targetLocalX = responsiveBaseX + (mouseRef.current.x * 0.25);
    let targetLocalY = mouseRef.current.y * 0.25;

    // Special behavior: Make the Torus Ring on the home page float freely in a large, graceful circular orbit!
    if (type === 'torus' && scrollTriggerPercent === 0) {
      targetLocalX += Math.sin(time * 0.55) * 0.7 * widthFactor;
      targetLocalY += Math.cos(time * 0.4) * 0.45;
    }

    group.position.x = THREE.MathUtils.lerp(group.position.x, targetLocalX, 0.05);
    group.position.y = THREE.MathUtils.lerp(group.position.y, targetLocalY, 0.05);

    // 4. Scroll Pop-Up Calculation
    const cameraY = state.camera.position.y;
    const distance = Math.abs(cameraY - targetY);
    const activeRange = 4.0; // active Y view distance where popup is triggered

    let scaleFactor = 0;
    if (distance < activeRange) {
      const normalizedDist = 1 - (distance / activeRange);
      // Smoothstep easing for popup transitions
      scaleFactor = normalizedDist * normalizedDist * (3 - 2 * normalizedDist);
    }

    // Ensure the home page ring stays visible and noticeable when at the top of the page
    if (type === 'torus' && scrollTriggerPercent === 0 && cameraY > -1.5) {
      scaleFactor = Math.max(scaleFactor, 0.95);
    }

    // Smoothly lerp actual mesh scale
    const currentScale = group.scale.x;
    const nextScale = THREE.MathUtils.lerp(currentScale, scaleFactor * baseScale, 0.08);
    group.scale.setScalar(nextScale);
  });

  // Dynamically shift neon colors to beautiful high-contrast frost tones in light mode
  const activeColor = theme === 'light'
    ? (color === '#a855f7' ? '#6366f1' // soft lavender instead of neon purple
      : color === '#ec4899' ? '#db2777' // saturated rich rose instead of neon pink
      : color === '#06b6d4' ? '#0891b2' // ice cyan
      : color === '#3b82f6' ? '#4f46e5' // deep indigo
      : color === '#16a34a' ? '#15803d' // forest green
      : color === '#eab308' ? '#d97706' // gold/amber
      : color)
    : color;

  return (
    // X is set to 0, letting the child group responsiveBaseX offset scale correctly inside useFrame
    <Float speed={2.0} rotationIntensity={0.6} floatIntensity={0.8} position={[0, targetY, position[2]]}>
      <group ref={meshRef} scale={0}>
        {/* --- 1. Real GLTF models (Astronaut / Pikachu) --- */}
        {type === 'astronaut' && (
          <Suspense fallback={
            <mesh>
              <sphereGeometry args={[0.5, 8, 8]} />
              <meshBasicMaterial wireframe color="#a855f7" />
            </mesh>
          }>
            <GLTFObject url="/assets/astronaut.glb" scale={0.46} />
          </Suspense>
        )}

        {type === 'pikachu' && (
          <Suspense fallback={
            <mesh>
              <sphereGeometry args={[0.5, 8, 8]} />
              <meshBasicMaterial wireframe color="#eab308" />
            </mesh>
          }>
            <GLTFObject url="/assets/pikachu.glb" scale={0.52} />
          </Suspense>
        )}

        {/* --- 2. Highly Creative Coder/Hardware/Cyber Compound Shapes --- */}
        {type === 'car' && (
          <group>
            {/* Cyberpunk car chassis */}
            <mesh>
              <boxGeometry args={[0.55, 0.2, 1.1]} />
              <meshStandardMaterial color={activeColor} metalness={0.9} roughness={0.12} />
            </mesh>
            {/* Frosted canopy glass */}
            <mesh position={[0, 0.16, -0.05]}>
              <boxGeometry args={[0.42, 0.15, 0.5]} />
              <meshPhysicalMaterial color="#38bdf8" transmission={0.9} thickness={0.8} transparent opacity={0.8} />
            </mesh>
            {/* Glowing neon headlights */}
            <mesh position={[0, 0, 0.56]}>
              <boxGeometry args={[0.48, 0.04, 0.02]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
            {/* Red neon taillights */}
            <mesh position={[0, 0, -0.56]}>
              <boxGeometry args={[0.48, 0.04, 0.02]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
            {/* Wheels / Engines */}
            <mesh position={[-0.3, -0.1, 0.32]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.13, 0.13, 0.08, 12]} />
              <meshStandardMaterial color="#0f172a" roughness={0.85} />
            </mesh>
            <mesh position={[0.3, -0.1, 0.32]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.13, 0.13, 0.08, 12]} />
              <meshStandardMaterial color="#0f172a" roughness={0.85} />
            </mesh>
            <mesh position={[-0.3, -0.1, -0.32]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.13, 0.13, 0.08, 12]} />
              <meshStandardMaterial color="#0f172a" roughness={0.85} />
            </mesh>
            <mesh position={[0.3, -0.1, -0.32]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.13, 0.13, 0.08, 12]} />
              <meshStandardMaterial color="#0f172a" roughness={0.85} />
            </mesh>
          </group>
        )}

        {type === 'satellite' && (
          <group>
            {/* Center Cylindrical gold body */}
            <mesh>
              <cylinderGeometry args={[0.18, 0.18, 0.55, 12]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Blue solar panel wings */}
            <mesh position={[-0.55, 0, 0]}>
              <boxGeometry args={[0.6, 0.22, 0.02]} />
              <meshStandardMaterial color="#0284c7" emissive="#0369a1" emissiveIntensity={0.5} roughness={0.15} />
            </mesh>
            <mesh position={[0.55, 0, 0]}>
              <boxGeometry args={[0.6, 0.22, 0.02]} />
              <meshStandardMaterial color="#0284c7" emissive="#0369a1" emissiveIntensity={0.5} roughness={0.15} />
            </mesh>
            {/* Antenna dish on top */}
            <mesh position={[0, 0.35, 0]}>
              <coneGeometry args={[0.15, 0.15, 12]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        )}

        {type === 'rocket' && (
          <group>
            {/* White booster body */}
            <mesh>
              <cylinderGeometry args={[0.16, 0.16, 0.7, 12]} />
              <meshStandardMaterial color="#f1f5f9" roughness={0.25} />
            </mesh>
            {/* Red rocket nose tip */}
            <mesh position={[0, 0.45, 0]}>
              <coneGeometry args={[0.16, 0.25, 12]} />
              <meshStandardMaterial color="#ef4444" roughness={0.1} />
            </mesh>
            {/* Stabilizer fins */}
            <mesh position={[-0.2, -0.28, 0]} rotation={[0, 0, Math.PI / 6]}>
              <boxGeometry args={[0.08, 0.25, 0.02]} />
              <meshStandardMaterial color="#ef4444" />
            </mesh>
            <mesh position={[0.2, -0.28, 0]} rotation={[0, 0, -Math.PI / 6]}>
              <boxGeometry args={[0.08, 0.25, 0.02]} />
              <meshStandardMaterial color="#ef4444" />
            </mesh>
          </group>
        )}

        {type === 'laptop' && (
          <group>
            {/* Slate grey keyboard base */}
            <mesh position={[0, -0.15, 0]}>
              <boxGeometry args={[0.7, 0.03, 0.46]} />
              <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.15} />
            </mesh>
            {/* Dark display casing */}
            <mesh position={[0, 0.08, -0.21]} rotation={[Math.PI / 6, 0, 0]}>
              <boxGeometry args={[0.7, 0.45, 0.02]} />
              <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.2} />
            </mesh>
            {/* Glowing screen panel */}
            <mesh position={[0, 0.08, -0.19]} rotation={[Math.PI / 6, 0, 0]}>
              <planeGeometry args={[0.66, 0.4]} />
              <meshBasicMaterial color={theme === 'light' ? "#6366f1" : "#38bdf8"} transparent opacity={0.85} />
            </mesh>
          </group>
        )}

        {type === 'microchip' && (
          <group>
            {/* Printed Circuit Board base */}
            <mesh>
              <boxGeometry args={[0.65, 0.65, 0.04]} />
              <meshStandardMaterial color="#16a34a" roughness={0.4} />
            </mesh>
            {/* Central silicon processor core */}
            <mesh position={[0, 0, 0.035]}>
              <boxGeometry args={[0.3, 0.3, 0.03]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Copper wire patterns */}
            <mesh position={[-0.15, 0.15, 0.025]}>
              <boxGeometry args={[0.08, 0.08, 0.015]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.95} roughness={0.1} />
            </mesh>
            <mesh position={[0.15, -0.15, 0.025]}>
              <boxGeometry args={[0.08, 0.08, 0.015]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.95} roughness={0.1} />
            </mesh>
          </group>
        )}

        {/* --- 3. Classic High-End Abstract Glass / Neon Geometries --- */}
        {type === 'torus' && (
          <mesh>
            <torusGeometry args={[0.7, 0.24, 12, 48]} />
            {materialType === 'glass' && (
              <meshPhysicalMaterial
                color={activeColor}
                roughness={theme === 'light' ? 0.05 : 0.08}
                metalness={theme === 'light' ? 0.05 : 0.1}
                transmission={0.9}
                thickness={1.8}
                ior={1.5}
                clearcoat={1.0}
                clearcoatRoughness={0.05}
                transparent
                opacity={0.88}
              />
            )}
          </mesh>
        )}

        {type === 'dodecahedron' && (
          <mesh>
            <dodecahedronGeometry args={[0.75]} />
            {materialType === 'glass' && (
              <meshPhysicalMaterial
                color={activeColor}
                roughness={theme === 'light' ? 0.05 : 0.08}
                metalness={theme === 'light' ? 0.05 : 0.1}
                transmission={0.9}
                thickness={1.8}
                ior={1.5}
                clearcoat={1.0}
                clearcoatRoughness={0.05}
                transparent
                opacity={0.88}
              />
            )}
          </mesh>
        )}

        {type === 'ring' && (
          <mesh>
            <torusGeometry args={[0.85, 0.04, 8, 48]} />
            {materialType === 'glow' && (
              <meshStandardMaterial
                color={activeColor}
                emissive={activeColor}
                emissiveIntensity={theme === 'light' ? 1.2 : 1.8}
                roughness={0.2}
              />
            )}
          </mesh>
        )}
      </group>
    </Float>
  );
}

// 10 distinct shapes spread out down the long scroll viewport
const OBJECTS_DATA: Array<{
  id: number;
  position: [number, number, number];
  baseScale: number;
  scrollTriggerPercent: number; // Normalized scroll position (0.0 = Top, 1.0 = Bottom)
  color: string;
  type: FloatingObjectProps['type'];
  materialType: FloatingObjectProps['materialType'];
}> = [
  // 1. Hero Top Right - Glass Torus (Neon Violet) - Scroll 0%
  {
    id: 1,
    position: [1.6, 0.8, 1.2],
    baseScale: 1.15,
    scrollTriggerPercent: 0.0,
    color: '#a855f7',
    type: 'torus',
    materialType: 'glass',
  },
  // 2. Hero Lower Left - Real Floating Astronaut GLB - Scroll 10%
  {
    id: 2,
    position: [-1.6, -0.4, 1.2],
    baseScale: 1.25,
    scrollTriggerPercent: 0.1,
    color: '#ffffff',
    type: 'astronaut',
    materialType: 'metal',
  },
  // 3. Stack Category Right - Creative Space Satellite - Scroll 22%
  {
    id: 3,
    position: [1.6, -0.1, 1.2],
    baseScale: 1.2,
    scrollTriggerPercent: 0.22,
    color: '#f59e0b',
    type: 'satellite',
    materialType: 'metal',
  },
  // 4. About Top Left - Creative Hardware CPU Microchip - Scroll 35%
  {
    id: 4,
    position: [-1.6, 0.1, 1.2],
    baseScale: 1.15,
    scrollTriggerPercent: 0.35,
    color: '#16a34a',
    type: 'microchip',
    materialType: 'metal',
  },
  // 5. About Details Right - Stylized Coder Laptop - Scroll 48%
  {
    id: 5,
    position: [1.6, 0.2, 1.2],
    baseScale: 1.15,
    scrollTriggerPercent: 0.48,
    color: '#38bdf8',
    type: 'laptop',
    materialType: 'metal',
  },
  // 6. Terminal Section Left - Custom Space Rocket - Scroll 60%
  {
    id: 6,
    position: [-1.6, -0.4, 1.2],
    baseScale: 1.15,
    scrollTriggerPercent: 0.6,
    color: '#ef4444',
    type: 'rocket',
    materialType: 'metal',
  },
  // 7. Projects Grid Right - Real Floating Pikachu GLB Easter Egg - Scroll 72%
  {
    id: 7,
    position: [1.6, 0.4, 1.2],
    baseScale: 1.25,
    scrollTriggerPercent: 0.72,
    color: '#f59e0b',
    type: 'pikachu',
    materialType: 'metal',
  },
  // 8. Communities Left - Futuristic Cyber-Car - Scroll 82%
  {
    id: 8,
    position: [-1.6, -0.2, 1.2],
    baseScale: 1.15,
    scrollTriggerPercent: 0.82,
    color: '#eab308',
    type: 'car',
    materialType: 'metal',
  },
  // 9. Contact Info Right - Creative Space Satellite - Scroll 90%
  {
    id: 9,
    position: [1.6, 0, 1.2],
    baseScale: 1.2,
    scrollTriggerPercent: 0.9,
    color: '#0284c7',
    type: 'satellite',
    materialType: 'metal',
  },
  // 10. Footer Center - Glowing Indigo Orbit Ring - Scroll 100%
  {
    id: 10,
    position: [0, -0.5, 0.8],
    baseScale: 1.55,
    scrollTriggerPercent: 1.0,
    color: '#6366f1',
    type: 'ring',
    materialType: 'glow',
  }
];

// Interactive background manager inside the R3F Canvas context
function InteractiveBackground({ 
  mouseRef, 
  scrollRef,
  theme
}: { 
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
  scrollRef: React.MutableRefObject<number>;
  theme: 'dark' | 'light';
}) {
  const { camera } = useThree();
  const starsRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Smoothly Lerp Camera position based on Scroll percentage and Mouse cursor offset
    const targetScrollY = -scrollRef.current * 28;
    const targetCamX = mouseRef.current.x * 0.4;
    const targetCamY = targetScrollY + (mouseRef.current.y * 0.4);

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, 0.05);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, 5.5, 0.05);
    camera.lookAt(0, targetScrollY, 0);

    // Slow orbital drift of star points
    if (starsRef.current) {
      starsRef.current.rotation.y = time * (theme === 'light' ? 0.003 : 0.006);
      starsRef.current.rotation.x = Math.sin(time * 0.03) * 0.008;
    }
  });

  // Dynamic light values adapted for bright vs dark themes
  const ambientIntensity = theme === 'light' ? 0.85 : 0.5;
  const directionalIntensity = theme === 'light' ? 2.2 : 1.8;
  
  const p1Color = theme === 'light' ? '#6366f1' : '#a855f7'; // soft lavender vs neon violet
  const p2Color = theme === 'light' ? '#db2777' : '#ec4899'; // deep rose vs neon pink
  const p3Color = theme === 'light' ? '#38bdf8' : '#3b82f6'; // sky blue vs royal blue

  return (
    <>
      {/* Advanced multi-light array to generate gorgeous neon reflections */}
      <ambientLight intensity={ambientIntensity} />
      <directionalLight position={[10, 15, 10]} intensity={directionalIntensity} color="#ffffff" />
      
      {/* Constant surrounding point lights */}
      <pointLight position={[-5, 2, 3]} intensity={theme === 'light' ? 3.0 : 4.0} color={p1Color} distance={15} decay={2} /> 
      <pointLight position={[5, -2, 3]} intensity={theme === 'light' ? 3.0 : 4.0} color={p2Color} distance={15} decay={2} />  
      <pointLight position={[0, 0, 4]} intensity={theme === 'light' ? 2.0 : 2.5} color={p3Color} distance={12} decay={2} />   

      {/* Map out our distributed floating 3D objects */}
      {OBJECTS_DATA.map((obj) => (
        <FloatingObject
          key={obj.id}
          position={obj.position}
          baseScale={obj.baseScale}
          scrollTriggerPercent={obj.scrollTriggerPercent}
          mouseRef={mouseRef}
          color={obj.color}
          type={obj.type}
          materialType={obj.materialType}
          theme={theme}
        />
      ))}

      {/* Starfield backdrop (reduces to faint, slow micro-dust in light mode for style) */}
      <group ref={starsRef as any}>
        <Stars 
          radius={90} 
          depth={45} 
          count={theme === 'light' ? 450 : 1600} 
          factor={5.5} 
          saturation={theme === 'light' ? 0.15 : 0.4} 
          fade 
          speed={theme === 'light' ? 0.4 : 0.8} 
        />
      </group>
    </>
  );
}

// Fixed-screen Canvas wrapper for standard page layering
export default function CanvasBackground({ theme }: { theme: 'dark' | 'light' }) {
  const mouseRef = useRef({ x: 0, y: 0 });
  const scrollRef = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const handleScroll = () => {
      // Calculate normalized scroll percentage (0.0 to 1.0)
      const totalScrollable = document.documentElement.scrollHeight - window.innerHeight;
      scrollRef.current = totalScrollable > 0 ? (window.scrollY / totalScrollable) : 0;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);

    handleScroll();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: 'var(--bg-primary)', // Render solid background color with canvas at backmost layer
        transition: 'background-color var(--transition-normal)', // Smooth backdrop transitions
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      >
        <InteractiveBackground mouseRef={mouseRef} scrollRef={scrollRef} theme={theme} />
      </Canvas>
    </div>
  );
}

// Preload heavy GLTF models asynchronously to guarantee zero loading lag
useGLTF.preload('/assets/astronaut.glb');
useGLTF.preload('/assets/pikachu.glb');
