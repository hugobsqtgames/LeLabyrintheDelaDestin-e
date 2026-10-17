/**
 * Validateur statique du contenu narratif.
 *
 * Détecte : destinations inexistantes, références inconnues (objets, quêtes,
 * personnages, lieux, ennemis), scènes inaccessibles, impasses (aucun choix
 * toujours disponible), conditions contradictoires ou impossibles, drapeaux
 * lus mais jamais posés, fins impossibles à atteindre.
 */
import { EFFECTIVE_STAT_MAX } from './rules';
import type { Condition, Effect, GameContent, Scene } from './types';
import { RELATION_MAX, RELATION_MIN } from './effects';
import { RELAY_FLAGS } from './relay';

export interface ValidationIssue {
  level: 'error' | 'warning';
  scene?: string;
  message: string;
}

function walkConditions(c: Condition, fn: (c: Condition) => void): void {
  fn(c);
  if (c.type === 'all' || c.type === 'any') c.conditions.forEach((sub) => walkConditions(sub, fn));
  if (c.type === 'not') walkConditions(c.condition, fn);
}

function sceneTargets(scene: Scene): string[] {
  const targets: string[] = [];
  for (const ch of scene.choices) {
    if (ch.next) targets.push(ch.next);
    if (ch.check) targets.push(ch.check.success, ch.check.failure);
  }
  for (const r of scene.routes ?? []) targets.push(r.to);
  if (scene.encounter) {
    targets.push(scene.encounter.victory, scene.encounter.defeat);
    if (scene.encounter.flee) targets.push(scene.encounter.flee);
  }
  return targets;
}

function flattenEffects(effects: Effect[] | undefined, out: Effect[]): Effect[] {
  for (const e of effects ?? []) {
    out.push(e);
    if (e.type === 'if') {
      flattenEffects(e.then, out);
      flattenEffects(e.else, out);
    }
  }
  return out;
}

function sceneEffects(scene: Scene): Effect[] {
  const list: Effect[] = [];
  flattenEffects(scene.onEnter, list);
  for (const ch of scene.choices) {
    flattenEffects(ch.effects, list);
    flattenEffects(ch.check?.successEffects, list);
    flattenEffects(ch.check?.failureEffects, list);
  }
  return list;
}

function sceneConditions(scene: Scene): Condition[] {
  const list: Condition[] = [];
  for (const e of sceneEffects(scene)) if (e.type === 'if') list.push(e.cond);
  for (const r of scene.routes ?? []) list.push(r.if);
  for (const b of scene.text) if (b.if) list.push(b.if);
  for (const ch of scene.choices) list.push(...(ch.requires ?? []), ...(ch.visibleIf ?? []));
  return list;
}

/** Une liste de conditions conjointes est-elle manifestement contradictoire ? */
function contradictions(conds: Condition[]): string[] {
  const out: string[] = [];
  const flat: Condition[] = [];
  conds.forEach((c) => {
    if (c.type === 'all') flat.push(...c.conditions);
    else flat.push(c);
  });
  const flags = new Set(flat.filter((c) => c.type === 'flag').map((c) => (c as { flag: string }).flag));
  for (const c of flat) {
    if (c.type === 'notFlag' && flags.has(c.flag)) out.push(`drapeau « ${c.flag} » exigé à la fois présent et absent`);
    if (c.type === 'stat' && c.min > EFFECTIVE_STAT_MAX) out.push(`caractéristique ${c.stat} ${c.min} impossible`);
    if (c.type === 'relation' && ((c.min ?? RELATION_MIN) > RELATION_MAX || (c.max ?? RELATION_MAX) < RELATION_MIN || (c.min !== undefined && c.max !== undefined && c.min > c.max)))
      out.push(`relation ${c.character} impossible`);
    if (c.type === 'counter' && c.min !== undefined && c.max !== undefined && c.min > c.max) out.push(`compteur ${c.counter} impossible`);
  }
  const profiles = flat.filter((c) => c.type === 'profile') as { profiles: string[] }[];
  if (profiles.length > 1) {
    const inter = profiles.reduce((acc, p) => acc.filter((x) => p.profiles.includes(x)), profiles[0].profiles);
    if (inter.length === 0) out.push('profils exigés incompatibles');
  }
  return out;
}

