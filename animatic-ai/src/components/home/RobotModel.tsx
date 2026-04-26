import React, { useRef, Suspense, Component } from 'react';
import type { ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Adding scroll interaction in 3D scene for robot model
 */



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

function Model() {
  const groupRef = useRef<THREE.Group>(null);
  
  // Loading robot model
  const { scene } = useGLTF('/models/robot.glb');

  useFrame(() => {
    if (!groupRef.current) return;
    
    // Rotation based on scroll section
    const section = document.getElementById('character');
    if (section) {
      const rect = section.getBoundingClientRect();
      const sectionProgress = -rect.top / (rect.height + window.innerHeight);
      
      // Calculate target rotation (e.g., 1 full rotation)
      const targetRotationY = sectionProgress * Math.PI * 2;
      
      // Smooth interpolation
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotationY, 0.08);
    }
  });

  return (
    <group ref={groupRef} dispose={null} position={[0, 0, 0]} scale={[2.5, 2.5, 2.5]}>
      {/* Apply material or just render as is */}
      <primitive object={scene} />
    </group>
  );
}

function Fallback() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      const section = document.getElementById('character');
      if (section) {
        const rect = section.getBoundingClientRect();
        const sectionProgress = -rect.top / (rect.height + window.innerHeight);
        const targetRotationY = sectionProgress * Math.PI * 2;
        meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotationY, 0.08);
      }
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[2, 4, 2]} />
      <meshStandardMaterial color="#EC4899" wireframe />
    </mesh>
  );
}

export function RobotModel() {
  return (
    <ModelErrorBoundary fallback={<Fallback />}>
      <Suspense fallback={<Fallback />}>
        <Model />
      </Suspense>
    </ModelErrorBoundary>
  );
}

useGLTF.preload('/models/robot.glb');
