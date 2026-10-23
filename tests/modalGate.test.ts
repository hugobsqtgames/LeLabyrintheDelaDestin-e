/**
 * Fenêtres modales : une fenêtre ne s'ouvre jamais pendant qu'une autre se ferme
 * (sur iOS, elle n'apparaîtrait pas ou bloquerait l'écran).
 */
import { describe, expect, it } from 'vitest';
import { CLOSE_MS, ModalGate } from '../src/ui/modalGate';

describe('ordonnancement des fenêtres modales', () => {
  it('aucune attente sans fermeture en cours', () => {
    let now = 1000;
    const g = new ModalGate(() => now);
    expect(g.wait()).toBe(0);
    g.closed('fade');
    now += CLOSE_MS.fade;
    expect(g.wait()).toBe(0);
  });

  it('une ouverture attend la fin de la fermeture précédente (confirmation qui en ouvre une autre)', () => {
    let now = 0;
    const g = new ModalGate(() => now);
    g.closed('fade'); // « Tout effacer ? » se ferme…
    expect(g.wait()).toBe(CLOSE_MS.fade); // … « Dernière confirmation » attend
    now += 100;
    expect(g.wait()).toBe(CLOSE_MS.fade - 100);
  });

  it('plusieurs fermetures : on attend la plus longue', () => {
    let now = 0;
    const g = new ModalGate(() => now);
    g.closed('slide');
    now += 10;
    g.closed('none');
    expect(g.wait()).toBe(CLOSE_MS.slide - 10);
  });

  it('propriété : l’attente n’est jamais négative et ne dépasse jamais la plus longue fermeture', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const anims = ['none', 'slide', 'fade'] as const;
    for (let run = 0; run < 1000; run += 1) {
      let now = 0;
      const g = new ModalGate(() => now);
      for (let i = 0; i < 20; i += 1) {
        if (rnd() < 0.5) g.closed(anims[Math.floor(rnd() * 3)]);
        now += Math.floor(rnd() * 400);
        const w = g.wait();
        expect(w).toBeGreaterThanOrEqual(0);
        expect(w).toBeLessThanOrEqual(CLOSE_MS.slide);
      }
    }
  });
});
