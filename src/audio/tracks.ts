/**
 * Choix de la piste d'ambiance d'après l'état de l'application (pur, testable).
 */
import type { AppModel } from '../store/GameStore';

export type TrackId = 'ville' | 'carrieres' | 'port' | 'ecluse' | 'combat';

// Faubourgs : la ville ; route du fleuve : l'eau du port.
const REGION_TRACKS: TrackId[] = ['ville', 'carrieres', 'ville', 'port', 'port', 'ecluse'];

/** `null` : silence (galerie, fin de partie). */
export function trackFor(model: Pick<AppModel, 'route' | 'game'>, regions: string[], regionOf: (sceneId: string) => string | undefined): TrackId | null {
  const g = model.game;
  if (model.route === 'gallery') return null;
  if (!g || model.route === 'title' || model.route === 'create') return 'ville';
  if (g.ending) return null;
  if (g.combat && g.combat.outcome === 'ongoing') return 'combat';
  const region = regionOf(g.currentScene);
  const i = region ? regions.indexOf(region) : -1;
  return REGION_TRACKS[i] ?? 'ville';
}
