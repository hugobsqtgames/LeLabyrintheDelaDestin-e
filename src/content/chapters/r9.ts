/**
 * Chapitre r9 — Le Gué (« La livraison »)
 * Le gué de la Sauldre : la benne embourbée des Ferrailleurs, les cages, et
 * pour la première fois les hommes de la barge venus réceptionner la livraison.
 * Si Théo est en cage, c’est ici qu’on peut le reprendre.
 */
import type { DiaryRule, DocumentDef, Scene } from '../../engine/types';
import {
  all,
  any,
  background,
  companion,
  companionIs,
  diary,
  doc,
  flag,
  give,
  has,
  hurt,
  journal,
  lacks,
  meal,
  not,
  notFlag,
  notWithUs,
  p,
  rel,
  say,
  set,
  take,
  when,
  withUs,
  xp,
} from '../helpers';

const C = 'r9';
const THEO_CAGE = companionIs('theo', 'captured');
const SANS_PERSONNE = all(notWithUs('maelle'), notWithUs('theo'), notWithUs('kaz'), notWithUs('ines'), notWithUs('nour'));
const AVEC_QUELQU_UN = not(SANS_PERSONNE);
const OBSERVE = any(flag('r9_observe'), flag('r8_camion_observe'));
const TIREUR = any(withUs('ines'), has('fusil'), has('arbalete'));
const ARME_DE_TIR = any(withUs('ines'), has('fusil'), has('arbalete'), has('arbalete_poing'), has('pistolet'));
const KAZ_HEROS = companionIs('kaz', 'hero');
const MAELLE_HEROS = companionIs('maelle', 'hero');
const INES_HEROS = companionIs('ines', 'hero');
const HEROS = any(KAZ_HEROS, MAELLE_HEROS, INES_HEROS);

