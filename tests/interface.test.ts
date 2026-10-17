import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { trackFor } from '../src/audio/tracks';
import { checkBreakdown } from '../src/engine/character';
import { addItem, compareWithEquipped } from '../src/engine/inventory';
import { enterScene } from '../src/engine/narrative';
import { recap } from '../src/engine/summary';
import { EN } from '../src/i18n/en';
import { FR } from '../src/i18n/fr';
import { colors, SOLID_BACKGROUNDS } from '../src/ui/tokens';
import { C, pick, start } from './helpers';

// ---------------------------------------------------------------------------
// Contraste des couleurs (WCAG 2.x)
// ---------------------------------------------------------------------------

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

describe('contraste des couleurs', () => {
  it('texte courant et secondaire : au moins 4,5:1 sur toutes les surfaces', () => {
    for (const bg of SOLID_BACKGROUNDS) {
      for (const fg of [colors.text, colors.textDim, colors.textFaint]) {
        expect(contrast(fg, bg), `${fg} sur ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('couleurs d’état utilisées comme texte : au moins 4,5:1 sur le fond', () => {
    for (const fg of [colors.rust, colors.rustBright, colors.mossBright, colors.amber, colors.blood, colors.ice, colors.violet, colors.steel]) {
      expect(contrast(fg, colors.bg), fg).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('boutons pleins et papier lisibles', () => {
    expect(contrast(colors.bg, colors.text)).toBeGreaterThanOrEqual(7);
    expect(contrast('#1A0904', colors.rust)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.paperInk, colors.paper)).toBeGreaterThanOrEqual(7);
  });
});

// ---------------------------------------------------------------------------
// Traductions de l'interface
// ---------------------------------------------------------------------------

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sources(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
}

describe('traductions', () => {
  it('le français et l’anglais ont exactement les mêmes clés et paramètres', () => {
    expect(Object.keys(EN).sort()).toEqual(Object.keys(FR).sort());
    const params = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const k of Object.keys(FR)) expect(params(EN[k]), k).toEqual(params(FR[k]));
  });

  it('chaque clé utilisée dans le code existe', () => {
    const used = new Set<string>();
    for (const file of sources(join(__dirname, '..', 'src'))) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/\bt\('([a-zA-Z0-9_.-]+)'/g)) used.add(m[1]);
      for (const m of text.matchAll(/key: '([a-z]+\.[a-zA-Z0-9_.]+)'/g)) used.add(m[1]);
    }
    const missing = [...used].filter((k) => !(k in FR));
    expect(missing).toEqual([]);
  });

  it('les clés dynamiques couvrent toutes les valeurs du moteur', () => {
    const need = [
      ...['melee', 'ranged', 'ammo', 'consumable', 'armor', 'accessory', 'tool', 'material', 'quest'].map((c) => `cat.${c}`),
      ...['melee', 'ranged', 'armor', 'accessory'].map((s) => `slot.${s}`),
      ...['unknown', 'met', 'companion', 'away', 'captured', 'dead'].map((s) => `status.${s}`),
      ...['inactive', 'active', 'completed', 'failed'].map((s) => `quest.${s}`),
      ...['ongoing', 'victory', 'defeat', 'fled'].map((s) => `combat.${s}`),
      ...Object.values(C.items).map((i) => `rarity.${i.rarity}`),
      'danger.1',
      'danger.2',
      'danger.3',
    ];
    expect(need.filter((k) => !(k in FR))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Logique des écrans
// ---------------------------------------------------------------------------

describe('ambiance sonore', () => {
  const regionOf = (id: string) => C.locations[C.scenes[id]?.location]?.region;
  const locationOf = (id: string) => C.scenes[id]?.location;
  it('suit la région, le combat et la fin', () => {
    const s = start();
    expect(trackFor({ route: 'title', game: null }, C.regions, regionOf)).toBe('ville');
    expect(trackFor({ route: 'game', game: s }, C.regions, regionOf)).toBe('ville');
    expect(trackFor({ route: 'game', game: enterScene(C, s, 'c2_ossuaire') }, C.regions, regionOf)).toBe('carrieres');
    expect(trackFor({ route: 'game', game: enterScene(C, s, 'c1_super_combat') }, C.regions, regionOf)).toBe('combat');
    expect(trackFor({ route: 'gallery', game: s }, C.regions, regionOf)).toBeNull();
  });
  it('donne aux lieux marquants leur propre ambiance', () => {
    const s = start();
    const at = (scene: string) => trackFor({ route: 'game', game: enterScene(C, s, scene) }, C.regions, regionOf, locationOf);
    expect(at('fb_sortie')).toBe('faubourgs');
    expect(at('fb_triage')).toBe('faubourgs');
    expect(at('fb_remblai')).toBe('faubourgs');
    expect(at('r6_digue')).toBe('marais');
    expect(at('r4_couronnement')).toBe('barrage');
    expect(at('c2_ossuaire')).toBe('carrieres');
    expect(trackFor({ route: 'game', game: s }, C.regions, regionOf, locationOf)).toBe('ville');
  });
});

describe('résumé de reprise', () => {
  it('donne lieu, objectif et derniers faits', () => {
    let s = start();
    for (const c of ['noter', 'dire']) s = pick(s, c);
    const r = recap(C, s);
    expect(r.chapter?.number).toBe(1);
    expect(r.sceneTitle).toBeTruthy();
    expect(r.objective).toBeTruthy();
    expect(r.recent.length).toBeGreaterThan(0);
  });
});

describe('comparaison d’équipement', () => {
  it('compare une arme à celle portée', () => {
    const s = addItem(C, start({ profile: 'guerrier' }), 'machette', 1, false).state;
    const cmp = compareWithEquipped(C, s, 'machette')!;
    expect(cmp.equipped).toBe(s.equipment.melee);
    expect(cmp.rows.find((r) => r.key === 'damage')).toBeDefined();
    expect(compareWithEquipped(C, s, s.equipment.melee!)).toBeNull();
  });
});

describe('détail des jets', () => {
  it('le total correspond au bonus utilisé par le moteur', () => {
    const s = start();
    for (const stat of ['force', 'discretion', 'survie', 'astuce'] as const) {
      const b = checkBreakdown(C, s, stat);
      expect(b.total).toBe(b.base + b.equipment + b.cap + b.perk + b.background);
    }
  });
});
