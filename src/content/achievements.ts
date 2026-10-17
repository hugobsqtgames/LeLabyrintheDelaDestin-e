/**
 * Succès : débloqués uniquement par ce qui arrive vraiment en partie
 * (hors ligne, rien n'est envoyé nulle part).
 */
import type { AchievementDef } from '../engine/meta';

const ended = (id?: string) => (c: { game: { ending: { id: string; kind: string } | null } }) =>
  !!c.game.ending && c.game.ending.kind === 'ending' && (!id || c.game.ending.id === id);

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'premiere_fin', title: 'Au bout du chemin', description: 'Atteindre une fin, quelle qu’elle soit.', check: ended() },
  { id: 'accord', title: 'L’Accord', description: 'Faire embarquer tout le groupe sans livrer personne.', check: ended('fin_accord') },
  { id: 'capitaines', title: 'Changement de capitaine', description: 'Prendre la Destinée par la force.', check: ended('fin_capitaines') },
  { id: 'racines', title: 'Les Racines', description: 'Tourner le dos à la barge.', check: ended('fin_racines') },
  { id: 'gardien', title: 'Quelqu’un devait tenir la vanne', description: 'Rester à la manivelle de l’écluse.', check: ended('fin_gardien') },
  {
    id: 'toutes_fins',
    title: 'Toutes les routes',
    description: 'Voir les six fins.',
    check: ({ meta, content }) => Object.values(content.endings).filter((e) => e.kind === 'ending').every((e) => meta.endings.includes(e.id)),
  },
  {
    id: 'personne',
    title: 'Personne ne reste derrière',
    description: 'Finir sans qu’aucun compagnon ne meure, et sans relève.',
    check: (c) => ended()(c) && c.game.fallen.length === 0 && !Object.values(c.game.companions).includes('dead'),
  },
  { id: 'releve', title: 'Quelqu’un d’autre', description: 'Finir le voyage avec un compagnon qui a repris la route.', check: (c) => ended()(c) && c.game.fallen.length > 0 },
  { id: 'deux_releves', title: 'Le dernier debout', description: 'Finir après deux relèves.', secret: true, check: (c) => ended()(c) && c.game.fallen.length >= 2 },
  { id: 'a_l_heure', title: 'À l’heure', description: 'Arriver à l’écluse avant l’aube du septième jour.', check: (c) => c.game.visitedScenes.includes('c4_ecluse') && !c.game.flags.en_retard },
  { id: 'cages', title: 'Les cages vides', description: 'Ouvrir les cages de la casse Lenoir et celles du gué de la Sauldre.', check: (c) => !!c.game.flags.prisonniers_liberes && !!c.game.flags.captifs_liberes },
  { id: 'berger', title: 'Le troupeau sans berger', description: 'Abattre le Berger.', check: (c) => !!c.game.flags.berger_tue },
  { id: 'peage', title: 'Passage libre', description: 'Abattre le Péage.', check: (c) => !!c.game.flags.peage_vaincu },
  { id: 'dame', title: 'Le marais se tait', description: 'Abattre la Dame des tourbières.', check: (c) => !!c.game.flags.dame_tuee },
  { id: 'courant', title: 'La lumière de Vaulx', description: 'Rendre le courant au barrage.', check: (c) => !!c.game.flags.courant_retabli },
  { id: 'theo', title: 'Le garçon des cartes', description: 'Ouvrir la cage de Théo au gué.', secret: true, check: (c) => !!c.game.flags.theo_libere },
  { id: 'delmas', title: 'Les naufragés du verger', description: 'Descendre Claire et Jules de leur toit.', check: (c) => !!c.game.flags.delmas_sauves },
  { id: 'archiviste', title: 'Archiviste', description: 'Réunir vingt documents d’archives dans une même partie.', check: (c) => c.game.documents.length >= 20 },
  {
    id: 'compagnons',
    title: 'Ceux qui marchent avec vous',
    description: 'Rencontrer les cinq compagnons possibles.',
    check: ({ meta }) => ['maelle', 'theo', 'kaz', 'ines', 'nour'].every((id) => meta.met.includes(id)),
  },
  {
    id: 'codex',
    title: 'Bestiaire',
    description: 'Croiser toutes les sortes de Muets et de pillards.',
    check: ({ meta, content }) => Object.keys(content.enemies).every((id) => meta.enemies.includes(id)),
  },
  {
    id: 'quinze',
    title: 'Sept jours, quinze chapitres',
    description: 'Atteindre le quinzième chapitre.',
    check: ({ meta, content }) => content.chapters.every((ch) => meta.chapters.includes(ch.id)),
  },
];
