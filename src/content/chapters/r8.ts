/**
 * Chapitre 12 — La Draisine (« La ligne du fleuve »)
 * La remise de la gare de Brennes, la draisine d’Armand Vidal, le pont du Lizon,
 * le 6142 couché dans les ronces, la horde de la tranchée, et, en contrebas,
 * le camion des Ferrailleurs embourbé au gué de la Sauldre.
 */
import type { Condition, DiaryRule, DocumentDef, Scene } from '../../engine/types';
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
  hurt,
  journal,
  lacks,
  meal,
  not,
  notFlag,
  notWithUs,
  p,
  profile,
  quest,
  questFx,
  questStep,
  rel,
  say,
  set,
  take,
  when,
  withUs,
  xp,
} from '../helpers';

const C = 'r8';
const THEO_PRISONNIER = companionIs('theo', 'captured');
const DELMAS_EN_ROUTE = questStep('q_delmas', 'route');
const DELMAS_A_BORD = flag('r8_delmas_embarques');
const CLE = has('cle_aiguillage');
const SANS_PERSONNE = all(notWithUs('maelle'), notWithUs('theo'), notWithUs('kaz'), notWithUs('ines'), notWithUs('nour'));
const COMBAT_TRANCHEE: Condition = { type: 'visited', scene: 'r8_horde_combat' };

