'use client'

import { useCallback } from 'react'
import Particles from '@tsparticles/react'
import { loadFull } from 'tsparticles' // ✅ correct import for working full engine

export default function ParticlesBackground() {
  const particlesInit = useCallback(async (engine) => {
    console.log('✅ Engine loaded:', engine) // <-- should now appear
    await loadFull(engine)
  }, [])

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={{
        fullScreen: {
          enable: true,
          zIndex: 0,
        },
        background: {
          color: '#1e1f22',
        },
        fpsLimit: 60,
        particles: {
          color: {
            value: '#5865f2',
          },
          links: {
            color: '#5865f2',
            distance: 150,
            enable: true,
            opacity: 0.4,
            width: 1,
          },
          move: {
            enable: true,
            speed: 1.2,
            outModes: {
              default: 'bounce',
            },
          },
          number: {
            value: 60,
          },
          opacity: {
            value: 0.5,
          },
          shape: {
            type: 'circle',
          },
          size: {
            value: { min: 1, max: 3 },
          },
        },
        detectRetina: true,
      }}
    />
  )
}
