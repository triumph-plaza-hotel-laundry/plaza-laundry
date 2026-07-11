import { useState } from 'react';

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
  const size = compact ? 80 : 120;

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
        onError={() => {
          setFailed(true);
          setLoaded(true);
        }}
        onLoad={() => setLoaded(true)}
        src={failed ? '/fabrics/fabric.svg' : src}
        width={size}
      />
    </div>
  );
}
