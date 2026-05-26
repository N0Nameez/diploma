import { useEffect } from 'react';

interface ModelReadyNotifierProps {
  onReady: () => void;
}

/**
 * A helper component to be placed inside a <Suspense> block in React Three Fiber.
 * It will call `onReady` as soon as the Suspense resolves and this component mounts.
 */
export function ModelReadyNotifier({ onReady }: ModelReadyNotifierProps) {
  useEffect(() => {
    // Small delay to ensure shaders compile and render cycle completes
    const timer = setTimeout(() => {
      onReady();
    }, 100);
    return () => clearTimeout(timer);
  }, [onReady]);

  return null;
}
