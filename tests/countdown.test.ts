/**
 * Choix chronométrés : le temps ne s'écoule que devant le choix, se conserve
 * d'un affichage à l'autre, et une suspension de l'application ne le consomme pas.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { consume, countdownKey, forget, MAX_STEP_MS, remainingMs, resetCountdowns } from '../src/ui/countdown';

beforeEach(() => resetCountdowns());

describe('compte à rebours des choix chronométrés', () => {
  it('retour au premier plan après 30 s : le choix n’est pas joué à la place du joueur (bug corrigé)', () => {
    const k = countdownKey('g', 'c3_quai', 4);
    consume(k, 10000, 100);
    // iOS a suspendu l'application : le battement suivant arrive 30 s plus tard.
    const left = consume(k, 10000, 30000);
    expect(left).toBe(10000 - 100 - MAX_STEP_MS);
    expect(left).toBeGreaterThan(9000);
  });

  it('quitter le récit puis revenir ne remet pas le compteur à zéro (exploit corrigé)', () => {
    const k = countdownKey('g', 'scene', 2);
    for (let i = 0; i < 80; i += 1) consume(k, 10000, 100);
    expect(remainingMs(k, 10000)).toBe(2000);
    // L'écran est remonté : il repart du temps mémorisé, pas de 10 s.
    expect(remainingMs(k, 10000)).toBe(2000);
  });

  it('chaque partie, scène et tour a son propre compteur', () => {
    const a = countdownKey('g1', 's', 1);
    const b = countdownKey('g2', 's', 1);
    const c = countdownKey('g1', 's', 2);
    consume(a, 5000, 200);
    expect(remainingMs(b, 5000)).toBe(5000);
    expect(remainingMs(c, 5000)).toBe(5000);
    forget(a);
    expect(remainingMs(a, 5000)).toBe(5000);
  });

  it('valeurs absurdes (négatif, NaN, infini) : le temps ne remonte jamais et ne saute pas', () => {
    const k = countdownKey('g', 's', 1);
    expect(consume(k, 1000, -500)).toBe(1000);
    expect(consume(k, 1000, Number.NaN)).toBe(1000);
    expect(consume(k, 1000, Number.POSITIVE_INFINITY)).toBe(1000);
  });

  it('propriété : temps restant toujours entre 0 et le total, décroissant, jamais plus vite que le temps réel borné', () => {
    let seed = 99;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    for (let run = 0; run < 2000; run += 1) {
      resetCountdowns();
      const total = 1000 + Math.floor(rnd() * 20000);
      const k = countdownKey(`g${run}`, 's', run);
      let prev = total;
      let budget = 0;
      for (let i = 0; i < 300; i += 1) {
        const dt = rnd() < 0.05 ? rnd() * 60000 : rnd() < 0.05 ? -rnd() * 100 : rnd() * 160;
        budget += Math.max(0, Math.min(MAX_STEP_MS, dt));
        const left = consume(k, total, dt);
        expect(left).toBeGreaterThanOrEqual(0);
        expect(left).toBeLessThanOrEqual(prev);
        expect(total - left).toBeLessThanOrEqual(budget + 1e-6);
        prev = left;
      }
    }
  });
});
