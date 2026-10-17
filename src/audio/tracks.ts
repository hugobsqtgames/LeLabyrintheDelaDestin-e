/**
 * Choix de la piste d'ambiance d'après l'état de l'application (pur, testable).
 */
import type { AppModel } from '../store/GameStore';

export type TrackId = 'ville' | 'carrieres' | 'faubourgs' | 'port' | 'ecluse' | 'marais' | 'barrage' | 'combat';

// Dans l'ordre des régions. Route du fleuve : l'eau du port.
const REGION_TRACKS: TrackId[] = ['ville', 'carrieres', 'faubourgs', 'port', 'port', 'ecluse'];

/** Lieux dont l'ambiance prime sur celle de leur région. */
const LOCATION_TRACKS: Record<string, TrackId> = {
  cimetiere: 'faubourgs',
  triage: 'faubourgs',
  remblai: 'faubourgs',
  tourbieres: 'marais',
  barrage: 'barrage',
};

/** `null` : silence (galerie, fin de partie). */
export function trackFor(
  model: Pick<AppModel, 'route' | 'game'>,
  regions: string[],
  regionOf: (sceneId: string) => string | undefined,
  locationOf: (sceneId: string) => string | undefined = () => undefined,
): TrackId | null {
  const g = model.game;
  if (model.route === 'gallery') return null;
  if (!g || model.route === 'title' || model.route === 'create') return 'ville';
  if (g.ending) return null;
  if (g.combat && g.combat.outcome === 'ongoing') return 'combat';
  const loc = locationOf(g.currentScene);
  const byLocation = loc ? LOCATION_TRACKS[loc] : undefined;
  if (byLocation) return byLocation;
  const region = regionOf(g.currentScene);
  const i = region ? regions.indexOf(region) : -1;
  return REGION_TRACKS[i] ?? 'ville';
}
