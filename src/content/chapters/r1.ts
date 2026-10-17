/**
 * Chapitre 5 — Les Vergers noyés
 * Au-delà du Pont de Fer : des pommiers dans un mètre d’eau brune, des Noyés
 * sous la surface, et sur un toit de ferme, Claire Delmas et son fils Jules.
 */
import type { DiaryRule, DocumentDef, Scene } from '../../engine/types';
import {
  all,
  any,
  background,
  companionIs,
  diary,
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
  questFx,
  rel,
  say,
  set,
  step,
  take,
  when,
  withUs,
  xp,
} from '../helpers';

const C = 'r1';
const THEO_CAPTIF = companionIs('theo', 'captured');
const SEUL = all(notWithUs('maelle'), notWithUs('theo'), notWithUs('kaz'), notWithUs('ines'), notWithUs('nour'));
const KAZ_HEROS = companionIs('kaz', 'hero');
const MAELLE_HEROS = companionIs('maelle', 'hero');
const INES_HEROS = companionIs('ines', 'hero');

export const chapterR1: Scene[] = [
  // -------------------------------------------------------------------------
  // La berge
  // -------------------------------------------------------------------------
  {
    id: 'r1_berge',
    chapter: C,
    location: 'vergers',
    title: 'Au-delà du Pont de Fer',
    kind: 'story',
    checkpoint: true,
    text: [
      p('Passé le Pont de Fer, la route de halage s’enfonce dans les vergers et disparaît. La digue a cédé quelque part en amont, cet hiver ou le précédent, et l’eau n’est jamais repartie. Un mètre d’eau brune, immobile, entre des rangées de pommiers qui continuent de fleurir comme si de rien n’était. Des pétales blancs flottent à la surface, collés en radeaux.'),
      p('Ça sent la vase, la pomme fermentée, et autre chose en dessous, de plus lourd.'),
      p('À gauche, le talus de l’ancienne voie ferrée longe le verger, deux mètres au-dessus de l’eau. Sec, droit, et visible depuis des kilomètres.'),
      p('Sur la route haute, de l’autre côté du verger, des traces de pneus larges dans la boue, fraîches de ce matin. Un camion lourd, qui a pris le chemin le plus sûr. Celui des Ferrailleurs. Théo est dans la cage, sur le plateau, et chaque heure l’éloigne un peu plus.', THEO_CAPTIF),
      p('Théo s’est accroupi au bord de l’eau. Il compte les rangées de pommiers et les reporte sur son carnet, une croix pour chaque arbre.', withUs('theo')),
      p('Inès plonge la crosse de son arbalète dans l’eau, la ressort, regarde la ligne de vase. « Jusqu’à la taille. Le fond est mou. »', withUs('ines')),
      p('Vous plongez la crosse de votre arbalète dans l’eau et vous regardez la ligne de vase : jusqu’à la taille, et le fond est mou. Avec Malik, dans les galeries inondées sous les Carrières, la règle était simple. On tâte avant de poser son poids, et on ne parle pas.', INES_HEROS),
      p('Kaz regarde l’eau comme on regarde un vieil ennemi. « Elle ne bouge pas. Une eau qui ne bouge pas, ça veut dire qu’il n’y a plus personne pour ouvrir les vannes. »', withUs('kaz')),
      p('Personne à vos côtés face à l’eau. Personne pour vous tenir la main si le fond se dérobe.', SEUL),
    ],
    choices: [
      {
        id: 'eau',
        text: 'Entrer dans l’eau et traverser le verger entre les rangées.',
        kind: 'explore', time: 0.5,
        check: { stat: 'survie', difficulty: 8, success: 'r1_remous', failure: 'r1_cheville' },
      },
      {
        id: 'kaz',
        text: 'Demander à Kaz de lire l’eau pour vous.',
        kind: 'talk', time: 0.5,
        visibleIf: [withUs('kaz')],
        effects: [set('r1_kaz_eau'), rel('kaz', 1)],
        next: 'r1_remous',
      },
      {
        id: 'kaz_heros',
        text: '[Vous, Kaz] Lire l’eau vous-même, comme votre père vous l’a appris.',
        kind: 'explore', time: 0.5,
        visibleIf: [KAZ_HEROS],
        effects: [xp(10)],
        next: 'r1_remous',
      },
      {
        id: 'talus',
        text: 'Prendre le talus de la voie ferrée, au sec mais à découvert.',
        kind: 'stealth', time: 1,
        check: { stat: 'discretion', difficulty: 8, success: 'r1_talus', failure: 'r1_talus_combat' },
      },
    ],
  },
  {
    id: 'r1_remous',
    chapter: C,
    location: 'vergers',
    title: 'Les remous',
    kind: 'story',
    text: [
      p('L’eau est froide au point de couper le souffle. Vous avancez à petits pas, en tâtant le fond du pied avant d’y mettre votre poids.', notFlag('r1_kaz_eau')),
      p('Au bout de vingt mètres, vous les voyez. Pas eux : leurs traces. Des cercles qui s’élargissent à la surface, sans vent ni poisson pour les faire. Une bulle qui crève. Une ondulation lente qui remonte une rangée, s’arrête, repart. Ils sont là-dessous, couchés dans la vase, et ils attendent qu’une jambe passe à leur portée.', notFlag('r1_kaz_eau')),
      say('kaz', '« Regarde la surface, pas le fond. » Kaz marche devant, l’eau à mi-cuisse, et montre du doigt une ligne de piquets qui dépasse à peine. « Les vieux fossés de drainage suivent les clôtures. Eux, ils descendent dans les fossés parce que c’est plus profond. Nous, on marche sur les talus entre deux. » Il crache. « Mon père curait des fossés comme ça. Il serait content de savoir que ça sert encore. »', flag('r1_kaz_eau')),
      p('Vous savez où regarder. Les vieux fossés de drainage suivent les clôtures, et c’est là qu’ils se couchent, parce que c’est plus profond. Vous marchez donc sur les talus entre deux, en suivant la ligne de piquets. Votre père curait des fossés comme ceux-là. Il serait content de savoir que ça sert encore.', KAZ_HEROS),
      p('Vous contournez les remous un par un, en silence. Une fois, une main pâle affleure à un mètre de vous, ouverte, comme pour cueillir quelque chose, puis redescend.'),
      p('Nour compte vos pas à voix basse. Elle s’arrête à cent douze, quand le toit apparaît.', withUs('nour')),
    ],
    onEnter: [xp(15)],
    choices: [{ id: 'ferme', text: 'Rejoindre le toit qui émerge au bout des rangées.', kind: 'move', next: 'r1_ferme' }],
  },
  {
    id: 'r1_cheville',
    chapter: C,
    location: 'vergers',
    title: 'Sous la surface',
    kind: 'combat',
    text: [
      p('Vous n’avez rien vu venir. Une main se referme sur votre cheville, molle et froide, et tire. Vous tombez à genoux dans l’eau, la bouche pleine de vase. Juste à côté, la surface se soulève : une tête gonflée, des yeux blancs, et ce cliquetis mouillé de dents qui s’entrechoquent sous l’eau.'),
    ],
    encounter: {
      enemies: ['noye', 'noye'],
      canFlee: false,
      victory: 'r1_cheville_apres',
      defeat: 'r1_a_terre',
      intro: 'Deux Noyés surgissent de l’eau. Dans un mètre de vase, impossible de courir.',
    },
    choices: [],
  },
  {
    id: 'r1_cheville_apres',
    chapter: C,
    location: 'vergers',
    title: 'L’eau se referme',
    kind: 'story',
    text: [
      p('Les deux corps redescendent lentement, sans bruit, et l’eau se referme sur eux comme si rien ne s’était passé. Vous restez debout, le souffle court, à attendre un troisième qui ne vient pas.'),
      p('Vous ne sentez plus vos pieds. Vous sentez très bien, en revanche, la marque des doigts autour de votre cheville.'),
      say('maelle', '« Montre. » Maëlle relève votre jambe de pantalon, regarde la peau, la retourne. « Pas de morsure. Des bleus. Avance, tu te réchaufferas en marchant. »', withUs('maelle')),
    ],
    choices: [{ id: 'ferme', text: 'Continuer jusqu’au toit qui émerge au bout des rangées.', kind: 'move', next: 'r1_ferme' }],
  },
  {
    id: 'r1_talus_combat',
    chapter: C,
    location: 'vergers',
    title: 'Le ballast',
    kind: 'combat',
    text: [
      p('Le ballast roule sous vos pas. Une pierre dévale le talus et claque contre un rail. En contrebas, dans les ronces, deux silhouettes se redressent : un Rôdeur, la peau grise, et derrière lui un autre, plus maigre, qui se met déjà à courir.'),
    ],
    encounter: {
      enemies: ['rodeur', 'coureur'],
      canFlee: true,
      victory: 'r1_talus',
      defeat: 'r1_a_terre',
      flee: 'r1_talus',
      intro: 'Un Rôdeur et un Coureur remontent le talus vers vous.',
    },
    choices: [],
  },
  {
    id: 'r1_a_terre',
    chapter: C,
    location: 'vergers',
    title: 'Dans l’herbe',
    kind: 'story',
    text: [
      p('Quand vous rouvrez les yeux, vous êtes sur le dos, dans l’herbe mouillée d’un talus. Le ciel est blanc. Vous avez le goût de la vase dans la gorge et une douleur sourde partout.'),
      say('maelle', '« Ne bouge pas. » Maëlle serre un bandage autour de votre bras. Ses mains sont rouges de froid. « Tu as perdu connaissance une minute. Une longue minute. »', withUs('maelle')),
      say('kaz', '« Par le col, comme un chiot », dit Kaz. Il est trempé jusqu’aux épaules. « Tu pèses plus lourd qu’un chiot. »', withUs('kaz')),
      say('ines', '« Ils sont morts », dit Inès en rechargeant son arbalète. Elle ne dit rien d’autre. Elle n’en a pas besoin.', withUs('ines')),
      p('Vous ne vous rappelez pas avoir rampé jusque-là. Votre sac est ouvert, à moitié vide : ce qui en est tombé est resté au fond.', SEUL),
    ],
    onEnter: [hurt(4, 'les Noyés du verger'), take('ration', 1)],
    choices: [{ id: 'repartir', text: 'Se relever, et repartir vers la ferme.', kind: 'move', time: 0.5, next: 'r1_ferme' }],
  },
  {
    id: 'r1_talus',
    chapter: C,
    location: 'vergers',
    title: 'Le talus',
    kind: 'story',
    text: [
      p('Du haut du talus, le verger se déplie comme une carte. Des centaines de pommiers alignés, la tête hors de l’eau. Une grange effondrée sur un côté. Une maison sur une butte, au fond, dont l’étage paraît sec. Et au milieu, à demi submergée, une ferme dont le toit d’ardoise dépasse comme le dos d’une bête.'),
      p('Une écharpe rouge est nouée à la cheminée. Deux silhouettes sont assises contre elle. Une grande, une toute petite.'),
      p('Autour de la ferme, l’eau bouge. Vous comptez cinq remous qui tournent lentement autour des murs, toujours dans le même sens, comme des chiens autour d’un arbre où un chat est monté. Le côté nord, contre la grange, reste calme : le fossé y est trop peu profond pour eux.'),
      p('Sur la route haute, les ornières du camion tracent deux lignes droites vers le viaduc. Il est passé ce matin. D’ici, vous ne pouvez que les suivre des yeux.', THEO_CAPTIF),
    ],
    onEnter: [set('r1_vu_haut'), xp(10)],
    choices: [{ id: 'descendre', text: 'Descendre du talus vers la ferme, par le côté nord.', kind: 'move', next: 'r1_ferme' }],
  },

  // -------------------------------------------------------------------------
  // La ferme
  // -------------------------------------------------------------------------
  {
    id: 'r1_ferme',
    chapter: C,
    location: 'vergers',
    title: 'Le toit',
    kind: 'story',
    checkpoint: true,
    illustration: 'vergers',
    text: [
      p('La ferme est une longère de pierre dont l’eau a avalé le rez-de-chaussée. Les volets du premier flottent, arrachés. Sur le toit, contre la cheminée, une femme maigre et droite tient un petit garçon sur ses genoux, et une valise de cuir sous son bras, comme on tient une rampe.'),
      p('Autour de la maison, les remous tournent. Lentement. Patiemment. Ils ont tout leur temps.'),
      p('Le garçon lève la tête vers vous. Il se lève, se met au garde-à-vous sur les ardoises et vous fait un salut militaire, la paume tournée vers l’extérieur, de la main gauche.'),
      p('Nour fixe l’eau sans ciller. « Ils font le tour de la maison en quarante et un pas. Toujours. Ça laisse vingt pas où personne ne regarde le côté de la grange. »', withUs('nour')),
      p('La grange, juste à côté, a perdu la moitié de son toit. Par la porte ouverte, on devine la proue d’une barque à fond plat, échouée sur un tas de foin.', notFlag('r1_barque')),
      p('La barque de la grange est amarrée à un pommier, à vingt mètres du toit, prête.', flag('r1_barque')),
    ],
    onEnter: [questFx('q_delmas', 'active', 'toit'), journal('Une femme et son fils sont réfugiés sur le toit d’une ferme noyée, cernés par les Noyés.')],
    choices: [
      {
        id: 'parler',
        text: 'Héler la femme du toit, à voix basse.',
        kind: 'talk',
        once: true,
        next: 'r1_claire',
      },
      {
        id: 'grange',
        text: 'Fouiller la grange.',
        kind: 'explore', time: 0.5,
        visibleIf: [notFlag('r1_barque')],
        next: 'r1_grange',
      },
      {
        id: 'maison',
        text: 'Fouiller la maison sur la butte.',
        kind: 'explore', time: 0.5,
        visibleIf: [notFlag('r1_maison_fouillee')],
        next: 'r1_maison',
      },
      {
        id: 'barque',
        text: 'Ramer jusqu’au toit avec la barque, sans un bruit.',
        kind: 'stealth', time: 0.5,
        visibleIf: [notFlag('r1_vu_haut'), notWithUs('nour')],
        requires: [flag('r1_barque')],
        check: { stat: 'discretion', difficulty: 9, success: 'r1_sauvetage', failure: 'r1_toit_combat', successEffects: [set('r1_par_barque')], failureEffects: [set('r1_par_combat')] },
      },
      {
        id: 'barque_nord',
        text: 'Ramer par le côté de la grange, pendant les vingt pas où personne ne regarde.',
        kind: 'stealth', time: 0.5,
        visibleIf: [any(flag('r1_vu_haut'), withUs('nour'))],
        requires: [flag('r1_barque')],
        check: { stat: 'discretion', difficulty: 7, success: 'r1_sauvetage', failure: 'r1_toit_combat', successEffects: [set('r1_par_barque')], failureEffects: [set('r1_par_combat')] },
      },
      {
        id: 'corde',
        text: 'Tendre une corde entre le grand pommier et la cheminée, et les faire passer au-dessus de l’eau.',
        kind: 'item', time: 0.5,
        requires: [has('corde')],
        check: { stat: 'force', difficulty: 8, success: 'r1_sauvetage', failure: 'r1_toit_combat', successEffects: [set('r1_par_corde')], failureEffects: [set('r1_par_combat')] },
      },
      {
        id: 'pompier',
        text: '[Ancien pompier] Organiser une évacuation de crue, comme à l’exercice.',
        kind: 'explore', time: 0.5,
        requires: [background('pompier')],
        effects: [set('r1_par_pompier'), xp(20)],
        next: 'r1_sauvetage',
      },
      {
        id: 'cloche',
        text: 'Faire tinter la cloche du Berger au fond du verger pour attirer les Noyés.',
        kind: 'item', time: 0.5,
        visibleIf: [has('cloche_berger')],
        effects: [set('r1_par_cloche'), xp(15)],
        next: 'r1_sauvetage',
      },
      {
        id: 'fusee',
        text: 'Allumer une fusée de détresse et la jeter loin, à l’autre bout des rangées.',
        kind: 'item', time: 0.5,
        requires: [has('fusee')],
        effects: [take('fusee'), set('r1_par_fusee')],
        next: 'r1_sauvetage',
      },
      {
        id: 'combat',
        text: 'Entrer dans l’eau et faire face à ce qui tourne autour de la maison.',
        kind: 'fight', time: 0.5,
        effects: [set('r1_par_combat')],
        next: 'r1_toit_combat',
      },
      {
        id: 'laisser',
        text: 'Les laisser là. Vous n’avez pas le temps.',
        kind: 'sacrifice',
        warning: 'Claire et Jules resteront sur le toit.',
        next: 'r1_abandon',
      },
    ],
  },
  {
    id: 'r1_claire',
    chapter: C,
    location: 'vergers',
    title: 'Claire Delmas',
    kind: 'story',
    text: [
      say('claire', '« Ne criez pas. » Sa voix porte juste assez, sèche, sans un mot de trop. « Ils entendent. Ils ne voient pas grand-chose, mais ils entendent. Je m’appelle Claire Delmas. Lui, c’est Jules. »'),
      p('Jules refait son salut à l’envers. Il a six ans, les lèvres gercées, et le sérieux absolu d’un enfant qui joue au soldat parce que c’est le seul jeu qui lui reste.'),
      say('claire', '« Deux jours. On a voulu couper par les vergers, l’eau ne montait qu’aux genoux. Et puis ils sont sortis de la vase. On a eu juste le temps de grimper par la lucarne. » Elle serre la valise. « On a bu la pluie. Il n’en tombe plus depuis hier. »'),
      p('La valise est vieille, en cuir craquelé, avec des coins de laiton. Elle ne la lâche pas une seconde. Même pour tenir son fils, elle la garde coincée sous son coude.'),
      say('claire', '« On va à l’écluse de Morvan. La radio dit qu’ils prennent les familles. » Elle vous regarde. « Vous aussi, j’imagine. Tout le monde. »'),
      p('Théo lève la main vers Jules, hésite, puis lui rend son salut. À l’endroit. Jules fronce les sourcils, et corrige le sien. Il le fait toujours à l’envers, mais avec plus de soin.', withUs('theo')),
    ],
    choices: [
      {
        id: 'verite',
        text: 'Lui dire ce que vous avez entendu sur l’enregistrement de la capitainerie : le tri à la grille, les porteurs achetés.',
        kind: 'talk',
        visibleIf: [flag('verite_ferrand')],
        effects: [set('r1_claire_prevenue'), journal('Vous avez prévenu Claire Delmas : à l’écluse, on trie à la grille.', false)],
        next: 'r1_claire_verite',
      },
      {
        id: 'promettre',
        text: '« On va vous sortir de là. Tenez encore un peu. »',
        kind: 'talk',
        effects: [set('r1_promesse')],
        next: 'r1_ferme',
      },
      { id: 'retour', text: 'Lui faire signe d’attendre, et réfléchir.', kind: 'move', next: 'r1_ferme' },
    ],
  },
  {
    id: 'r1_claire_verite',
    chapter: C,
    location: 'vergers',
    title: 'Ce que dit Rousset',
    kind: 'story',
    text: [
      p('Vous le lui dites à voix basse, par-dessus l’eau. Le capitaine Rousset. Les porteurs payés en places sur le pont inférieur. « Le reste est négociable. »'),
      p('Claire ne dit rien pendant longtemps. Elle regarde son fils, puis le fleuve, au loin, derrière les pommiers.'),
      say('claire', '« J’ai donné des cours de piano pendant vingt-deux ans à des enfants qui n’en voulaient pas. Je sais faire semblant d’être aimable avec des gens qui décident à ma place. » Elle redresse les épaules. « Alors on ira quand même. Mais je saurai à qui je souris. Merci. »'),
    ],
    onEnter: [xp(10)],
    choices: [{ id: 'retour', text: 'Revenir au problème des Noyés.', kind: 'move', next: 'r1_ferme' }],
  },
  {
    id: 'r1_grange',
    chapter: C,
    location: 'vergers',
    title: 'La grange',
    kind: 'story',
    text: [
      p('L’eau de la grange arrive à mi-poitrine et sent le foin pourri. Des caisses à pommes flottent, empilées contre une poutre. Sur un tas de foin que l’eau n’a pas encore atteint, une barque à fond plat, peinte en vert, avec une seule rame attachée dedans par une ficelle.'),
      p('Vous la poussez dehors. Elle prend un peu l’eau par une planche disjointe, mais elle flotte. Dans un coin, accrochée à un clou, une pompe à main rouillée : du métal récupérable.'),
      p('Inès bouche la fente de la planche avec un chiffon et de la poix grattée sur une poutre. « Elle tiendra une heure. C’est assez. »', withUs('ines')),
    ],
    onEnter: [set('r1_barque'), give('ferraille', 1)],
    choices: [{ id: 'retour', text: 'Amarrer la barque près du toit.', kind: 'move', next: 'r1_ferme' }],
  },
  {
    id: 'r1_maison',
    chapter: C,
    location: 'vergers',
    title: 'La maison sur la butte',
    kind: 'story',
    text: [
      p('La maison est construite sur une butte, assez haut pour que l’eau n’ait noyé que la cave. La porte n’est pas fermée à clé. Dans la cuisine, une chaise est tournée vers la fenêtre, face au verger, et sur la table, un bocal de pommes séchées soigneusement fermé, une bouteille d’eau-de-vie de cidre, et une enveloppe timbrée qui n’a jamais été postée.'),
      p('L’adresse est à Lyon. Sur le dos de l’enveloppe, au crayon : « Si quelqu’un passe et va vers le sud, postez-la. Il paraît que la poste reviendra. »'),
      p('Dans le placard, des torchons propres, pliés au carré. Personne n’est revenu les déplier.'),
      p('Maëlle prend un torchon, le regarde, le remet en place, puis le reprend. « Il n’en aura plus besoin. »', withUs('maelle')),
    ],
    onEnter: [set('r1_maison_fouillee'), doc('doc_r1_lettre'), give('ration', 1), give('alcool', 1), give('chiffons', 1), xp(10)],
    choices: [{ id: 'retour', text: 'Ressortir vers la ferme.', kind: 'move', next: 'r1_ferme' }],
  },

  // -------------------------------------------------------------------------
  // Le sauvetage
  // -------------------------------------------------------------------------
  {
    id: 'r1_toit_combat',
    chapter: C,
    location: 'vergers',
    title: 'Autour de la maison',
    kind: 'combat',
    text: [
      p('Les remous cessent de tourner. Ils s’arrêtent tous en même temps, et puis ils viennent vers vous. Sur le toit, Claire plaque la main sur la bouche de Jules.'),
    ],
    encounter: {
      enemies: ['noye', 'noye'],
      canFlee: false,
      victory: 'r1_sauvetage',
      defeat: 'r1_toit_defaite',
      intro: 'Les Noyés qui encerclaient la ferme se jettent sur vous. Gardez vos jambes : ils visent les chevilles.',
    },
    choices: [],
  },
  {
    id: 'r1_toit_defaite',
    chapter: C,
    location: 'vergers',
    title: 'La valise',
    kind: 'story',
    text: [
      p('Vous coulez. L’eau brune se referme au-dessus de votre tête, et une main serre votre mollet, et une autre votre ceinture. Vous ne savez plus où est le haut.'),
      p('Puis un choc sourd, au-dessus de vous. Un deuxième. La main lâche votre mollet. Vous remontez en crachant, et vous voyez Claire, debout dans l’eau jusqu’aux épaules, qui abat sa valise de toutes ses forces sur un crâne gonflé. Une fois. Deux fois. La serrure saute. Des partitions s’envolent et se posent sur l’eau, des dizaines, comme des feuilles mortes.'),
      p('Le métronome tombe en dernier. Il fait un petit bruit de pierre et disparaît.'),
      p('Kaz vous empoigne par le col et vous hisse sur le talus, puis retourne chercher Jules à bout de bras.', withUs('kaz')),
      p('Ce sont vos compagnons qui achèvent le dernier Noyé et tirent tout le monde sur la terre ferme.', all(notWithUs('kaz'), not(SEUL))),
      p('Vous ne savez pas comment vous avez regagné la berge, ni comment Claire et Jules y sont arrivés avant vous.', SEUL),
    ],
    onEnter: [hurt(5, 'les Noyés de la ferme'), set('r1_valise_perdue')],
    choices: [{ id: 'berge', text: 'Reprendre votre souffle sur la berge.', kind: 'move', time: 0.5, next: 'r1_descente' }],
  },
  {
    id: 'r1_sauvetage',
    chapter: C,
    location: 'vergers',
    title: 'Descendre du toit',
    kind: 'story',
    text: [
      p('Vous poussez la barque vers la ferme, à petits coups de rame, en comptant dans votre tête. La rame entre dans l’eau sans un clapotis. Derrière la maison, les remous continuent leur ronde sans vous voir. La coque touche les ardoises. Claire fait glisser Jules vers vous.', flag('r1_par_barque')),
      p('La corde siffle, s’enroule autour de la cheminée, et tient. Vous la tendez autour du tronc du grand pommier jusqu’à ce qu’elle vibre comme une corde de piano. Claire y accroche la ceinture de son fils et le pousse dans le vide. Jules glisse au-dessus de l’eau, les jambes repliées, sans un cri, et atterrit dans vos bras.', flag('r1_par_corde')),
      p('Vous avez déjà vu des fermes comme celle-ci, du temps des crues de printemps, avec des familles sur le toit et des vaches qui nageaient en rond. La procédure vous revient d’un coup : une ligne de vie, l’enfant d’abord, la mère ensuite, personne ne se met à l’eau sans y être attaché. Les Noyés n’y changent rien. Ils ne sont qu’un courant de plus.', flag('r1_par_pompier')),
      p('La cloche du Berger tinte au fond du verger, accrochée à une branche, agitée par la ficelle que vous tirez de loin. Les remous s’arrêtent. Puis, un par un, ils s’en vont vers le son, en ligne, comme un troupeau. Vous avez dix minutes, peut-être moins.', flag('r1_par_cloche')),
      p('La fusée crache une lumière rouge et tombe dans l’eau à deux cents mètres, en sifflant. Toute la surface du verger se met à bouger dans cette direction. Vous ne pensiez pas qu’il y en avait autant.', flag('r1_par_fusee')),
      p('Les deux corps flottent sur le ventre, entre les pommiers. Les autres remous se sont éloignés, comme si quelque chose leur avait appris la prudence. Claire descend par la gouttière et se laisse glisser dans l’eau, Jules accroché à son dos, et vous la guidez entre les corps jusqu’au talus.', flag('r1_par_combat')),
      p('Au bord du toit, Claire s’arrête. Elle tient la valise contre sa poitrine. Il n’y a de place que pour elle, Jules, et ce qu’on peut porter d’une main.'),
      say('claire', '« Il y a un métronome là-dedans, et les partitions de mes élèves. Vingt-deux ans. » Elle ne bouge pas. « Je sais ce que vous allez dire. »'),
    ],
    onEnter: [xp(30)],
    choices: [
      {
        id: 'porter',
        text: 'Prendre la valise vous-même. Elle n’est pas si lourde.',
        kind: 'talk', time: 0.5,
        effects: [set('r1_valise_sauvee'), rel('claire', 2)],
        next: 'r1_descente',
      },
      {
        id: 'nour',
        text: 'Laisser Nour proposer de porter le métronome.',
        kind: 'talk',
        visibleIf: [withUs('nour')],
        effects: [set('r1_valise_sauvee'), set('r1_nour_metronome'), rel('nour', 1), rel('claire', 2)],
        next: 'r1_descente',
      },
      {
        id: 'laisser',
        text: '« Votre fils ou la valise. Pas les deux. »',
        kind: 'talk',
        effects: [set('r1_valise_laissee'), rel('claire', -1)],
        next: 'r1_descente',
      },
    ],
  },
  {
    id: 'r1_descente',
    chapter: C,
    location: 'vergers',
    title: 'La terre ferme',
    kind: 'story',
    text: [
      p('Sur le talus, Claire s’assoit dans l’herbe et serre Jules sans rien dire. Longtemps. Il se laisse faire, les bras le long du corps, comme un soldat qu’on décore.'),
      p('Elle a gardé la valise. Elle la pose à côté d’elle, la main à plat sur le cuir, et elle la regarde comme si elle venait de la retrouver après des années.', all(flag('r1_valise_sauvee'), notFlag('r1_nour_metronome'))),
      p('Nour a porté le métronome tout le long, serré contre son ventre. Elle a remonté le mécanisme sans demander. Il bat doucement dans l’herbe. Nour compte les coups, et Jules compte avec elle. Pour la première fois, Nour sourit à un adulte. C’est à Claire.', flag('r1_nour_metronome')),
      p('La valise est restée sur le toit, contre la cheminée, à côté de l’écharpe rouge. Claire ne s’est pas retournée une seule fois. Dans sa poche, il y a une seule partition, pliée en huit.', flag('r1_valise_laissee')),
      p('Claire n’a plus de valise. Elle regarde ses mains vides comme si elles appartenaient à quelqu’un d’autre. Quelques partitions détrempées s’accrochent encore aux branches basses des pommiers.', flag('r1_valise_perdue')),
      p('Maëlle s’accroupit devant Jules, lui fait boire de l’eau par petites gorgées, regarde ses yeux, ses ongles, ses mains. « Il n’a rien. Il a soif, c’est tout. Il a été bien gardé. »', withUs('maelle')),
      p('Vous vous accroupissez devant Jules. De l’eau par petites gorgées, les yeux, les ongles, les mains : il n’a rien, il a soif, c’est tout. Il a le même air buté que Théo à six ans, quand il refusait de pleurer chez le médecin. Vous le dites à Claire : il a été bien gardé.', MAELLE_HEROS),
      say('claire', '« Ce matin, un camion est passé sur la route haute. Il y avait une cage sur le plateau. Un garçon dedans, avec un dessin au feutre sur la main. Il nous a regardés tout le temps qu’il a mis à passer. » Elle vous dévisage. « Vous le connaissez. »', THEO_CAPTIF),
      say('claire', '« On part devant. Jules marche vite quand il veut, et je ne veux plus attendre nulle part. » Elle se relève, droite, maigre, et lui prend la main. « On se reverra à Morvan. Je vous garderai une place dans la file. »'),
      p('Jules vous fait un dernier salut, à l’envers, et ils s’en vont sur la route haute, la femme et l’enfant, deux silhouettes qui rapetissent entre les pommiers.'),
    ],
    onEnter: [
      set('delmas_sauves'),
      step('q_delmas', 'route'),
      rel('claire', 2),
      when(withUs('theo'), [rel('theo', 1)]),
      when(withUs('maelle'), [rel('maelle', 1)]),
      xp(20),
      journal('Vous avez tiré Claire et Jules Delmas du toit de la ferme. Ils marchent devant vous, vers l’écluse.'),
    ],
    choices: [{ id: 'verger', text: 'Reprendre la route à travers les rangées hautes du verger.', kind: 'move', next: 'r1_verger' }],
  },
  {
    id: 'r1_abandon',
    chapter: C,
    location: 'vergers',
    title: 'Le salut',
    kind: 'story',
    text: [
      p('Vous tournez le dos à la ferme. Personne ne crie derrière vous. Claire ne vous appelle pas. Elle a compris tout de suite, et ce silence est pire que n’importe quel reproche.'),
      p('Elle vous avait cru, pourtant. « Tenez encore un peu. » Ce sont les derniers mots qu’elle aura entendus de vous.', flag('r1_promesse')),
      p('Au moment où vous atteignez les rangées hautes, vous vous retournez une seule fois. Sur le toit, contre la cheminée, Jules s’est mis debout. Il vous fait son salut, à l’envers, la main gauche, et il le tient jusqu’à ce que les pommiers le cachent.'),
      p('Théo ne dit rien. Il ferme son carnet sans finir la carte du verger.', withUs('theo')),
      p('Maëlle marche devant, sans vous attendre. Elle a soigné des inconnus pendant quatorze mois. Elle n’a pas besoin de dire ce qu’elle pense.', withUs('maelle')),
      p('Nour s’arrête. Elle regarde le toit, puis vous, avec ce même regard qu’elle avait derrière les barreaux. Puis elle recommence à compter ses pas, plus fort qu’avant.', withUs('nour')),
      say('kaz', '« Chacun ses morts », dit Kaz, sans conviction. Il ne vous regarde pas.', withUs('kaz')),
    ],
    onEnter: [
      set('delmas_abandonnes'),
      questFx('q_delmas', 'failed'),
      when(withUs('theo'), [rel('theo', -2)]),
      when(withUs('maelle'), [rel('maelle', -2)]),
      when(withUs('nour'), [rel('nour', -2)]),
      when(withUs('ines'), [rel('ines', -1)]),
      when(flag('r1_promesse'), [when(withUs('kaz'), [rel('kaz', -1)])]),
      journal('Vous avez laissé Claire et Jules Delmas sur le toit de la ferme.'),
    ],
    choices: [{ id: 'verger', text: 'Continuer sans vous retourner.', kind: 'move', next: 'r1_verger' }],
  },

  // -------------------------------------------------------------------------
  // Les rangées hautes
  // -------------------------------------------------------------------------
  {
    id: 'r1_verger',
    chapter: C,
    location: 'vergers',
    title: 'Les rangées hautes',
    kind: 'story',
    text: [
      p('Le terrain remonte doucement vers la route. L’eau recule, laisse une boue grise, puis de l’herbe. Ici, les pommiers ont les pieds au sec, et certains portent encore les pommes de l’automne dernier, ridées, sucrées, que personne n’a cueillies. Des guêpes ivres tournent autour des fruits tombés.'),
      p('Kaz s’arrête au sommet de la pente et regarde en arrière, vers l’eau. « La digue n’a pas cédé toute seule. Elle a cédé parce que le barrage de Vaulx ne régule plus rien depuis que la centrale est morte. Chaque crue passe tout droit. » Il hausse les épaules. « Un jour, il faudra que quelqu’un aille rallumer ce barrage. Pas moi. Enfin, pas aujourd’hui. »', withUs('kaz')),
      p('Au sommet de la pente, vous vous retournez vers l’eau. Cette digue n’a pas cédé toute seule : le barrage de Vaulx ne régule plus rien depuis que sa centrale est morte, et chaque crue passe tout droit. Vous y avez fait deux ans de maintenance, avant l’écluse. Vous savez exactement où il faudrait poser les mains.', KAZ_HEROS),
      p('Inès mange une pomme tombée en trois bouchées, trognon compris. « Malik disait que les pommes de l’année d’avant sont les meilleures. Il disait n’importe quoi. Celle-là est bonne. »', withUs('ines')),
      p('La route haute est déserte. Les traces du camion y sont nettes, régulières. Elles mènent vers le viaduc, comme vous.', THEO_CAPTIF),
    ],
    choices: [
      {
        id: 'cueillir',
        text: 'Cueillir les pommes encore bonnes et en manger quelques-unes.',
        kind: 'explore', time: 0.5,
        once: true,
        effects: [heal(4), give('ration', 1)],
      },
      { id: 'route', text: 'Monter vers la route.', kind: 'move', next: 'r1_fin' },
    ],
  },
  {
    id: 'r1_fin',
    chapter: C,
    location: 'vergers',
    title: 'Fin du chapitre 5',
    kind: 'chapterEnd',
    text: [
      p('Vous vous arrêtez au bord de la route haute, là où le verger finit et où commence le bitume. Vous faites sécher vos chaussettes sur une borne kilométrique et vous mangez sans parler. Derrière vous, l’eau brune et les pommiers en fleur. Devant, la route qui monte vers le grand viaduc de la rocade, dont on devine déjà les piles grises dans la brume.'),
      p('Loin devant, sur la route, deux silhouettes, une grande et une petite. Elles ne se retournent pas. Elles n’en ont pas besoin.', flag('delmas_sauves')),
      p('Vous ne regardez pas en arrière, vers le toit. Vous savez très bien ce que vous y verriez.', flag('delmas_abandonnes')),
      p('Les traces du camion continuent vers le viaduc. Quelque part devant, Théo compte peut-être les kilomètres, lui aussi.', THEO_CAPTIF),
      p('Il reste {reste} avant l’aube du septième.'),
    ],
    onEnter: [meal(), diary('r1')],
    choices: [{ id: 'suite', text: 'Chapitre 6 : La Rocade', kind: 'move', time: 1, next: 'r2_bretelle' }],
  },
];

