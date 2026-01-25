// EdgeFunctionRenderButton.tsx
// React component for rendering videos using the edge function webhook approach

import React, { useState } from 'react';
import { renderAndWaitForVideo, subscribeToRenderStatus } from './edgeFunctionService';

interface EdgeFunctionRenderButtonProps {
  planId: string;
  remotionCode: string;
  composition: {
    id: string;
    width: number;
    height: number;
    fps: number;
    durationInFrames: number;
  };
  inputProps?: any;
  onComplete?: (videoUrl: string) => void;
  onError?: (error: Error) => void;
}

export const EdgeFunctionRenderButton: React.FC<EdgeFunctionRenderButtonProps> = ({
  planId,
  remotionCode,
  composition,
  inputProps,
  onComplete,
  onError
}) => {
  const [isRendering, setIsRendering] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRenderWithPolling = async () => {
    setIsRendering(true);
    setStatus('Submitting render job...');
    setError(null);
    setVideoUrl(null);

    try {
      // Render and wait with polling
      const url = await renderAndWaitForVideo(
        planId,
        remotionCode,
        composition,
        inputProps,
        (newStatus) => {
          setStatus(`Status: ${newStatus}`);
        }
      );

      setVideoUrl(url);
      setStatus('Completed!');
      setIsRendering(false);

      if (onComplete) {
        onComplete(url);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setStatus('Failed');
      setIsRendering(false);

      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    }
  };

  const handleRenderWithRealtimeUpdates = async () => {
    setIsRendering(true);
    setStatus('Submitting render job...');
    setError(null);
    setVideoUrl(null);

    try {
      // Subscribe to real-time updates first
      const unsubscribe = subscribeToRenderStatus(
        planId,
        (newStatus, url, errorMsg) => {
          setStatus(`Status: ${newStatus}`);

          if (newStatus === 'completed' && url) {
            setVideoUrl(url);
            setIsRendering(false);
            if (onComplete) {
              onComplete(url);
            }
            unsubscribe();
          } else if (newStatus === 'failed') {
            setError(errorMsg || 'Render failed');
            setIsRendering(false);
            if (onError) {
              onError(new Error(errorMsg || 'Render failed'));
            }
            unsubscribe();
          }
        }
      );

      // Import the render function
      const { renderVideoViaEdgeFunction } = await import('./edgeFunctionService');

      // Submit the render job
      await renderVideoViaEdgeFunction(planId, remotionCode, composition, inputProps);
      setStatus('Status: rendering');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setStatus('Failed');
      setIsRendering(false);

      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    }
  };

  return (
    <div className="render-container">
      <div className="button-group">
        <button
          onClick={handleRenderWithPolling}
          disabled={isRendering}
          className="render-button"
        >
          {isRendering ? 'Rendering (Polling)...' : 'Render with Polling'}
        </button>

        <button
          onClick={handleRenderWithRealtimeUpdates}
          disabled={isRendering}
          className="render-button realtime"
        >
          {isRendering ? 'Rendering (Real-time)...' : 'Render with Real-time Updates'}
        </button>
      </div>

      {status && (
        <div className="status-message">
          {status}
        </div>
      )}

      {error && (
        <div className="error-message">
          ❌ Error: {error}
        </div>
      )}

      {videoUrl && (
        <div className="success-message">
          ✅ Video ready!
          <div className="video-container">
            <video src={videoUrl} controls style={{ maxWidth: '100%', marginTop: '10px' }}>
              Your browser does not support the video tag.
            </video>
          </div>
          <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="video-link">
            Open video in new tab
          </a>
        </div>
      )}

      <style jsx>{`
        .render-container {
          padding: 20px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          max-width: 600px;
        }

        .button-group {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }

        .render-button {
          flex: 1;
          padding: 12px 24px;
          background-color: #0070f3;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .render-button:hover:not(:disabled) {
          background-color: #0051cc;
        }

        .render-button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .render-button.realtime {
          background-color: #10b981;
        }

        .render-button.realtime:hover:not(:disabled) {
          background-color: #059669;
        }

        .status-message {
          padding: 10px;
          background-color: #f0f9ff;
          border-left: 4px solid #0070f3;
          margin-bottom: 10px;
        }

        .error-message {
          padding: 10px;
          background-color: #fef2f2;
          border-left: 4px solid #ef4444;
          color: #991b1b;
          margin-bottom: 10px;
        }

        .success-message {
          padding: 10px;
          background-color: #f0fdf4;
          border-left: 4px solid #10b981;
          color: #065f46;
        }

        .video-container {
          margin-top: 15px;
        }

        .video-link {
          display: inline-block;
          margin-top: 10px;
          color: #0070f3;
          text-decoration: none;
        }

        .video-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};
