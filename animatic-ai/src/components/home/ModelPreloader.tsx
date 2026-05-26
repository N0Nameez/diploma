import { useGLTF } from '@react-three/drei';

const DRACO_URL = 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/';

/**
 * Preload secondary models in the background.
 * This should be called only after the initial loading screen has finished,
 * so it doesn't block the UI or compete with the main Hero model download.
 */
export function preloadBackgroundModels() {
  // Use requestIdleCallback or setTimeout to yield to the main thread before starting heavy fetches
  setTimeout(() => {
    useGLTF.preload('/models/blot_draco.glb', DRACO_URL);
    useGLTF.preload('/models/heart_draco.glb', DRACO_URL);
    useGLTF.preload('/models/dron_draco.glb', DRACO_URL);
    useGLTF.preload('/models/building_draco.glb', DRACO_URL);
    useGLTF.preload('/models/chair_draco.glb', DRACO_URL);
    useGLTF.preload('/models/samurai_draco.glb', DRACO_URL);
    useGLTF.preload('/models/robot_draco.glb', DRACO_URL);
  }, 1000);
}
