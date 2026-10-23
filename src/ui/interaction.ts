/**
 * Le récit est-il momentanément masqué (pause, carton de chapitre, résumé,
 * tutoriel, confirmation) ? Les compteurs des choix chronométrés s'arrêtent alors.
 */
import { createContext, useContext } from 'react';

export const StoryBlockedContext = createContext(false);

export function useStoryBlocked(): boolean {
  return useContext(StoryBlockedContext);
}
