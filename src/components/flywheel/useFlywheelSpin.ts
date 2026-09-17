/**
 * Drives the flywheel rotation.
 *
 * Angle is ACCUMULATED across frames rather than derived from the clock, so when
 * momentum changes the wheel eases into its new speed instead of teleporting to a
 * new angle. `kick` injects a short-lived angular boost when a habit is ticked —
 * that's the bit that makes completion feel physical.
 */

import { useEffect, useRef, type MutableRefObject } from 'react';
import { angularVelocity } from '../../lib/momentum';

const OMEGA_EASE = 2.2; // how fast actual speed chases target speed
const KICK_DECAY = 2.6; // how fast the completion burst bleeds off
const KICK_MAGNITUDE = 260; // deg/s

export function useFlywheelSpin(
  momentum: number,
  kick: number,
  enabled: boolean,
): MutableRefObject<SVGGElement | null> {
  const groupRef = useRef<SVGGElement | null>(null);
  const angleRef = useRef(0);
  const omegaRef = useRef(0);
  const boostRef = useRef(0);
  const targetRef = useRef(angularVelocity(momentum));
  const firstKick = useRef(true);

  targetRef.current = angularVelocity(momentum);

  useEffect(() => {
    if (firstKick.current) {
      firstKick.current = false;
      return; // don't fire a burst on mount
    }
    boostRef.current = KICK_MAGNITUDE;
  }, [kick]);

  useEffect(() => {
    if (!enabled) {
      if (groupRef.current) groupRef.current.setAttribute('transform', 'rotate(0 100 100)');
      return;
    }

    let raf = 0;
    let last = performance.now();
    let running = true;

    const tick = (now: number) => {
      if (!running) return;
      // Clamp dt so a backgrounded tab doesn't cause a giant jump on return.
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      omegaRef.current += (targetRef.current - omegaRef.current) * Math.min(1, dt * OMEGA_EASE);
      boostRef.current *= Math.exp(-dt * KICK_DECAY);

      angleRef.current = (angleRef.current + (omegaRef.current + boostRef.current) * dt) % 360;
      groupRef.current?.setAttribute('transform', `rotate(${angleRef.current.toFixed(2)} 100 100)`);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    const onVisibility = () => {
      last = performance.now(); // resync so we don't integrate the hidden interval
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);

  return groupRef;
}
