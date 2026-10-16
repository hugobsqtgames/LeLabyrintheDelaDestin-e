/**
 * Chapitre 10 — Les Tourbières (« Ce que garde le brouillard »)
 * La digue de rondins, la tourbe qui prend l’un des vôtres, la cabane de
 * l’observatrice et la Dame qui garde la seule passe du marais.
 */
import type { Condition, DiaryRule, DocumentDef, Effect, Scene } from '../../engine/types';
import {
  all,
  background,
  companionIs,
  diary,
  discover,
  doc,
  flag,
  give,
  has,
  heal,
  hurt,
  journal,
  meal,
  not,
  notFlag,
  notWithUs,
  p,
  profile,
  rel,
  say,
  set,
  take,
  when,
  withUs,
  xp,
} from '../helpers';

const C = 'r6';

/** Personne ne vous accompagne. */
const SEUL = all(notWithUs('kaz'), notWithUs('maelle'), notWithUs('ines'), notWithUs('theo'), notWithUs('nour'));
/** Celui ou celle que la tourbe prend : le plus lourd du groupe. */
const V_KAZ = withUs('kaz');
const V_MAELLE = all(notWithUs('kaz'), withUs('maelle'));
const V_INES = all(notWithUs('kaz'), notWithUs('maelle'), withUs('ines'));
const V_THEO = all(notWithUs('kaz'), notWithUs('maelle'), notWithUs('ines'), withUs('theo'));
const V_NOUR = all(notWithUs('kaz'), notWithUs('maelle'), notWithUs('ines'), notWithUs('theo'), withUs('nour'));
const THEO_CAPTIF = companionIs('theo', 'captured');
const CARNET_LU: Condition = { type: 'document', doc: 'doc_r6_carnet' };
const THEO_SANS_CARNET: Condition = all(V_THEO, { type: 'visited', scene: 'r6_sauve_tard' });
const BOSS = 'Combat de boss. Une défaite serait fatale.';

const relVictime = (n: number): Effect[] => [
  when(V_KAZ, [rel('kaz', n)]),
  when(V_MAELLE, [rel('maelle', n)]),
  when(V_INES, [rel('ines', n)]),
  when(V_THEO, [rel('theo', n)]),
  when(V_NOUR, [rel('nour', n)]),
];

