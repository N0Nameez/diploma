import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useState, useRef, useEffect, useMemo } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

export interface Viewer3DProps {
  variant?: "hero" | "full";
  modelUrl?: string;
  animationUrl?: string;
  emoji?: string;
  gradient?: string;
  showToolbar?: boolean;
  showBadge?: boolean;
  autoRotate?: boolean;
  className?: string;
  onLoaded?: (hasBones: boolean) => void;
}

interface AnimationPlayerProps {
  modelScene: THREE.Object3D;
  animationUrl: string;
  scale: number;
}

const LEFT_ARM_ADJUST = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.05, 0.2));
const RIGHT_ARM_ADJUST = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.05, -0.2));

function AnimationPlayer({ modelScene, animationUrl, scale }: AnimationPlayerProps) {
  const { animations } = useGLTF(animationUrl);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  useEffect(() => {
    if (!modelScene || !animations || animations.length === 0) return;

    const mixer = new THREE.AnimationMixer(modelScene);
    mixerRef.current = mixer;

    const originalClip = animations[0];
    const clip = originalClip.clone();

    // Collect all bone objects in modelScene
    const modelBones: { [key: string]: THREE.Bone } = {};
    modelScene.traverse((child) => {
      if (child instanceof THREE.Bone) {
        modelBones[child.name] = child;
      }
    });

    const modelBoneNames = Object.keys(modelBones);

    const getBasename = (name: string) => {
      let base = name.split("/").pop() || name;
      base = base.split(":").pop() || base;
      return base.toLowerCase().replace(/[^a-z0-9]/g, "");
    };

    const findMatchingBone = (trackBoneName: string) => {
      const trackBase = getBasename(trackBoneName);
      if (!trackBase) return null;

      // 1. Exact match (case insensitive) of basename
      for (const boneName of modelBoneNames) {
        if (getBasename(boneName) === trackBase) {
          return boneName;
        }
      }

      // 2. Contains match (case-insensitive)
      for (const boneName of modelBoneNames) {
        const mbBase = getBasename(boneName);
        if (mbBase.includes(trackBase) || trackBase.includes(mbBase)) {
          return boneName;
        }
      }

      // 3. Fallback to any bone containing 'hips' if the track is for a root/hips movement
      if (trackBase.includes("hips") || trackBase.includes("root")) {
        for (const boneName of modelBoneNames) {
          if (boneName.toLowerCase().includes("hips")) {
            return boneName;
          }
        }
      }

      return null;
    };

    // Map bones and filter unmatched tracks to avoid THREE.PropertyBinding warnings
    const mappedTracks: THREE.KeyframeTrack[] = [];
    clip.tracks.forEach((track) => {
      const match = track.name.match(/^(.+)\.(position|quaternion|scale|rotation)(.*)$/);
      if (match) {
        const [, bonePath, property, suffix] = match;

        // 1. Skip scale tracks entirely to prevent bone scaling / mesh distortion
        if (property === "scale") {
          return;
        }

        const matchedBoneName = findMatchingBone(bonePath);
        if (matchedBoneName) {
          // 2. Limit position tracks to root or hips bone to prevent bone shifting/stretching
          if (property === "position") {
            const isRootOrHips =
              matchedBoneName.toLowerCase().includes("hips") ||
              matchedBoneName.toLowerCase().includes("root");
            if (!isRootOrHips) {
              return;
            }
          }

          const newName = `${matchedBoneName}.${property}${suffix}`;
          const newTrack = track.clone();
          newTrack.name = newName;

          // 3. Scale position/translation tracks by 0.01 to convert Mixamo centimeters to meters
          // and divide by scale to prevent model from floating or sinking due to parent scaling
          if (property === "position") {
            for (let i = 0; i < newTrack.values.length; i++) {
              newTrack.values[i] = (newTrack.values[i] * 0.01) / scale;
            }
          }

          mappedTracks.push(newTrack);
        }
      } else {
        mappedTracks.push(track);
      }
    });

    clip.tracks = mappedTracks;

    const action = mixer.clipAction(clip);
    action.play();

    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
    };
  }, [modelScene, animations, scale]);

  useFrame((state, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);

      const isIdleOrWalk =
        animationUrl.toLowerCase().includes("idle") ||
        animationUrl.toLowerCase().includes("walk");

      if (isIdleOrWalk) {
        modelScene.traverse((child) => {
          if (child instanceof THREE.Bone) {
            const name = child.name.toLowerCase();
            if (
              name.includes("leftarm") ||
              name.includes("leftupperarm") ||
              (name.includes("l_arm") && !name.includes("forearm"))
            ) {
              child.quaternion.multiply(LEFT_ARM_ADJUST);
            } else if (
              name.includes("rightarm") ||
              name.includes("rightupperarm") ||
              (name.includes("r_arm") && !name.includes("forearm"))
            ) {
              child.quaternion.multiply(RIGHT_ARM_ADJUST);
            }
          }
        });
      }
    }
  });

  return null;
}