export function validateContent(content: GameContent): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const err = (message: string, scene?: string) => issues.push({ level: 'error', message, scene });
  const warn = (message: string, scene?: string) => issues.push({ level: 'warning', message, scene });

  if (!content.scenes[content.startScene]) err(`Scène de départ inconnue : ${content.startScene}`);
  for (const ch of content.chapters) {
    if (!content.scenes[ch.start]) err(`Chapitre ${ch.id} : scène de départ inconnue ${ch.start}`);
  }

  for (const [a, b] of content.mapLinks) {
    const la = content.locations[a];
    const lb = content.locations[b];
    if (!la || !lb) err(`Carte : lien vers un lieu inconnu (${a} – ${b})`);
    else if (la.region !== lb.region) err(`Carte : ${a} et ${b} ne sont pas dans la même région`);
  }
  for (const l of Object.values(content.locations)) {
    if (!content.regions.includes(l.region)) err(`Lieu ${l.id} : région inconnue ${l.region}`);
  }

  // Drapeaux posés par le moteur lui-même (relève).
  const setFlags = new Set<string>(RELAY_FLAGS);
  const readFlags = new Map<string, string>();
  const counters = new Set<string>();

  for (const scene of Object.values(content.scenes)) {
    const sid = scene.id;
    if (!content.chapters.some((c) => c.id === scene.chapter)) err(`chapitre inconnu ${scene.chapter}`, sid);
    if (!content.locations[scene.location]) err(`lieu inconnu ${scene.location}`, sid);
    if (!scene.text.length) err('scène sans texte', sid);

    // Destinations.
    for (const t of sceneTargets(scene)) if (!content.scenes[t]) err(`destination inexistante « ${t} »`, sid);

    // Identifiants de choix uniques.
    const ids = new Set<string>();
    for (const ch of scene.choices) {
      if (ids.has(ch.id)) err(`identifiant de choix dupliqué « ${ch.id} »`, sid);
      ids.add(ch.id);
      if (!ch.text.trim()) err(`choix « ${ch.id} » sans texte`, sid);
      if (ch.next && ch.check) err(`choix « ${ch.id} » avec destination et jet à la fois`, sid);
      for (const msg of contradictions([...(ch.requires ?? []), ...(ch.visibleIf ?? [])])) err(`choix « ${ch.id} » : ${msg}`, sid);
      if (!ch.next && !ch.check && !ch.once) warn(`choix « ${ch.id} » sans destination ni usage unique (boucle sur place)`, sid);
    }

    // Choix chronométrés : le repli doit exister et être toujours disponible.
    if (scene.timed) {
      const fb = scene.choices.find((c) => c.id === scene.timed!.fallback);
      if (!fb) err(`choix de repli « ${scene.timed.fallback} » introuvable`, sid);
      else if (fb.requires?.length || fb.visibleIf?.length || fb.once) err(`le choix de repli « ${fb.id} » doit être toujours disponible`, sid);
      if (scene.timed.seconds < 5) err('délai de choix chronométré trop court (minimum 5 s)', sid);
    }

    // Types de scènes.
    if (scene.kind === 'ending' || scene.kind === 'death') {
      if (!scene.ending || !content.endings[scene.ending]) err('fin sans identifiant de fin valide', sid);
      if (scene.choices.length) err('une scène de fin ne doit pas proposer de choix', sid);
    } else if (scene.kind === 'combat') {
      if (!scene.encounter) err('scène de combat sans rencontre', sid);
      else {
        for (const e of scene.encounter.enemies) if (!content.enemies[e]) err(`ennemi inconnu ${e}`, sid);
        if (scene.encounter.canFlee && !scene.encounter.flee) warn('fuite autorisée sans scène de fuite (défaite utilisée)', sid);
      }
    } else {
      // Anti-impasse : au moins un choix toujours disponible et répétable.
      const fallback = scene.choices.some((c) => !c.requires?.length && !c.visibleIf?.length && !c.once && (c.next || c.check));
      if (!fallback) err('impasse possible : aucun choix sans condition', sid);
    }

    // Références des effets.
    for (const e of sceneEffects(scene)) {
      if ((e.type === 'giveItem' || e.type === 'takeItem') && !content.items[e.item]) err(`objet inconnu ${e.item}`, sid);
      if ((e.type === 'relation' || e.type === 'companion') && !content.characters[e.character]) err(`personnage inconnu ${e.character}`, sid);
      if (e.type === 'quest') {
        const q = content.quests[e.quest];
        if (!q) err(`quête inconnue ${e.quest}`, sid);
        else if (e.step && !q.steps.some((st) => st.id === e.step)) err(`étape « ${e.step} » inconnue pour ${e.quest}`, sid);
      }
      if ((e.type === 'discover' || e.type === 'world') && !content.locations[e.location]) err(`lieu inconnu ${e.location}`, sid);
      if (e.type === 'world' && !content.locations[e.location]?.changes?.[e.change]) err(`changement « ${e.change} » non décrit pour ${e.location}`, sid);
      if ((e.type === 'chapter' || e.type === 'diary') && !content.chapters.some((c) => c.id === e.chapter)) err(`chapitre inconnu ${e.chapter}`, sid);
      if (e.type === 'document' && !content.documents[e.doc]) err(`document inconnu ${e.doc}`, sid);
      if (e.type === 'repair' && e.item && !content.items[e.item]?.durability) err(`réparation d’un objet sans solidité ${e.item}`, sid);
      if (e.type === 'setFlag') setFlags.add(e.flag);
      if (e.type === 'addCounter') counters.add(e.counter);
    }
    // Références des conditions.
    for (const cond of sceneConditions(scene)) {
      walkConditions(cond, (c) => {
        if (c.type === 'item' && !content.items[c.item]) err(`condition : objet inconnu ${c.item}`, sid);
        if ((c.type === 'relation' || c.type === 'companion') && !content.characters[c.character]) err(`condition : personnage inconnu ${c.character}`, sid);
        if (c.type === 'quest' && !content.quests[c.quest]) err(`condition : quête inconnue ${c.quest}`, sid);
        if (c.type === 'questStep') {
          const q = content.quests[c.quest];
          if (!q || !q.steps.some((st) => st.id === c.step)) err(`condition : étape inconnue ${c.quest}/${c.step}`, sid);
        }
        if (c.type === 'visited' && !content.scenes[c.scene]) err(`condition : scène inconnue ${c.scene}`, sid);
        if (c.type === 'document' && !content.documents[c.doc]) err(`condition : document inconnu ${c.doc}`, sid);
        if (c.type === 'flag' && !readFlags.has(c.flag)) readFlags.set(c.flag, sid);
      });
    }
  }
  for (const rule of content.diaryRules) {
    if (!content.chapters.some((c) => c.id === rule.chapter)) err(`journal : chapitre inconnu ${rule.chapter}`);
    if (rule.if)
      walkConditions(rule.if, (c) => {
        if (c.type === 'flag' && !readFlags.has(c.flag)) readFlags.set(c.flag, 'journal');
      });
  }
  for (const r of Object.values(content.recipes)) {
    for (const id of Object.keys(r.inputs)) if (!content.items[id]) err(`recette ${r.id} : objet inconnu ${id}`);
    if (r.output && !content.items[r.output.item]) err(`recette ${r.id} : produit inconnu ${r.output.item}`);
    if (!r.output && !r.repair) err(`recette ${r.id} : ne produit rien`);
  }
  for (const rule of content.summaryRules) {
    walkConditions(rule.if, (c) => {
      if (c.type === 'flag' && !readFlags.has(c.flag)) readFlags.set(c.flag, 'résumé');
    });
  }
  for (const [flag, where] of readFlags) {
    if (!setFlags.has(flag)) err(`drapeau « ${flag} » testé mais jamais posé (condition impossible)`, where);
  }

  // Accessibilité (graphe sans conditions).
  const reachable = new Set<string>();
  const stack = [content.startScene];
  while (stack.length) {
    const id = stack.pop()!;
    if (reachable.has(id) || !content.scenes[id]) continue;
    reachable.add(id);
    stack.push(...sceneTargets(content.scenes[id]));
  }
  for (const id of Object.keys(content.scenes)) {
    if (!reachable.has(id)) err('scène inaccessible depuis le début', id);
  }
  // Fins atteignables.
  for (const ending of Object.values(content.endings)) {
    if (ending.id === 'mort') continue; // Mort générique : déclenchée par les dégâts.
    const has = Object.values(content.scenes).some((s) => s.ending === ending.id && reachable.has(s.id));
    if (!has) err(`fin « ${ending.id} » impossible à atteindre`);
  }
  // Données diverses.
  for (const item of Object.values(content.items)) {
    if (item.ammo && !content.items[item.ammo]) err(`objet ${item.id} : munition inconnue ${item.ammo}`);
    if (item.slot && !['melee', 'ranged', 'armor', 'accessory'].includes(item.slot)) err(`objet ${item.id} : emplacement invalide`);
    if ((item.category === 'melee' || item.category === 'ranged') && !item.damage) err(`arme ${item.id} sans dégâts`);
  }
  for (const enemy of Object.values(content.enemies)) {
    if (!enemy.moves.length) err(`ennemi ${enemy.id} sans attaque`);
    for (const m of [...enemy.moves, ...(enemy.phases ?? []).flatMap((p) => p.moves)]) {
      if (m.summon && !content.enemies[m.summon]) err(`ennemi ${enemy.id} : invocation inconnue ${m.summon}`);
    }
  }
  return issues;
}