export const chapterR8: Scene[] = [
  // -------------------------------------------------------------------------
  // La gare de Brennes
  // -------------------------------------------------------------------------
  {
    id: 'r8_quai',
    chapter: C,
    location: 'voie_fleuve',
    title: 'Le bout du quai',
    kind: 'story',
    checkpoint: true,
    text: [
      p('La gare de Brennes tient en trois choses : un quai de briques où l’herbe a percé entre les joints, une horloge arrêtée sur une heure que plus personne ne regarde, et, adossée au talus, la remise des cantonniers. Une porte de planches peinte en rouge sang-de-bœuf. Un cadenas carré, de ceux qu’on n’ouvre qu’avec une clé de cheminot.'),
      p('Au-delà du heurtoir, la voie unique file vers l’est entre deux haies de ronces. Elle suit le fleuve jusqu’à Morvan. Personne n’y a roulé depuis la Fièvre. Les rails ont pris la couleur des feuilles mortes.'),
      p('Dans votre poche, la clé en T d’Armand Vidal, gravée « A.V. — Brennes ». Vous revoyez le vieux cheminot dans son poste d’aiguillage, sa casquette trop grande. « Sous la bâche verte. Elle vous fera gagner la moitié d’une journée. »', CLE),
      p('Vous n’avez pas de clé. Vous avez des épaules, et peu de temps devant vous.', lacks('cle_aiguillage')),
      p('Kaz pose sa paume à plat sur la porte, comme on tâte le flanc d’une bête. « Du chêne. Le cantonnier qui a posé ça n’aimait pas les voleurs. »', withUs('kaz')),
      p('Théo s’est assis au bord du quai, les pieds au-dessus du ballast. Il dessine la voie qui part : deux traits qui se rejoignent au bout de la page.', withUs('theo')),
      p('Nour compte les traverses jusqu’au premier poteau. « Vingt-trois. » Elle le dit pour elle-même, pas pour vous.', withUs('nour')),
    ],
    choices: [
      {
        id: 'cle',
        text: 'Ouvrir la remise avec la clé d’Armand.',
        kind: 'item', time: 0.5,
        requires: [CLE],
        next: 'r8_remise',
      },
      {
        id: 'gonds',
        text: '[Technicien ou outils] Démonter les gonds : ils sont du côté extérieur.',
        kind: 'explore', time: 1,
        visibleIf: [lacks('cle_aiguillage')],
        requires: [any(profile('technicien'), has('outils'))],
        effects: [set('r8_porte_forcee'), xp(15)],
        next: 'r8_remise',
      },
      {
        id: 'levier',
        text: '[Pied-de-biche] Glisser la pince sous l’auberon et faire sauter le cadenas.',
        kind: 'fight', time: 0.5,
        visibleIf: [lacks('cle_aiguillage')],
        requires: [has('pied_de_biche')],
        check: {
          stat: 'force',
          difficulty: 8,
          success: 'r8_remise',
          failure: 'r8_remise_bruit',
          successEffects: [set('r8_porte_forcee')],
          failureEffects: [set('r8_porte_forcee')],
        },
      },
      {
        id: 'epaule',
        text: 'Enfoncer la porte à coups d’épaule.',
        kind: 'fight', time: 0.5,
        visibleIf: [lacks('cle_aiguillage')],
        warning: 'Le bruit portera loin.',
        check: {
          stat: 'force',
          difficulty: 10,
          success: 'r8_remise',
          failure: 'r8_remise_bruit',
          successEffects: [set('r8_porte_forcee')],
          failureEffects: [set('r8_porte_forcee')],
        },
      },
      {
        id: 'ballast',
        text: 'Partir à pied sur le ballast, sans perdre de temps ici.',
        kind: 'move',
        warning: 'À pied, la ligne jusqu’au gué prendra plusieurs heures.',
        next: 'r8_ballast',
      },
    ],
  },
  {
    id: 'r8_remise_bruit',
    chapter: C,
    location: 'voie_fleuve',
    title: 'Le tambour',
    kind: 'combat',
    text: [
      p('Le bois gémit, se fend sur toute sa hauteur, et tient. Le choc roule sur le quai comme un coup de grosse caisse. Dans les ronces du talus, quelque chose se redresse. Puis le cliquetis : des dents qui claquent, sèches, régulières, comme une horloge qui se serait remise en marche.'),
    ],
    encounter: {
      enemies: ['rodeur', 'rodeur'],
      canFlee: true,
      victory: 'r8_remise',
      defeat: 'r8_remise_defaite',
      flee: 'r8_ballast',
      intro: 'Deux Rôdeurs descendent du talus, attirés par le vacarme.',
    },
    choices: [],
  },
  {
    id: 'r8_remise_defaite',
    chapter: C,
    location: 'voie_fleuve',
    title: 'Contre la porte rouge',
    kind: 'story',
    text: [
      p('Vous vous retrouvez au sol, le dos contre la porte rouge, un poids mort sur les jambes et un goût de rouille dans la bouche.'),
      p('Kaz arrache le dernier Rôdeur de sur vous et l’écrase contre le mur de briques. Il vous relève d’une main, sans un mot, et vous tâte le cou, les bras, à la recherche d’une morsure. Il n’y en a pas. Il souffle.', withUs('kaz')),
      p('Maëlle nettoie l’entaille de votre front avec ce qui reste d’alcool. Ses gestes sont rapides, presque brusques. « Tu as eu de la chance. Ne compte pas dessus deux fois. »', withUs('maelle')),
      p('Inès retire un carreau planté dans un crâne et l’essuie sur l’herbe. « Le prochain bruit, on le fait exprès ou on ne le fait pas. »', withUs('ines')),
      p('Quand vous parvenez à vous dégager, vous comprenez que la porte a fini par céder sous le poids des corps. Elle bâille sur le noir de la remise.', SANS_PERSONNE),
      p('Derrière vous, la porte a cédé. Elle bâille sur le noir de la remise.', not(SANS_PERSONNE)),
    ],
    onEnter: [hurt(4, 'les Rôdeurs du quai de Brennes')],
    choices: [{ id: 'entrer', text: 'Entrer dans la remise.', kind: 'move', time: 0.5, next: 'r8_remise' }],
  },

  // -------------------------------------------------------------------------
  // La remise
  // -------------------------------------------------------------------------
  {
    id: 'r8_remise',
    chapter: C,
    location: 'voie_fleuve',
    title: 'Sous la bâche verte',
    kind: 'story',
    text: [
      p('La clé tourne dans le cadenas comme si elle n’était jamais partie. La porte s’ouvre sur une odeur de graisse froide et de poussière.', all(CLE, notFlag('r8_porte_forcee'))),
      p('La porte pend sur un seul gond. Personne ne la refermera.', flag('r8_porte_forcee')),
      p('À l’intérieur, la lumière passe entre les planches en lames minces où dansent des poussières. Un établi, des pelles, une lanterne de signalisation au verre rouge. Et au milieu, posée sur deux bouts de rail, une forme sous une bâche verte.'),
      p('Vous tirez la bâche. Une plate-forme de chêne sur quatre roues d’acier. Au centre, un balancier de fonte à deux poignées, comme une balançoire de square. Un frein à pied, une boîte à outils vissée dans le plancher. Sur l’établi, une burette d’huile, encore pleine.'),
      p('Une feuille de cahier est épinglée au balancier, écrite au crayon de menuisier. Le mot est pour vous.', CLE),
      p('Une feuille de cahier est épinglée au balancier. Le mot n’était pas pour vous. Vous le lisez quand même.', lacks('cle_aiguillage')),
      say('kaz', '« Une draisine à balancier. » Kaz fait jouer la poignée, qui remonte avec un grincement de vieille porte. « Un qui pompe, elle roule. Deux qui pompent, elle file. Quatre, elle s’envole. Mon beau-père en avait une sur le canal de la Marne. Irena montait dessus en robe du dimanche. » Il se tait.', withUs('kaz')),
      say('theo', '« On va vraiment rouler ? » C’est la première fois depuis longtemps que Théo pose une question sans avoir peur de la réponse.', withUs('theo')),
    ],
    onEnter: [doc('doc_r8_mot_armand')],
    choices: [
      {
        id: 'caisse',
        text: 'Fouiller la caisse à outils d’Armand.',
        kind: 'explore', time: 0.5,
        once: true,
        effects: [give('ration', 1), give('chiffons', 1), give('alcool', 1), journal('Dans la caisse d’Armand : une ration emballée dans du papier journal, des chiffons, une flasque d’eau-de-vie.', false)],
      },
      {
        id: 'graisser',
        text: 'Graisser les paliers et l’axe du balancier à la burette.',
        kind: 'explore', time: 0.5,
        once: true,
        effects: [set('r8_graissee'), journal('Vous avez graissé la draisine : elle ne grince plus.', false)],
      },
      {
        id: 'kaz',
        text: '[Kaz] Laisser Kaz organiser la manœuvre.',
        kind: 'talk', time: 0.5,
        requires: [withUs('kaz')],
        effects: [rel('kaz', 1)],
        next: 'r8_depart',
      },
      {
        id: 'rails',
        text: 'Sortir la draisine et la soulever jusque sur les rails.',
        kind: 'fight', time: 0.5,
        check: { stat: 'force', difficulty: 8, success: 'r8_depart', failure: 'r8_rails_ko' },
      },
      { id: 'pied', text: 'Laisser la draisine là et partir à pied.', kind: 'move', next: 'r8_ballast' },
    ],
  },
  {
    id: 'r8_rails_ko',
    chapter: C,
    location: 'voie_fleuve',
    title: 'Une roue dans le ballast',
    kind: 'story',
    text: [
      p('La draisine bascule à mi-course. Une roue mord le rail, l’autre retombe dans le ballast avec un bruit de sac de pierres. Le balancier vous revient dans les côtes. Pendant une seconde, vous ne respirez plus.'),
      p('Kaz jure en polonais, longuement, avec application. « Elle pèse plus lourd que ma belle-mère. Et elle a meilleur caractère. On recommence, au trois. »', withUs('kaz')),
      p('Le chêne est lourd et l’acier encore plus. Il faudra trouver un meilleur appui.', notWithUs('kaz')),
    ],
    onEnter: [hurt(2, 'le balancier de la draisine')],
    choices: [
      {
        id: 'corde',
        text: '[Corde] Passer la corde autour du poteau et faire levier.',
        kind: 'item', time: 0.5,
        requires: [has('corde')],
        effects: [xp(10)],
        next: 'r8_depart',
      },
      {
        id: 'encore',
        text: 'Recommencer, en coordonnant mieux l’effort.',
        kind: 'fight', time: 0.5,
        check: {
          stat: 'force',
          difficulty: 8,
          success: 'r8_depart',
          failure: 'r8_rails_ko',
          failureEffects: [hurt(1, 'un dos tordu')],
        },
      },
      { id: 'pied', text: 'Renoncer et partir à pied.', kind: 'move', next: 'r8_ballast' },
    ],
  },

  // -------------------------------------------------------------------------
  // La ligne
  // -------------------------------------------------------------------------
  {
    id: 'r8_depart',
    chapter: C,
    location: 'voie_fleuve',
    title: 'La ligne du fleuve',
    kind: 'story',
    checkpoint: true,
    text: [
      p('Les roues trouvent le rail avec un claquement net. On pousse, on saute à bord, on pompe. Le balancier monte, descend, monte. Le quai de Brennes glisse vers l’arrière, puis l’horloge arrêtée, puis le village tout entier, qui n’est plus qu’un clocher au-dessus des haies.'),
      p('Et la draisine prend de la vitesse. Le vent du fleuve vous entre dans la bouche et vous fait pleurer les yeux. Les traverses défilent sous vous trop vite pour qu’on les distingue, un battement sourd, régulier, comme un cœur. À droite, en contrebas, le fleuve, large et brun, plein de lumière. Pour la première fois depuis des jours, c’est le paysage qui bouge et vous qui restez immobile.'),
      p('Elle tire un peu à gauche. Armand avait prévenu.'),
      p('Kaz pompe torse nu, la chemise nouée autour de la taille, et il rit. Un rire énorme, absurde, qui couvre le bruit des roues.', withUs('kaz')),
      p('Théo tient son carnet contre sa poitrine pour que le vent ne l’emporte pas. Il ne dessine pas. Il regarde.', withUs('theo')),
      p('Nour s’est accroupie à l’avant, les mains crispées sur le bord du plancher. Elle a renoncé à compter les traverses. « Elles vont trop vite », dit-elle, et c’est presque un reproche.', withUs('nour')),
      p('Inès, à l’arrière, surveille la voie derrière vous. Par habitude. Personne ne vous suit. Personne ne pourrait.', withUs('ines')),
      p('Maëlle a fermé les yeux. Elle ne dort pas. Elle sent le vent, c’est tout.', withUs('maelle')),
    ],
    onEnter: [
      set('draisine_prise'),
      when(quest('q_armand', 'active'), [questFx('q_armand', 'completed', 'draisine')]),
      xp(30),
      journal('La draisine d’Armand Vidal roule sur la ligne du fleuve.'),
    ],
    choices: [
      {
        id: 'delmas',
        text: 'Freiner : deux silhouettes marchent sur le ballast, une grande et une petite.',
        kind: 'talk', time: 0.5,
        visibleIf: [DELMAS_EN_ROUTE],
        next: 'r8_delmas',
      },
      { id: 'pomper', text: 'Pomper. Le pont du Lizon est à quelques kilomètres.', kind: 'move', time: 0.5, next: 'r8_pont' },
    ],
  },
  {
    id: 'r8_delmas',
    chapter: C,
    location: 'voie_fleuve',
    title: 'Le salut à l’envers',
    kind: 'story',
    text: [
      p('Claire Delmas s’est écartée sur le bas-côté en vous entendant venir, une main sur l’épaule de son fils, l’autre sur la poignée de sa valise. Elle est encore plus maigre qu’aux vergers. Sa robe est grise de poussière jusqu’aux genoux.'),
      p('Jules vous reconnaît avant elle. Il se met au garde-à-vous sur une traverse et vous fait le salut militaire, la paume tournée vers lui, le pouce en bas. À l’envers, comme toujours.'),
      say('claire', '« On marche depuis l’aube. Jules compte les traverses. Il en est à trois mille. »'),
      say('nour', '« Trois mille quatre cent douze, si vous êtes partis de la gare », dit Nour sans lever la tête. Jules la regarde comme on regarde une magicienne.', withUs('nour')),
      say('claire', '« Je ne vous demande rien. » Elle a dit ça très vite, avant que vous ayez parlé. Elle regarde la draisine, puis les jambes de son fils, puis le ciel, comme si elle calculait ce qu’il reste de jour. Elle se tient droite. Elle se tient toujours droite.'),
    ],
    choices: [
      {
        id: 'embarquer',
        text: 'Les faire monter. En se serrant, il y a de la place.',
        kind: 'talk',
        warning: 'La draisine sera plus lourde.',
        effects: [set('r8_delmas_embarques'), rel('claire', 2), journal('Claire et Jules Delmas montent sur la draisine.')],
        next: 'r8_pont',
      },
      {
        id: 'ration',
        text: 'Leur laisser une ration et repartir.',
        kind: 'negotiate',
        requires: [has('ration')],
        effects: [take('ration', 1), rel('claire', 1), set('r8_delmas_ration')],
        next: 'r8_pont',
      },
      {
        id: 'repartir',
        text: 'Leur souhaiter bonne route et repartir. Chaque kilo compte.',
        kind: 'move',
        effects: [rel('claire', -1)],
        next: 'r8_pont',
      },
    ],
  },
  {
    id: 'r8_pont',
    chapter: C,
    location: 'voie_fleuve',
    title: 'Le pont du Lizon',
    kind: 'story',
    text: [
      p('La voie franchit le Lizon sur un pont de poutrelles rivetées, quarante mètres au-dessus d’un affluent qui gronde dans les rochers. Les traverses du milieu ont brûlé, l’été d’avant la Fièvre. Il en reste des moignons noirs entre lesquels on voit l’eau. Les rails, eux, sont là. Le rail gauche fait un léger ventre.'),
      p('Vous freinez à l’entrée du tablier. La draisine s’arrête en tremblant.'),
      p('Jules s’est blotti contre sa mère. Claire tient la valise sur ses genoux et ne dit rien. Avec eux à bord, la draisine s’enfonce un peu plus sur ses ressorts.', DELMAS_A_BORD),
      say('kaz', '« Ce rail-là a chauffé. L’acier se souvient de tout. » Il crache dans le vide et regarde le crachat tomber longtemps.', withUs('kaz')),
    ],
    choices: [
      {
        id: 'elan',
        text: 'Reculer, prendre de l’élan et passer d’un trait.',
        kind: 'move',
        visibleIf: [not(DELMAS_A_BORD)],
        check: { stat: 'survie', difficulty: 8, success: 'r8_wagon', failure: 'r8_deraillement' },
      },
      {
        id: 'elan_lourd',
        text: 'Reculer, prendre de l’élan et passer d’un trait, aussi chargés que vous l’êtes.',
        kind: 'move',
        visibleIf: [DELMAS_A_BORD],
        warning: 'Avec Claire et Jules, la draisine est plus lourde à lancer.',
        check: { stat: 'survie', difficulty: 9, success: 'r8_wagon', failure: 'r8_deraillement' },
      },
      {
        id: 'pompier',
        text: '[Ancien pompier] Écouter le pont avant de s’y engager.',
        kind: 'explore', time: 0.5,
        requires: [background('pompier')],
        effects: [xp(15), journal('Vous avez écouté le pont du Lizon comme on écoute une charpente avant qu’elle cède.', false)],
        next: 'r8_wagon',
      },
      {
        id: 'kaz',
        text: '[Kaz] Demander à Kaz d’inspecter les éclisses une à une.',
        kind: 'talk', time: 0.5,
        requires: [withUs('kaz')],
        effects: [rel('kaz', 1)],
        next: 'r8_wagon',
      },
      {
        id: 'pousser',
        text: 'Descendre et pousser la draisine à pied, traverse par traverse.',
        kind: 'stealth', time: 1,
        next: 'r8_wagon',
      },
    ],
  },
  {
    id: 'r8_wagon',
    chapter: C,
    location: 'voie_fleuve',
    title: 'Le 6142',
    kind: 'story',
    text: [
      p('Le pont est derrière vous. Le cœur met plus longtemps à le comprendre que les jambes.', notFlag('draisine_perdue')),
      p('Après une longue courbe, la voie est barrée. Un wagon couvert est couché en travers des rails, les roues en l’air, la caisse ouverte sur le flanc comme un ventre. Les ronces ont commencé à le recouvrir. Sur la tôle, à moitié effacé au pochoir : « 6142 ».'),
      p('Le 6142. Celui qu’Armand attend dans son poste d’aiguillage depuis quatorze mois. Il n’est pas en retard. Il est ici.', CLE),
      p('Le 6142. Le train du mot épinglé au balancier, celui que son auteur attend encore. Il n’est pas en retard. Il est ici.', lacks('cle_aiguillage')),
      p('La porte du wagon a été arrachée. De l’intérieur : la tôle est bombée vers l’extérieur, et les gonds pendent.'),
      p('Cinquante mètres avant l’épave, un aiguillage part vers la gauche : une voie d’évitement qui contourne la courbe et rejoint la ligne plus loin. Le levier est verrouillé par un cadenas carré.'),
      say('kaz', '« Un évitement. Le cheminot qui a dessiné ça avait de l’avance sur nous. »', withUs('kaz')),
    ],
    choices: [
      {
        id: 'fouiller',
        text: 'Fouiller le wagon renversé.',
        kind: 'explore', time: 0.5,
        once: true,
        effects: [doc('doc_r8_feuille_route'), give('ration', 1), give('composants', 1), set('r8_wagon_fouille'), xp(10)],
      },
      {
        id: 'aiguillage',
        text: 'Ouvrir le levier avec la clé d’Armand et passer par l’évitement.',
        kind: 'item', time: 0.25,
        requires: [CLE],
        next: 'r8_horde',
      },
      {
        id: 'kaz_levier',
        text: '[Kaz] Laisser Kaz faire sauter le cadenas d’un coup de clé à molette.',
        kind: 'fight', time: 0.25,
        visibleIf: [lacks('cle_aiguillage')],
        requires: [withUs('kaz')],
        next: 'r8_horde',
      },
      {
        id: 'portage',
        text: 'Soulever la draisine hors des rails et la porter au-delà du wagon.',
        kind: 'fight', time: 1,
        check: {
          stat: 'force',
          difficulty: 8,
          success: 'r8_horde',
          failure: 'r8_horde',
          failureEffects: [hurt(2, 'la draisine portée à bout de bras')],
        },
      },
    ],
  },
  {
    id: 'r8_horde',
    chapter: C,
    location: 'voie_fleuve',
    title: 'La tranchée',
    kind: 'story',
    timed: { seconds: 12, fallback: 'foncer' },
    text: [
      p('La ligne plonge dans une tranchée, entre deux talus de craie plantés d’acacias. Au bout, là où elle ressort à la lumière, il y a du mouvement sur les rails.'),
      p('Des Muets. Une vingtaine, peut-être plus. Ils descendent des champs vers le fleuve et traversent la voie comme on traverse une route, sans se presser, par petits groupes. Le cliquetis de leurs dents monte jusqu’à vous, mêlé au chant des roues. Deux d’entre eux sont plus maigres que les autres, plus droits. Des Coureurs.'),
      p('La draisine roule toujours. Il faut décider avant qu’ils vous entendent.'),
      p('Claire a plaqué la main sur la bouche de Jules. Il ne pleure pas. Il regarde.', DELMAS_A_BORD),
    ],
    choices: [
      {
        id: 'foncer',
        text: 'Pomper de toutes vos forces et passer au travers.',
        kind: 'fight',
        next: 'r8_horde_combat',
      },
      {
        id: 'glisser',
        text: 'Lâcher le balancier et glisser en roue libre : les paliers graissés ne font pas un bruit.',
        kind: 'stealth', time: 0.25,
        visibleIf: [flag('r8_graissee')],
        check: { stat: 'discretion', difficulty: 7, success: 'r8_corniche', failure: 'r8_horde_combat', successEffects: [set('r8_glisse')] },
      },
      {
        id: 'nour',
        text: '[Nour] Laisser Nour compter les écarts entre les groupes.',
        kind: 'talk', time: 0.5,
        visibleIf: [withUs('nour')],
        effects: [set('r8_nour_compte'), rel('nour', 2), xp(15)],
        next: 'r8_corniche',
      },
      {
        id: 'cloche',
        text: '[Cloche du Berger] Agiter la cloche vers l’amont et laisser la horde se tourner.',
        kind: 'item', time: 0.5,
        requires: [has('cloche_berger')],
        effects: [set('r8_cloche_sonnee')],
        next: 'r8_corniche',
      },
      {
        id: 'freiner',
        text: 'Freiner dans l’ombre de la tranchée et attendre, immobiles, qu’ils aient traversé.',
        kind: 'stealth', time: 1,
        check: { stat: 'discretion', difficulty: 8, success: 'r8_horde_attente', failure: 'r8_horde_combat' },
      },
    ],
  },
  {
    id: 'r8_horde_combat',
    chapter: C,
    location: 'voie_fleuve',
    title: 'Ceux qui s’accrochent',
    kind: 'combat',
    text: [
      p('Les têtes se tournent toutes en même temps. Le groupe s’ouvre, et les deux Coureurs se détachent. Ils courent à côté de la draisine, à la même vitesse qu’elle, sans effort, les mains tendues vers les montants. L’un d’eux attrape le bord du plancher et se hisse.'),
    ],
    encounter: {
      enemies: ['coureur', 'coureur'],
      canFlee: false,
      victory: 'r8_corniche',
      defeat: 'r8_deraillement',
      intro: 'Deux Coureurs s’accrochent à la draisine lancée. Faites-les lâcher prise.',
    },
    choices: [],
  },
  {
    id: 'r8_horde_attente',
    chapter: C,
    location: 'voie_fleuve',
    title: 'Le temps qu’ils passent',
    kind: 'story',
    text: [
      p('La draisine s’arrête dans l’ombre de la tranchée, à trente mètres de la sortie. Vous ne bougez plus. Vous ne respirez presque plus.'),
      p('Ils passent. Par trois, par cinq, par un seul. Le cliquetis va et vient. Un Rôdeur s’arrête sur le rail, tourne la tête vers vous, renifle l’air comme un chien. Une minute. Deux. Puis il reprend sa marche vers l’eau, de ce pas qui ne va nulle part.'),
      p('Théo vous a pris la main sans s’en rendre compte. Il ne la lâche qu’à la fin.', withUs('theo')),
      p('Inès a l’arbalète à l’épaule depuis le début. Elle ne tire pas. Elle n’a jamais eu l’intention de tirer. C’est pour se tenir à quelque chose.', withUs('ines')),
      p('Le soleil a tourné quand le dernier disparaît dans les roseaux de la berge.'),
    ],
    choices: [{ id: 'repartir', text: 'Repartir, tout doucement.', kind: 'move', time: 0.25, next: 'r8_corniche' }],
  },
  {
    id: 'r8_deraillement',
    chapter: C,
    location: 'voie_fleuve',
    title: 'Le déraillement',
    kind: 'story',
    text: [
      p('Ça se passe en une seconde. La roue avant gauche monte sur le rail, hésite, et la draisine quitte la voie. Le plancher se cabre. Le monde tourne. Le choc vous jette dans le ballast, puis dans les ronces, et le bruit vient après : l’acier qui hurle, le chêne qui se fend, un essieu qui se tord comme un clou sous un marteau.'),
      p('Quand vous relevez la tête, la draisine est couchée sur le flanc au bas du remblai. Une roue tourne encore dans le vide. Elle tirait un peu à gauche.'),
      p('Kaz saigne du front et jure en polonais. Il se relève, regarde la draisine, et pour la première fois depuis que vous le connaissez, il n’a rien de drôle à dire.', withUs('kaz')),
      p('Théo a protégé son carnet de tout son corps. Il a les paumes en sang, et le carnet est intact.', withUs('theo')),
      p('Maëlle se relève la première et compte les membres du groupe, les uns après les autres, à voix haute. Puis elle s’occupe de vous.', withUs('maelle')),
      p('Claire s’est couchée sur Jules pendant la chute. Il n’a rien. Sa valise, elle, a éclaté sur le ballast : des partitions, des centaines, qui s’envolent vers le fleuve. Claire ne court pas après. Elle les regarde partir.', DELMAS_A_BORD),
    ],
    onEnter: [
      set('draisine_prise', false),
      set('draisine_perdue'),
      set('r8_deraille'),
      hurt(4, 'le déraillement de la draisine'),
      when(DELMAS_A_BORD, [rel('claire', -1)]),
      journal('La draisine a déraillé. Il faudra finir la ligne à pied.'),
    ],
    choices: [{ id: 'marcher', text: 'Ramasser ce qui peut l’être et continuer à pied.', kind: 'move', time: 2, next: 'r8_corniche' }],
  },

  // -------------------------------------------------------------------------
  // À pied
  // -------------------------------------------------------------------------
  {
    id: 'r8_ballast',
    chapter: C,
    location: 'voie_fleuve',
    title: 'Le ballast',
    kind: 'story',
    checkpoint: true,
    text: [
      p('Les traverses ne sont jamais à la bonne distance pour un pas humain. Trop courtes pour une enjambée, trop longues pour deux. On finit par marcher sur le ballast, qui roule sous les semelles et tord les chevilles, ou sur le rail, les bras écartés, comme des enfants.'),
      p('La ligne longe le fleuve, en hauteur. La lumière est blanche. Le vent ne rafraîchit rien. Au bout d’une heure, personne ne parle plus. Au bout de deux, on ne pense plus qu’aux pieds.'),
      p('Au deuxième kilomètre, vous rattrapez Claire Delmas et son fils. Jules vous salue à l’envers, la paume tournée vers lui. Ils marchent avec vous un moment, puis Claire ralentit, à cause des petites jambes, et vous fait signe de continuer. « On se verra à l’écluse. »', DELMAS_EN_ROUTE),
      p('Nour compte les traverses. Elle a dépassé les deux mille. Elle ne s’arrête que pour boire.', withUs('nour')),
      p('Kaz porte le sac de quelqu’un d’autre en plus du sien, et il fait semblant de ne pas le remarquer.', withUs('kaz')),
      p('Puis le pont du Lizon : quarante mètres de poutrelles au-dessus d’un affluent qui gronde. Au milieu, les traverses ont brûlé. Il en reste des moignons noirs entre lesquels on voit l’eau.'),
    ],
    onEnter: [
      set('draisine_perdue'),
      set('r8_a_pied'),
      when(quest('q_armand', 'active'), [questFx('q_armand', 'failed')]),
    ],
    choices: [
      {
        id: 'poutres',
        text: 'Passer le pont sur les rails, là où les traverses ont brûlé.',
        kind: 'move', time: 2.5,
        check: {
          stat: 'survie',
          difficulty: 8,
          success: 'r8_talus',
          failure: 'r8_talus',
          failureEffects: [set('r8_chute'), hurt(3, 'une chute entre deux traverses')],
        },
      },
      {
        id: 'ravin',
        text: 'Descendre dans le ravin et traverser le Lizon à gué, plus bas.',
        kind: 'move', time: 3.5,
        next: 'r8_talus',
      },
    ],
  },
  {
    id: 'r8_talus',
    chapter: C,
    location: 'voie_fleuve',
    title: 'La tranchée',
    kind: 'story',
    text: [
      p('Une jambe passe entre deux traverses calcinées. Le vide s’ouvre sous vos semelles, vos bras s’accrochent au rail, et c’est une main sur votre col qui vous remonte. Le genou saigne. Vous pouvez marcher. C’est l’essentiel.', all(flag('r8_chute'), not(SANS_PERSONNE))),
      p('Une jambe passe entre deux traverses calcinées. Le vide s’ouvre sous vos semelles, vos bras s’accrochent au rail, et vous vous hissez à la force des coudes. Le genou saigne. Vous pouvez marcher. C’est l’essentiel.', all(flag('r8_chute'), SANS_PERSONNE)),
      p('Plus loin, la ligne s’enfonce dans une tranchée entre deux talus de craie. Au bout, sur les rails, du mouvement. Des Muets descendent des champs vers le fleuve et traversent la voie par petits groupes. Le cliquetis de leurs dents résonne entre les parois. Il y a des Coureurs parmi eux.'),
      p('À pied, vous êtes déjà dans la tranchée. Il n’y a pas de bonne façon d’en sortir. Seulement des moins mauvaises.'),
    ],
    choices: [
      {
        id: 'eclaireur',
        text: '[Éclaireur] Trouver un passage par le haut du talus, à contrevent.',
        kind: 'stealth', time: 0.5,
        requires: [profile('eclaireur')],
        effects: [xp(15)],
        next: 'r8_corniche',
      },
      {
        id: 'nour',
        text: '[Nour] Laisser Nour compter les écarts entre les groupes.',
        kind: 'talk', time: 0.5,
        visibleIf: [withUs('nour')],
        effects: [set('r8_nour_compte'), rel('nour', 2), xp(15)],
        next: 'r8_corniche',
      },
      {
        id: 'cloche',
        text: '[Cloche du Berger] Agiter la cloche vers l’amont et laisser la horde se tourner.',
        kind: 'item', time: 0.5,
        requires: [has('cloche_berger')],
        effects: [set('r8_cloche_sonnee')],
        next: 'r8_corniche',
      },
      {
        id: 'ronces',
        text: 'Se couler dans les ronces du talus et attendre qu’ils soient passés.',
        kind: 'stealth', time: 1,
        check: { stat: 'discretion', difficulty: 8, success: 'r8_corniche', failure: 'r8_talus_combat' },
      },
      { id: 'front', text: 'Les prendre de front avant qu’ils vous encerclent.', kind: 'fight', next: 'r8_talus_combat' },
    ],
  },
  {
    id: 'r8_talus_combat',
    chapter: C,
    location: 'voie_fleuve',
    title: 'Entre les parois',
    kind: 'combat',
    text: [p('Une branche craque sous un pied. Un Coureur se retourne, puis un Rôdeur. Ils viennent.')],
    encounter: {
      enemies: ['coureur', 'rodeur'],
      canFlee: true,
      victory: 'r8_corniche',
      defeat: 'r8_talus_defaite',
      flee: 'r8_corniche',
      intro: 'Un Coureur et un Rôdeur se détachent de la horde et remontent la tranchée.',
    },
    choices: [],
  },
  {
    id: 'r8_talus_defaite',
    chapter: C,
    location: 'voie_fleuve',
    title: 'Le haut du talus',
    kind: 'story',
    text: [
      p('Vous ne savez plus très bien comment s’est faite la montée jusqu’en haut du talus. Il y a de la craie sous vos ongles, du sang sur votre manche, et votre sac est plus léger : il s’est ouvert dans la pente.'),
      p('On vous a tiré par les bras jusqu’aux acacias. En bas, la horde a repris sa marche vers l’eau, comme si rien ne s’était passé. Pour elle, rien ne s’est passé.', not(SANS_PERSONNE)),
      p('En bas, la horde a repris sa marche vers l’eau, comme si rien ne s’était passé. Pour elle, rien ne s’est passé.', SANS_PERSONNE),
    ],
    onEnter: [hurt(3, 'la horde de la tranchée'), take('ration', 1)],
    choices: [{ id: 'suite', text: 'Rejoindre la voie plus loin, en longeant la crête.', kind: 'move', time: 0.5, next: 'r8_corniche' }],
  },

  // -------------------------------------------------------------------------
  // La corniche
  // -------------------------------------------------------------------------
  {
    id: 'r8_corniche',
    chapter: C,
    location: 'voie_fleuve',
    title: 'Au-dessus du gué',
    kind: 'story',
    checkpoint: true,
    text: [
      p('Nour a compté à voix basse, les yeux plissés : « Sept. Puis quarante. Puis quatre. Puis soixante. » Au soixantième battement, vous êtes passés. Personne ne s’est retourné.', flag('r8_nour_compte')),
      p('La cloche du Berger a tinté vers l’amont. Une à une, les têtes se sont tournées vers le son, et la horde a remonté la berge, lente et docile, en vous laissant le passage.', flag('r8_cloche_sonnee')),
      p('La draisine a traversé la sortie de la tranchée sans un grincement, portée par sa seule vitesse, à trois mètres des derniers. Ils n’ont rien entendu. L’huile d’Armand.', flag('r8_glisse')),
      p('Sur les montants de la draisine, il reste des traces de doigts. Personne ne les essuie.', all(COMBAT_TRANCHEE, flag('draisine_prise'))),
      p('La ligne monte ensuite en corniche, accrochée au flanc du coteau, et le fleuve s’éloigne en contrebas. Vous arrêtez la draisine au point le plus haut. D’ici, on voit la Sauldre qui se jette dans le fleuve, et le pont routier qui l’enjambait, cassé en deux, le tablier dans l’eau. À côté, un gué de pierres plates.', flag('draisine_prise')),
      p('La ligne monte ensuite en corniche, accrochée au flanc du coteau. Au point le plus haut, vous vous arrêtez, à bout de souffle. D’ici, on voit la Sauldre qui se jette dans le fleuve, et le pont routier qui l’enjambait, cassé en deux, le tablier dans l’eau. À côté, un gué de pierres plates.', not(flag('draisine_prise'))),
      p('Dans le gué, un camion. Une benne à ridelles, peinte de cambouis, les roues arrière enfoncées dans la vase jusqu’aux moyeux. Sur le plateau, des formes bâchées, carrées. Des cages. Deux hommes au visage noirci font les cent pas sur la rive en se disputant. Les Ferrailleurs.'),
      p('Sur l’autre rive, un 4×4 blanc vient de s’arrêter. Deux silhouettes en combinaison grise en descendent et déroulent le câble d’un treuil. Elles ne se pressent pas. Elles savent que la marchandise ne partira pas sans elles.'),
      p('Vous savez ce qu’il y a sous la bâche. Vous le savez depuis la casse. Un pan de toile se soulève dans le vent, et une main maigre se cramponne aux barreaux. Théo.', THEO_PRISONNIER),
      p('Maëlle a vu, elle aussi. Elle fait trois pas vers le talus, et il faut la retenir par le bras. Elle ne se débat pas. Elle tremble.', all(THEO_PRISONNIER, withUs('maelle'))),
      p('Sous les bâches, il y a des gens. Vous voyez une jambe de femme, des pieds d’enfant. Des porteurs, sans doute, qu’on livre à la barge.', not(THEO_PRISONNIER)),
      p('Claire serre Jules contre elle et lui tourne la tête vers le coteau. « Ne regarde pas en bas. » Puis, pour vous : « Nous, on continue par la voie. On sera à l’écluse avant la nuit. » Jules vous fait le salut à l’envers. Ils s’éloignent sur les rails, une grande ombre et une petite.', DELMAS_A_BORD),
      p('Assis sur une borne kilométrique, un peu plus loin, un homme regarde lui aussi le gué. Massif, voûté, sans plastron, le visage lavé de son cambouis. Il a entendu vos pas. Il ne se lève pas. Gaspard Lenoir.', all(flag('gaspard_epargne'), notFlag('r8_gaspard_parle'))),
    ],
    choices: [
      {
        id: 'observer',
        text: 'Observer longuement : les hommes, les cages, le treuil.',
        kind: 'explore', time: 0.5,
        once: true,
        requires: [any(has('jumelles'), withUs('ines'))],
        effects: [
          set('r8_camion_observe'),
          xp(15),
          journal('Au gué de la Sauldre : deux Ferrailleurs, un camion embourbé, des cages. En face, deux hommes en gris de l’Institut et un treuil.'),
        ],
      },
      {
        id: 'gaspard',
        text: 'Aller s’asseoir près de Gaspard Lenoir.',
        kind: 'talk', time: 0.5,
        visibleIf: [flag('gaspard_epargne'), notFlag('r8_gaspard_parle')],
        next: 'r8_gaspard',
      },
      { id: 'descendre', text: 'Descendre vers le gué par le talus, à couvert.', kind: 'stealth', time: 0.5, next: 'r8_fin' },
    ],
  },
  {
    id: 'r8_gaspard',
    chapter: C,
    location: 'voie_fleuve',
    title: 'La borne',
    kind: 'story',
    text: [
      p('De près, il a l’air plus petit. Sans ses tôles, sans ses chiens, sans son trône de sièges de voiture, Gaspard Lenoir ressemble à n’importe quel homme de soixante ans qui a trop marché. Il a des ampoules aux talons. Il mange une pomme verte, lentement, avec un canif.'),
      say('gaspard', '« Le Bègue et Momo. Mes gars. Enfin, mes anciens gars. » Il pointe le canif vers le gué. « La nuit où la casse est tombée, ils ont pris le dernier camion et les cages. Ils ont gardé le contrat. Ils livrent ce que je devais livrer. Ils se sont même pas donné la peine de changer de client. »'),
      say('gaspard', '« Le gamin, là-dessous. Celui que tu m’as laissé pour une plaque en fer. » Il ne vous regarde pas. « Il n’a pas pleuré une seule fois. Même moi, ça m’a gêné. »', all(THEO_PRISONNIER, flag('theo_vendu'))),
      say('gaspard', '« Les gris, en face, ils ne paient pas. Ils prennent. Je l’ai compris trop tard. Toi, tu l’as compris avant moi. » Il jette le trognon dans les ronces. « Le Bègue a peur de l’eau. Momo dort dès qu’il a mangé. Fais-en ce que tu veux. »'),
      p('Kaz est resté debout, à trois mètres. Gaspard le regarde enfin. « Le Polonais. » Kaz ne répond pas. Ils restent ainsi un long moment, deux hommes qui se sont tout dit il y a longtemps.', withUs('kaz')),
    ],
    onEnter: [set('r8_gaspard_parle'), journal('Gaspard Lenoir : au gué, ce sont ses anciens hommes, le Bègue et Momo. Le Bègue a peur de l’eau ; Momo dort après avoir mangé.')],
    choices: [
      {
        id: 'ration',
        text: 'Lui laisser une ration. Il a encore de la route.',
        kind: 'negotiate',
        requires: [has('ration')],
        effects: [take('ration', 1), rel('gaspard', 2), set('r8_gaspard_nourri')],
        next: 'r8_corniche',
      },
      { id: 'laisser', text: 'Le laisser à sa pomme et à sa borne.', kind: 'move', next: 'r8_corniche' },
    ],
  },

  // -------------------------------------------------------------------------
  // Fin
  // -------------------------------------------------------------------------
  {
    id: 'r8_fin',
    chapter: C,
    location: 'voie_fleuve',
    title: 'Les saules de la Sauldre',
    kind: 'chapterEnd',
    text: [
      p('Vous vous installez dans un bouquet de saules, au pied du talus, à deux cents mètres du gué. On entend les Ferrailleurs se disputer au-dessus du moteur qui patine. On sent l’odeur de leur feu. Vous mangez froid, sans un mot, en vous passant la gourde.'),
      p('La draisine attend là-haut, calée sur ses rails, au point le plus haut de la corniche. Elle vous a fait gagner des heures que vous n’aviez pas. Armand serait content. Il ne le dirait pas.', flag('draisine_prise')),
      p('La draisine est restée couchée au bas d’un remblai, l’essieu tordu. Vous avez fini à pied, comme tout le monde, et vos jambes vous le font payer.', flag('r8_deraille')),
      p('Vous avez fait toute la ligne à pied. Vos jambes ont cessé de se plaindre il y a longtemps. Elles ont compris que ça ne servait à rien.', flag('r8_a_pied')),
      p('Théo regarde le camion, en bas, sans rien dire. Puis il ouvre son carnet et dessine le gué, les pierres plates, le pont cassé, les cages. Il dessine tout. C’est sa façon de ne rien oublier.', withUs('theo')),
      p('Là-bas, sous une bâche, il y a Théo. Il est à deux cents mètres. Il n’a jamais été aussi près depuis la casse.', THEO_PRISONNIER),
      p('Il reste {reste} avant l’aube du septième.'),
    ],
    onEnter: [meal(), diary('r8')],
    choices: [{ id: 'suite', text: 'Chapitre 13 : Le Gué', kind: 'move', time: 1, next: 'r9_rive' }],
  },
];