interface LocalAnimationPlayerProps {
  modelScene: THREE.Object3D;
  clip: THREE.AnimationClip;
}

function LocalAnimationPlayer({ modelScene, clip }: LocalAnimationPlayerProps) {
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  useEffect(() => {
    if (!modelScene || !clip) return;

    const mixer = new THREE.AnimationMixer(modelScene);
    mixerRef.current = mixer;

    const action = mixer.clipAction(clip);
    action.play();

    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
    };
  }, [modelScene, clip]);

  useFrame((state, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
  });

  return null;
}

function Model({
  modelUrl,
  onLoaded,
  animationUrl,
}: {
  modelUrl?: string;
  onLoaded?: (hasBones: boolean) => void;
  animationUrl?: string;
}) {
  if (!modelUrl) {
    return (
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color="#EC4899" />
      </mesh>
    );
  }

  // Set up error handler using event listener or catch block if needed,
  // but since we are inside Suspense, the parent ErrorBoundary handles loading errors.
  return (
    <ModelContent
      modelUrl={modelUrl}
      onLoaded={onLoaded}
      animationUrl={animationUrl}
    />
  );
}

function ModelContent({
  modelUrl,
  onLoaded,
  animationUrl,
}: {
  modelUrl: string;
  onLoaded?: (hasBones: boolean) => void;
  animationUrl?: string;
}) {
  const { scene, animations } = useGLTF(modelUrl);
  const [scale, setScale] = useState(1);
  const centeredUrlRef = useRef<string | null>(null);
  const centeringDataRef = useRef<{
    s: number;
    center: THREE.Vector3;
    minY: number;
    hipsLocal: THREE.Vector3;
  } | null>(null);

  const hasBones = useMemo(() => {
    let bonesFound = false;
    scene.traverse((child) => {
      if (child instanceof THREE.Bone) {
        bonesFound = true;
      }
    });
    return bonesFound;
  }, [scene]);

  useEffect(() => {
    onLoaded?.(hasBones);
  }, [hasBones, onLoaded]);

  useEffect(() => {
    if (scene && centeredUrlRef.current !== modelUrl) {
      // Auto-center, normalize scale to 1.6 meters, and align feet to Y = 0
      scene.rotation.set(0, 0, 0);
      scene.position.set(0, 0, 0);
      scene.scale.set(1, 1, 1);

      const box = new THREE.Box3().setFromObject(scene);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      // Target height of the model is 1.6 units (meters)
      const targetHeight = 1.6;
      const currentHeight = size.y > 0 ? size.y : 1.0;
      const s = targetHeight / currentHeight;
      scene.scale.set(s, s, s);
      requestAnimationFrame(() => {
        setScale(s);
      });

      // Find hips bone position in original space (scale 1) before scaling/rotation
      const hipsLocal = new THREE.Vector3(0, 1.0, 0);
      scene.traverse((child) => {
        if (child.name.toLowerCase().includes("hips") && child instanceof THREE.Bone) {
          child.getWorldPosition(hipsLocal);
          scene.worldToLocal(hipsLocal);
        }
      });

      centeringDataRef.current = {
        s,
        center,
        minY: box.min.y,
        hipsLocal,
      };

      // Center X and Z, and set bottom (feet) to Y = 0
      scene.position.set(-center.x * s, -box.min.y * s, -center.z * s);

      centeredUrlRef.current = modelUrl;
    }
  }, [scene, modelUrl]);

  // If there's an explicit animation URL chosen, play it.
  // Otherwise, if the model has its own built-in animations, play the first built-in animation.
  // Otherwise, if the model has bones, play the fallback idle animation.
  const playBuiltIn = !animationUrl && animations && animations.length > 0;
  const playExternal = animationUrl || (!playBuiltIn && hasBones ? "/animations/idle_clean.glb" : null);

  // Apply centering positioning based on whether we are playing an external animation (rotated container)
  useEffect(() => {
    if (!scene || !centeringDataRef.current) return;

    const { s, center, minY, hipsLocal } = centeringDataRef.current;
    const vx = -center.x * s;
    const vy = -minY * s;
    const vz = -center.z * s;

    if (playExternal) {
      const rx_val = hipsLocal.x;
      const ry_val = hipsLocal.y;

      scene.position.set(
        vx - s * rx_val,
        vz - s * ry_val,
        0
      );
    } else {
      scene.position.set(vx, vy, vz);
    }
  }, [scene, playExternal, modelUrl, hasBones]);

  // Rotate model by +90 degrees around X to stand it up if playing a Mixamo animation (which tilts hips by -90)
  const rotation: [number, number, number] = playExternal ? [Math.PI / 2, 0, 0] : [0, 0, 0];

  return (
    <>
      <group rotation={rotation}>
        <primitive object={scene} />
      </group>
      {playBuiltIn && (
        <LocalAnimationPlayer modelScene={scene} clip={animations[0]} />
      )}
      {playExternal && (
        <AnimationPlayer modelScene={scene} animationUrl={playExternal} scale={scale} />
      )}
    </>
  );
}

