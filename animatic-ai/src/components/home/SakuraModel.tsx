import React, { useRef, useEffect, Suspense, Component } from 'react';
import type { ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

class ModelErrorBoundary extends Component<{children: ReactNode, fallback: ReactNode}, {hasError: boolean}> {
  constructor(props: {children: ReactNode, fallback: ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface ModelProps {
  position?: [number, number, number];
  scale?: number | [number, number, number];
  rotation?: [number, number, number];
}

/**
 * Sakura 3D model with wind effect.
 * For Hero section.
 */

function Model({ position, scale, rotation }: ModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Using Draco compressed model for performance
  const { scene } = useGLTF('/models/sakura_draco.glb', 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/');

  const materialsWithTime = useRef<THREE.ShaderMaterial[]>([]);

  useEffect(() => {
    if (!scene) return;
    
    // Cloning materials and adding wind shader
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          // Cloning material to safely modify the shader
          const mat = (mesh.material as THREE.Material).clone();
          mesh.material = mat;
          
          mat.onBeforeCompile = (shader) => {
            shader.uniforms.time = { value: 0 };
            
            // Inserting uniform-time variable
            shader.vertexShader = shader.vertexShader.replace(
              '#include <common>',
              `
              #include <common>
              uniform float time;
              `
            );

            // Adding logic of distortion (wind)
            // position.y affects amplitude (bottom vertices stay in place, top ones sway)
            shader.vertexShader = shader.vertexShader.replace(
              '#include <begin_vertex>',
              `
              #include <begin_vertex>
              
              // Set wind start threshold (so the tree root doesn't move).
              // Value 0.5 may need to be adjusted to the size of your model.
              float heightFactor = max(0.0, transformed.y - 0.1); 
              
              // Wind strength
              float windStrength = heightFactor * 0.05; 
              
              // Smooth swaying along X and Z
              transformed.x += sin(time * 2.0 + transformed.y * 5.0) * windStrength;
              transformed.z += cos(time * 1.5 + transformed.y * 5.0) * windStrength;
              `
            );
            
            // Saving reference to shader to update time in useFrame
            mat.userData.shader = shader;
            materialsWithTime.current.push(mat as unknown as THREE.ShaderMaterial);
          };
        }
      }
    });
  }, [scene]);

  useFrame((state) => {
    // 1. Updating time in shaders
    materialsWithTime.current.forEach((mat) => {
      if (mat.userData?.shader) {
        mat.userData.shader.uniforms.time.value = state.clock.elapsedTime;
      }
    });

    // 2. Rotating the tree following the mouse (only if external rotation is not set or added to it)
    if (groupRef.current) {
      const targetRotationX = (state.pointer.y * Math.PI) / -32; 
      const targetRotationY = (state.pointer.x * Math.PI) / -16;  

      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotationX + (rotation?.[0] || 0), 0.05);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotationY + (rotation?.[1] || 0), 0.05);
      if (rotation?.[2] !== undefined) {
        groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, rotation[2], 0.05);
      }
    }
  });

  const { viewport, size } = useThree();
  const isMobile = size.width < 768;

  const defaultPosition: [number, number, number] = isMobile ? [0, -0.8, 0] : [viewport.width / 4, 0, 0];
  const defaultScale: number | [number, number, number] = isMobile 
    ? [viewport.width * 0.28, viewport.width * 0.28, viewport.width * 0.28] 
    : [3, 3, 3];

  return (
    <group 
      ref={groupRef} 
      dispose={null} 
      position={position || defaultPosition} 
      scale={scale || defaultScale}
    >
      <primitive object={scene} />
    </group>
  );
}

// Fallback, if there is no model
function Fallback() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      const targetRotationX = (state.pointer.y * Math.PI) / 8;
      const targetRotationY = (state.pointer.x * Math.PI) / 4;
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotationX, 0.05);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotationY, 0.05);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[1.5, 32, 32]} />
      <meshStandardMaterial color="#EC4899" wireframe />
    </mesh>
  );
}

export function SakuraModel(props: ModelProps) {
  return (
    <ModelErrorBoundary fallback={<Fallback />}>
      <Suspense fallback={<Fallback />}>
        <Model {...props} />
      </Suspense>
    </ModelErrorBoundary>
  );
}


useGLTF.preload('/models/sakura_draco.glb', 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/');