export const chapterR6: Scene[] = [
  // -------------------------------------------------------------------------
  // La digue
  // -------------------------------------------------------------------------
  {
    id: 'r6_digue',
    chapter: C,
    location: 'tourbieres',
    title: 'La digue de rondins',
    kind: 'story',
    checkpoint: true,
    text: [
      p('La route du convoi s’enfonce dans le blanc et n’en ressort pas. Au bout de cent mètres, le bitume s’arrête net, comme coupé au couteau, et laisse place à une digue de rondins posés à même la tourbe. Le brouillard est si épais qu’on ne voit pas le troisième rondin.'),
      p('Le marais respire. Des bulles crèvent à la surface des fosses, lentes, grasses, avec une odeur d’œuf pourri et de feuilles mortes. Il n’y a pas d’oiseaux. Il n’y a pas de vent. Il y a seulement, quelque part sur la droite, très loin ou très près, un petit bruit sec et régulier. Des dents.'),
      p('Dans la boue du bas-côté, des empreintes de pieds nus, des dizaines, toutes dans le même sens. La horde des vergers est passée par ici. Elle descend dans le marais.'),
      p('Inès s’avance la première, l’arbalète en travers de la poitrine. Elle tâte chaque rondin du bout du pied avant d’y mettre son poids, et ne dit rien.', withUs('ines')),
      say('kaz', '« La tourbe, c’est de l’eau qui a oublié qu’elle était de l’eau. Elle s’en souvient quand on marche dessus. »', withUs('kaz')),
      say('maelle', '« Personne ne se presse. Personne ne lâche personne. »', withUs('maelle')),
      p('Personne pour ouvrir la marche, personne pour la fermer. Vous tâtez le premier rondin du bout du pied. Il s’enfonce d’un doigt, puis tient.', SEUL),
    ],
    choices: [
      {
        id: 'encorder',
        text: 'S’encorder les uns aux autres, trois mètres entre chacun.',
        kind: 'item', time: 0.5,
        once: true,
        visibleIf: [not(SEUL)],
        requires: [has('corde')],
        effects: [set('r6_encordes'), journal('Le groupe s’est encordé pour traverser la digue.', false)],
      },
      {
        id: 'nour',
        text: 'Demander à Nour de compter les pas.',
        kind: 'talk',
        once: true,
        visibleIf: [withUs('nour')],
        effects: [set('r6_nour_compte'), rel('nour', 1), journal('Nour compte les pas sur la digue des tourbières.', false)],
      },
      { id: 'avancer', text: 'S’engager sur la digue.', kind: 'move', time: 0.5, next: 'r6_brume' },
    ],
  },
  {
    id: 'r6_brume',
    chapter: C,
    location: 'tourbieres',
    title: 'Dans le blanc',
    kind: 'story',
    timed: { seconds: 12, fallback: 'coucher' },
    text: [
      p('Le cliquetis se rapproche. Puis il s’arrête, et c’est pire.'),
      p('À vingt mètres devant vous, deux formes se hissent hors d’une fosse et prennent pied sur la digue. Des corps gonflés, la peau grise et luisante comme du savon, des herbes noires collées dans les cheveux. Des Noyés. Ils restent un moment immobiles, la tête oscillante, l’eau ruisselant de leurs manches.'),
      p('Puis ils se mettent à marcher. Pas vers vous : devant vous, dans le même sens que vous, vers le cœur du marais. Lentement, du pas de ceux qui ont tout le temps.'),
      p('Inès lève le poing. Halte. Elle montre deux doigts, puis le dos des Noyés, puis son arbalète. Elle vous laisse décider.', withUs('ines')),
      p('Nour s’est arrêtée de compter. Ses lèvres continuent de bouger.', all(withUs('nour'), flag('r6_nour_compte'))),
    ],
    choices: [
      {
        id: 'coucher',
        text: 'Se mettre à plat ventre sur les rondins et attendre qu’ils disparaissent.',
        kind: 'stealth', time: 0.5,
        check: {
          stat: 'discretion',
          difficulty: 8,
          success: 'r6_passage',
          failure: 'r6_noyes_combat',
          successEffects: [set('r6_noyes_devant')],
        },
      },
      {
        id: 'suivre',
        text: '[Éclaireur] Les suivre de loin, en lisant leurs pas, jusqu’à ce qu’ils quittent la digue.',
        kind: 'stealth', time: 0.5,
        requires: [profile('eclaireur')],
        effects: [set('r6_noyes_devant'), xp(10)],
        next: 'r6_passage',
      },
      {
        id: 'frapper',
        text: 'Les prendre à revers maintenant, tant qu’ils vous tournent le dos.',
        kind: 'fight',
        next: 'r6_noyes_embuscade',
      },
    ],
  },
  {
    id: 'r6_noyes_embuscade',
    chapter: C,
    location: 'tourbieres',
    title: 'Dans leur dos',
    kind: 'combat',
    text: [p('Vous franchissez les vingt mètres en quelques pas souples. Le premier Noyé ne se retourne même pas.')],
    encounter: {
      enemies: ['noye', 'noye'],
      canFlee: false,
      ambush: true,
      victory: 'r6_passage',
      defeat: 'r6_noyes_defaite',
      intro: 'Embuscade sur la digue : deux Noyés, de dos. Ils visent les chevilles. Ne tombez pas.',
    },
    choices: [],
  },
  {
    id: 'r6_noyes_combat',
    chapter: C,
    location: 'tourbieres',
    title: 'Les Noyés de la digue',
    kind: 'combat',
    text: [p('Un rondin craque sous votre genou. Les deux têtes se tournent ensemble, lentement, et le cliquetis reprend, plus vite.')],
    encounter: {
      enemies: ['noye', 'noye'],
      canFlee: false,
      victory: 'r6_passage',
      defeat: 'r6_noyes_defaite',
      intro: 'Deux Noyés reviennent vers vous sur la digue. Leurs mains cherchent vos jambes.',
    },
    choices: [],
  },
  {
    id: 'r6_noyes_defaite',
    chapter: C,
    location: 'tourbieres',
    title: 'La tourbe',
    kind: 'story',
    text: [
      p('Une main froide se referme sur votre cheville et tire. Vous basculez. La tourbe vous prend jusqu’à la taille, puis jusqu’à la poitrine, et elle a le goût de la terre et de la rouille.'),
      p('Des mains vous empoignent par le col et par le sac. On vous hisse sur les rondins comme un poisson, et quelqu’un vous frappe dans le dos jusqu’à ce que vous recrachiez le marais.', not(SEUL)),
      p('Vos doigts trouvent un piquet. Vous vous y accrochez, vous tirez, vous tirez encore, et la tourbe finit par vous rendre avec un bruit de baiser.', SEUL),
      p('Quand vous relevez la tête, les Noyés ne sont plus là. Ils ont repris leur chemin vers le cœur du marais, comme si vous n’aviez été qu’un caillou sur la route. Votre sac est plus léger.'),
    ],
    onEnter: [hurt(3, 'les Noyés de la digue'), take('ration', 1), set('r6_noyes_devant')],
    choices: [{ id: 'repartir', text: 'Repartir, en grelottant.', kind: 'move', time: 0.5, next: 'r6_chute' }],
  },
  {
    id: 'r6_passage',
    chapter: C,
    location: 'tourbieres',
    title: 'Ce qui tombe dans la tourbe',
    kind: 'story',
    text: [
      p('Vous restez à plat ventre sur les rondins, la joue contre le bois pourri, le temps qu’il faut. Les Noyés s’éloignent sur la digue, devant vous. Le brouillard les avale. Le cliquetis, lui, met plus longtemps à disparaître.', flag('r6_noyes_devant')),
      p('Ils vont dans la même direction que vous. Vous essayez de ne pas y penser.', flag('r6_noyes_devant')),
      p('Les deux Noyés glissent de la digue et s’enfoncent dans la tourbe sans un remous. Une bulle, puis une autre. Puis plus rien. Ce qui tombe dans la tourbe n’en ressort pas.', notFlag('r6_noyes_devant')),
      say('kaz', '« Enterrés et noyés en même temps. On ne fait pas plus économique. »', all(withUs('kaz'), notFlag('r6_noyes_devant'))),
      p('Vous reprenez la marche. Le bois gémit sous les pas. Certains rondins sont neufs, d’autres sont noirs et mous comme du pain trempé, et rien ne permet de les distinguer avant d’y avoir posé le pied.'),
    ],
    choices: [{ id: 'suite', text: 'Continuer sur la digue.', kind: 'move', time: 0.5, next: 'r6_chute' }],
  },

  // -------------------------------------------------------------------------
  // La chute
  // -------------------------------------------------------------------------
  {
    id: 'r6_chute',
    chapter: C,
    location: 'tourbieres',
    title: 'Le rondin',
    kind: 'story',
    routes: [{ if: SEUL, to: 'r6_enlise' }],
    timed: { seconds: 10, fallback: 'mains' },
    text: [
      p('Ça arrive sans bruit. Un rondin qui a l’air de tous les autres, et qui ne l’est pas.'),
      p('Le craquement est sec, presque poli. Kaz disparaît jusqu’à la ceinture, puis jusqu’aux aisselles. Ses bras battent la surface, qui se referme autour de lui comme une bouche. Cent vingt kilos, et le marais les veut tous.', V_KAZ),
      p('Maëlle pose le pied, et le rondin se dérobe. Elle ne crie pas. Elle s’enfonce jusqu’à la poitrine, les bras écartés à plat sur la tourbe, exactement comme il faut, et elle vous regarde. « Doucement. » Ce n’est pas une prière. C’est une consigne.', V_MAELLE),
      p('Devant, Inès teste un rondin du bout du pied, comme les cent autres. Celui-là tient. C’est le suivant qui casse, sous son poids, et elle tombe en avant, l’arbalète d’abord. La tourbe la prend jusqu’au cou.', V_INES),
      p('Théo marche en regardant ses pieds, son carnet de cartes serré contre lui. Le rondin s’enfonce d’un coup, et Théo avec. La tourbe lui monte au menton. Il lève le carnet au-dessus de sa tête, par réflexe, pour ne pas le mouiller.', V_THEO),
      p('« Trois cent quarante et un, trois cent quarante-deux… » Au trois cent quarante-troisième pas, il n’y a plus de rondin. Nour est si légère que la tourbe hésite. Puis elle l’aspire quand même, jusqu’aux épaules.', all(V_NOUR, flag('r6_nour_compte'))),
      p('Nour marche dans vos pas, exactement dans vos pas. Mais elle pose le pied un peu à gauche, une seule fois, et la tourbe l’aspire jusqu’aux épaules.', all(V_NOUR, notFlag('r6_nour_compte'))),
      p('La corde se tend d’un coup et vous arrache presque l’épaule. Elle tient. Pour l’instant.', flag('r6_encordes')),
      p('Chaque seconde, la tourbe en prend un peu plus.'),
    ],
    choices: [
      {
        id: 'corde_tendue',
        text: 'S’arc-bouter sur les rondins et tirer sur la corde qui vous relie.',
        kind: 'item', time: 0.5,
        visibleIf: [flag('r6_encordes')],
        requires: [has('corde')],
        check: { stat: 'force', difficulty: 7, success: 'r6_sauve', failure: 'r6_sauve_tard' },
      },
      {
        id: 'corde',
        text: 'Lancer la corde, et tirer.',
        kind: 'item', time: 0.5,
        visibleIf: [notFlag('r6_encordes')],
        requires: [has('corde')],
        check: { stat: 'force', difficulty: 8, success: 'r6_sauve', failure: 'r6_sauve_tard' },
      },
      {
        id: 'pompier',
        text: '[Pompier] Se coucher à plat, répartir le poids, et sortir le corps comme on sort quelqu’un d’un étang gelé.',
        kind: 'explore', time: 0.5,
        requires: [background('pompier')],
        effects: [xp(15)],
        next: 'r6_sauve',
      },
      {
        id: 'mains',
        text: 'S’allonger sur les rondins et tirer à mains nues.',
        kind: 'explore', time: 0.5,
        check: { stat: 'force', difficulty: 9, success: 'r6_sauve', failure: 'r6_sauve_tard' },
      },
    ],
  },
  {
    id: 'r6_enlise',
    chapter: C,
    location: 'tourbieres',
    title: 'Le rondin',
    kind: 'story',
    timed: { seconds: 10, fallback: 'ramper' },
    text: [
      p('Ça arrive sans bruit. Un rondin qui a l’air de tous les autres, et qui ne l’est pas.'),
      p('Vous êtes dans la tourbe jusqu’à la taille avant d’avoir compris. Elle est froide, épaisse, et elle tire. Pas brutalement : patiemment. Chaque mouvement vous enfonce un peu plus. Le rondin le plus proche est à une longueur de bras. Un peu plus, peut-être.'),
      p('Personne ne viendra. Personne ne saura même que vous étiez sur cette digue.'),
    ],
    choices: [
      {
        id: 'corde',
        text: 'Lancer la corde autour du piquet de la digue et se hisser.',
        kind: 'item', time: 0.5,
        requires: [has('corde')],
        next: 'r6_sauve',
      },
      {
        id: 'ramper',
        text: 'Basculer sur le dos, écarter les bras, et ramper vers les rondins.',
        kind: 'explore', time: 0.5,
        check: { stat: 'survie', difficulty: 8, success: 'r6_sauve', failure: 'r6_sauve_tard' },
      },
      {
        id: 'force',
        text: 'Agripper le rondin du bout des doigts et tirer de toutes vos forces.',
        kind: 'explore', time: 0.5,
        check: { stat: 'force', difficulty: 9, success: 'r6_sauve', failure: 'r6_sauve_tard' },
      },
    ],
  },
  {
    id: 'r6_sauve',
    chapter: C,
    location: 'tourbieres',
    title: 'Rendu par le marais',
    kind: 'story',
    text: [
      p('Kaz sort de la tourbe avec un bruit de ventouse et reste à quatre pattes sur les rondins, à souffler comme un phoque. Il est noir jusqu’aux oreilles.', V_KAZ),
      say('kaz', '« Irena disait que je finirais dans la vase. Elle avait raison. Mais pas aujourd’hui. »', V_KAZ),
      say('kaz', '« Deux fois, maintenant. Deux fois que tu me sors de quelque chose. » Il ne vous regarde pas en le disant. « Je tiens les comptes, moi aussi. »', all(V_KAZ, flag('kaz_rachete'))),
      p('Maëlle franchit seule les derniers centimètres. Elle essuie ses mains sur son pantalon, vérifie son sac, puis vous regarde.', V_MAELLE),
      say('maelle', '« Merci. » Elle le dit tout de suite, cette fois. Pas comme on rend une dette.', V_MAELLE),
      p('Inès crache de la tourbe, essuie son arbalète avec sa manche avant de s’essuyer elle-même. Puis elle vous regarde, longtemps.', V_INES),
      say('ines', '« Bien. » Chez elle, c’est un discours.', V_INES),
      p('Théo remonte, le carnet toujours levé, intact. Il le regarde, puis vous regarde, et il fait une chose qu’il ne fait jamais : il rit. Un rire bref, nerveux, qui s’arrête aussitôt.', V_THEO),
      p('Nour s’assoit sur un rondin, grelottante, et reprend son souffle. Puis elle dit : « Trois cent quarante-trois. Je reprends à trois cent quarante-trois. »', V_NOUR),
      p('Vous roulez sur les rondins et restez là, sur le dos, à regarder le blanc au-dessus de vous. Votre cœur cogne contre le bois. Personne n’a rien vu. C’est peut-être mieux ainsi.', SEUL),
      p('Plus loin, la digue mène à une butte de terre ferme où se tassent des bouleaux maigres et une cabane au toit de tôle.'),
    ],
    onEnter: [...relVictime(2), set('r6_tire_vite'), xp(20)],
    choices: [{ id: 'ilot', text: 'Gagner la terre ferme.', kind: 'move', next: 'r6_ilot' }],
  },
  {
    id: 'r6_sauve_tard',
    chapter: C,
    location: 'tourbieres',
    title: 'Ce que garde la tourbe',
    kind: 'story',
    text: [
      p('Il faut trois tentatives, et la troisième vous laisse les paumes à vif. Kaz remonte enfin, mais sa jambe gauche est restée coincée sous un rondin, et quand il l’arrache, le pantalon est ouvert du genou à la cheville. Il boite. Il ne dit rien, et c’est pire que tout ce qu’il aurait pu dire.', V_KAZ),
      p('Maëlle remonte à la troisième tentative, le souffle court, une longue estafilade sur l’avant-bras là où une branche noyée l’a lacérée. Elle l’examine d’un œil d’infirmière. « Ça ira. » Ça ira, mais elle serre les dents à chaque pas.', V_MAELLE),
      p('Inès remonte, mais sans son carquois. Les carreaux sont quelque part sous un mètre de tourbe. Elle tient son poignet tordu contre elle et ne se plaint pas.', V_INES),
      p('Théo remonte. Le carnet, non. Il regarde l’endroit où il a disparu : toutes ses cartes, Valombre rue par rue, les carrières, le port. Il ne pleure pas. Il a quinze ans et il ne pleure pas, et c’est terrible à regarder.', V_THEO),
      p('Nour remonte bleue de froid, une chaussure en moins. Vous lui donnez vos chaussettes. Elle les enfile sans un mot, ce qui chez elle est un remerciement.', V_NOUR),
      p('Une partie de ce qui était dans les sacs est restée en bas. La tourbe ne rend rien.', not(SEUL)),
      p('Vous sortez de la tourbe à la force des bras, au bout d’un temps qui vous paraît une heure. Une partie de votre sac est restée en bas, et quelque chose s’est déchiré dans votre épaule.', SEUL),
      p('Plus loin, la digue mène à une butte de terre ferme où se tassent des bouleaux maigres et une cabane au toit de tôle.'),
    ],
    onEnter: [
      when(SEUL, [hurt(4, 'la tourbe')], [hurt(2, 'l’effort dans la tourbe')]),
      take('ration', 1),
      take('bandage', 1),
      when(V_INES, [take('carreau', 4)]),
      set('r6_tire_tard'),
    ],
    choices: [{ id: 'ilot', text: 'Gagner la terre ferme.', kind: 'move', next: 'r6_ilot' }],
  },

  // -------------------------------------------------------------------------
  // L’îlot et la cabane
  // -------------------------------------------------------------------------
  {
    id: 'r6_ilot',
    chapter: C,
    location: 'tourbieres',
    title: 'L’îlot du tourbier',
    kind: 'story',
    checkpoint: true,
    text: [
      p('L’îlot fait vingt pas de large. De la terre ferme, enfin, qui ne bouge pas sous les semelles. Une cabane de planches goudronnées, une perche avec un nichoir, et sur la porte une plaque émaillée : « Réserve naturelle des Fonds-Noirs — Station d’observation. Prière de ne pas déranger les oiseaux. »'),
      p('Il n’y a plus d’oiseaux à déranger.'),
      p('Sur le chambranle, une main noire, large comme une pelle. Du cambouis, encore gras. Quelqu’un est passé ici il y a peu, et s’est appuyé contre la porte pour reprendre son souffle. Vous ne connaissez qu’un homme qui se peint les mains de cette façon.', flag('gaspard_epargne')),
      say('kaz', '« Gaspard. Il marche vers l’écluse, lui aussi. Il n’a plus que ça. »', all(flag('gaspard_epargne'), withUs('kaz'))),
      p('Maëlle a déjà ouvert sa trousse sur une souche.', withUs('maelle')),
    ],
    choices: [
      {
        id: 'soins',
        text: 'Laisser Maëlle nettoyer vos écorchures à l’alcool.',
        kind: 'rest', time: 0.5,
        once: true,
        visibleIf: [withUs('maelle')],
        effects: [heal(5), rel('maelle', 1)],
      },
      { id: 'cabane', text: 'Fouiller la cabane.', kind: 'explore', time: 0.5, once: true, next: 'r6_cabane' },
      { id: 'passe', text: 'Continuer vers le cœur du marais.', kind: 'move', time: 0.5, next: 'r6_passe' },
    ],
  },
  {
    id: 'r6_cabane',
    chapter: C,
    location: 'tourbieres',
    title: 'La station d’observation',
    kind: 'story',
    text: [
      p('Une table, un lit de camp, un poêle froid depuis des mois. Aux murs, des aquarelles d’oiseaux épinglées avec soin : butor étoilé, busard des roseaux, bécassine. Puis, à partir d’une certaine date, plus d’oiseaux. Des silhouettes humaines, au crayon, de dos, debout dans l’eau.'),
      p('Sur la table, un carnet à couverture cirée, une tasse sèche, et l’étui d’une paire de jumelles, ouvert. Vide.'),
      p('Sous le lit, une caisse : une conserve, une bouteille d’alcool à brûler, des chiffons, une fusée de détresse orange encore dans son emballage. Au mur, une carte du marais. Une ligne de petites croix blanches traverse les îlots du nord, juste à côté d’un endroit entouré trois fois au crayon : « la passe ».'),
      p('Théo s’est planté devant la carte. Il a déjà sorti son crayon.', all(withUs('theo'), not(THEO_SANS_CARNET))),
      p('Théo regarde les carnets vierges empilés sur l’étagère. Il en prend un, le tient sans l’ouvrir, et vous interroge des yeux. Vous hochez la tête. Il commence par dessiner la cabane.', THEO_SANS_CARNET),
    ],
    onEnter: [
      doc('doc_r6_carnet'),
      set('r6_piquets'),
      give('ration', 1),
      give('alcool', 1),
      give('chiffons', 1),
      give('fusee', 1),
      xp(10),
      journal('Dans la cabane des Fonds-Noirs, une observatrice a tracé un chemin de piquets blancs à travers les îlots.', false),
    ],
    choices: [
      {
        id: 'theo',
        text: 'Attendre que Théo ait recopié la carte des piquets.',
        kind: 'talk', time: 0.5,
        once: true,
        visibleIf: [withUs('theo')],
        effects: [rel('theo', 1)],
      },
      { id: 'retour', text: 'Ressortir.', kind: 'move', next: 'r6_ilot' },
    ],
  },

  // -------------------------------------------------------------------------
  // La passe
  // -------------------------------------------------------------------------
  {
    id: 'r6_passe',
    chapter: C,
    location: 'tourbieres',
    title: 'La grande fosse',
    kind: 'story',
    checkpoint: true,
    text: [
      p('La digue s’élargit, puis se resserre entre deux fosses d’eau noire, si étroite qu’il faut y passer un par un. C’est la seule passe. De chaque côté, la tourbe, les joncs, et le brouillard qui fume au ras de l’eau.'),
      p('Ils sont là. Une trentaine de Muets debout dans la grande fosse, de l’eau jusqu’à la taille, immobiles, tournés vers le même point. Leurs dents cliquettent doucement, sans rythme, comme une pluie fine sur un toit de tôle.'),
      p('Les deux Noyés de la digue sont arrivés avant vous. Ils ont pris leur place au premier rang, tout près de la passe.', flag('r6_noyes_devant')),
      p('Au milieu de la fosse, à deux mètres de la passe, se tient quelque chose qui n’est pas un arbre. Trois mètres de haut, peut-être, si l’on compte la mousse. Une silhouette couverte de sphaigne et de vase, des racines pendues aux bras comme des manches trop longues, la tête penchée. Elle ne bouge pas. Les autres la regardent. C’est elle qu’ils attendaient.'),
      say('kaz', '« Je n’aime pas les comités d’accueil. »', withUs('kaz')),
      say('ines', '« La passe est à deux mètres d’elle. Personne ne passe à deux mètres d’elle. »', withUs('ines')),
      p('Au nord, à peine visibles, des piquets peints en blanc s’enfoncent dans le brouillard, d’îlot en îlot. Le chemin de l’observatrice.', flag('r6_piquets')),
      say('nour', '« Quatre cent six pas depuis la cabane », chuchote Nour. « Le carnet disait quatre cents. Elle avait des grandes jambes. »', all(withUs('nour'), flag('r6_nour_compte'), flag('r6_piquets'))),
      p('Elle a tourné la tête vers la digue. Elle vous cherche.', flag('r6_dame_alertee')),
    ],
    choices: [
      {
        id: 'piquets',
        text: 'Suivre les piquets blancs à travers les îlots, en silence.',
        kind: 'stealth', time: 0.5,
        visibleIf: [flag('r6_piquets'), notFlag('r6_dame_alertee')],
        check: { stat: 'discretion', difficulty: 7, success: 'r6_ilots', failure: 'r6_reperes' },
      },
      {
        id: 'ilots',
        text: 'Contourner la fosse par les îlots du nord, à tâtons, en silence.',
        kind: 'stealth', time: 0.5,
        visibleIf: [notFlag('r6_piquets'), notFlag('r6_dame_alertee')],
        check: { stat: 'discretion', difficulty: 9, success: 'r6_ilots', failure: 'r6_reperes' },
      },
      {
        id: 'cloche',
        text: 'Confier la cloche du Berger au courant du chenal sud, et la laisser sonner.',
        kind: 'item', time: 0.5,
        requires: [has('cloche_berger')],
        warning: 'La cloche ne vous servira plus à l’écluse.',
        next: 'r6_cloche',
      },
      {
        id: 'fusee',
        text: 'Tirer une fusée de détresse loin au sud, dans les joncs, et attendre.',
        kind: 'item', time: 0.5,
        requires: [has('fusee')],
        effects: [take('fusee', 1), set('r6_leurre_fusee')],
        next: 'r6_evitee',
      },
      {
        id: 'molotov',
        text: 'Mettre le feu aux joncs secs, côté sud, avec un cocktail Molotov.',
        kind: 'item', time: 0.5,
        requires: [has('molotov')],
        effects: [take('molotov', 1), set('r6_leurre_feu')],
        next: 'r6_evitee',
      },
      {
        id: 'canal',
        text: 'Suivre Kaz le long du vieux canal de drainage, qui contourne le marais par l’est.',
        kind: 'move', time: 1.5,
        visibleIf: [withUs('kaz')],
        effects: [set('r6_canal'), rel('kaz', 1)],
        next: 'r6_evitee',
      },
      {
        id: 'detour',
        text: 'Rebrousser chemin et contourner tout le marais par la lande.',
        kind: 'move', time: 3,
        warning: 'Le détour vous coûtera la matinée.',
        effects: [set('r6_detour')],
        next: 'r6_evitee',
      },
      {
        id: 'affronter',
        text: 'S’engager sur la passe et affronter la Dame des tourbières.',
        kind: 'fight', time: 0.5,
        visibleIf: [notFlag('r6_noyes_devant')],
        warning: BOSS,
        next: 'r6_dame',
      },
      {
        id: 'affronter_noyes',
        text: 'S’engager sur la passe et affronter la Dame des tourbières et sa garde.',
        kind: 'fight', time: 0.5,
        visibleIf: [flag('r6_noyes_devant')],
        warning: BOSS,
        next: 'r6_dame_noyes',
      },
    ],
  },
  {
    id: 'r6_ilots',
    chapter: C,
    location: 'tourbieres',
    title: 'Les îlots',
    kind: 'story',
    text: [
      p('D’îlot en îlot, de touffe en touffe. Les piquets blancs surgissent du brouillard un par un, toujours trop tard, toujours là.', flag('r6_piquets')),
      p('D’îlot en îlot, de touffe en touffe, sans autre repère que la terre qui cède ou qui tient. Deux fois, vous posez le pied dans le vide et le retirez juste à temps.', notFlag('r6_piquets')),
      p('À votre droite, à quinze mètres, la grande fosse. Vous entendez l’eau bouger autour des jambes des Muets quand ils se balancent. Vous entendez autre chose : un souffle très lent, très profond, qui fait monter des bulles. Elle respire.'),
      p('Un des Noyés de la digue se tient sur votre chemin, de l’eau jusqu’aux genoux, de dos. Il faudra passer à portée de son bras.', flag('r6_noyes_devant')),
      p('Le dernier îlot est le plus proche d’elle. Il n’y a pas d’autre chemin.'),
    ],
    choices: [
      {
        id: 'avancer',
        text: 'Passer, un pas après l’autre, sans respirer.',
        kind: 'stealth', time: 0.5,
        check: { stat: 'discretion', difficulty: 8, success: 'r6_evitee', failure: 'r6_reperes', successEffects: [set('r6_par_ilots')] },
      },
      {
        id: 'nour',
        text: 'Laisser Nour compter à voix basse, et poser les pieds sur ses nombres.',
        kind: 'stealth', time: 0.5,
        visibleIf: [withUs('nour'), flag('r6_nour_compte')],
        check: { stat: 'discretion', difficulty: 7, success: 'r6_evitee', failure: 'r6_reperes', successEffects: [set('r6_par_ilots'), rel('nour', 1)] },
      },
      {
        id: 'ines',
        text: 'Mettre vos pieds exactement dans les traces d’Inès.',
        kind: 'stealth', time: 0.5,
        visibleIf: [withUs('ines')],
        check: { stat: 'discretion', difficulty: 7, success: 'r6_evitee', failure: 'r6_reperes', successEffects: [set('r6_par_ilots'), rel('ines', 1)] },
      },
    ],
  },
  {
    id: 'r6_reperes',
    chapter: C,
    location: 'tourbieres',
    title: 'Le regard',
    kind: 'story',
    timed: { seconds: 10, fallback: 'reculer' },
    text: [
      p('Un bruit de succion sous votre semelle. Presque rien. Assez.'),
      p('La tête couverte de mousse se relève lentement et se tourne vers vous. Il n’y a pas d’yeux sous la sphaigne, ou alors ils sont trop profonds pour qu’on les voie. Mais elle vous regarde. Autour d’elle, trente têtes se tournent en même temps.'),
      p('Le cliquetis cesse. Le silence est pire.'),
    ],
    choices: [
      {
        id: 'reculer',
        text: 'Reculer vers la digue, sans courir, sans lui tourner le dos.',
        kind: 'flee', time: 0.5,
        effects: [set('r6_dame_alertee'), hurt(2, 'les ronces et la tourbe')],
        next: 'r6_passe',
      },
      {
        id: 'combat',
        text: 'Tenir. Si elle vient, elle viendra.',
        kind: 'fight',
        visibleIf: [notFlag('r6_noyes_devant')],
        warning: BOSS,
        next: 'r6_dame',
      },
      {
        id: 'combat_noyes',
        text: 'Tenir. Si elle vient, elle viendra, et sa garde avec elle.',
        kind: 'fight',
        visibleIf: [flag('r6_noyes_devant')],
        warning: BOSS,
        next: 'r6_dame_noyes',
      },
    ],
  },
  {
    id: 'r6_cloche',
    chapter: C,
    location: 'tourbieres',
    title: 'La cloche du Berger',
    kind: 'story',
    text: [
      p('Vous défaites le chiffon qui étouffe la cloche. Elle pèse dans la main le poids exact de ce qu’elle a coûté.'),
      p('Vous l’avez prise au cou d’un mort, sous Valombre, au milieu de son troupeau.', flag('berger_tue')),
      p('Vous l’attachez par un lacet à un bout de rondin, et vous poussez le rondin dans le chenal qui part vers le sud. Le courant est presque nul. Presque.'),
      p('La cloche tinte. Une fois. Une autre. Le rondin s’éloigne dans le brouillard en sonnant doucement, comme une vache égarée dans un pré.'),
      p('Dans la grande fosse, les têtes se tournent. Puis les corps. Puis la Dame se détache de la tourbe avec un bruit d’arbre qu’on déracine, et elle suit le son, à pas lents, et les autres la suivent. Le troupeau a trouvé un nouveau berger, et le berger une nouvelle cloche.'),
      say('kaz', '« À l’écluse, on en aurait peut-être eu besoin. » Il hausse les épaules. « On aurait aussi pu mourir ici. »', withUs('kaz')),
    ],
    onEnter: [take('cloche_berger'), set('r6_cloche_perdue'), journal('La cloche du Berger a emmené la Dame des tourbières vers le sud du marais.')],
    choices: [{ id: 'passer', text: 'Franchir la passe pendant que la cloche sonne encore.', kind: 'stealth', next: 'r6_evitee' }],
  },
  {
    id: 'r6_evitee',
    chapter: C,
    location: 'tourbieres',
    title: 'De l’autre côté',
    kind: 'story',
    text: [
      p('Le dernier îlot. Puis la digue reprend, de l’autre côté de la fosse, et vous y posez le pied comme on pose le pied sur un quai. Derrière vous, la Dame n’a pas bougé. Elle attend toujours ce qu’elle attend. Ce n’était pas vous.', flag('r6_par_ilots')),
      p('La fusée monte en sifflant, pâlit dans le brouillard et retombe loin au sud, une lueur rouge qui palpite derrière les joncs. La Dame se tourne vers elle. La grande fosse se vide lentement, trente corps qui pataugent vers la lumière. Vous passez dans leur dos.', flag('r6_leurre_fusee')),
      p('La bouteille éclate dans les joncs secs. Les flammes prennent mal, puis d’un coup, et une colonne de fumée orange se lève dans le blanc. Les Muets se tournent vers le feu comme vers une fenêtre éclairée, et la Dame les y mène. Vous passez dans leur dos, dans l’odeur de tourbe brûlée.', flag('r6_leurre_feu')),
      p('Vous franchissez la passe un par un, à deux mètres de l’endroit où elle se tenait. L’eau tourne encore dans le trou qu’elle a laissé. Au sud, de plus en plus loin, la cloche tinte.', flag('r6_cloche_perdue')),
      p('Le canal de drainage est un fossé droit comme une règle, couvert de lentilles d’eau, bordé d’un sentier à peine plus large qu’un pied.', flag('r6_canal')),
      say('kaz', '« Les fossés sont toujours plus vieux que les marais. Les ingénieurs passent, les marais reviennent, mais les fossés se souviennent du plan. » Il a l’air ravi. Vous ne voyez pas la Dame. Vous ne l’entendez pas. C’est exactement ce que vous vouliez.', flag('r6_canal')),
      p('Le détour vous prend la matinée. La lande, les ronces, des clôtures effondrées, une ferme vide où un chien est mort au bout de sa chaîne. Pas un Muet. Pas de Dame. Seulement le temps qui passe, et que vous ne rattraperez pas.', flag('r6_detour')),
    ],
    onEnter: [set('dame_evitee'), xp(40), journal('Vous avez traversé les tourbières sans affronter la Dame.')],
    choices: [{ id: 'suite', text: 'Marcher vers la lisière du marais.', kind: 'move', time: 0.5, next: 'r6_fin' }],
  },

  // -------------------------------------------------------------------------
  // La Dame
  // -------------------------------------------------------------------------
  {
    id: 'r6_dame',
    chapter: C,
    location: 'tourbieres',
    title: 'La Dame des tourbières',
    kind: 'combat',
    text: [p('À deux mètres, la mousse frémit. La Dame se redresse dans un long bruit de succion, et le marais tout entier semble se lever avec elle.')],
    encounter: {
      enemies: ['dame_tourbiere'],
      canFlee: false,
      victory: 'r6_dame_tombe',
      defeat: 'r6_mort',
      intro: 'La Dame des tourbières. Sa mousse sèche brûle bien ; gardez-vous quand la tourbe s’ouvre sous vos pieds.',
    },
    choices: [],
  },
  {
    id: 'r6_dame_noyes',
    chapter: C,
    location: 'tourbieres',
    title: 'La Dame et sa garde',
    kind: 'combat',
    text: [
      p('La Dame se redresse dans un long bruit de succion. Au premier rang, un des Noyés de la digue se retourne avec elle. Vous l’avez laissé passer, tout à l’heure. Il vous attendait.'),
    ],
    encounter: {
      enemies: ['dame_tourbiere', 'noye'],
      canFlee: false,
      victory: 'r6_dame_tombe',
      defeat: 'r6_mort',
      intro: 'La Dame des tourbières et un Noyé. Sa mousse sèche brûle bien ; ne laissez pas le Noyé vous tenir les chevilles.',
    },
    choices: [],
  },
  {
    id: 'r6_mort',
    chapter: C,
    location: 'tourbieres',
    title: 'La grande fosse',
    kind: 'death',
    ending: 'mort',
    text: [
      p('La tourbe s’ouvre sous vous, et cette fois, aucune main ne vous rattrape. Elle est froide, puis elle ne l’est plus. Le brouillard se referme au-dessus de l’endroit où vous étiez.'),
      p('Au printemps, s’il y a un printemps, quelqu’un verra dans la grande fosse une silhouette de plus, debout parmi les autres, tournée vers le même point.'),
    ],
    choices: [],
  },
  {
    id: 'r6_dame_tombe',
    chapter: C,
    location: 'tourbieres',
    title: 'Ce que gardait la mousse',
    kind: 'story',
    text: [
      p('Elle tombe comme tombe un arbre mort : lentement d’abord, puis d’un coup. La tourbe la reçoit sans un bruit. La mousse flotte quelques secondes à la surface, puis la fosse se referme.'),
      p('Autour, les Muets restés dans l’eau tournent la tête dans tous les sens, comme des gens à qui l’on vient d’annoncer que le train ne viendra pas. Puis, un à un, ils se dispersent dans le brouillard.'),
      p('Sur la passe, quelque chose est resté accroché à une racine : une courroie de cuir, et au bout, une paire de jumelles, la lentille fêlée, pleine de vase.'),
      p('Vous pensez à l’étui vide, sur la table de la cabane. « Au moins, je saurai enfin ce qu’ils attendent. » Elle ne l’a pas su. Ou alors, c’était elle.', CARNET_LU),
      say('theo', '« Elle avait l’air de quelqu’un », dit Théo. Personne ne lui répond.', withUs('theo')),
      say('kaz', '« Paix à elle. Et à mes genoux. »', withUs('kaz')),
      p('Maëlle vous fait tourner sur vous-même, examine vos bras, votre cou, vos mains. Pas de morsure. Elle souffle enfin.', withUs('maelle')),
    ],
    onEnter: [set('dame_tuee'), xp(30), give('bandage', 2), give('ration', 1), journal('Vous avez abattu la Dame des tourbières.')],
    choices: [{ id: 'suite', text: 'Franchir la passe.', kind: 'move', time: 0.5, next: 'r6_fin' }],
  },

  // -------------------------------------------------------------------------
  // Fin
  // -------------------------------------------------------------------------
  {
    id: 'r6_fin',
    chapter: C,
    location: 'tourbieres',
    title: 'Fin du chapitre',
    kind: 'chapterEnd',
    text: [
      p('Le brouillard se lève d’un coup, comme on tire un drap. Derrière vous, le marais redevient ce qu’il était sans doute avant : une lande brune et plate, des joncs, quelques bouleaux. On ne devinerait jamais.'),
      p('Devant, sur une butte, un village. Des remorques de camion mises bout à bout en guise de rempart, des sacs de sable, un clocher, et de la fumée qui monte droit de trois cheminées. De la fumée de cuisine. Brennes.'),
      p('La Dame est au fond de sa fosse. Personne ne passera plus à deux mètres d’elle.', flag('dame_tuee')),
      p('La Dame est toujours là-bas, debout dans son brouillard. Vous pensez à ceux qui marchent derrière vous.', flag('dame_evitee')),
      p('Pour la première fois depuis les Carrières, votre sac ne tinte plus quand vous marchez.', flag('r6_cloche_perdue')),
      p('Sur la route qui longe le village, très loin, un camion roule vers le fleuve, lentement, sans phares. Vous ne pouvez pas voir ce qu’il transporte. Vous le savez.', THEO_CAPTIF),
      p('Nour s’est assise sur une borne et vide la tourbe de ses chaussures. Elle a compté tout le marais. Elle ne dit pas le chiffre.', withUs('nour')),
      p('Il reste {reste} avant l’aube du septième.'),
    ],
    onEnter: [meal(), diary('r6'), discover('brennes')],
    choices: [{ id: 'suite', text: 'Chapitre 11 : Brennes', kind: 'move', time: 1, next: 'r7_barricade' }],
  },
];

