// RenderButton.tsx
// React component for rendering videos in Lovable or any React app
import React, { useState } from 'react';
import { handleRenderVideo } from './videoManager';

interface RenderButtonProps {
  planId: string;
}

export function RenderButton({ planId }: RenderButtonProps) {
  const [status, setStatus] = useState<'idle' | 'rendering' | 'done' | 'error'>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  async function handleRender() {
    setStatus('rendering');
    setError(null);
    
    try {
      const url = await handleRenderVideo(planId);
      setVideoUrl(url);
      setStatus('done');
    } catch (err) {
      console.error('Render failed:', err);
      setError(err instanceof Error ? err.message : 'Render failed');
      setStatus('error');
    }
  }
  
  return (
    <div className="render-container">
      {status === 'idle' && (
        <button 
          onClick={handleRender}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          Render Final Video
        </button>
      )}
      
      {status === 'rendering' && (
        <div className="flex items-center gap-3">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          <span className="text-gray-700">Rendering... (15-30 seconds)</span>
        </div>
      )}
      
      {status === 'error' && (
        <div className="space-y-3">
          <div className="text-red-600">
            {error || 'Render failed. Please try again.'}
          </div>
          <button 
            onClick={handleRender}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
      
      {status === 'done' && videoUrl && (
        <div className="space-y-4">
          <video 
            src={videoUrl} 
            controls 
            className="w-full rounded-lg shadow-lg"
          />
          <div className="flex gap-3">
            <a 
              href={videoUrl} 
              download 
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-block"
            >
              Download Video
            </a>
            <button 
              onClick={() => {
                setStatus('idle');
                setVideoUrl(null);
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Render Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
