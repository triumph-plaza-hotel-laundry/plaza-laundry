import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import darkBgUrl from '@/assets/images/home-luxury-laundry.png';
import lightBgUrl from '@/assets/images/luxury-light.png';
import '@/components/home/home-cinematic-background.css';

const HOST_ID = 'home-cinematic-bg-host';

export function HomeCinematicBackground() {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let portalHost = document.getElementById(HOST_ID);
    if (!portalHost) {
      portalHost = document.createElement('div');
      portalHost.id = HOST_ID;
      document.body.prepend(portalHost);
    }

    setHost(portalHost);

    return () => {
      document.getElementById(HOST_ID)?.remove();
      setHost(null);
    };
  }, []);

  if (!host) {
    return null;
  }

  return createPortal(
    <div aria-hidden="true" className="home-cinematic-bg">
      <div className="home-cinematic-bg__stage">
        <div className="home-cinematic-bg__motion home-cinematic-bg__motion--dark">
          <img
            alt=""
            className="home-cinematic-bg__image home-cinematic-bg__image--dark"
            decoding="async"
            draggable={false}
            src={darkBgUrl}
          />
        </div>
        <div className="home-cinematic-bg__motion home-cinematic-bg__motion--light">
          <img
            alt=""
            className="home-cinematic-bg__image"
            decoding="async"
            draggable={false}
            src={lightBgUrl}
          />
        </div>
      </div>
      <div className="home-cinematic-bg__glow" />
      <div className="home-cinematic-bg__overlay" />
    </div>,
    host,
  );
}
