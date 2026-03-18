import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment } from '@react-three/drei'
import { Suspense, useState, useRef } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

function Model() {
  const { scene } = useGLTF('/models/golubino.glb')
  return <primitive object={scene} />
}

function Loader() {
  return (
    <mesh>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial color="#1B6EF3" wireframe />
    </mesh>
  )
}

function ViewerCard() {
    const [autoRotate, setAutoRotate] = useState(true)
    const controlsRef = useRef<OrbitControlsImpl>(null)

  return (
    <div 
      className="
        w-full aspect-[4/3]
        bg-surface 
        border border-border
        rounded-[20px] 
        overflow-hidden
        relative
        shadow-[0_24px_80px_rgba(0,0,0,0.4),0_0_0_1px_var(--border)]
      "
    >
      {/* 3D Canvas */}
      <Canvas 
        camera={{ position: [0, 1, 3], fov: 50 }}
        className="w-full h-full z-10"
      >
        <ambientLight intensity={0.5} />  
        <directionalLight position={[5, 5, 5]} intensity={1.4} castShadow />  
        <directionalLight position={[-10, 3, -5]} intensity={1} />
        <pointLight position={[0, -2, 0]} color="#1B6EF3" intensity={5} />
        <Environment preset="sunset" />

        <Suspense fallback={<Loader />}>
          <Model />
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          autoRotate={autoRotate}
          autoRotateSpeed={1.5}
          enablePan={true}
        />
      </Canvas>

      {/* Grid */}
      <div className="
        absolute inset-0 pointer-events-none z-0
        bg-[linear-gradient(transparent_60%,_rgba(27,110,243,0.08)_100%),_linear-gradient(rgba(27,110,243,0.06)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(27,110,243,0.06)_1px,_transparent_1px)]
        [background-size:100%_100%,_30px_30px,_30px_30px]
      "/>
      
      {/* Badge */}
      <div className=" z-10
        absolute top-4 left-4
        bg-surface2
        border border-border
        rounded-lg px-[10px] py-[5px]
        text-[11px] text-accent font-semibold
        tracking-[0.5px]
      ">
        ● LIVE 3D
      </div>

      {/* Hint */}
      <div className=" z-10
        absolute bottom-4 left-4
        text-[11px] text-textSecondary
        flex items-center gap-[5px]
      ">
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
        </svg>
        Перетащи для вращения
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex gap-1.5 z-10">
        {/* AutoRotate */}
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className="w-8 h-8 rounded-lg flex items-center justify-center
                     bg-surface2 border border-border
                     text-textSecondary hover:bg-surface
                     hover:text-accent transition-all text-xs"
        >
          ↻
        </button>
        {/* Reset cam */}
        <button
          onClick={() => controlsRef.current?.reset()}
          className="w-8 h-8 rounded-lg flex items-center justify-center
                     bg-surface2 border border-border
                     text-textSecondary hover:bg-surface
                     hover:text-accent transition-all text-xs"
        >
          ⤢
        </button>
      </div>
    </div>
  )
}

export default ViewerCard