export const DOCUMENTS_R6: DocumentDef[] = [
  {
    id: 'doc_r6_carnet',
    title: 'Carnet d’observation des Fonds-Noirs',
    source: 'Carnet à couverture cirée, cabane de l’îlot, tourbières',
    body:
      '12 mars. Toujours pas de butor. La réserve est fermée depuis la Fièvre, personne ne viendra me chercher, et c’est très bien ainsi. Je reste avec les oiseaux.\n\n' +
      '2 avril. Premier promeneur sur la digue. Un homme en ciré, qui marchait sans regarder où il posait les pieds. Il est tombé dans la fosse aux Joncs et n’est pas remonté. Ce soir, je l’ai vu debout dans l’eau, à la même place, la tête au ras des roseaux. Il claquait des dents.\n\n' +
      '19 mai. Ils sont onze. Ils viennent tous du sud, par la route. La tourbe les garde : ils ne pourrissent pas, ils s’alourdissent. Ils suivent les bruits d’eau, et tout ce qui tinte. Une cloche de troupeau, à la ferme Morel, les a tous fait lever un matin.\n\n' +
      '3 juillet. Ils se rassemblent autour de la grande fosse, près de la passe. Debout, immobiles, tournés vers le même point. Comme des gens sur un quai qui attendent un train.\n\n' +
      '28 août. La lumière les attire : la nuit, ils suivent ma lampe. Je ne l’allume plus. J’ai planté des piquets peints en blanc à travers les îlots du nord, pour rentrer dans le noir. Quatre cents pas, en comptant bien.\n\n' +
      '14 octobre. J’ai voulu voir de plus près. Il ne faut jamais vouloir voir de plus près. Morsure à l’avant-bras. Ce n’est pas profond.\n\n' +
      '15 octobre. Fièvre. Je vais descendre m’asseoir au bord de la grande fosse, avec les jumelles. Au moins, je saurai enfin ce qu’ils attendent.\n\n' +
      '— M. Varenne, garde-animatrice',
  },
];