export const chapterR9: Scene[] = [
  // -------------------------------------------------------------------------
  // La rive
  // -------------------------------------------------------------------------
  {
    id: 'r9_rive',
    chapter: C,
    location: 'gue',
    title: 'Le pont couché',
    kind: 'story',
    checkpoint: true,
    illustration: 'gue',
    text: [
      p('Le pont routier de la Sauldre s’est couché dans la rivière d’un seul bloc, comme une bête qui s’agenouille. Le tablier plonge dans l’eau verte et ressort plus loin en tronçons, hérissé de fers à béton. À côté, il reste le gué d’avant les ponts : une rangée de grandes pierres plates, posées là par des gens qui n’avaient ni pont ni impatience.'),
      p('Au milieu du gué, la benne des Ferrailleurs s’est enfoncée jusqu’aux moyeux. Ridelles soudées, bâche de chantier, cambouis partout. Sous la bâche relevée par le vent, des barreaux.'),
      p('Sur la rive d’en face attend un 4×4 blanc. Sur la portière, une hélice d’ADN couronnée : le sigle de l’Institut Ferrand. Deux hommes en combinaison grise déroulent le câble d’un treuil vers la benne, sans hâte. Pour la première fois, vous voyez les hommes de la barge.'),
      p('Le même dessin que sur la plaque de Gaspard. Elle pèse dans votre poche plus lourd que tout le reste du sac.', flag('passage_gaspard')),
      p('Vous savez ce que transporte cette benne. Vous le savez depuis le Pont de Fer. Chaque fois que la bâche se soulève, vous cherchez une épaule maigre, une couverture militaire. Vous ne la voyez pas. Vous savez qu’elle est là.', THEO_CAGE),
      say('kaz', '« Cette benne-là, je l’ai réparée deux fois. Le pont arrière ne tient que par l’habitude. » Il plisse les yeux. « Et les gris ont un treuil de quatre tonnes. Ils sont venus préparés. »', withUs('kaz')),
      p('Plus haut sur la berge, Gaspard Lenoir est descendu de sa borne. Il s’est assis sur la dernière pile du pont, les jambes au-dessus du vide, et il regarde la benne comme on regarde brûler sa maison.', flag('gaspard_epargne')),
    ],
    choices: [
      {
        id: 'jumelles',
        text: 'Prendre le temps d’observer le gué aux jumelles.',
        kind: 'explore', time: 0.5,
        requires: [has('jumelles')],
        visibleIf: [notFlag('r8_camion_observe')],
        next: 'r9_jumelles',
      },
      {
        id: 'gaspard',
        text: 'Rejoindre Gaspard sur sa pile de pont.',
        kind: 'talk', time: 0.5,
        visibleIf: [flag('gaspard_epargne')],
        next: 'r9_gaspard',
      },
      { id: 'descendre', text: 'Se glisser sous les saules, au plus près du gué.', kind: 'stealth', time: 0.5, next: 'r9_saules' },
    ],
  },
  {
    id: 'r9_jumelles',
    chapter: C,
    location: 'gue',
    title: 'Dans les jumelles',
    kind: 'story',
    text: [
      p('Dans les jumelles, le gué devient net, presque intime.'),
      p('Deux Ferrailleurs. Le maigre, dans l’eau jusqu’aux cuisses, creuse sous une roue avec une pelle et jure chaque fois que le courant lui prend les jambes. L’autre, un gros en salopette, est assis sur la ridelle, une gamelle sur les genoux, un fusil à côté, et un trousseau de clés pendu à la ceinture. Il mange. Bientôt, il dormira.'),
      p('Les deux hommes de l’Institut sont d’une autre espèce. Gants, masques filtrants rabattus sur la poitrine, fusils courts et propres. L’un porte des galons et une radio au gilet. L’autre, très jeune, accroche le crochet du treuil au pare-chocs avec des gestes appris par cœur. Ils ne parlent pas aux Ferrailleurs. Ils ne les regardent pas.'),
      p('Sur le plateau, quatre cages à chien. Dans la première, une femme d’une quarantaine d’années, les genoux contre la poitrine. Dans les deux suivantes, un garçon et une fillette qui se tiennent la main à travers les barreaux.'),
      p('Dans la dernière, un garçon maigre sous une couverture militaire. Il ne dort pas. Il gratte quelque chose sur le plancher avec un clou. Puis il lève la tête, droit vers le coteau, droit vers le reflet de vos lentilles. Théo. Il vous voit. Il ne fait aucun signe. Il vous regarde, c’est tout, comme il vous a regardé à la casse.', THEO_CAGE),
      p('La quatrième cage est vide. Elle attend quelqu’un.', not(THEO_CAGE)),
      p('Vous notez le reste. Quand le treuil tirera, tout le monde regardera le câble. Le gros lâchera son fusil pour pousser. Une minute, peut-être deux.'),
    ],
    onEnter: [set('r9_observe'), xp(10)],
    choices: [{ id: 'descendre', text: 'Descendre sous les saules.', kind: 'stealth', time: 0.5, next: 'r9_saules' }],
  },
  {
    id: 'r9_gaspard',
    chapter: C,
    location: 'gue',
    title: 'La pile du pont',
    kind: 'story',
    optional: true,
    text: [
      p('Gaspard ne se retourne pas. Il a entendu vos pas sur les gravats depuis longtemps.'),
      say('gaspard', '« Le Bègue et Momo. » Il crache dans la Sauldre. « Je les ai ramassés gamins sur le parking d’un supermarché. Je leur ai appris à démonter un moteur. Je leur ai aussi appris ça. »', notFlag('r8_gaspard_parle')),
      say('gaspard', '« Tu vois, la marchandise et l’acheteur sont arrivés. Il ne manque que la morale. » Il a un rire sans joie.', flag('r8_gaspard_parle')),
      say('gaspard', '« Je descends leur parler. Ils m’écouteront peut-être, une dernière fois. Les gris, par contre, ils n’écoutent personne. Il faudra que tu sois là quand ça tournera mal. »'),
      say('gaspard', '« Pourquoi je fais ça ? » Il se lève, lourdement. « Parce qu’on m’a laissé debout, à la casse. Et parce que je n’aime pas qu’on me roule. Ces gens-là roulent tout le monde. »'),
      say('kaz', '« Il ment souvent, dit Kaz à voix basse. Pas sur ce genre de choses. »', withUs('kaz')),
    ],
    choices: [
      {
        id: 'accepter',
        text: 'Le laisser descendre dans le gué, et vous tenir prêts.',
        kind: 'negotiate', time: 1,
        effects: [set('r9_gaspard_aide'), journal('Au gué de la Sauldre, Gaspard Lenoir est descendu parler à ses anciens hommes.')],
        next: 'r9_retournement',
      },
      { id: 'refuser', text: 'Lui dire de rester là. Vous ne confiez pas des enfants à Gaspard Lenoir.', kind: 'talk', next: 'r9_saules' },
    ],
  },

  // -------------------------------------------------------------------------
  // Sous les saules
  // -------------------------------------------------------------------------
  {
    id: 'r9_saules',
    chapter: C,
    location: 'gue',
    title: 'Sous les saules',
    kind: 'story',
    checkpoint: true,
    text: [
      p('Les saules descendent jusque dans l’eau. À quarante mètres de la benne, on entend tout : le moteur du 4×4 au ralenti, la pelle qui racle les galets, une cuillère contre une gamelle, et la rivière, partout, qui parle plus fort que les hommes.'),
      p('Le jeune soldat a fini d’accrocher le câble. Le sergent regarde sa montre. Ils ont un horaire, et une barge au bout de l’horaire.'),
      p('Gaspard l’a dit : le Bègue a peur de l’eau, et Momo dort dès qu’il a mangé. Momo a mangé.', flag('r8_gaspard_parle')),
      p('Dans la dernière cage, Théo a tourné la tête vers les saules. Il ne peut pas vous voir à travers les branches. Il sait quand même. Il pose sa main à plat contre les barreaux et il la laisse là.', THEO_CAGE),
      say('maelle', '« Il est là. » Maëlle ne dit rien d’autre. Elle a la voix très calme, très basse, celle du soir où la pharmacie a brûlé. La voix qui précède les gestes. Vous posez une main sur son bras. Elle la laisse, pour l’instant.', all(withUs('maelle'), THEO_CAGE)),
      say('maelle', '« Ce sont des enfants. » Maëlle a la voix très calme, très basse. La voix qui précède les gestes.', all(withUs('maelle'), not(THEO_CAGE))),
      p('Théo regarde les cages sans rien dire. Il a remonté le col de son blouson sur la cicatrice. Ses mains tremblent ; il serre les poings pour qu’elles s’arrêtent.', withUs('theo')),
      say('nour', '« Deux en gris, deux peints. Quatre fusils. » Elle compte encore, presque sans voix. « Et eux, dans les cages. Il faut que ce soit nous, les plus nombreux. »', withUs('nour')),
      say('kaz', '« Quand le treuil se tendra, la benne va gémir comme une vache, et personne ne regardera ailleurs. » Il fait craquer ses doigts. « Après, il y a les fusils des gris. Ça, je ne sais pas les réparer. »', withUs('kaz')),
      say('ines', '« D’ici, j’ai le sergent. Pas les deux. » Inès a déjà armé son arbalète. Elle ne demande pas la permission. Elle attend que vous la donniez.', withUs('ines')),
      p('Votre fils est à quarante mètres, derrière des barreaux. Dans votre tête, la voix est très calme, celle du soir où la pharmacie a brûlé. La voix qui précède les gestes. Vous attendez quand même. Une infirmière qui se précipite tue son patient.', all(MAELLE_HEROS, THEO_CAGE)),
      p('D’ici, vous avez le sergent. Pas les deux. Vous armez l’arbalète sans un bruit, la joue contre le bois, comme vous l’aviez appris à Malik dans les galeries. Il tirait toujours trop tôt.', INES_HEROS),
      p('Personne à côté de vous. Quatre fusils en face, et l’eau entre les deux.', SANS_PERSONNE),
    ],
    choices: [
      {
        id: 'tir',
        text: 'Attendre que le câble se tende, puis ouvrir le feu depuis les saules.',
        kind: 'fight', time: 1,
        requires: [TIREUR],
        effects: [set('r9_surprise')],
        next: 'r9_tir',
      },
      {
        id: 'embuscade_vue',
        text: 'Profiter de la minute du treuil, celle que vous avez repérée, pour surgir de l’eau.',
        kind: 'stealth', time: 1,
        visibleIf: [OBSERVE],
        check: { stat: 'discretion', difficulty: 7, success: 'r9_embuscade', failure: 'r9_assaut', successEffects: [set('r9_surprise')] },
      },
      {
        id: 'embuscade',
        text: 'Ramper dans l’eau jusqu’à la benne et frapper quand le treuil se tendra.',
        kind: 'stealth', time: 1,
        visibleIf: [not(OBSERVE)],
        check: { stat: 'discretion', difficulty: 9, success: 'r9_embuscade', failure: 'r9_assaut', successEffects: [set('r9_surprise')] },
      },
      {
        id: 'ruse',
        text: 'Sortir à découvert et vous faire passer pour un Ferrailleur venu pousser la benne.',
        kind: 'negotiate', time: 0.5,
        requires: [any(flag('respect_ferrailleurs'), flag('passage_gaspard'), background('detenu'))],
        next: 'r9_ruse',
      },
      { id: 'negocier', text: 'Sortir les mains ouvertes et parler aux hommes de la barge.', kind: 'negotiate', time: 0.5, next: 'r9_negoce' },
      {
        id: 'assaut',
        text: 'Charger à travers le gué.',
        kind: 'fight', time: 0.5,
        warning: 'Combat difficile : deux gardes de la Destinée et un Ferrailleur.',
        next: 'r9_assaut',
      },
      {
        id: 'rien',
        text: 'Ne pas bouger. Les laisser partir.',
        kind: 'move', time: 1.5,
        visibleIf: [not(THEO_CAGE)],
        warning: 'Les captifs seront livrés à la barge.',
        next: 'r9_attendre',
      },
      {
        id: 'rien_theo',
        text: 'Ne pas bouger. Les laisser partir, Théo avec eux.',
        kind: 'sacrifice', time: 1.5,
        visibleIf: [THEO_CAGE],
        warning: 'Théo sera livré à la barge.',
        next: 'r9_attendre',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Combats
  // -------------------------------------------------------------------------
  {
    id: 'r9_assaut',
    chapter: C,
    location: 'gue',
    title: 'À découvert',
    kind: 'combat',
    text: [
      p('Vous sortez des saules en pleine lumière. Le Bègue lâche sa pelle. Le sergent, lui, ne lâche rien : il a déjà un genou dans l’eau et l’arme à l’épaule, comme à l’exercice.'),
    ],
    encounter: {
      enemies: ['soldat', 'soldat', 'pillard'],
      canFlee: true,
      victory: 'r9_fuyard',
      defeat: 'r9_defaite',
      flee: 'r9_repli',
      intro: 'Deux gardes de la Destinée et un Ferrailleur, au milieu du gué. Les gris tirent juste : défendez-vous quand ils mettent un genou à terre.',
    },
    choices: [],
  },
  {
    id: 'r9_embuscade',
    chapter: C,
    location: 'gue',
    title: 'La minute du treuil',
    kind: 'combat',
    text: [
      p('Le treuil se met à hurler. Le câble se tend, la benne gémit, et quatre têtes se tournent vers la même roue. Vous êtes déjà dans l’eau, à deux mètres d’eux.'),
    ],
    encounter: {
      enemies: ['soldat', 'soldat', 'pillard'],
      canFlee: true,
      ambush: true,
      victory: 'r9_victoire',
      defeat: 'r9_defaite',
      flee: 'r9_repli',
      intro: 'Embuscade : les gardes de la Destinée regardent le câble, pas vous.',
    },
    choices: [],
  },
  {
    id: 'r9_tir',
    chapter: C,
    location: 'gue',
    title: 'Depuis les saules',
    kind: 'combat',
    text: [
      p('Le câble se tend. La benne gémit. Le sergent lève la main vers le chauffeur, et le premier trait part des saules. Momo bascule de la ridelle dans l’eau sans un cri, sa gamelle avec lui.', withUs('ines')),
      p('Le câble se tend. La benne gémit. Le sergent lève la main vers le chauffeur, et vous tirez. Momo bascule de la ridelle dans l’eau sans un cri, sa gamelle avec lui.', notWithUs('ines')),
      p('Le temps que les gris comprennent d’où vient le tir, vous êtes sur eux.'),
    ],
    encounter: {
      enemies: ['soldat', 'soldat'],
      canFlee: true,
      ambush: true,
      victory: 'r9_victoire',
      defeat: 'r9_defaite',
      flee: 'r9_repli',
      intro: 'Le Ferrailleur est tombé au premier tir. Restent les deux gardes de la Destinée, surpris.',
    },
    choices: [],
  },
  {
    id: 'r9_victoire',
    chapter: C,
    location: 'gue',
    title: 'Le silence du gué',
    kind: 'story',
    text: [
      p('Le silence revient d’un coup, comme une porte qu’on referme. Il n’y a plus que la rivière, et le treuil du 4×4 qui tourne à vide en cliquetant.'),
      p('Aucun des deux soldats n’a eu le temps de toucher sa radio. À Morvan, personne ne sait encore rien.'),
      p('Momo flotte contre la roue arrière, face dans l’eau. Le Bègue a disparu dans les roseaux en amont, sans son fusil. Vous décrochez le trousseau de la ceinture du mort. Il y a un petit sapin en carton pendu à l’anneau, de ceux qu’on accrochait aux rétroviseurs. Il ne sent plus rien depuis longtemps.'),
    ],
    onEnter: [set('r9_combat_gagne'), give('cartouche', 2), xp(30), journal('Au gué de la Sauldre, vous avez surpris les gardes de la Destinée. Aucun n’a pu prévenir Morvan.')],
    choices: [{ id: 'cages', text: 'Monter sur le plateau et ouvrir les cages.', kind: 'move', next: 'r9_cages' }],
  },
  {
    id: 'r9_fuyard',
    chapter: C,
    location: 'gue',
    title: 'La radio',
    kind: 'story',
    timed: { seconds: 10, fallback: 'laisser' },
    text: [
      p('Momo ne se relèvera pas. Le Bègue a disparu dans les roseaux, sans son fusil. Le sergent est assis dans l’eau, adossé à la roue, les mains sur le ventre. Il ne vous regarde plus. Il ne regardera plus rien.'),
      p('Mais le jeune soldat court. Il a lâché son arme, il tient son épaule, il remonte le gué vers le 4×4 en trébuchant sur les pierres. La radio est dans le 4×4. Au bout de la radio, il y a Morvan.'),
    ],
    onEnter: [set('r9_combat_gagne'), give('cartouche', 2), xp(25)],
    choices: [
      {
        id: 'poursuivre',
        text: 'Lui courir après dans le courant.',
        kind: 'move',
        check: {
          stat: 'survie',
          difficulty: 8,
          success: 'r9_rattrape',
          failure: 'r9_cages',
          failureEffects: [set('r9_alerte'), journal('Un garde de la Destinée s’est enfui vers Morvan avec la nouvelle.')],
        },
      },
      {
        id: 'tirer',
        text: 'Tirer avant qu’il atteigne la portière.',
        kind: 'fight',
        requires: [ARME_DE_TIR],
        effects: [set('r9_soldat_abattu'), when(withUs('maelle'), [rel('maelle', -1)]), journal('Vous avez abattu le jeune garde avant qu’il atteigne sa radio.')],
        next: 'r9_cages',
      },
      {
        id: 'laisser',
        text: 'Le laisser partir. Les cages d’abord.',
        kind: 'move',
        effects: [set('r9_alerte'), journal('Un garde de la Destinée s’est enfui vers Morvan avec la nouvelle.')],
        next: 'r9_cages',
      },
    ],
  },
  {
    id: 'r9_rattrape',
    chapter: C,
    location: 'gue',
    title: 'Vernet',
    kind: 'story',
    text: [
      p('Vous le rattrapez à trois mètres de la portière. Il glisse sur une pierre moussue, vous tombez avec lui dans l’eau froide, et quand vous le relevez par le col, il ne se débat plus.'),
      p('Il a dix-neuf ans, peut-être. Un nom brodé sur la poitrine : VERNET. Une alliance trop grande enfilée au pouce, qui n’a sûrement pas été achetée pour lui.'),
      p('« On nous a dit que c’étaient des orphelins », dit-il. Ses dents claquent. « Qu’on les sauvait. Qu’on les emmenait là où il y a des médecins. » Il regarde les cages, derrière vous. « C’est vrai, non ? Il y a des médecins, sur la barge ? »'),
    ],
    choices: [
      {
        id: 'ligoter',
        text: 'Le ligoter au pare-buffle et arracher le combiné de la radio.',
        kind: 'talk',
        effects: [set('r9_vernet_ligote'), xp(15), journal('Vous avez laissé le jeune garde Vernet ligoté à son 4×4, la radio arrachée.')],
        next: 'r9_cages',
      },
      {
        id: 'liberer',
        text: 'Lui prendre ses armes et le laisser repartir à pied vers Morvan.',
        kind: 'talk',
        effects: [set('r9_alerte'), set('r9_vernet_libre'), xp(10), journal('Vous avez laissé le jeune garde Vernet repartir à pied vers Morvan. Il racontera.')],
        next: 'r9_cages',
      },
      {
        id: 'faire_taire',
        text: 'Le faire taire pour de bon. Personne ne doit savoir.',
        kind: 'fight',
        effects: [
          set('r9_soldat_abattu'),
          when(withUs('maelle'), [rel('maelle', -1)]),
          when(withUs('theo'), [rel('theo', -1)]),
          journal('Vous avez tué le jeune garde Vernet dans l’eau du gué.'),
        ],
        next: 'r9_cages',
      },
    ],
  },
  {
    id: 'r9_defaite',
    chapter: C,
    location: 'gue',
    title: 'Le courant',
    kind: 'story',
    text: [
      p('Un coup de crosse, quelque part entre l’oreille et le monde. Puis l’eau froide dans la bouche, et le ciel qui tourne.'),
      p('Des mains vous tirent par le col jusque sous les saules. Ce sont celles de Kaz. Il vous traîne sur la berge comme un sac de ciment, sans douceur, et vous recouvre de branches.', withUs('kaz')),
      p('Des mains vous tirent par le col jusque sous les saules et vous recouvrent de branches. Quelqu’un respire tout près, en retenant le bruit.', all(AVEC_QUELQU_UN, notWithUs('kaz'))),
      p('Le courant vous dépose contre les racines d’un saule, plus bas. Personne ne prend la peine de vous suivre dans l’eau. Les gris ne gaspillent pas leurs balles.', SANS_PERSONNE),
      p('Quand vous pouvez relever la tête, le treuil a fait son travail. La benne remonte la berge d’en face en ruisselant, au bout du câble, comme un chien au bout d’une laisse. Le 4×4 ouvre la route de Morvan. Le sergent parle dans sa radio. Il décrit votre visage.'),
      p('À l’arrière, dans la dernière cage, Théo s’est levé. Il tient les barreaux à deux mains. Il regarde les saules jusqu’au virage.', THEO_CAGE),
    ],
    onEnter: [
      hurt(4, 'les crosses des gardes de la Destinée'),
      take('ration', 1),
      set('r9_alerte'),
      set('r9_camion_parti'),
      journal('Au gué de la Sauldre, les gardes de la Destinée ont eu le dessus. La livraison est repartie vers Morvan.'),
    ],
    choices: [{ id: 'traverser', text: 'Reprendre ses esprits, puis traverser.', kind: 'move', time: 1, next: 'r9_traversee' }],
  },
  {
    id: 'r9_repli',
    chapter: C,
    location: 'gue',
    title: 'Le repli',
    kind: 'story',
    text: [
      p('Vous refluez vers les saules sous les tirs. Les balles hachent les branches au-dessus de vous. Puis elles s’arrêtent : les gris n’ont pas besoin de vous tuer. Ils ont besoin de partir.'),
      p('Le treuil hurle. La benne s’arrache aux galets dans une gerbe d’eau brune et remonte l’autre berge. Le 4×4 ouvre la route de Morvan, le sergent la radio collée à la bouche, sans quitter les saules des yeux.'),
      p('Dans la dernière cage, Théo ne regarde pas vers vous. Il regarde la route devant. Il a déjà recommencé à compter quelque chose.', THEO_CAGE),
    ],
    onEnter: [set('r9_alerte'), set('r9_camion_parti'), journal('Au gué de la Sauldre, il a fallu reculer, et la livraison est repartie vers Morvan.')],
    choices: [{ id: 'traverser', text: 'Attendre que le bruit du moteur s’éteigne, puis traverser.', kind: 'move', time: 0.5, next: 'r9_traversee' }],
  },

  // -------------------------------------------------------------------------
  // La ruse et la parole
  // -------------------------------------------------------------------------
  {
    id: 'r9_ruse',
    chapter: C,
    location: 'gue',
    title: 'Un des leurs',
    kind: 'story',
    text: [
      p('Vous sortez des saules sans vous presser, comme quelqu’un qui a le droit d’être là, et vous entrez dans l’eau. Momo lève son fusil, à moitié.'),
      say('moi', '« La benne a encore fait des siennes ? On m’envoie pousser. Et toucher ma part, si on la touche un jour. »', not(flag('passage_gaspard'))),
      p('Vous ne dites rien. Vous sortez la plaque de Gaspard et vous la tenez bien haut, poinçon tourné vers eux. Momo plisse les yeux, la reconnaît, crache de côté. C’est un laissez-passer qu’on ne donne qu’à ceux qui ont vendu quelqu’un.', flag('passage_gaspard')),
      p('Dans la dernière cage, Théo a vu la plaque. Il sait ce qu’elle vous a coûté. Il sait surtout ce qu’elle lui a coûté, à lui. Il ne détourne pas les yeux.', all(THEO_CAGE, flag('passage_gaspard'))),
      p('Votre démarche fait le reste. Les cours de promenade laissent ça dans le corps : une façon d’occuper l’espace sans rien demander.', background('detenu')),
      p('Théo est resté sous les saules, à plat ventre, la capuche sur la tête. Pour une fois, il vaut mieux qu’on ne le regarde pas.', withUs('theo')),
      p('Le sergent de l’Institut vous dévisage, sans un mot. Il attend que les Ferrailleurs décident si vous êtes des leurs.'),
    ],
    choices: [
      {
        id: 'bluff',
        text: 'Tenir le regard du sergent et attraper la ridelle comme si vous l’aviez fait toute votre vie.',
        kind: 'negotiate', time: 0.5,
        check: { stat: 'astuce', difficulty: 8, success: 'r9_parmi_eux', failure: 'r9_assaut' },
      },
      { id: 'reculer', text: 'Faire demi-tour avant qu’il soit trop tard.', kind: 'flee', next: 'r9_saules' },
    ],
  },
  {
    id: 'r9_parmi_eux',
    chapter: C,
    location: 'gue',
    title: 'L’épaule contre la ridelle',
    kind: 'story',
    text: [
      p('Momo hausse les épaules et vous tend la pelle. Au gué de la Sauldre, ça vaut un certificat.'),
      p('Vous voilà dans l’eau jusqu’aux cuisses, l’épaule contre la ridelle, parmi les hommes que vous comptiez combattre. Le trousseau pend à la ceinture de Momo, à une main de la vôtre. Le sergent est remonté au 4×4 pour manœuvrer le treuil. Le jeune soldat surveille le câble. Personne ne surveille vos mains.'),
      p('Théo est à trente centimètres, derrière les barreaux. Vous ne le regardez pas. Il ne vous regarde pas. Vous jouez la même pièce, tous les deux, sans l’avoir jamais répétée.', THEO_CAGE),
    ],
    choices: [
      {
        id: 'cles',
        text: 'Décrocher le trousseau dans le vacarme du treuil et ouvrir les cages par l’arrière.',
        kind: 'stealth', time: 0.5,
        check: {
          stat: 'discretion',
          difficulty: 8,
          success: 'r9_cages',
          failure: 'r9_assaut',
          successEffects: [set('r9_en_douce'), set('r9_alerte'), set('r9_camion_parti'), xp(30)],
        },
      },
      {
        id: 'frapper',
        text: 'Attendre que le câble se tende et frapper le premier.',
        kind: 'fight',
        effects: [set('r9_surprise')],
        next: 'r9_embuscade',
      },
    ],
  },
  {
    id: 'r9_negoce',
    chapter: C,
    location: 'gue',
    title: 'Une voix de guichet',
    kind: 'story',
    text: [
      p('Vous sortez des saules les mains ouvertes, loin du corps. Quatre canons se tournent vers vous d’un seul mouvement. L’eau vous arrive aux genoux, froide comme un reproche.'),
      p('C’est le sergent qui parle. Il a une voix de guichet, polie, sans rien derrière. « Vous êtes sur une zone de réception de l’Institut Ferrand. Les sujets transportés sont placés sous la protection de l’Institut. Faites demi-tour. »'),
      say('moi', '« Les sujets. Ce sont des enfants, dans des cages à chien. »'),
      p('« Ce sont des patients prioritaires. Le transport n’est pas de notre ressort. » Il désigne les Ferrailleurs du menton, comme on désigne une brouette. Momo a vu le geste. Il ne l’a pas aimé.'),
      p('Le regard du sergent glisse sur le groupe et s’arrête sur Théo. Sur son épaule. Il ne dit rien. Il note. Vous le voyez noter.', withUs('theo')),
      p('Derrière les barreaux, Théo vous regarde parler. Il n’a jamais entendu votre voix mentir aussi bien, ni dire la vérité aussi mal.', THEO_CAGE),
    ],
    choices: [
      {
        id: 'preuve',
        text: 'Montrer aux Ferrailleurs ce que vaut la parole de la barge.',
        kind: 'negotiate', time: 0.5,
        requires: [any(has('enregistrement'), has('ordre_mission'))],
        check: { stat: 'astuce', difficulty: 7, success: 'r9_retournement', failure: 'r9_assaut', successEffects: [set('r9_par_preuve')] },
      },
      {
        id: 'racheter',
        text: 'Poser trois rations sur la ridelle : de quoi manger ce soir, contre des places promises pour on ne sait quand.',
        kind: 'negotiate', time: 0.5,
        requires: [has('ration', 3)],
        check: {
          stat: 'astuce',
          difficulty: 9,
          success: 'r9_retournement',
          failure: 'r9_assaut',
          successEffects: [take('ration', 3), set('r9_par_rachat')],
        },
      },
      {
        id: 'kaz',
        text: 'Laisser Kaz parler aux Ferrailleurs : il les connaît depuis la casse.',
        kind: 'talk', time: 0.5,
        requires: [withUs('kaz')],
        check: { stat: 'astuce', difficulty: 7, success: 'r9_retournement', failure: 'r9_assaut', successEffects: [set('r9_par_kaz'), rel('kaz', 1)] },
      },
      {
        id: 'kaz_vous',
        text: '[Vous, Kaz] Parler aux Ferrailleurs : vous les connaissez depuis la casse, et ils vous doivent encore de l’argent.',
        kind: 'talk', time: 0.5,
        requires: [KAZ_HEROS],
        check: { stat: 'astuce', difficulty: 7, success: 'r9_retournement', failure: 'r9_assaut', successEffects: [set('r9_par_kaz')] },
      },
      { id: 'reculer', text: 'Reculer lentement jusqu’aux saules.', kind: 'flee', next: 'r9_saules' },
    ],
  },
  {
    id: 'r9_retournement',
    chapter: C,
    location: 'gue',
    title: 'Le calcul du sergent',
    kind: 'story',
    text: [
      p('Le dictaphone grésille au-dessus de l’eau. La voix du capitaine Rousset, plate, administrative : « … huit places sur le pont inférieur. Le reste du contingent sera trié à la grille. » Momo écoute jusqu’au bout. Le Bègue a cessé de creuser.', all(flag('r9_par_preuve'), has('enregistrement'))),
      p('« Trié à la grille », répète Momo. Il se tourne vers le sergent. « C’est quoi, la grille ? » Le sergent ne répond pas. C’est une réponse.', all(flag('r9_par_preuve'), has('enregistrement'))),
      p('Vous dépliez la feuille plastifiée tachée de sang et vous la tendez à Momo. « Collecte de porteurs, secteur Valombre-Nord. Priorité : sujets jeunes. » Signé Rousset. Momo lit lentement, en remuant les lèvres. Le convoi de l’Institut faisait la collecte lui-même. Les Ferrailleurs ne sont qu’un raccourci, en attendant qu’on n’ait plus besoin d’eux.', all(flag('r9_par_preuve'), lacks('enregistrement'))),
      p('« Et nous, on est quoi, sur ton papier ? » demande Momo au sergent. Le sergent ne répond pas. C’est une réponse.', all(flag('r9_par_preuve'), lacks('enregistrement'))),
      p('Vous posez les rations sur la ridelle, une par une. De vraies boîtes, avec des étiquettes. Momo les regarde, puis il regarde le sergent. « Des places sur la barge, qu’il nous promet. Pour quand ? Pour qui ? » Il soupèse une boîte. « Ça, au moins, ça se mange ce soir. »', flag('r9_par_rachat')),
      say('kaz', '« Momo. Tu me dois toujours une bouteille et quarante euros. » Kaz entre dans l’eau, énorme et tranquille. « Gaspard ne t’a jamais dit pourquoi lui, il ne montait pas à bord ? Parce qu’ils trient, petit. Ils trient à la grille, et les gars comme toi et moi, on est de l’autre côté. »', all(flag('r9_par_kaz'), withUs('kaz'))),
      say('moi', '« Momo. Tu me dois toujours une bouteille et quarante euros. » Vous entrez dans l’eau, lentement, de tout votre poids. « Gaspard ne t’a jamais dit pourquoi lui, il ne montait pas à bord ? Parce qu’ils trient, petit. Ils trient à la grille, et les gars comme toi et moi, on est de l’autre côté. »', all(flag('r9_par_kaz'), KAZ_HEROS)),
      p('Gaspard Lenoir descend dans le gué comme on rentre chez soi. Il ne court pas, il ne crie pas. Le Bègue lâche sa pelle. Momo se lève de la ridelle, le fusil ballant.', flag('r9_gaspard_aide')),
      say('gaspard', '« Rangez-moi ça. On ne livre plus. La barge nous trie à la grille comme des pommes pourries, et vous, vous lui portez les pommes. »', flag('r9_gaspard_aide')),
      p('Le sergent n’attend pas la suite. Il tire. Gaspard pivote, une main sur le haut du bras, et reste debout.', flag('r9_gaspard_aide')),
      p('Les fusils des Ferrailleurs se tournent lentement vers les combinaisons grises. Le sergent fait le calcul très vite : on l’a formé pour ça. Il recule vers le 4×4 sans baisser son arme. Le jeune soldat décroche le câble à mains nues, et le moteur rugit.'),
      p('Le 4×4 remonte la berge en patinant et disparaît sur la route de Morvan. Avant le virage, le sergent porte sa radio à sa bouche. Ce soir, la barge saura qu’au gué de la Sauldre, quelqu’un a dit non.'),
      p('Momo décroche le trousseau de sa ceinture et vous le lance. « Prends-les. On n’a plus d’acheteur. » Le Bègue et lui repartent vers l’amont, à pied, sans se retourner, en laissant la benne plantée dans la rivière comme une pierre tombale.'),
      say('gaspard', '« Ça va. J’ai connu pire. » Il serre un chiffon sur son bras et regarde partir ses deux gars. « Moi, je continue vers l’écluse. J’ai deux mots à dire à ce Rousset. Peut-être plus. » Il s’éloigne seul, le long de l’eau.', flag('r9_gaspard_aide')),
    ],
    onEnter: [
      set('r9_alerte'),
      xp(40),
      when(flag('r9_gaspard_aide'), [rel('gaspard', 2)]),
      journal('Au gué de la Sauldre, les Ferrailleurs ont renoncé à leur livraison. Les gardes de l’Institut sont repartis prévenir Morvan.'),
    ],
    choices: [{ id: 'cages', text: 'Monter sur le plateau et ouvrir les cages.', kind: 'move', next: 'r9_cages' }],
  },

  // -------------------------------------------------------------------------
  // Les cages
  // -------------------------------------------------------------------------
  {
    id: 'r9_cages',
    chapter: C,
    location: 'gue',
    title: 'Les cages',
    kind: 'story',
    routes: [{ if: THEO_CAGE, to: 'r9_theo' }],
    text: [
      p('Le treuil hurle, le câble chante, la benne s’arrache aux galets dans un vacarme de ferraille. Sous ce bruit-là, un cadenas qui s’ouvre ne fait aucun bruit. Vous ouvrez les cages par l’arrière pendant que tous les regards sont sur la roue. La femme comprend la première : elle prend les enfants par le col et se laisse glisser dans l’eau avec eux.', all(flag('r9_en_douce'), notFlag('theo_libere'))),
      p('Vous les retrouvez en aval, dans les roseaux, grelottants. Sur l’autre rive, quelqu’un hurle : on vient de découvrir les cages vides. Des coups, un tir en l’air, puis la radio. Le 4×4 et la benne vide partent vers Morvan. La barge saura ce soir qu’il manque une livraison.', flag('r9_en_douce')),
      p('Le cadenas de la première cage cède avec un bruit de bouteille qu’on débouche. Puis le deuxième. Puis le troisième.', all(notFlag('r9_en_douce'), notFlag('theo_libere'))),
      p('Vous ouvrez les autres cages. Le trousseau tremble un peu dans vos mains. Ce n’est pas le froid.', all(notFlag('r9_en_douce'), flag('theo_libere'))),
      p('Sur l’autre rive, il n’y a plus de 4×4. Rien que deux traces de pneus dans la boue, qui filent vers Morvan.', all(flag('r9_alerte'), notFlag('r9_en_douce'), notFlag('r9_vernet_libre'))),
      p('La femme s’appelle Aurélie. Elle n’est pas porteuse. Elle est la tante des deux petits, et quand on est venu les prendre dans une ferme de la route de Brennes, elle a refusé de les lâcher. Alors on l’a prise aussi. Quelqu’un, à Brennes, leur avait offert une soupe et regardé leurs nuques. « Adulte négociable », a dit le sergent en la voyant. Elle répète le mot sans le comprendre.'),
      p('Lou a huit ans, Nathan onze. Ils ont la même cicatrice ronde, lui au poignet, elle à la base du cou. Ils ne pleurent pas. Nathan ne lâche pas la main de sa sœur, même pour descendre du plateau.'),
      p('Théo les aide à descendre, un par un. Il sait comment on déplie des jambes restées trop longtemps pliées. Il l’a appris dans la benne.', flag('theo_libere')),
      p('Théo reste un long moment devant la quatrième cage, la vide, celle qui attendait quelqu’un. Puis il en referme la porte d’un coup de pied, et le cadenas avec, et il jette la clé dans la Sauldre.', all(withUs('theo'), notFlag('theo_libere'), notFlag('r9_en_douce'))),
      say('nour', '« Huit pas jusqu’à l’eau », dit Nour à Lou en lui prenant l’autre main. « Après, tu comptes avec moi. Quand on compte, on a moins peur. »', withUs('nour')),
      p('Maëlle s’agenouille dans l’eau et examine les poignets, les chevilles, les gencives. Elle ne parle pas. Ses mains parlent pour elle.', withUs('maelle')),
      p('Le corps du jeune soldat s’est arrêté contre une pile du pont. Le courant le berce. Personne ne le regarde.', flag('r9_soldat_abattu')),
      p('Ligoté au pare-buffle du 4×4, le jeune Vernet regarde les enfants descendre des cages. Il pleure sans bruit. Peut-être qu’il vient de comprendre ce qu’il gardait.', flag('r9_vernet_ligote')),
      p('Le jeune Vernet est parti à pied sur la route de Morvan, sans arme, sans se retourner. Il sera à l’écluse avant la nuit. Il racontera.', flag('r9_vernet_libre')),
      p('Aurélie vous demande où aller. Pas à l’écluse. Plus jamais à l’écluse.'),
    ],
    onEnter: [set('captifs_liberes'), xp(30), journal('Au gué de la Sauldre, vous avez ouvert les cages : Aurélie, Lou et Nathan sont libres.')],
    choices: [
      {
        id: 'ration',
        text: 'Leur donner une ration pour la route.',
        kind: 'item',
        once: true,
        requires: [has('ration')],
        effects: [take('ration', 1), set('r9_ration_donnee'), xp(10)],
      },
      {
        id: 'prieure',
        text: 'Leur indiquer le prieuré de Saint-Aubin : Mère Agathe ne refuse personne.',
        kind: 'talk',
        effects: [set('r9_captifs_prieure')],
        next: 'r9_fouille',
      },
      {
        id: 'veilleurs',
        text: 'Leur dire de remonter jusqu’aux Veilleurs de Saint-Roch. C’est loin, mais là-bas, on compte les vivants.',
        kind: 'talk',
        effects: [set('r9_captifs_veilleurs')],
        next: 'r9_fouille',
      },
    ],
  },
  {
    id: 'r9_theo',
    chapter: C,
    location: 'gue',
    title: 'La dernière cage',
    kind: 'story',
    text: [
      p('La dernière cage. Le cadenas résiste, puis cède.', notFlag('r9_en_douce')),
      p('Vous ouvrez sa cage en dernier, dans le vacarme du treuil. Il se glisse dans l’eau sans un bruit, comme il a dû le répéter cent fois dans sa tête.', flag('r9_en_douce')),
      p('Théo ne sort pas tout de suite. Il range d’abord le clou dans sa poche. Sur le plancher de la cage, gravée à la pointe, il y a une carte : la route depuis le Pont de Fer, chaque virage, chaque village, chaque pont, avec un trait pour chaque heure. Le chemin du retour. Il comptait le faire seul.'),
      p('Puis il descend. Ses jambes le portent mal. Il refuse votre bras.'),
      say('theo', '« Tu m’as vendu. » Il ne crie pas. Il constate, comme on lit un panneau. « Pour une plaque et six cartouches. J’ai eu le temps de compter, dans la cage. Six. »', all(flag('r9_theo_vendu'), not(HEROS))),
      say('theo', '« Je viens avec toi parce que c’est le seul chemin. Ne crois pas autre chose. Pas encore. »', all(flag('r9_theo_vendu'), not(HEROS))),
      say('theo', '« J’ai regardé ta silhouette traverser le Pont de Fer. J’ai compté les poutrelles pour ne pas penser à toi. Quarante-deux. » Il s’essuie le nez avec sa manche. « Tu as fait demi-tour. Ça compte. Pas assez. Mais ça compte. »', all(flag('r9_theo_abandonne'), not(HEROS))),
      p('Vous entrez dans l’eau jusqu’à la taille et vous prenez votre fils. Il est plus léger qu’à la casse. Il sent la rouille et le chien mouillé. Vous dites son prénom, plusieurs fois, parce que c’est le seul mot qui vous reste.', MAELLE_HEROS),
      say('theo', '« Je savais que tu viendrais, maman. » Puis, plus bas, contre votre cou : « Ce n’est pas toi qui m’as laissé là-bas. Je le sais. »', MAELLE_HEROS),
      say('theo', '« Ce n’est pas toi qui m’as laissé là-bas. » Il regarde la rive derrière vous, comme s’il y cherchait quelqu’un qui n’y est plus. « Ça ne change rien à ce qui s’est passé. Mais ce n’est pas toi. »', any(KAZ_HEROS, INES_HEROS)),
      p('Maëlle ne dit rien. Elle entre dans l’eau jusqu’à la taille, elle prend son fils, et elle le tient. Longtemps. Théo se laisse faire. Par-dessus l’épaule de sa mère, il vous regarde, et dans ce regard il n’y a pas encore de pardon. Il y a de la place pour un, plus tard, peut-être.', withUs('maelle')),
      say('theo', '« Maman s’est assise devant ma cage, à la casse. Elle n’a presque pas bougé. Quand la benne est partie, elle a couru derrière. Longtemps. Je l’ai regardée devenir toute petite. » Il se tait. « Elle est vivante. Je le sais. »', all(notWithUs('maelle'), flag('maelle_reste_casse'))),
      say('theo', '« Maman ? » Puis, devant votre visage : « Je sais. Elle me cherche quelque part. Elle me cherche toujours. »', all(companionIs('maelle', 'away'), notFlag('maelle_reste_casse'))),
      say('kaz', '« Petit… » Kaz n’ose pas approcher. Ses grosses mains pendent le long de son corps. Théo le regarde, et Kaz se tait. Il y a des dettes qui ne se règlent pas avec des mots.', withUs('kaz')),
      p('Inès lui tend sa gourde sans un mot. Il boit. C’est la seule chose qu’il accepte.', withUs('ines')),
      p('Il marche avec vous. Deux pas derrière. Assez près pour qu’on le protège, assez loin pour qu’on comprenne.'),
    ],
    onEnter: [
      when(flag('theo_vendu'), [set('r9_theo_vendu'), rel('theo', -2)]),
      when(flag('theo_abandonne'), [set('r9_theo_abandonne')]),
      companion('theo', 'companion'),
      set('theo_vendu', false),
      set('theo_abandonne', false),
      set('theo_libere'),
      when(withUs('maelle'), [rel('maelle', 3)]),
      xp(50),
      journal('Au gué de la Sauldre, vous avez sorti Théo de sa cage. Il marche avec vous. Il ne vous a pas pardonné.'),
    ],
    choices: [
      {
        id: 'plaque',
        text: 'Sortir la plaque de Gaspard et la jeter dans la Sauldre, devant lui.',
        kind: 'item',
        visibleIf: [flag('passage_gaspard')],
        effects: [set('passage_gaspard', false), set('r9_plaque_jetee'), rel('theo', 2), journal('Vous avez jeté dans la Sauldre la plaque que Gaspard vous avait donnée pour Théo.')],
        next: 'r9_cages',
      },
      {
        id: 'pardon',
        text: 'Lui demander pardon, simplement, sans rien expliquer.',
        kind: 'talk',
        effects: [rel('theo', 1)],
        next: 'r9_cages',
      },
      { id: 'silence', text: 'Ne rien dire. Lui laisser la distance qu’il demande, et ouvrir les autres cages.', kind: 'move', next: 'r9_cages' },
    ],
  },
  {
    id: 'r9_fouille',
    chapter: C,
    location: 'gue',
    title: 'Ce qui reste',
    kind: 'story',
    text: [
      p('Aurélie et les enfants s’éloignent vers l’amont. Avant de traverser, vous faites ce qu’on fait maintenant après chaque chose terrible : vous fouillez.'),
      p('Les fusils des gris ne vous servent à rien. Une puce dans la crosse, un voyant rouge : ils ne tirent que pour les mains auxquelles on les a réglés. L’Institut a pensé à tout, sauf à ce qu’on lui reprenne ses enfants.', flag('r9_combat_gagne')),
      p('La benne est toujours plantée au milieu du gué. L’eau entre dans la cabine par la portière ouverte.', notFlag('r9_camion_parti')),
      p('La benne est partie. Il ne reste au gué que des ornières, et un pan de bâche arraché, accroché aux pierres.', flag('r9_camion_parti')),
    ],
    choices: [
      {
        id: 'cabine',
        text: 'Fouiller la cabine de la benne.',
        kind: 'explore', time: 0.5,
        once: true,
        visibleIf: [notFlag('r9_camion_parti')],
        effects: [give('ration', 1), give('chiffons', 1), give('ferraille', 1), doc('doc_r9_bordereau')],
      },
      {
        id: 'vehicule',
        text: 'Fouiller le 4×4 de l’Institut.',
        kind: 'explore', time: 0.5,
        once: true,
        visibleIf: [notFlag('r9_alerte')],
        effects: [give('trousse', 1), give('bandage', 2), doc('doc_r9_consignes'), xp(10)],
      },
      {
        id: 'berge',
        text: 'Fouiller la bâche arrachée et les pierres où la benne était embourbée.',
        kind: 'explore', time: 0.5,
        once: true,
        visibleIf: [flag('r9_camion_parti')],
        effects: [give('chiffons', 1), doc('doc_r9_bordereau')],
      },
      { id: 'traverser', text: 'Aller au gué.', kind: 'move', next: 'r9_traversee' },
    ],
  },
  {
    id: 'r9_attendre',
    chapter: C,
    location: 'gue',
    title: 'Les yeux ouverts',
    kind: 'story',
    text: [
      p('Vous ne bougez pas. Vous regardez. C’est un choix, lui aussi, et vous le faites les yeux ouverts.'),
      p('Le treuil hurle. Le câble se tend. La benne s’arrache aux galets dans une gerbe d’eau brune et remonte l’autre berge au bout de sa laisse d’acier. Les Ferrailleurs grimpent sur le plateau, à côté des cages. Le 4×4 ouvre la route. Ils passent à cinquante mètres de vous.'),
      p('Théo est debout dans sa cage. Il regarde les saules jusqu’au virage. Il sait que vous êtes là. Il l’a toujours su. Puis la route tourne, et il ne reste que le bruit du moteur, qui met très longtemps à s’éteindre.', THEO_CAGE),
      p('Maëlle ne vous parle pas. Elle s’est levée à l’instant où la benne a bougé, et quelqu’un l’a retenue par le bras, vous ne savez plus qui. Elle ne vous le pardonnera pas. Elle ne vous l’a pas dit. Elle n’a pas besoin.', all(THEO_CAGE, withUs('maelle'))),
      p('Lou et Nathan se tiennent toujours la main à travers les barreaux. La femme, elle, regarde vers les saules. Elle ne vous voit pas. Elle regarde quand même.', not(THEO_CAGE)),
      say('theo', '« Il y avait une cage vide », dit Théo. Rien d’autre. Il ne vous adresse plus la parole jusqu’au gué.', withUs('theo')),
      p('Nour s’est détournée. Elle compte quelque chose, très bas, et ce ne sont pas des pas.', withUs('nour')),
    ],
    onEnter: [
      set('r9_camion_parti'),
      set('r9_livraison_partie'),
      when(withUs('nour'), [rel('nour', -2)]),
      when(withUs('theo'), [rel('theo', -1)]),
      when(withUs('maelle'), [when(THEO_CAGE, [rel('maelle', -4)], [rel('maelle', -1)])]),
      journal('Au gué de la Sauldre, vous avez laissé partir la livraison vers la barge.'),
    ],
    choices: [{ id: 'traverser', text: 'Attendre que la route soit vide, puis traverser.', kind: 'move', next: 'r9_traversee' }],
  },

  // -------------------------------------------------------------------------
  // Le gué
  // -------------------------------------------------------------------------
  {
    id: 'r9_traversee',
    chapter: C,
    location: 'gue',
    title: 'Le gué de la Sauldre',
    kind: 'story',
    text: [
      p('Les pierres plates sont glissantes et l’eau vous prend aux genoux, froide, rapide. Entre deux pierres, il y a des trous où un homme tiendrait debout. La lumière baisse ; la rivière devient couleur de plomb.'),
      p('Et dans le courant, un cliquetis. Faible, régulier. Des dents, sous l’eau. Des Noyés se sont pris dans les fers du pont effondré, et ils ont senti vos jambes.'),
      p('La benne plantée au milieu du gué brise le courant. Derrière elle, l’eau est presque calme. C’est le seul service qu’elle aura jamais rendu.', notFlag('r9_camion_parti')),
    ],
    choices: [
      {
        id: 'kaz',
        text: 'Laisser Kaz ouvrir la marche : il a passé sa vie à lire l’eau.',
        kind: 'move', time: 1,
        visibleIf: [withUs('kaz')],
        effects: [rel('kaz', 1), xp(10)],
        next: 'r9_fin',
      },
      {
        id: 'kaz_vous',
        text: '[Vous, Kaz] Ouvrir la marche : vous avez passé votre vie à lire l’eau.',
        kind: 'move', time: 1,
        visibleIf: [KAZ_HEROS],
        effects: [xp(10)],
        next: 'r9_fin',
      },
      {
        id: 'corde',
        text: 'Tendre la corde d’une rive à l’autre et passer un par un.',
        kind: 'item', time: 1.5,
        requires: [has('corde')],
        effects: [xp(10)],
        next: 'r9_fin',
      },
      {
        id: 'pierres',
        text: 'Passer de pierre en pierre, vite, sans regarder l’eau.',
        kind: 'move', time: 1,
        check: {
          stat: 'survie',
          difficulty: 8,
          success: 'r9_fin',
          failure: 'r9_fin',
          failureEffects: [hurt(3, 'une main de Noyé refermée sur la cheville'), set('r9_cheville')],
        },
      },
    ],
  },
  {
    id: 'r9_fin',
    chapter: C,
    location: 'gue',
    title: 'Le crépuscule sur la Sauldre',
    kind: 'chapterEnd',
    text: [
      p('De l’autre côté, la route remonte vers une crête plantée de peupliers. Vous vous arrêtez là-haut, le temps de manger quelque chose et de compter qui est là.'),
      p('Votre cheville porte la marque de quatre doigts, violette, nette comme une signature. La main a lâché quand vous avez frappé. Les dents n’ont pas eu le temps.', flag('r9_cheville')),
      p('Théo mange à l’écart, assis sur une borne. Il fait tourner son clou entre ses doigts. Quand vous le regardez, il ne détourne pas les yeux. C’est déjà quelque chose.', flag('theo_libere')),
      p('Vous ne regardez pas la route de Morvan. La benne y est passée. Théo y est passé. Au bout de cette route, il y a l’écluse, et dans l’écluse, une barge qui l’attend.', THEO_CAGE),
      p('En bas, le long de la Sauldre, trois silhouettes remontent vers l’amont : une grande et deux petites qui se tiennent la main. Elles ne se retournent pas. C’est bon signe.', flag('captifs_liberes')),
      p('Le 4×4 de l’Institut a des heures d’avance. À l’écluse, ce soir, quelqu’un fait son rapport, et le capitaine Rousset apprend qu’on l’attend sur la route.', all(flag('r9_alerte'), notFlag('r9_vernet_libre'))),
      p('À Morvan, personne ne sait encore ce qui s’est passé au gué. La barge attend une livraison qui n’arrivera pas, et elle ne sait pas pourquoi.', all(notFlag('r9_alerte'), flag('captifs_liberes'))),
      p('Plus loin sur le chemin, une silhouette massive marche seule, un chiffon noué autour du bras. Gaspard ne se retourne pas.', flag('r9_gaspard_aide')),
      p('Le soleil se couche derrière vous, du côté de Valombre. Devant, le ciel est déjà gris, et sous ce gris, à quelques heures de marche, on croit voir une lueur blanche qui ne bouge pas. Un projecteur.'),
      p('Il reste {reste} avant l’aube du septième.'),
    ],
    onEnter: [meal(), diary('r9')],
    choices: [{ id: 'suite', text: 'Chapitre 14 : La Dernière Veillée', kind: 'move', time: 1, next: 'r10_chapelle' }],
  },
];

export const DOCUMENTS_R9: DocumentDef[] = [
  {
    id: 'doc_r9_bordereau',
    title: 'Bon de livraison n° 7',
    source: 'Carnet à souches des Ferrailleurs, gué de la Sauldre',
    body:
      'FERRAILLES LENOIR — Pièces, métaux, transport\n\n' +
      'Livraison n° 7 — Gué de la Sauldre, sixième jour, avant la nuit.\n' +
      'Contenu : sujets « P » (cicatrice contrôlée), voir liste. 1 adulte (négociable).\n' +
      'Provenance : ferme Morin, route de Brennes (sur indication de M. le maire).\n' +
      'Contrepartie convenue : places sur le pont inférieur, à valoir à la grille.\n' +
      'Réceptionné par : ____________ (Institut)\n\n' +
      'Au dos, au crayon, d’une autre écriture : « Momo — demande-leur pour la grille. Personne veut me dire c’est quoi, la grille. »',
  },
  {
    id: 'doc_r9_consignes',
    title: 'Note de service n° 12',
    source: 'Classeur plastifié, boîte à gants d’un 4×4 de l’Institut Ferrand',
    body:
      'INSTITUT FERRAND — NAVIRE DESTINÉE\n' +
      'Note de service n° 12 — Équipes de réception\n\n' +
      '1. Vérifier la cicatrice (morsure ancienne, refermée, sans nécrose).\n' +
      '2. Prélever 5 ml pour test rapide avant tout transfert. Sujet négatif : ne pas embarquer.\n' +
      '3. Ne pas converser avec les sujets. Ne pas leur communiquer la destination.\n' +
      '4. Les accompagnants adultes ne sont pas prioritaires. Les orienter vers la grille.\n' +
      '5. Les fournisseurs sont réglés à quai, selon disponibilité.\n\n' +
      'Toute question relative au présent protocole est à adresser au capitaine. Pas à la docteure Sorel.\n\n' +
      '— A. Rousset',
  },
];

export const DIARY_R9: DiaryRule[] = [
  { chapter: C, text: 'Le pont de la Sauldre est couché dans l’eau. On a traversé à pied, sur des pierres que quelqu’un a posées là il y a deux cents ans.' },
  { chapter: C, if: flag('theo_libere'), text: 'Théo est sorti de sa cage avec un clou dans la poche. Il avait gravé la route du retour sur le plancher. Il marche deux pas derrière moi. Je ne lui demande pas de se rapprocher.' },
  { chapter: C, if: THEO_CAGE, text: 'J’ai vu Théo dans une cage, au milieu d’une rivière, et je l’ai regardé partir. Je n’ai pas d’excuse. Je n’en cherche plus.' },
  { chapter: C, if: flag('captifs_liberes'), text: 'Lou, Nathan, Aurélie. J’écris leurs noms pour qu’ils existent ailleurs que sur un bon de livraison.' },
  { chapter: C, if: all(flag('r9_livraison_partie'), not(THEO_CAGE)), text: 'Il y avait deux enfants dans des cages et je n’ai rien fait. Je me répète que nous n’aurions pas gagné. Je n’arrive pas à me croire.' },
  { chapter: C, if: flag('r9_alerte'), text: 'Les hommes de la barge ont des combinaisons grises et des voix de guichet. Maintenant, ils savent qu’on arrive.' },
  { chapter: C, if: flag('r9_gaspard_aide'), text: 'Gaspard Lenoir a pris une balle pour des enfants qu’il aurait vendus il y a une semaine. Je ne sais pas quoi faire de ça.' },
  { chapter: C, if: flag('r9_soldat_abattu'), text: 'Le jeune soldat courait vers sa radio. Il n’y est pas arrivé. Je me dis que c’était lui ou nous. C’est vrai. Ça ne suffit pas.' },
];
