import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useState, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

export interface Viewer3DProps {
  variant?: "hero" | "full";
  modelUrl?: string;
  emoji?: string;
  gradient?: string;
  showToolbar?: boolean;
  showBadge?: boolean;
  autoRotate?: boolean;
  className?: string;
}

function Model({ modelUrl }: { modelUrl?: string }) {
  const [error, setError] = useState(false);

  if (!modelUrl || error) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#1B6EF3" />
      </mesh>
    );
  }

  return (
    <ModelContent
      modelUrl={modelUrl}
      onError={() => {
        requestAnimationFrame(() => setError(true));
      }}
    />
  );
}

function ModelContent({
  modelUrl,
  onError,
}: {
  modelUrl: string;
  onError: () => void;
}) {
  const { scene } = useGLTF(modelUrl);
  return <primitive object={scene} />;
}

function Loader() {
  return (
    <mesh>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial color="#1B6EF3" wireframe />
    </mesh>
  );
}

export function Viewer3D({
  variant = "hero",
  modelUrl,
  autoRotate: defaultAutoRotate = false,
  className = "",
}: Viewer3DProps) {
  const [autoRotate, setAutoRotate] = useState(defaultAutoRotate);
  const [zoom, setZoom] = useState(1);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const isHero = variant === "hero";

  const handleReset = () => {
    controlsRef.current?.reset();
    controlsRef.current?.update();
  };

  return (
    <div
      className={`
        relative w-full overflow-hidden
        ${
          isHero
            ? "aspect-[4/3] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.4)] border border-border border-[2px]"
            : "h-[500px] rounded-2xl border border-border"
        }
        ${className}
      `}
      style={{
        background:
          "radial-gradient(ellipse at 35% 45%, var(--viewer-bg-start, #0D2045) 0%, var(--viewer-bg-end, #080C14) 65%)",
      }}
    >
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 1, 3], fov: 50 }}
        dpr={isHero ? [1, 1] : [1, 1.5]}
        className="w-full h-full z-10"
        style={{ background: "transparent" }}
      >
        {/* Bright studio lighting */}
        <ambientLight intensity={0.6} />
        <hemisphereLight args={["#ffffff", "#444444", 0.8]} />
        <directionalLight position={[5, 8, 5]} intensity={3} />
        <directionalLight position={[-5, 3, -5]} intensity={2} />
        <directionalLight position={[0, -3, 5]} intensity={2} />
        <pointLight position={[3, 2, 0]} color="#ffffff" intensity={3} />

        <Suspense fallback={<Loader />}>
          {modelUrl ? (
            <Model modelUrl={modelUrl} />
          ) : (
            <mesh scale={zoom || 1}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#1B6EF3" />
            </mesh>
          )}
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          autoRotate={autoRotate}
          autoRotateSpeed={isHero ? 2 : 1.5}
          enablePan={true}
          minDistance={1.5}
          maxDistance={15}
          enableZoom={true}
        />
      </Canvas>

      {/* Grid Overlay — both variants */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(27,110,243,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(27,110,243,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Floor gradient — full variant only */}
      {!isHero && (
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none z-0"
          style={{
            height: "40%",
            background: "linear-gradient(transparent, rgba(27,110,243,0.04))",
          }}
        />
      )}

      {/* Badge */}
      {isHero && (
        <div className="z-10 absolute top-3 left-3 bg-surface2 backdrop-blur border border-border rounded-lg px-3 py-1.5 text-[9px] text-success font-bold tracking-[0.5px] flex items-center gap-2">
          <span className="w-1 h-1 bg-success rounded-full animate-pulse" />
          LIVE
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex gap-1.5">
          <button
            onClick={handleReset}
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-surface2 border border-border text-textSecondary hover:bg-accentGlow hover:text-accent transition-all duration-200 text-xs backdrop-blur-sm"
          >
            ⟳
          </button>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all duration-200 text-xs backdrop-blur-sm ${
              autoRotate
                ? "bg-surface border-accent text-accent hover:bg-accentGlow hover:text-accent"
                : "bg-surface2 border-border text-textSecondary hover:bg-accentGlow hover:text-accent"
            }`}
          >
            ↻
          </button>
        </div>
    </div>
  );
}

export default Viewer3D;