export const DOCUMENTS_R8: DocumentDef[] = [
  {
    id: 'doc_r8_mot_armand',
    title: 'Un mot sous la bâche',
    source: 'Remise de la gare de Brennes, épinglé au balancier de la draisine',
    body:
      'Toi qui as la clé,\n\n' +
      'Elle s’appelle Odette. Oui, comme ma femme. Elle tire un peu à gauche, comme moi. Pompe régulier, pas par à-coups : elle déteste qu’on la brusque. Le frein est au pied, à droite.\n\n' +
      'Avant le pont du Lizon, ralentis. Les traverses ont brûlé l’été d’avant la Fièvre et personne n’est venu les changer. Tu me diras qu’il n’y a plus personne pour rien changer.\n\n' +
      'Après la grande courbe, il y a l’évitement de la Côte-aux-Saules. La clé ouvre aussi le levier. Graisse-la avant de partir, la burette est sur l’établi.\n\n' +
      'Si tu croises le 6142 sur la ligne, ne lui dis rien. Je l’attends encore un peu.\n\n' +
      'A. V.',
  },
  {
    id: 'doc_r8_feuille_route',
    title: 'Feuille de route du 6142',
    source: 'Wagon couvert renversé, porte-documents du chef de train',
    body:
      'FRET — TRAIN 6142. Valombre-Triage → Morvan-Écluse.\n' +
      'Réquisition préfectorale n° 0417, au profit de l’Institut Ferrand.\n\n' +
      'Composition : 1 locomotive diesel, 3 wagons couverts.\n' +
      'Wagon 1 : matériel médical, chaîne du froid.\n' +
      'Wagon 2 : vivres et eau.\n' +
      'Wagon 3 : passagers sous escorte (11). Sujets jeunes.\n\n' +
      'Consigne : ne pas ouvrir le wagon 3 avant Morvan, quoi qu’on entende.\n\n' +
      'Au crayon, d’une autre écriture, en travers de la page : « Arrêt non prévu PK 41. Ils frappent depuis deux heures. L’escorte ne répond plus à la radio. J’ouvre. »',
  },
];

