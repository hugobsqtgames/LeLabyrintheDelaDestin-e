import { describe, expect, it } from 'vitest';
import { MESSAGES_EN } from '../src/content/en/messages';
import { applyEffects } from '../src/engine/effects';
import { MESSAGES_FR, msg } from '../src/engine/messages';
import { formatClock } from '../src/engine/rules';
import type { GameContent } from '../src/engine/types';
import { formatRemaining } from '../src/engine/util';
import { C, start } from './helpers';

function params(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

const EN: GameContent = { ...C, messages: MESSAGES_EN };

describe('messages du moteur', () => {
  it('la table anglaise a exactement les clés et paramètres de la table française', () => {
    expect(Object.keys(MESSAGES_EN).sort()).toEqual(Object.keys(MESSAGES_FR).sort());
    for (const [key, fr] of Object.entries(MESSAGES_FR)) {
      expect(params(MESSAGES_EN[key]), key).toEqual(params(fr));
    }
  });

  it('msg remplace les paramètres et se replie sur le français puis la clé', () => {
    expect(msg(C, 'notice.locationFound', { name: 'Quai' })).toBe('Lieu découvert : Quai');
    expect(msg(C, 'craft.missing', { list: '2 × Chiffons' })).toBe('Il manque : 2 × Chiffons.');
    expect(msg(EN, 'gain.hp', { n: 3 })).toBe('+3 HP');
    expect(msg({ ...C, messages: {} }, 'gain.hp', { n: 3 })).toBe('+3 PV');
    expect(msg(C, 'cle.inexistante')).toBe('cle.inexistante');
    expect(msg(C, 'gain.hp')).toBe('+{n} PV');
  });

  it('le moteur parle français avec CONTENT', () => {
    const s = applyEffects(C, { ...start(), notices: [], discovered: [] }, [{ type: 'discover', location: 'hopital' }]);
    expect(s.notices.at(-1)?.text).toBe(`Lieu découvert : ${C.locations.hopital.name}`);
    expect(formatClock(C, 23)).toBe('Jour 1 · 23 h · nuit');
    expect(formatRemaining(C, 30)).toBe('1 jour et 6 heures');
  });

  it('le moteur parle anglais avec les messages anglais', () => {
    const s = applyEffects(EN, { ...start(), notices: [], discovered: [] }, [{ type: 'discover', location: 'hopital' }]);
    expect(s.notices.at(-1)?.text).toBe(`Location discovered: ${C.locations.hopital.name}`);
    expect(formatClock(EN, 23)).toBe('Day 1 · 23:00 · night');
    expect(formatRemaining(EN, 49)).toBe('2 days and 1 hour');
  });
});
