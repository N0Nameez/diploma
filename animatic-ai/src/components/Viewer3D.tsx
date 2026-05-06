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
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color="#EC4899" />
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
      <meshStandardMaterial color="#EC4899" wireframe />
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
          "radial-gradient(ellipse at 35% 45%, var(--bg-secondary) 0%, var(--bg-primary) 65%)",
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
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshStandardMaterial color="#EC4899" />
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
        className="absolute inset-0 pointer-events-none z-0 opacity-50"
        style={{
          backgroundImage: `
            linear-gradient(var(--grid-color) 1px, transparent 1px),
            linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)
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
            background: "linear-gradient(transparent, var(--grid-color))",
          }}
        />
      )}

      {/* Badge */}
      {isHero && (
        <div className="z-10 absolute top-3 left-3 bg-background-surface/80 backdrop-blur-md border border-border rounded-lg px-3 py-1.5 text-[9px] text-accent font-bold tracking-[0.5px] flex items-center gap-2 shadow-sm">
          <span className="w-1 h-1 bg-accent rounded-full animate-pulse" />
          LIVE PREVIEW
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-10 right-5 z-20 flex gap-1.5">
          <button
            onClick={handleReset}
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-background-secondary/80 border border-border text-text-secondary hover:bg-accent/10 hover:text-accent transition-all duration-200 text-xs backdrop-blur-md"
          >
            ⟳
          </button>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all duration-200 text-xs backdrop-blur-md ${
              autoRotate
                ? "bg-accent/10 border-accent text-accent hover:bg-accent/20"
                : "bg-background-secondary/80 border-border text-text-secondary hover:bg-accent/10 hover:text-accent"
            }`}
          >
            ↻
          </button>
        </div>
    </div>
  );
}

export default Viewer3D;