export const DIARY_R8: DiaryRule[] = [
  { chapter: C, text: 'La ligne du fleuve. Des kilomètres de rails qui ne mènent plus nulle part, sauf à Morvan.' },
  { chapter: C, if: all(flag('draisine_prise'), notFlag('draisine_perdue')), text: 'La draisine d’Armand file comme un chien qu’on lâche. Le vent du fleuve m’a fait pleurer les yeux, et pour une fois, ce n’était que le vent.' },
  { chapter: C, if: flag('r8_deraille'), text: 'Elle a déraillé dans une courbe. J’ai entendu l’essieu se tordre. Elle s’appelait Odette. Je n’oserai pas le dire à Armand.' },
  { chapter: C, if: flag('r8_a_pied'), text: 'Des heures sur le ballast. Les traverses ne sont jamais à la bonne distance pour un pas humain. Je crois qu’elles ont été posées pour des trains, pas pour nous.' },
  { chapter: C, if: flag('r8_wagon_fouille'), text: 'Le 6142 était couché dans les ronces, la porte arrachée de l’intérieur. Onze passagers. Je n’ai pas cherché à savoir ce qu’ils étaient devenus.' },
  { chapter: C, if: flag('r8_delmas_embarques'), text: 'Jules a fait le salut à l’envers au fleuve, aux vaches mortes dans les prés, à moi. Claire n’a pas souri. Mais elle a lâché sa valise un moment.' },
  { chapter: C, if: companionIs('theo', 'captured'), text: 'Il y a une cage sous une bâche, en bas, au gué. Je sais qui est dedans. Il est à deux cents mètres de moi.' },
  { chapter: C, if: flag('r8_gaspard_parle'), text: 'Gaspard Lenoir, assis sur une borne, sans peinture sur le visage. Il ressemblait à n’importe quel vieil homme. C’est peut-être ce qu’il a toujours été.' },
];
