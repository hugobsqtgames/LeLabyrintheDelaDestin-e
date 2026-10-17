/**
 * Navigation : chaque écran a un parent fixe. « Retour » (bouton ou geste
 * Android) y mène toujours, quel que soit le chemin suivi : aucune boucle
 * entre deux écrans n'est possible.
 */
import type { AppModel, Route } from './GameStore';

export function parentRoute(model: Pick<AppModel, 'route' | 'game' | 'savesMode' | 'pendingChapter'>): Route {
  switch (model.route) {
    case 'create':
      return 'saves';
    case 'saves':
      // Copie depuis la partie, ou sauvegardes ouvertes depuis une fin de partie : retour à la partie.
      if (model.game) return 'game';
      return model.pendingChapter ? 'memories' : 'title';
    case 'settings':
      return model.game ? 'game' : 'title';
    case 'memories':
    case 'gallery':
    case 'game':
    case 'title':
    default:
      return 'title';
  }
}
