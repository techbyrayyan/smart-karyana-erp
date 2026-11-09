'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, RefreshCw, Zap, ZapOff, Check, AlertCircle } from 'lucide-react';

export default function LiveCameraCapture({ isOpen, onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' = rear camera
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cameraError, setCameraError] = useState('');
  const [shutterFlash, setShutterFlash] = useState(false);

  // Start Camera Stream
  const startCamera = async (mode = facingMode) => {
    setLoading(true);
    setCameraError('');

    // Stop existing stream if running
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera API is not supported on this browser.');
      }

      const constraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Check if torch/flashlight is supported
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      setHasTorch(!!capabilities.torch);

      setLoading(false);
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser settings.'
          : 'Could not access mobile camera. Please use file upload.'
      );
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      // Stop camera when modal closed
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, facingMode]);

  // Toggle Torch / Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (e) {
        console.warn('Torch toggle failed:', e);
      }
    }
  };

  // Flip between rear and front camera
  const flipCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Capture Snapshot from Live Video
  const handleCapture = () => {
    if (!videoRef.current || !streamRef.current) return;

    // Trigger visual shutter flash
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 200);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `receipt_${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

        // Haptic feedback if supported on mobile
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }

        onCapture(file);
        onClose();
      },
      'image/jpeg',
      0.92
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none">
      {/* Visual Shutter Flash */}
      {shutterFlash && <div className="absolute inset-0 bg-white z-50 pointer-events-none" />}

      {/* Top Controls Bar */}
      <div className="relative z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <span className="text-white text-xs font-bold tracking-wide uppercase bg-black/40 px-3 py-1 rounded-full border border-white/10">
          Receipt Scanner
        </span>

        <div className="flex items-center gap-2">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white active:scale-95 transition-all ${
                torchOn ? 'bg-amber-400 text-black' : 'bg-white/20 backdrop-blur-md'
              }`}
            >
              {torchOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={flipCamera}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Viewfinder */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
            <RefreshCw className="w-8 h-8 animate-spin text-kiryana-freshGreen" />
            <span className="text-xs font-semibold">Opening Mobile Camera...</span>
          </div>
        )}

        {cameraError ? (
          <div className="p-6 text-center max-w-xs bg-red-950/80 border border-red-500/40 rounded-2xl text-red-200 text-xs">
            <AlertCircle className="w-8 h-8 mx-auto text-red-400 mb-2" />
            <p className="font-semibold">{cameraError}</p>
            <button
              onClick={() => startCamera(facingMode)}
              className="mt-4 px-4 py-2 bg-red-600 text-white font-bold rounded-xl active:scale-95"
            >
              Retry Camera
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Receipt Alignment Frame Overlay */}
            <div className="absolute inset-6 pointer-events-none border-2 border-dashed border-emerald-400/70 rounded-2xl flex flex-col justify-between p-4 shadow-2xl">
              {/* Corner brackets */}
              <div className="flex justify-between">
                <div className="w-6 h-6 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl" />
                <div className="w-6 h-6 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr" />
              </div>

              <div className="text-center">
                <span className="text-[11px] font-bold text-white bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20 shadow-lg">
                  📄 Align receipt within box
                </span>
              </div>

              <div className="flex justify-between">
                <div className="w-6 h-6 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl" />
                <div className="w-6 h-6 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Shutter Controls */}
      <div className="relative z-10 p-6 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-center">
        <button
          onClick={handleCapture}
          disabled={loading || !!cameraError}
          className="relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform shadow-2xl disabled:opacity-50"
        >
          <div className="w-16 h-16 rounded-full bg-white active:bg-emerald-400 transition-colors shadow-inner" />
        </button>
      </div>
    </div>
  );
}
