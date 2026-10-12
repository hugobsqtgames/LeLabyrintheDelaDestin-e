import { describe, expect, it } from 'vitest';
import {
  adjustDraftStat,
  canIncrement,
  choosePerk,
  draftStats,
  emptyDraft,
  grantXp,
  maxHp,
  remainingPoints,
  setDraftProfile,
  spendStatPoint,
  validateDraft,
} from '../src/engine/character';
import { newGame } from '../src/engine/narrative';
import { CREATION_CAP, CREATION_POINTS, STAT_MAX, xpToNext } from '../src/engine/rules';
import type { CharacterDraft } from '../src/engine/types';
import { C, DRAFT, start } from './helpers';

describe('création du personnage', () => {
  it('refuse un brouillon incomplet avec des messages explicites', () => {
    const v = validateDraft(C, emptyDraft());
    expect(v.valid).toBe(false);
    expect(v.errors.join(' ')).toMatch(/nom/);
    expect(v.errors.join(' ')).toMatch(/profil/);
    expect(v.errors.join(' ')).toMatch(/passé/);
    expect(v.errors.join(' ')).toMatch(/emblème/);
    expect(v.errors.join(' ')).toMatch(/point/);
  });

  it('accepte un brouillon complet et applique les bonus de profil', () => {
    expect(validateDraft(C, DRAFT).valid).toBe(true);
    const s = draftStats(C, DRAFT);
    // Base 1 + Guerrier (+2 Force, +1 Survie) + points répartis.
    expect(s).toEqual({ force: 5, discretion: 2, survie: 3, astuce: 3 });
  });

  it('respecte le budget de points et le plafond de création', () => {
    let d: CharacterDraft = { ...emptyDraft(), name: 'Zoé', profile: 'guerrier' as const, background: 'pompier' as const, emblem: 'cle' as const };
    for (let i = 0; i < 10; i += 1) d = adjustDraftStat(C, d, 'force', 1);
    expect(draftStats(C, d).force).toBe(CREATION_CAP);
    expect(canIncrement(C, d, 'force')).toBe(false);
    for (let i = 0; i < 10; i += 1) d = adjustDraftStat(C, d, 'astuce', 1);
    expect(remainingPoints(d)).toBe(0);
    expect(validateDraft(C, d).valid).toBe(true);
    // Retirer un point est toujours possible tant qu'il en reste.
    d = adjustDraftStat(C, d, 'astuce', -1);
    expect(remainingPoints(d)).toBe(1);
  });

  it('changer de profil retire les points qui dépasseraient le plafond', () => {
    let d: CharacterDraft = { ...emptyDraft(), profile: 'eclaireur' };
    for (let i = 0; i < 4; i += 1) d = adjustDraftStat(C, d, 'force', 1);
    expect(draftStats(C, d).force).toBe(5);
    d = setDraftProfile(C, d, 'guerrier');
    expect(draftStats(C, d).force).toBe(CREATION_CAP);
    expect(remainingPoints(d)).toBe(CREATION_POINTS - d.allocated.force);
  });

  it('refuse un nom trop court, trop long ou avec des caractères interdits', () => {
    expect(validateDraft(C, { ...DRAFT, name: 'A' }).valid).toBe(false);
    expect(validateDraft(C, { ...DRAFT, name: 'Un nom vraiment beaucoup trop long' }).valid).toBe(false);
    expect(validateDraft(C, { ...DRAFT, name: 'Zo<e>' }).valid).toBe(false);
    expect(validateDraft(C, { ...DRAFT, name: '  Zoé   Martin ' }).valid).toBe(true);
  });

  it('le moteur refuse de créer une partie avec un brouillon invalide', () => {
    expect(() => newGame(C, emptyDraft(), { seed: 1, id: 'x', now: 0 })).toThrow();
  });

  it('applique l’équipement et les objets de départ du profil et du passé', () => {
    const s = start({ profile: 'technicien', background: 'ambulancier', allocated: { force: 2, discretion: 1, survie: 1, astuce: 2 } });
    expect(s.equipment.melee).toBe('pied_de_biche');
    expect(s.equipment.ranged).toBe('cloueur');
    expect(s.inventory.outils).toBe(1);
    expect(s.inventory.trousse).toBe(1); // passé ambulancier
    expect(s.player.hp).toBe(maxHp(C, s));
  });

  it('le passé modifie réellement la santé et les relations', () => {
    const pompier = start({ background: 'pompier' });
    const cata = start({ background: 'cataphile' });
    expect(maxHp(C, pompier) - maxHp(C, cata)).toBe(7);
    const detenu = start({ background: 'detenu' });
    expect(detenu.relations.helene).toBe(-2);
  });
});

describe('progression', () => {
  it('monte de niveau et attribue points et compétences', () => {
    let s = start();
    const hpBefore = maxHp(C, s);
    s = grantXp(C, s, xpToNext(1));
    expect(s.player.level).toBe(2);
    expect(s.player.unspentStatPoints).toBe(1);
    expect(s.player.unspentPerks).toBe(1);
    expect(maxHp(C, s)).toBeGreaterThan(hpBefore);
    s = spendStatPoint(C, s, 'survie');
    expect(s.player.unspentStatPoints).toBe(0);
    s = choosePerk(C, s, 'sang_froid');
    expect(s.player.perks).toContain('sang_froid');
    // Pas de double compétence.
    const again = choosePerk(C, s, 'main_lourde');
    expect(again).toBe(s);
  });

  it('ne dépasse jamais le plafond absolu d’une caractéristique', () => {
    let s = start();
    s = { ...s, player: { ...s.player, unspentStatPoints: 10, stats: { ...s.player.stats, force: STAT_MAX } } };
    const after = spendStatPoint(C, s, 'force');
    expect(after.player.stats.force).toBe(STAT_MAX);
    expect(after.player.unspentStatPoints).toBe(10);
  });

  it('gère plusieurs niveaux d’un coup et plafonne au niveau maximal', () => {
    let s = start();
    s = grantXp(C, s, 100000);
    expect(s.player.level).toBe(6);
    expect(s.player.unspentPerks).toBe(3);
  });
});
