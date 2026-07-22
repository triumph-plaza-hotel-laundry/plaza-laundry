import desktopAvif from '@/assets/images/home/triumph-home-desktop.avif';
import mobileAvif from '@/assets/images/home/triumph-home-mobile.avif';
import darkBgPng from '@/assets/images/home-luxury-laundry.webp';
import lightBgUrl from '@/assets/images/luxury-light.webp';
import '@/components/home/home-cinematic-background.css';

export function HomeCinematicBackground() {
  return (
    <div aria-hidden="true" className="home-cinematic-bg">
      <div className="home-cinematic-bg__stage">
        <div className="home-cinematic-bg__motion home-cinematic-bg__motion--dark">
          <picture className="home-cinematic-bg__picture">
            <source
              media="(max-width: 768px)"
              srcSet={mobileAvif}
              type="image/avif"
            />
            <source
              media="(max-width: 768px)"
              srcSet={darkBgPng}
              type="image/webp"
            />
            <source
              media="(min-width: 769px)"
              srcSet={desktopAvif}
              type="image/avif"
            />
            <img
              alt="Triumph Plaza Luxury Laundry"
              className="home-cinematic-bg__image home-cinematic-bg__image--dark"
              decoding="async"
              draggable={false}
              fetchPriority="high"
              height={576}
              loading="eager"
              src={darkBgPng}
              width={1024}
            />
          </picture>
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
    </div>
  );
}
