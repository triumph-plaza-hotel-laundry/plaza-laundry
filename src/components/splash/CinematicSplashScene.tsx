import { motion, useReducedMotion } from 'framer-motion';
import hoopoeUrl from '@/assets/images/eslam.png';
import logoUrl from '@/assets/images/logo.png';
import { GoldenParticleField } from '@/components/splash/GoldenParticleField';
import type { CinematicSplashPhase } from '@/components/splash/useCinematicSplashTimeline';

type CinematicSplashSceneProps = {
  phase: CinematicSplashPhase;
  burstKey: number;
};

function particleMode(phase: CinematicSplashPhase) {
  if (phase === 'explosion' || phase === 'smoke') {
    return 'explosion';
  }

  if (phase === 'reveal' || phase === 'logo' || phase === 'fade') {
    return 'dissipate';
  }

  if (phase === 'flight' || phase === 'land') {
    return 'trail';
  }

  return 'ambient';
}

function sceneOpacity(phase: CinematicSplashPhase) {
  if (phase === 'explosion') {
    return 0.35;
  }

  if (phase === 'smoke' || phase === 'reveal' || phase === 'logo' || phase === 'fade') {
    return 0;
  }

  return 1;
}

function smokeOpacity(phase: CinematicSplashPhase) {
  if (phase === 'explosion') {
    return 0.82;
  }

  if (phase === 'smoke') {
    return 1;
  }

  if (phase === 'reveal') {
    return 0.42;
  }

  if (phase === 'logo') {
    return 0.08;
  }

  return 0;
}

export function CinematicSplashScene({ phase, burstKey }: CinematicSplashSceneProps) {
  const reduceMotion = useReducedMotion();
  const showLogo = phase === 'reveal' || phase === 'logo' || phase === 'fade';
  const fadeBlack = phase === 'fade';

  const birdStates: Record<CinematicSplashPhase, Record<string, number | string>> = {
    intro: { x: '-46vw', y: '-24vh', rotate: -16, scale: 0.7, opacity: 0 },
    flight: { x: '2vw', y: '-10vh', rotate: 5, scale: 0.56, opacity: 1 },
    land: { x: '0vw', y: 'calc(-50vh + 11.75rem)', rotate: 0, scale: 0.4, opacity: 1 },
    explosion: { x: '0vw', y: 'calc(-50vh + 11.75rem)', rotate: 0, scale: 0.4, opacity: 0.15 },
    smoke: { x: '0vw', y: 'calc(-50vh + 11.75rem)', rotate: 0, scale: 0.4, opacity: 0 },
    reveal: { x: '0vw', y: 'calc(-50vh + 11.75rem)', rotate: 0, scale: 0.4, opacity: 0 },
    logo: { x: '0vw', y: 'calc(-50vh + 11.75rem)', rotate: 0, scale: 0.4, opacity: 0 },
    fade: { x: '0vw', y: 'calc(-50vh + 11.75rem)', rotate: 0, scale: 0.4, opacity: 0 },
  };

  const birdTransition = reduceMotion
    ? { duration: 0.01 }
    : phase === 'flight'
      ? { duration: 2.1, ease: [0.22, 0.61, 0.36, 1] as const }
      : phase === 'land'
        ? { duration: 0.72, ease: [0.33, 1, 0.68, 1] as const }
        : { duration: 0.35, ease: 'easeOut' as const };

  return (
    <div aria-hidden="true" className="cinematic-splash__scene">
      <div className="cinematic-splash__marble">
        <div className="cinematic-splash__marble-veins" />
        <div className="cinematic-splash__marble-gloss" />
        <div className="cinematic-splash__marble-reflection" />
      </div>

      <div className="cinematic-splash__fog cinematic-splash__fog--left" />
      <div className="cinematic-splash__fog cinematic-splash__fog--right" />
      <div className="cinematic-splash__spotlight" />
      <div className="cinematic-splash__vignette" />

      <GoldenParticleField burstKey={burstKey} mode={particleMode(phase)} />

      <motion.div
        animate={{
          scale: phase === 'flight' ? 1.035 : 1,
          filter: phase === 'flight' ? 'blur(0.55px)' : 'blur(0px)',
        }}
        className="cinematic-splash__camera"
        transition={{ duration: 0.75, ease: 'easeOut' }}
      >
        <motion.div
          animate={{ opacity: sceneOpacity(phase) }}
          className="cinematic-splash__stage"
          transition={{ duration: phase === 'explosion' ? 0.22 : 0.35 }}
        >
          <motion.div
            animate={{ opacity: sceneOpacity(phase), y: 0 }}
            className="cinematic-splash__title-block"
            initial={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.75, delay: 0.25 }}
          >
            <p className="cinematic-splash__title cinematic-splash__title--line1">TRIUMPH PLAZA</p>
            <p className="cinematic-splash__title cinematic-splash__title--line2">HOTEL</p>
          </motion.div>

          <motion.div
            animate={birdStates[phase]}
            className="cinematic-splash__bird-wrap"
            initial={birdStates.intro}
            transition={birdTransition}
          >
            <motion.div
              animate={
                reduceMotion || (phase !== 'flight' && phase !== 'land')
                  ? { rotate: 0, scaleY: 1 }
                  : { rotate: [0, -2.5, 2.5, -1.5, 1.5, 0], scaleY: [1, 0.985, 1.015, 0.99, 1.01, 1] }
              }
              className="cinematic-splash__bird-body"
              transition={
                reduceMotion
                  ? undefined
                  : { duration: 1.05, repeat: Infinity, ease: 'easeInOut' }
              }
            >
              <img alt="" className="cinematic-splash__bird" decoding="async" draggable={false} src={hoopoeUrl} />
              <div className="cinematic-splash__bird-shadow" />
            </motion.div>

            <motion.div
              animate={{ opacity: phase === 'flight' || phase === 'land' ? 0.9 : 0, scaleX: 1.35 }}
              className="cinematic-splash__bird-trail"
              transition={{ duration: 0.35 }}
            />
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div
        animate={{ opacity: smokeOpacity(phase), scale: phase === 'smoke' ? 1.18 : 1.05 }}
        className="cinematic-splash__smoke-stack"
        initial={{ opacity: 0, scale: 0.35 }}
        transition={{ duration: reduceMotion ? 0.01 : 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="cinematic-splash__smoke cinematic-splash__smoke--core" />
        <div className="cinematic-splash__smoke cinematic-splash__smoke--volume" />
        <div className="cinematic-splash__smoke cinematic-splash__smoke--spark" />
      </motion.div>

      <motion.div
        animate={{
          opacity: showLogo ? 1 : 0,
          scale: showLogo ? 1 : 0.86,
          filter: showLogo ? 'blur(0px)' : 'blur(10px)',
        }}
        className="cinematic-splash__logo-stage"
        initial={{ opacity: 0, scale: 0.82, filter: 'blur(14px)' }}
        transition={{ duration: reduceMotion ? 0.01 : 0.72, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="cinematic-splash__logo-glow" />
        <img alt="" className="cinematic-splash__logo" decoding="async" draggable={false} src={logoUrl} />
        <div aria-hidden="true" className="cinematic-splash__logo-reflection">
          <img
            alt=""
            className="cinematic-splash__logo cinematic-splash__logo--reflection"
            draggable={false}
            src={logoUrl}
          />
        </div>
      </motion.div>

      <motion.div
        animate={{ opacity: fadeBlack ? 1 : 0 }}
        className="cinematic-splash__fade-black"
        initial={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: 'easeIn' }}
      />
    </div>
  );
}