export const DIARY_R6: DiaryRule[] = [
  { chapter: C, text: 'Le marais ne fait pas de bruit. C’est ce qui m’a le plus fait peur : pas les dents, le silence entre les dents.' },
  { chapter: C, if: all(flag('r6_tire_vite'), not(SEUL)), text: 'La tourbe a voulu l’un des nôtres. Je ne le lui ai pas laissé.' },
  { chapter: C, if: all(flag('r6_tire_tard'), not(SEUL)), text: 'J’ai mis trop longtemps à tirer. La tourbe a gardé de quoi se souvenir de nous.' },
  { chapter: C, if: SEUL, text: 'La tourbe m’a pris jusqu’à la poitrine. Personne ne m’a vu en sortir. Personne ne m’aurait vu ne pas en sortir.' },
  { chapter: C, if: CARNET_LU, text: 'Dans la cabane, une femme avait dessiné des oiseaux, puis des gens debout dans l’eau. Elle les appelait les promeneurs.' },
  { chapter: C, if: flag('dame_tuee'), text: 'J’ai tué la Dame des tourbières. Elle portait des jumelles autour du cou.' },
  { chapter: C, if: flag('dame_evitee'), text: 'Nous sommes passés à côté d’elle. Elle attend encore. Je me demande ce qu’elle attend.' },
  { chapter: C, if: flag('r6_cloche_perdue'), text: 'J’ai laissé la cloche au marais. Je saurai à l’écluse si j’ai eu tort.' },
  { chapter: C, if: THEO_CAPTIF, text: 'Un camion, au loin, sur la route du fleuve. Je n’ai pas pu le quitter des yeux.' },
  { chapter: C, if: flag('gaspard_epargne'), text: 'Une main de cambouis sur une porte. Gaspard marche devant nous, seul.' },
];
