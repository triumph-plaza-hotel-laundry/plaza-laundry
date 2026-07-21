import { useEffect, useRef, useState } from 'react';

type FabricImageProps = {
  alt?: string;
  className?: string;
  compact?: boolean;
  src: string;
};

export function FabricImage({
  alt = '',
  className = '',
  compact = false,
  src,
}: FabricImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const size = compact ? 80 : 120;

  useEffect(() => {
    const image = imageRef.current;
    if (!image) {
      return;
    }

    const handleLoad = () => setLoaded(true);
    const handleError = () => {
      setFailed(true);
      setLoaded(true);
    };

    image.addEventListener('load', handleLoad);
    image.addEventListener('error', handleError);

    return () => {
      image.removeEventListener('load', handleLoad);
      image.removeEventListener('error', handleError);
    };
  }, [src, failed]);

  return (
    <div
      className={`fabric-image${loaded ? 'fabric-image--loaded' : ''}${className ? ` ${className}` : ''}`}
    >
      {!loaded ? (
        <div aria-hidden="true" className="fabric-image__skeleton" />
      ) : null}
      <img
        alt={alt}
        className="fabric-image__img"
        decoding="async"
        height={size}
        loading="lazy"
        ref={imageRef}
        src={failed ? '/fabrics/fabric.svg' : src}
        width={size}
      />
    </div>
  );
}
