import React, { useRef, Suspense } from 'react';
import { motion, useScroll, useTransform, useSpring, MotionValue } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Float, Stage, Environment } from '@react-three/drei';

interface SideRobotProps {
  side: 'left' | 'right';
  modelPath: string;
  progress: MotionValue<number>;
}

/**
 * SideRobot component that slides in from the screen edges on scroll.
 * 
 * @param props - Component props
 * @param props.side - Which side of the screen the robot appears on
 * @param props.modelPath - Path to the .glb model
 * @param props.progress - MotionValue representing scroll progress
 */
export function SideRobot({ side, modelPath, progress }: SideRobotProps) {
  const ref = useRef<HTMLDivElement>(null);
  
  const smoothProgress = useSpring(progress, {
    stiffness: 200,
    damping: 40,
    restDelta: 0.001
  });

  const x = useTransform(
    smoothProgress, 
    [0, 0.3, 0.7, 1], 
    side === 'left' ? [-500, 150, 150, 150] : [500, -150, -150, -150]
  );

  const opacity = useTransform(smoothProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 1]);
  
  return (
    <motion.div
      ref={ref}
      style={{ x, opacity }}
      className={`absolute top-[20%] -translate-y-1/2 z-20 pointer-events-none hidden lg:block will-change-transform ${
        side === 'left' ? '-left-[150px]' : '-right-[150px]'
      }`}
    >
      <div className="relative w-[600px] h-[700px]">
        <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 blur-[120px] rounded-full opacity-10 ${
          side === 'left' ? 'bg-purple-500' : 'bg-accent'
        }`} />
        
        <div className="w-full h-full relative z-10">
          <Canvas camera={{ position: [0, 0, 5], far: 50 }}>
            <ambientLight intensity={1.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={10} />
            <pointLight position={[-1, 0, 5]} intensity={10} color="#EC4899" />
            <pointLight position={[1, 0, 5]} intensity={10} color="#ffffff" />
            
            <Suspense fallback={null}>
              <Float speed={3} rotationIntensity={1.5} floatIntensity={1}>
                <Stage intensity={0.2} environment="city" adjustCamera={false} shadows={false}>
                  <Model path={modelPath} />
                </Stage>
              </Float>
            </Suspense>
            <Environment preset="city" />
          </Canvas>
        </div>
      </div>
    </motion.div>
  );
}

function Model({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  return <primitive object={scene} scale={1} />;
}
