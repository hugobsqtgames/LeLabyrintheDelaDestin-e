/**
 * Politique de confidentialité : les pages publiées correspondent au texte du
 * jeu, et l'application reste fidèle à ce qu'elle promet (aucune connexion,
 * aucun SDK de suivi), sans quoi la déclaration App Store « Aucune donnée
 * collectée » deviendrait fausse.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { legalPages } from '../scripts/legal-pages';
import { CONTACT_EMAIL, PRIVACY, PRIVACY_URL, SUPPORT_URL } from '../src/legal/privacy';

const ROOT = join(__dirname, '..');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

describe('politique de confidentialité', () => {
  it('les pages de docs/ sont à jour (npm run legal)', () => {
    for (const [file, text] of Object.entries(legalPages())) {
      expect(readFileSync(join(ROOT, 'docs', file), 'utf8'), `docs/${file} à régénérer : npm run legal`).toBe(text);
    }
  });

  it('français et anglais ont la même structure et les mêmes coordonnées', () => {
    expect(PRIVACY.fr.sections.length).toBe(PRIVACY.en.sections.length);
    PRIVACY.fr.sections.forEach((s, i) => expect(s.paragraphs.length).toBe(PRIVACY.en.sections[i].paragraphs.length));
    for (const doc of [PRIVACY.fr, PRIVACY.en]) expect(doc.sections.map((s) => s.paragraphs.join(' ')).join(' ')).toContain(CONTACT_EMAIL);
    expect(PRIVACY_URL.fr).toMatch(/^https:\/\/.+\.html$/);
    expect(PRIVACY_URL.en).toMatch(/^https:\/\/.+\.html$/);
    expect(SUPPORT_URL).toMatch(/^https:\/\//);
  });

  it('les pages web ne chargent aucune ressource externe', () => {
    for (const [file, text] of Object.entries(legalPages())) {
      expect(text, file).not.toMatch(/<script|<link|<img|@import|url\(/i);
    }
  });

  it('le code du jeu ne se connecte à rien (sinon : mettre à jour la politique et la déclaration App Store)', () => {
    const offenders = files(join(ROOT, 'src'))
      .filter((f) => !f.includes(`${join('src', 'content')}`))
      .filter((f) => /\bfetch\(|XMLHttpRequest|WebSocket|getExpoPushTokenAsync|getDevicePushTokenAsync|EventSource/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('aucune dépendance de suivi, de publicité, d’analyse ou de mise à jour en ligne', () => {
    const deps = Object.keys(JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).dependencies);
    const forbidden = deps.filter((d) => /analytics|sentry|bugsnag|crashlytics|firebase|amplitude|mixpanel|segment|appsflyer|adjust|admob|ads|tracking|facebook|expo-updates|expo-device|expo-application|expo-network/i.test(d));
    expect(forbidden).toEqual([]);
  });
});