export const DOCUMENTS_R1: DocumentDef[] = [
  {
    id: 'doc_r1_lettre',
    title: 'Lettre à Mathilde',
    source: 'Enveloppe timbrée jamais postée, maison du verger Garnier',
    body:
      'Ma Mathilde,\n\n' +
      'La digue a lâché le soir de la Saint-Martin. Je l’ai entendue d’ici, un bruit de porte qu’on claque très loin. Au matin, le verger était un lac. Les Reinettes du bas ont de l’eau jusqu’aux premières branches, les Belchards aussi. Les vieilles Calville, celles que ton grand-père a greffées, sont sur la butte. Elles tiennent.\n\n' +
      'Il y a des choses dans l’eau. Les Rabier, les Morel, d’autres que je ne reconnais pas. Ils ne remontent jamais sur la butte. Je crois qu’ils ont oublié comment on monte. Je ne descends plus à la cave.\n\n' +
      'Ne viens pas. Je sais que tu voudrais venir. Il n’y a plus de trains, de toute façon, et tu as les petits.\n\n' +
      'Je reste avec les arbres. Ils fleuriront en avril, il n’y aura personne pour les tailler, et ils fleuriront quand même. Ça me console plus que ça ne devrait.\n\n' +
      'Si quelqu’un lit cette lettre avant toi : il y a des pommes séchées dans le bocal, prenez-les. Laissez la chaise devant la fenêtre.\n\n' +
      'Ton papa,\nGaston Garnier',
  },
];

