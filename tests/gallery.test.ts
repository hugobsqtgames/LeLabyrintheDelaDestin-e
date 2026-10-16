import { describe, expect, it } from 'vitest';
import { CONTENT as C } from '../src/content';
import { bodyItems, canRelay, relayCandidates } from '../src/engine/relay';
import { buildMockups } from '../src/gallery/fixtures';

describe('maquettes', () => {
  it('chaque maquette est produite par le moteur sans erreur', () => {
    const mockups = buildMockups();
    expect(mockups.length).toBeGreaterThanOrEqual(20);
    const ids = new Set(mockups.map((m) => m.id));
    expect(ids.size).toBe(mockups.length);
    const boss = mockups.find((m) => m.id === 'boss')!;
    expect(boss.model.game?.combat?.enemies[0].def).toBe('berger');
    expect(mockups.find((m) => m.id === 'death')!.model.game?.ending?.kind).toBe('death');
    expect(mockups.find((m) => m.id === 'ending')!.model.game?.ending?.id).toBe('fin_accord');
    expect(mockups.find((m) => m.id === 'story-check')!.model.game?.lastCheck?.success).toBe(true);
    // Mort définitive : personne pour la relève. Relève : Kaz et Inès peuvent reprendre la route.
    expect(canRelay(C, mockups.find((m) => m.id === 'death')!.model.game!)).toBe(false);
    const relay = mockups.find((m) => m.id === 'relay')!.model.game!;
    expect(relayCandidates(C, relay).map((h) => h.character).sort()).toEqual(['ines', 'kaz', 'maelle']);
    expect(bodyItems(C, relay).length).toBeGreaterThan(0);
    expect(mockups.find((m) => m.id === 'tutorial')!.model.settings?.tutorialDone).toBe(false);
  });
});
