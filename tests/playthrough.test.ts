import { describe, expect, it } from 'vitest';
import { simulate, type Policy } from '../src/engine/simulate';
import { summarize } from '../src/engine/summary';
import { C, follow, start } from './helpers';

const POLICIES: Policy[] = ['prudent', 'agressif', 'discret', 'relationnel', 'aleatoire'];

describe('parcours automatiques complets', () => {
  it('aucun parcours ne se bloque, et chacun atteint une conclusion', () => {
    for (const policy of POLICIES) {
      for (let i = 0; i < 25; i += 1) {
        const r = simulate(C, policy, 500 + i * 131);
        expect(r.error, `${policy}#${i}: ${r.error} @ ${r.state.currentScene}`).toBeUndefined();
        expect(r.stuck, `${policy}#${i} bloqué @ ${r.state.currentScene}`).toBe(false);
        expect(r.ending).not.toBeNull();
      }
    }
  });

  it('toutes les fins sont atteignables avec le vrai moteur', () => {
    const reached = new Set<string>();
    for (const policy of POLICIES) {
      for (let i = 0; i < 200 && reached.size < Object.keys(C.endings).length; i += 1) {
        const r = simulate(C, policy, 9000 + i * 977);
        if (r.ending) reached.add(r.ending);
      }
    }
    const expected = Object.keys(C.endings).filter((e) => e !== 'mort');
    for (const e of expected) expect(reached, `fin ${e} jamais atteinte`).toContain(e);
  });

  it('les états de fin sont cohérents (PV, inventaire, compagnons)', () => {
    for (const policy of POLICIES) {
      const r = simulate(C, policy, 4242);
      const s = r.state;
      expect(s.player.hp).toBeGreaterThanOrEqual(0);
      for (const qty of Object.values(s.inventory)) expect(qty).toBeGreaterThan(0);
      for (const slot of Object.values(s.equipment)) if (slot) expect(s.inventory[slot]).toBeGreaterThan(0);
      if (s.ending?.kind === 'ending') expect(s.player.hp).toBeGreaterThan(0);
      const summary = summarize(C, s);
      expect(summary.ending).not.toBeNull();
      expect(summary.decisions).toBeGreaterThan(10);
    }
  });
});

describe('parcours scénarisés', () => {
  /** Préférences communes : soigner Théo, faire confiance, ne vendre personne. */
  const BASE: Record<string, string[]> = {
    c1_toit: ['noter'],
    c1_descente: ['dire'],
    c1_conseil: ['porte'],
    c1_kaz_porte: ['ouvrir'],
    c1_kaz_entre: ['dette', 'accepter'],
    c1_preparatifs: ['reserve', 'theo', 'partir'],
    c1_theo_chevet: ['partir'],
    c1_rue: ['hopital', 'rentrer'],
    c1_hopital: ['morgue', 'service', 'cuisines'],
    c1_hopital_morgue: ['monter'],
    c1_hopital_pharma: ['lire', 'partir'],
    c1_retour: ['donner', 'abandonner'],
    c1_nuit_theo: ['respecter'],
    c1_soir: ['monter'],
    c1_assaut: ['charger'],
    c1_apres: ['medocs'],
    c1_lettre: ['garder'],
    c1_fuite: ['partir'],
    c2_brasserie: ['malik'],
    c2_galerie: ['malik', 'puits'],
    c2_malik: ['ines'],
    c2_ossuaire_porte: ['soigner_maelle', 'entrer'],
    c2_ossuaire: ['helene', 'pompe', 'nuit', 'salle'],
    c2_pompe: ['reparer', 'bricoler'],
    c2_pompe_ko: ['reessayer'],
    c2_nuit: ['theo', 'lettre', 'dormir'],
    c2_aveu_theo: ['promettre'],
    c2_aveu_maelle: ['proteger'],
    c2_grande_salle: ['cloches', 'attaquer'],
    c2_sortie: ['garder'],
    c3_quai: ['cacher'],
    c3_planque: ['radio', 'grue', 'kaz', 'repos', 'nuit'],
    c3_radio: ['reparer', 'antenne'],
    c3_radio_ko: ['reessayer'],
    c3_radio_ok: ['appeler'],
    c3_kaz_aveu: ['pardonner'],
    c3_aube: ['infiltrer', 'infiltrer_aveugle'],
    c3_infiltration: ['cles'],
    c3_cages_ouvertes: ['nour'],
    c3_fuite_casse: ['pont'],
    c3_cage: ['forcer'],
    c4_halage: ['cloche', 'attendre'],
    c4_ecluse: ['observer', 'sorel'],
    c4_sorel: ['cassette', 'carnet', 'dossier', 'lettre', 'nour', 'theo', 'grille'],
    c4_sorel_bilan: ['grille'],
    c4_maree_accord: ['cloche', 'kaz', 'colosse'],
    c4_maree_force: ['cloche', 'kaz', 'colosse'],
    // La route : payer le Péage, contourner la Dame.
    r2_barriere: ['vivres', 'cartouches', 'jumelles', 'kaz', 'contourner'],
    r6_passe: ['ilots', 'piquets', 'canal', 'detour'],
  };

  it('un joueur orienté relations peut conclure l’Accord', () => {
    let reached = false;
    for (let seed = 1; seed <= 40 && !reached; seed += 1) {
      const s0 = start({ profile: 'technicien', background: 'ambulancier', allocated: { force: 2, discretion: 1, survie: 1, astuce: 2 } }, seed);
      const end = follow(s0, { ...BASE, c4_decision: ['accord', 'force'] });
      if (end.ending?.id === 'fin_accord') {
        reached = true;
        expect(end.quests.q_theo.status).toBe('completed');
        expect(end.companions.theo).toBe('companion');
        expect(end.relations.sorel).toBeGreaterThanOrEqual(4);
        expect(end.inventory.enregistrement).toBe(1);
      }
    }
    expect(reached).toBe(true);
  });

  it('vendre Théo mène au Prix du passage et pèse sur le récapitulatif', () => {
    let s = start({}, 3);
    s = follow(s, { ...BASE, c2_sortie: ['garder'], c3_aube: ['parlementer'], c3_gaspard: ['vendre'], c4_decision: ['plaque'] });
    expect(s.ending?.id).toBe('fin_prix');
    expect(s.flags.theo_vendu).toBe(true);
    const lines = summarize(C, s).lines.map((l) => l.text).join(' ');
    expect(lines).toMatch(/vendu Théo/);
  });

  it('laisser Kaz dehors en fait un Ferrailleur au chapitre 3', () => {
    let s = start({}, 5);
    s = follow(s, { ...BASE, c1_kaz_porte: ['refuser'], c3_quai: ['kaz'] }, 400);
    expect(s.flags.kaz_refuse).toBe(true);
    expect(s.visitedScenes).toContain('c3_kaz_ferrailleur');
  });

  it('confier Théo aux Veilleurs ouvre la fin des Racines', () => {
    let s = start({}, 8);
    s = follow(s, { ...BASE, c2_sortie: ['confier'], c4_decision: ['demitour'], c4_demitour: ['veilleurs'] });
    expect(s.flags.theo_veilleurs).toBe(true);
    expect(s.ending?.id).toBe('fin_racines');
  });
});
