/**
 * Libellés d'un résumé de sauvegarde, recalculés à l'affichage dans la langue
 * courante (le résumé stocké garde des identifiants ; ses textes ne servent
 * que de repli pour les sauvegardes anciennes).
 */
import type { GameContent } from '../engine/types';
import type { SaveSummary } from './schema';

export function summaryLabels(content: GameContent, sum: SaveSummary, chapterLabel: (n: number) => string): { profile: string; chapter: string; scene: string } {
  const chapter = content.chapters.find((c) => c.id === sum.chapter);
  return {
    profile: (sum.profileId && content.profiles[sum.profileId as keyof typeof content.profiles]?.name) || sum.profile,
    chapter: chapter ? `${chapterLabel(chapter.number)} — ${chapter.title}` : sum.chapterTitle,
    scene: (sum.scene && content.scenes[sum.scene]?.title) || sum.sceneTitle,
  };
}
