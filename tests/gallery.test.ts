import { describe, expect, it } from 'vitest';
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
  });
});
