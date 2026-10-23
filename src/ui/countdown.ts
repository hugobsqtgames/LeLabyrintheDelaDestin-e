/**
 * Temps restant des choix chronométrés, mémorisé par partie, scène et tour.
 *
 * - Quitter puis revenir sur le récit (sac, dés, paramètres) ne remet pas le
 *   compteur à zéro : le temps déjà écoulé reste écoulé.
 * - Seul le temps réellement passé devant le choix compte : un écart anormal
 *   entre deux battements (application suspendue par iOS, téléphone verrouillé,
 *   gros ralentissement) n'est jamais décompté d'un coup.
 */
export const TICK_MS = 100;
/** Au-delà, l'écart entre deux battements n'est pas du temps de jeu (suspension). */
export const MAX_STEP_MS = 250;

const remaining = new Map<string, number>();

export function countdownKey(gameId: string, scene: string, turn: number): string {
  return `${gameId}:${scene}:${turn}`;
}

export function remainingMs(key: string, totalMs: number): number {
  return Math.min(totalMs, remaining.get(key) ?? totalMs);
}

/** Avance le compte à rebours de `elapsed` ms (borné) ; renvoie le temps restant. */
export function consume(key: string, totalMs: number, elapsed: number): number {
  const step = Math.max(0, Math.min(MAX_STEP_MS, Number.isFinite(elapsed) ? elapsed : 0));
  const left = Math.max(0, remainingMs(key, totalMs) - step);
  remaining.set(key, left);
  // Les anciennes scènes n'ont plus d'intérêt : la table reste petite.
  if (remaining.size > 64) {
    const first = remaining.keys().next().value;
    if (first !== undefined && first !== key) remaining.delete(first);
  }
  return left;
}

export function forget(key: string) {
  remaining.delete(key);
}

/** Tests uniquement. */
export function resetCountdowns() {
  remaining.clear();
}
