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

// Library animations (walk, idle, dance) need +90 deg to stand up from Z-up
const LIBRARY_FIX = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));

function AnimationPlayer({ modelScene, animationUrl, scale }: AnimationPlayerProps) {
  const { animations } = useGLTF(animationUrl);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  useEffect(() => {
    if (!modelScene || !animations || animations.length === 0) return;

    // Detect animation source
    const isLibrary =
      animationUrl.toLowerCase().includes("idle") ||
      animationUrl.toLowerCase().includes("walk") ||
      animationUrl.toLowerCase().includes("dance");

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

      for (const boneName of modelBoneNames) {
        if (getBasename(boneName) === trackBase) return boneName;
      }
      for (const boneName of modelBoneNames) {
        const mbBase = getBasename(boneName);
        if (mbBase.includes(trackBase) || trackBase.includes(mbBase)) return boneName;
      }
      if (trackBase.includes("hips") || trackBase.includes("root")) {
        for (const boneName of modelBoneNames) {
          if (boneName.toLowerCase().includes("hips")) return boneName;
        }
      }
      return null;
    };

    const mappedTracks: THREE.KeyframeTrack[] = [];
    clip.tracks.forEach((track) => {
      const match = track.name.match(/^(.+)\.(position|quaternion|scale|rotation)(.*)$/);
      if (match) {
        const [, bonePath, property, suffix] = match;
        if (property === "scale") return;

        const matchedBoneName = findMatchingBone(bonePath);
        if (matchedBoneName) {
          const isRootOrHips =
            matchedBoneName.toLowerCase().includes("hips") ||
            matchedBoneName.toLowerCase().includes("root");

          if (property === "position" && !isRootOrHips) return;

          const newName = `${matchedBoneName}.${property}${suffix}`;
          const newTrack = track.clone();
          newTrack.name = newName;

          // Positions
          if (property === "position") {
            for (let i = 0; i < newTrack.values.length; i += 3) {
              let x = (newTrack.values[i] * 0.01) / scale;
              let y = (newTrack.values[i+1] * 0.01) / scale;
              let z = (newTrack.values[i+2] * 0.01) / scale;

              // Only Library animations from raw Mixamo need axis swap
              if (isLibrary && isRootOrHips) {
                const tx = x;
                const ty = z;
                const tz = y;
                x = tx; 
                y = ty; 
                z = tz;
                
                // Mixamo Hips often have an offset that makes the model float or sink.
                // We normalize it so the lowest point of the animation starts at Y=0
                // but for now, let's apply a constant shift if they are consistently low.
                // Based on "feet not visible", we need to lift them up.
                y += 0.8; 
              }
              newTrack.values[i] = x;
              newTrack.values[i+1] = y;
              newTrack.values[i+2] = z;
            }
          }

          // Rotations
          if (property === "quaternion" && isRootOrHips) {
            for (let i = 0; i < newTrack.values.length; i += 4) {
              const q = new THREE.Quaternion(
                newTrack.values[i],
                newTrack.values[i+1],
                newTrack.values[i+2],
                newTrack.values[i+3]
              );
              
              // Only apply fix to Library animations. 
              // Generated (Blender) animations should be 0-fix (no premultiply).
              if (isLibrary) {
                q.premultiply(LIBRARY_FIX);
              }

              newTrack.values[i] = q.x;
              newTrack.values[i+1] = q.y;
              newTrack.values[i+2] = q.z;
              newTrack.values[i+3] = q.w;
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
  }, [modelScene, animationUrl, animations, scale]);

  useFrame((state, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
      const isLibrary =
        animationUrl.toLowerCase().includes("idle") ||
        animationUrl.toLowerCase().includes("walk") ||
        animationUrl.toLowerCase().includes("dance");

      if (isLibrary) {
        modelScene.traverse((child) => {
          if (child instanceof THREE.Bone) {
            const name = child.name.toLowerCase();
            if (name.includes("leftarm") || name.includes("leftupperarm") || (name.includes("l_arm") && !name.includes("forearm"))) {
              child.quaternion.multiply(LEFT_ARM_ADJUST);
            } else if (name.includes("rightarm") || name.includes("rightupperarm") || (name.includes("r_arm") && !name.includes("forearm"))) {
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
    mixer.clipAction(clip).play();
    return () => { mixer.stopAllAction(); mixerRef.current = null; };
  }, [modelScene, clip]);
  useFrame((state, delta) => { mixerRef.current?.update(delta); });
  return null;
}

function Model({ modelUrl, onLoaded, animationUrl }: { modelUrl?: string; onLoaded?: (hasBones: boolean) => void; animationUrl?: string; }) {
  if (!modelUrl) return <mesh><sphereGeometry args={[0.5, 16, 16]} /><meshStandardMaterial color="#EC4899" /></mesh>;
  return <ModelContent modelUrl={modelUrl} onLoaded={onLoaded} animationUrl={animationUrl} />;
}

function ModelContent({ modelUrl, onLoaded, animationUrl }: { modelUrl: string; onLoaded?: (hasBones: boolean) => void; animationUrl?: string; }) {
  const { scene, animations } = useGLTF(modelUrl);
  const [scale, setScale] = useState(1);
  const normalizedRef = useRef(false);

  const hasBones = useMemo(() => {
    let bonesFound = false;
    scene.traverse((child) => { if (child instanceof THREE.Bone) bonesFound = true; });
    return bonesFound;
  }, [scene]);

  useEffect(() => { onLoaded?.(hasBones); }, [hasBones, onLoaded]);

  // NORMALIZATION: Centering and Scaling
  useEffect(() => {
    if (scene && !normalizedRef.current) {
      // 1. Reset
      scene.rotation.set(0, 0, 0);
      scene.position.set(0, 0, 0);
      scene.scale.set(1, 1, 1);
      scene.updateMatrixWorld(true);

      // 2. Compute bounding box to find size
      const box = new THREE.Box3().setFromObject(scene);
      const size = new THREE.Vector3();
      box.getSize(size);
      
      // Use max dimension for height if the model is rotated in source
      const currentHeight = Math.max(size.y, size.z, 0.1);
      const targetHeight = 1.6;
      const s = targetHeight / currentHeight;
      
      // 3. Apply scale
      scene.scale.set(s, s, s);
      scene.updateMatrixWorld(true);

      // 4. Ground and Center once
      const scaledBox = new THREE.Box3().setFromObject(scene);
      const center = new THREE.Vector3();
      scaledBox.getCenter(center);
      
      // Place feet at Y=0, center on XZ=0
      scene.position.set(-center.x, -scaledBox.min.y, -center.z);
      scene.updateMatrixWorld(true);

      setScale(s);
      normalizedRef.current = true;
    }
  }, [scene, modelUrl]);

  useEffect(() => { normalizedRef.current = false; }, [modelUrl]);

  const playBuiltIn = !animationUrl && animations && animations.length > 0;
  const playExternal = animationUrl || (!playBuiltIn && hasBones ? "/animations/idle_clean.glb" : null);

  return (
    <>
      <primitive object={scene} />
      {playBuiltIn && <LocalAnimationPlayer modelScene={scene} clip={animations[0]} />}
      {playExternal && <AnimationPlayer modelScene={scene} animationUrl={playExternal} scale={scale} />}
    </>
  );
}

function Loader() {
  return <mesh position={[0, 0.8, 0]}><torusKnotGeometry args={[0.4, 0.05, 128, 16]} /><meshStandardMaterial color="#EC4899" emissive="#EC4899" emissiveIntensity={2} wireframe /></mesh>;
}

export function Viewer3D({ variant = "hero", modelUrl, animationUrl, autoRotate: defaultAutoRotate = false, className = "", onLoaded }: Viewer3DProps) {
  const [autoRotate, setAutoRotate] = useState(defaultAutoRotate);
  const [isPlayingAnimation, setIsPlayingAnimation] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const isHero = variant === "hero";

  const handleReset = () => {
    if (controlsRef.current) {
      // Focus on the lower center of the model to ensure feet are visible
      controlsRef.current.target.set(0, 0.7, 0);
      const camera = controlsRef.current.object;
      if (camera) {
        camera.position.set(0, 0.7, 3.5);
        camera.lookAt(0, 0.7, 0);
      }
      controlsRef.current.update();
    }
  };

  // Sync camera target when model or animation changes
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0.7, 0);
      controlsRef.current.update();
    }
  }, [modelUrl, animationUrl]);

  return (
    <div className={`relative w-full overflow-hidden ${isHero ? "aspect-[4/3] md:aspect-square lg:aspect-[4/3] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.4)] border border-border border-[2px]" : "h-[60dvh] md:h-[500px] rounded-2xl border border-border"} ${className}`} style={{ background: "radial-gradient(ellipse at 35% 45%, var(--bg-secondary) 0%, var(--bg-primary) 65%)" }}>
      <Canvas camera={{ position: [0, 0.7, 3.5], fov: 45 }} dpr={[1, 2]} frameloop="always" className="w-full h-full z-10" style={{ background: "transparent", touchAction: "none" }}>
        <ambientLight intensity={0.6} /><hemisphereLight args={["#ffffff", "#444444", 0.8]} /><directionalLight position={[5, 8, 5]} intensity={3} /><directionalLight position={[-5, 3, -5]} intensity={2} /><directionalLight position={[0, -3, 5]} intensity={2} /><pointLight position={[3, 2, 0]} color="#ffffff" intensity={3} />
        <Suspense fallback={<Loader />}>{modelUrl ? <Model modelUrl={modelUrl} onLoaded={(hasBones) => { setIsPlayingAnimation(hasBones); onLoaded?.(hasBones); }} animationUrl={animationUrl} /> : <mesh><sphereGeometry args={[0.5, 16, 16]} /><meshStandardMaterial color="#EC4899" /></mesh>}</Suspense>
        <OrbitControls ref={controlsRef} target={[0, 0.7, 0]} autoRotate={autoRotate} autoRotateSpeed={isHero ? 2 : 1.5} enablePan={!isHero} minDistance={0.8} maxDistance={8} enableZoom={true} enableDamping={true} dampingFactor={0.07} rotateSpeed={0.8} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.5} makeDefault />
      </Canvas>
      <div className="absolute inset-0 pointer-events-none z-0 opacity-30" style={{ backgroundImage: "linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      {!isHero && <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-0" style={{ height: "40%", background: "linear-gradient(transparent, var(--grid-color))" }} />}
      {isHero && <div className="z-20 absolute top-3 left-3 bg-background-surface/80 backdrop-blur-md border border-border rounded-lg px-3 py-1.5 text-[9px] text-accent font-bold tracking-[0.5px] flex items-center gap-2 shadow-sm"><span className="w-1 h-1 bg-accent rounded-full animate-pulse" />LIVE PREVIEW</div>}
      <div className="absolute bottom-6 right-4 z-30 flex flex-col sm:flex-row gap-2">
        <button onClick={handleReset} title="Reset Camera" className="w-10 h-10 rounded-xl flex items-center justify-center bg-background-surface/90 border border-border text-text-secondary hover:bg-accent/10 hover:text-accent transition-all duration-200 text-sm backdrop-blur-xl shadow-lg active:scale-95">⟳</button>
        <button onClick={() => setAutoRotate(!autoRotate)} title="Toggle Auto-Rotate" className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-200 text-sm backdrop-blur-xl shadow-lg active:scale-95 ${autoRotate ? "bg-accent text-white border-accent shadow-accent/20" : "bg-background-surface/90 border-border text-text-secondary hover:bg-accent/10 hover:text-accent"}`}>↻</button>
      </div>
    </div>
  );
}

export default Viewer3D;
