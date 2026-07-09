import React, { useState, useEffect } from 'react';

/**
 * OptimizedImage
 * - Automatically rewrites Unsplash URLs to serve WebP format (&fm=webp) and optimal quality (&q=60)
 * - Supports native lazy loading and responsive width sizing
 * - Displays a shimmering skeleton loader placeholder to prevent layout shifts (CLS)
 * - Restores broken images using fallback source URLs or icons
 */
const OptimizedImage = ({
  src,
  alt = 'Image',
  className = '',
  width = 400,
  quality = 60,
  fallbackSrc = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
  fallbackIcon = null,
  style = {},
  ...props
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Re-evaluate state when src changes
  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [src]);

  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-slate-50 border border-slate-100 text-slate-350 ${className}`} style={style}>
        {fallbackIcon}
      </div>
    );
  }

  // Optimize Unsplash URL
  let optimizedUrl = src;
  if (src.includes('images.unsplash.com')) {
    try {
      const url = new URL(src);
      // Force webp format, set custom width, and adjust quality
      url.searchParams.set('fm', 'webp');
      url.searchParams.set('w', width.toString());
      url.searchParams.set('q', quality.toString());
      optimizedUrl = url.toString();
    } catch (e) {
      console.warn('Failed to parse image URL, using original:', e);
    }
  }

  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center" style={style}>
      {/* Loading Placeholder / Skeleton */}
      {!loaded && !error && (
        <div className="absolute inset-0 bg-slate-100 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500/10 border-t-emerald-500 animate-spin" />
        </div>
      )}

      {/* Image tag */}
      <img
        src={error ? fallbackSrc : optimizedUrl}
        alt={alt}
        className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!error) {
            setError(true);
          }
        }}
        {...props}
      />
    </div>
  );
};

export default React.memo(OptimizedImage);
