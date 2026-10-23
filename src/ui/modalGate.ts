/**
 * Fenêtres modales natives : une seule transition à la fois.
 *
 * iOS ne sait pas présenter une fenêtre modale pendant qu'une autre se ferme :
 * la nouvelle n'apparaît pas, ou un voile invisible reste et bloque tous les
 * appuis (l'application semble figée). Chaque fermeture réserve donc un court
 * délai, et une fenêtre qui s'ouvre attend qu'il soit écoulé.
 */
export type LayerAnimation = 'none' | 'slide' | 'fade';

/** Durée de fermeture d'une fenêtre modale iOS (animation comprise, avec une marge). */
export const CLOSE_MS: Record<LayerAnimation, number> = { slide: 450, fade: 320, none: 120 };

export class ModalGate {
  private busyUntil = 0;
  constructor(private readonly now: () => number = () => Date.now()) {}

  /** Une fenêtre vient de commencer à se fermer. */
  closed(animation: LayerAnimation) {
    this.busyUntil = Math.max(this.busyUntil, this.now() + CLOSE_MS[animation]);
  }

  /** Millisecondes à attendre avant d'ouvrir une nouvelle fenêtre. */
  wait(): number {
    return Math.max(0, this.busyUntil - this.now());
  }
}

export const modalGate = new ModalGate();
