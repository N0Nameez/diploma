import { create } from 'zustand';
import { useGLTF } from '@react-three/drei';

interface ProgressState {
  progress: number;
  isLoaded: boolean;
  sakuraUrl: string;
  hasStarted: boolean;
  startLoading: () => Promise<void>;
}

const DRACO_URL = 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/';
const ORIGINAL_URL = '/models/sakura_draco.glb';

export const useModelProgress = create<ProgressState>((set, get) => ({
  progress: 0,
  isLoaded: false,
  sakuraUrl: ORIGINAL_URL,
  hasStarted: false,
  startLoading: async () => {
    if (get().hasStarted) return;
    set({ hasStarted: true });
    
    try {
      const response = await fetch(ORIGINAL_URL);
      if (!response.ok) throw new Error('Failed to fetch model');
      
      const contentLength = response.headers.get('content-length');
      // If no content-length, guess ~1.5MB for sakura_draco.glb
      const total = contentLength ? parseInt(contentLength, 10) : 1.5 * 1024 * 1024;
      
      let loaded = 0;
      const reader = response.body?.getReader();
      const chunks = [];
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            loaded += value.length;
            set({ progress: Math.min(Math.round((loaded / total) * 100), 99) });
          }
        }
        
        const blob = new Blob(chunks);
        const url = URL.createObjectURL(blob);
        
        // Preload via GLTFLoader to ensure it's in the Three.js cache
        useGLTF.preload(url, DRACO_URL);
        
        set({ sakuraUrl: url, progress: 100, isLoaded: true });
      } else {
        set({ progress: 100, isLoaded: true });
      }
    } catch (e) {
      console.error('Error preloading hero model:', e);
      // Fallback
      useGLTF.preload(ORIGINAL_URL, DRACO_URL);
      set({ progress: 100, isLoaded: true });
    }
  }
}));
