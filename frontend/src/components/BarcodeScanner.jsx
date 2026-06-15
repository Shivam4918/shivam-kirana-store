import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { FiX, FiCamera, FiRefreshCw, FiZap, FiAlertCircle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * BarcodeScanner — premium camera-based barcode scanner modal.
 *
 * Props:
 *  - onScan(result: string) — called when a barcode is successfully decoded
 *  - onClose()              — called when the user closes the modal
 *  - title                  — optional modal title (default: "Scan Barcode")
 */
const BarcodeScanner = ({ onScan, onClose, title = 'Scan Barcode' }) => {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState('');
  const [flash, setFlash] = useState(false);

  // Initialize reader once
  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader();
    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, []);

  // Load available cameras
  useEffect(() => {
    BrowserMultiFormatReader.listVideoInputDevices()
      .then((devices) => {
        setCameras(devices);
        if (devices.length > 0) {
          // Prefer rear camera
          const rear = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
          );
          setSelectedCamera(rear ? rear.deviceId : devices[0].deviceId);
        } else {
          setError('No cameras found on this device.');
        }
      })
      .catch(() => setError('Camera access was denied. Please allow camera permissions and try again.'));
  }, []);

  // Start/stop scanning when camera changes
  useEffect(() => {
    if (!selectedCamera || !videoRef.current || !readerRef.current) return;

    setError('');
    setScanning(true);

    readerRef.current.reset();
    readerRef.current
      .decodeFromVideoDevice(selectedCamera, videoRef.current, (result, err) => {
        if (result) {
          const code = result.getText();
          if (code !== lastResult) {
            setLastResult(code);
            setFlash(true);
            setTimeout(() => setFlash(false), 600);
            // Brief delay so the flash animation is visible
            setTimeout(() => {
              readerRef.current?.reset();
              onScan(code);
            }, 400);
          }
        }
        if (err && !(err instanceof NotFoundException)) {
          // Only show critical errors, not "nothing found yet"
          console.warn('Scanner error:', err);
        }
      })
      .catch((err) => {
        setScanning(false);
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please enable camera permissions in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Connect a camera and try again.');
        } else {
          setError('Could not start camera: ' + err.message);
        }
      });

    return () => {
      readerRef.current?.reset();
      setScanning(false);
    };
  }, [selectedCamera]);

  const switchCamera = useCallback(() => {
    if (cameras.length < 2) return;
    const currentIdx = cameras.findIndex((c) => c.deviceId === selectedCamera);
    const nextIdx = (currentIdx + 1) % cameras.length;
    setSelectedCamera(cameras[nextIdx].deviceId);
  }, [cameras, selectedCamera]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 22, stiffness: 320 }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-sm"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-slate-50">
            <div className="flex items-center space-x-2.5">
              <div className="bg-emerald-100 text-emerald-600 p-2 rounded-xl">
                <FiZap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-poppins font-extrabold text-secondary text-sm leading-none">{title}</h3>
                <p className="text-[10px] text-text-secondary mt-0.5">Point camera at a barcode or QR code</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-all cursor-pointer active:scale-95"
            >
              <FiX className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Camera Feed */}
          <div className="relative bg-slate-900 overflow-hidden" style={{ aspectRatio: '4/3' }}>
            {/* Video element */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />

            {/* Scanning overlay */}
            {!error && (
              <>
                {/* Dark corners */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Corner brackets */}
                  <div className="absolute top-6 left-6 w-8 h-8 border-t-3 border-l-3 border-emerald-400 rounded-tl-lg" style={{ borderWidth: '3px', borderRight: 'none', borderBottom: 'none', borderRadius: '6px 0 0 0' }} />
                  <div className="absolute top-6 right-6 w-8 h-8 border-t-3 border-r-3 border-emerald-400 rounded-tr-lg" style={{ borderWidth: '3px', borderLeft: 'none', borderBottom: 'none', borderRadius: '0 6px 0 0' }} />
                  <div className="absolute bottom-6 left-6 w-8 h-8 border-b-3 border-l-3 border-emerald-400 rounded-bl-lg" style={{ borderWidth: '3px', borderRight: 'none', borderTop: 'none', borderRadius: '0 0 0 6px' }} />
                  <div className="absolute bottom-6 right-6 w-8 h-8 border-b-3 border-r-3 border-emerald-400 rounded-br-lg" style={{ borderWidth: '3px', borderLeft: 'none', borderTop: 'none', borderRadius: '0 0 6px 0' }} />
                </div>

                {/* Animated laser scan line */}
                <motion.div
                  className="absolute left-8 right-8 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, transparent, #10b981, #34d399, #10b981, transparent)' }}
                  animate={{ top: ['25%', '75%', '25%'] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Success flash overlay */}
                <AnimatePresence>
                  {flash && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-emerald-400/30 pointer-events-none"
                    />
                  )}
                </AnimatePresence>
              </>
            )}

            {/* Error state overlay */}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 p-6 text-center space-y-3">
                <div className="bg-rose-500/20 text-rose-400 p-3 rounded-full">
                  <FiAlertCircle className="w-6 h-6" />
                </div>
                <p className="text-white text-xs font-semibold leading-snug">{error}</p>
                <button
                  onClick={() => { setError(''); if (selectedCamera) setSelectedCamera(v => v); }}
                  className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  <FiRefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {/* Scanning indicator */}
            {scanning && !error && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-1.5 bg-slate-900/70 text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-full backdrop-blur-sm">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span>Scanning…</span>
              </div>
            )}
          </div>

          {/* Footer — camera switch */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-[10px] text-text-secondary font-medium">
              Supports EAN-13, UPC-A, Code-128, QR & more
            </p>
            {cameras.length > 1 && (
              <button
                onClick={switchCamera}
                className="flex items-center space-x-1.5 text-[11px] font-bold text-primary hover:text-primary-hover transition-colors cursor-pointer"
              >
                <FiCamera className="w-3.5 h-3.5" />
                <span>Switch Camera</span>
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BarcodeScanner;