export const DIARY_R1: DiaryRule[] = [
  { chapter: 'r1', text: 'J’ai encore de la vase sous les ongles. Les pommiers fleurissaient dans l’eau, et sous l’eau il y avait des gens qui attendaient.' },
  { chapter: 'r1', if: flag('delmas_sauves'), text: 'Claire et Jules sont devant nous, quelque part sur la route. Le petit salue à l’envers. Je crois que je ne l’oublierai jamais.' },
  { chapter: 'r1', if: flag('r1_nour_metronome'), text: 'Nour a porté le métronome tout le chemin. Elle comptait les battements, et pour une fois elle ne comptait pas pour avoir moins peur.' },
  { chapter: 'r1', if: flag('r1_valise_perdue'), text: 'Claire a fracassé sa valise sur un crâne pour me sortir de l’eau. Vingt-deux ans de partitions dans la vase. Elle ne m’en a pas parlé.' },
  { chapter: 'r1', if: flag('delmas_abandonnes'), text: 'Le petit a tenu son salut jusqu’à ce que les arbres le cachent. Je me répète qu’on n’avait pas le temps. Je me le répéterai longtemps.' },
  { chapter: 'r1', if: flag('r1_claire_prevenue'), text: 'J’ai dit à Claire ce qui l’attend à la grille. Elle a répondu qu’elle saurait à qui elle sourit.' },
  { chapter: 'r1', if: companionIs('theo', 'captured'), text: 'Les traces du camion vont dans le même sens que nous. C’est la seule chose qui me fait encore marcher vite.' },
  { chapter: 'r1', if: flag('r1_kaz_eau'), text: 'Kaz lisait l’eau comme un livre. Son père curait des fossés. C’est la première fois qu’il me parle de son père.' },
];