function Loader() {
  return (
    <mesh position={[0, 0.8, 0]}>
      <torusKnotGeometry args={[0.4, 0.05, 128, 16]} />
      <meshStandardMaterial
        color="#EC4899"
        emissive="#EC4899"
        emissiveIntensity={2}
        wireframe
      />
    </mesh>
  );
}

export function Viewer3D({
  variant = "hero",
  modelUrl,
  animationUrl,
  autoRotate: defaultAutoRotate = false,
  className = "",
  onLoaded,
}: Viewer3DProps) {
  const [autoRotate, setAutoRotate] = useState(defaultAutoRotate);
  const zoom = 1;
  const [isPlayingAnimation, setIsPlayingAnimation] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const isHero = variant === "hero";

  const handleReset = () => {
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0.8, 0);
      const camera = controlsRef.current.object;
      if (camera) {
        camera.position.set(0, 0.8, 2.2);
        camera.lookAt(0, 0.8, 0);
      }
      controlsRef.current.update();
    }
  };

  return (
    <div
      className={`
        relative w-full overflow-hidden
        ${
          isHero
            ? "aspect-[4/3] md:aspect-square lg:aspect-[4/3] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.4)] border border-border border-[2px]"
            : "h-[60dvh] md:h-[500px] rounded-2xl border border-border"
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
        camera={{ position: [0, 0.8, 2.2], fov: 50 }}
        dpr={[1, 2]} // Better quality on high-res mobile screens
        frameloop={isPlayingAnimation || autoRotate ? "always" : "demand"}
        className="w-full h-full z-10"
        style={{ background: "transparent", touchAction: "none" }}
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
            <Model
              modelUrl={modelUrl}
              onLoaded={(hasBones) => {
                setIsPlayingAnimation(hasBones);
                onLoaded?.(hasBones);
              }}
              animationUrl={animationUrl}
            />
          ) : (
            <mesh scale={zoom || 1}>
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshStandardMaterial color="#EC4899" />
            </mesh>
          )}
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          target={[0, 0.8, 0]}
          autoRotate={autoRotate}
          autoRotateSpeed={isHero ? 2 : 1.5}
          enablePan={!isHero}
          minDistance={0.8}
          maxDistance={8}
          enableZoom={true}
          enableDamping={true}
          dampingFactor={0.07}
          rotateSpeed={0.8}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.6}
          makeDefault
        />
      </Canvas>

      {/* Grid Overlay — both variants */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-30"
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
        <div className="z-20 absolute top-3 left-3 bg-background-surface/80 backdrop-blur-md border border-border rounded-lg px-3 py-1.5 text-[9px] text-accent font-bold tracking-[0.5px] flex items-center gap-2 shadow-sm">
          <span className="w-1 h-1 bg-accent rounded-full animate-pulse" />
          LIVE PREVIEW
        </div>
      )}

      {/* Controls - Positioned safely for mobile */}
      <div className="absolute bottom-6 right-4 z-30 flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleReset}
          title="Reset Camera"
          className="w-10 h-10 rounded-xl flex items-center justify-center bg-background-surface/90 border border-border text-text-secondary hover:bg-accent/10 hover:text-accent transition-all duration-200 text-sm backdrop-blur-xl shadow-lg active:scale-95"
        >
          ⟳
        </button>
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          title="Toggle Auto-Rotate"
          className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-200 text-sm backdrop-blur-xl shadow-lg active:scale-95 ${
            autoRotate
              ? "bg-accent text-white border-accent shadow-accent/20"
              : "bg-background-surface/90 border-border text-text-secondary hover:bg-accent/10 hover:text-accent"
          }`}
        >
          ↻
        </button>
      </div>
    </div>
  );
}

export default Viewer3D;
