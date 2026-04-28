import { useGLTF } from '@react-three/drei';

/**
 * Module-level preload declarations for all 3D assets used on the landing page.
 * These fire immediately when the module is imported, registering with
 * Three.js DefaultLoadingManager so that useProgress tracks them.
 * 
 * No component is needed — the preload() calls work outside of Canvas context.
 */
const DRACO_URL = 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/';

// Hero Section — Sakura tree
useGLTF.preload('/models/sakura_draco.glb', DRACO_URL);

// About Section — Side models
useGLTF.preload('/models/blot_draco.glb', DRACO_URL);
useGLTF.preload('/models/heart_draco.glb', DRACO_URL);

// Work Examples — Portfolio models
useGLTF.preload('/models/dron_draco.glb', DRACO_URL);
useGLTF.preload('/models/building_draco.glb', DRACO_URL);
useGLTF.preload('/models/chair_draco.glb', DRACO_URL);
useGLTF.preload('/models/samurai_draco.glb', DRACO_URL);

// Character Section — Robot
useGLTF.preload('/models/robot_draco.glb', DRACO_URL);
