import { describe, expect, it } from 'vitest';
import { CONTENT } from '../src/content';
import { contentFor, EN_DICTIONARY } from '../src/content/localized';
import { collectTexts } from '../src/content/translate';
import { MESSAGES_EN } from '../src/content/en/messages';
import { type Policy, simulate } from '../src/engine/simulate';
import { validateContent } from '../src/engine/validator';

describe('version anglaise', () => {
  it('chaque texte du contenu a une traduction, sans paramètre perdu', () => {
    const texts = collectTexts(CONTENT);
    const missing = texts.filter((t) => !(t in EN_DICTIONARY));
    expect(missing).toEqual([]);
    const params = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const t of texts) expect(params(EN_DICTIONARY[t]), t.slice(0, 60)).toBe(params(t));
  });

  it('le contenu anglais est valide et identique en structure', () => {
    const en = contentFor('en');
    expect(validateContent(en).filter((i) => i.level === 'error')).toEqual([]);
    expect(Object.keys(en.scenes)).toEqual(Object.keys(CONTENT.scenes));
    expect(en.scenes.c1_toit.title).not.toBe(CONTENT.scenes.c1_toit.title);
    expect(en.messages).toBe(MESSAGES_EN);
    expect(en.statLabels.force).toBe('Strength');
  });

  it('une partie complète se joue en anglais', () => {
    const en = contentFor('en');
    const policies: Policy[] = ['prudent', 'agressif', 'discret', 'relationnel', 'aleatoire'];
    for (let seed = 1; seed <= 8; seed += 1) {
      const r = simulate(en, policies[seed % policies.length], seed);
      expect(r.error).toBeUndefined();
      expect(r.stuck).toBe(false);
      expect(r.ending).toBeTruthy();
    }
  });
});
