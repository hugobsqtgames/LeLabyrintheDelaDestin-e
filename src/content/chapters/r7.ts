/**
 * Chapitre 11 — Brennes (« La soupe du maire »)
 * Un village fortifié qui accueille trop bien : la soupe du maire Vautrin,
 * les deux « pensionnaires » de la salle des fêtes, et la voie du fleuve.
 */
import type { DiaryRule, DocumentDef, Scene } from '../../engine/types';
import {
  all,
  any,
  background,
  companionIs,
  diary,
  discover,
  doc,
  flag,
  give,
  has,
  hurt,
  journal,
  lacks,
  meal,
  notFlag,
  notWithUs,
  p,
  profile,
  questFx,
  questStep,
  quest,
  rel,
  say,
  set,
  take,
  when,
  withUs,
  xp,
} from '../helpers';

const C = 'r7';
const THEO = withUs('theo');
const THEO_CAGE = companionIs('theo', 'captured');
/** Celui ou celle que Vautrin veut retenir : Théo, sinon Nour, sinon le joueur. */
const CIBLE_NOUR = all(notWithUs('theo'), withUs('nour'));
const CIBLE_MOI = all(notWithUs('theo'), notWithUs('nour'));
const SEUL = all(notWithUs('maelle'), notWithUs('theo'), notWithUs('kaz'), notWithUs('ines'), notWithUs('nour'));
const INDICE = any(flag('r7_talus'), flag('r7_pension_vue'), flag('r7_indice_ecole'), flag('r7_indice_marche'));
const KAZ_HEROS = companionIs('kaz', 'hero');
const MAELLE_HEROS = companionIs('maelle', 'hero');
const INES_HEROS = companionIs('ines', 'hero');
const FLAIR_GENERIQUE = all(
  notFlag('r7_flair_maelle'),
  notFlag('r7_flair_nour'),
  notFlag('r7_flair_amb'),
  notFlag('r7_flair_maelle_vous'),
  notFlag('r7_flair_ines_vous'),
);

export const chapterR7: Scene[] = [
  // -------------------------------------------------------------------------
  // L’arrivée
  // -------------------------------------------------------------------------
  {
    id: 'r7_barricade',
    chapter: C,
    location: 'brennes',
    title: 'Le mur de Brennes',
    kind: 'story',
    checkpoint: true,
    illustration: 'brennes',
    text: [
      p('Vu de près, Brennes tient en peu de choses : un clocher trapu, des toits d’ardoise, et tout autour un mur fait de ce que la route a laissé. Des remorques de camion couchées bout à bout, des sacs de sable, des portières soudées, des herses agricoles dents tournées vers l’extérieur.'),
      p('Sur le mur, des silhouettes et des fusils de chasse. Et, chose que vous n’aviez pas vue depuis des mois, une fumée de cheminée qui sent le poireau.'),
      p('Au-dessus du portail, une banderole peinte à la main : « BRENNES — ICI ON S’ENTRAIDE ». Les lettres ont été repassées plusieurs fois. Quelqu’un y tient.'),
      say('kaz', '« Brennes. J’ai fait passer leurs péniches de betteraves à l’écluse d’en bas, dans le temps. Ils avaient un maire qui parlait trop. » Il plisse les yeux vers le mur. « Ils en ont peut-être encore un. »', withUs('kaz')),
      p('Brennes. Vous avez fait passer leurs péniches de betteraves à l’écluse d’en bas, dans le temps. Ils avaient un maire qui parlait trop. Irena disait qu’il serrait les mains comme on pèse des légumes. Ils en ont peut-être encore un.', KAZ_HEROS),
      p('Nour s’est arrêtée. Elle compte les fusils à voix basse. « Sept. » Puis elle compte les fenêtres de la mairie, et elle ne dit pas pourquoi.', withUs('nour')),
      p('Personne ne marche à côté de vous. La fumée de cheminée vous serre la gorge plus que le brouillard ne l’a jamais fait.', SEUL),
    ],
    onEnter: [discover('brennes')],
    choices: [
      {
        id: 'presenter',
        text: 'Avancer à découvert jusqu’au portail, les mains bien visibles.',
        kind: 'talk', time: 0.5,
        next: 'r7_accueil',
      },
      {
        id: 'eclaireur',
        text: '[Éclaireur] Se glisser sous le pont du chemin de fer, là où personne ne regarde jamais.',
        kind: 'stealth', time: 0.5,
        requires: [profile('eclaireur')],
        effects: [xp(10)],
        next: 'r7_talus',
      },
      {
        id: 'talus',
        text: 'Contourner par le talus de la voie ferrée pour observer le village avant de se montrer.',
        kind: 'stealth', time: 0.5,
        check: { stat: 'discretion', difficulty: 8, success: 'r7_talus', failure: 'r7_accueil', failureEffects: [set('r7_surpris')] },
      },
    ],
  },
  {
    id: 'r7_talus',
    chapter: C,
    location: 'brennes',
    title: 'Le talus',
    kind: 'story',
    text: [
      p('Le talus de la voie domine les jardins. À plat ventre dans les ronces, vous voyez tout : des potagers tirés au cordeau, une cour d’école balayée, une place avec une fontaine qui coule. Une vie. Un village.'),
      p('Et la salle des fêtes, au bout de la place : un préfabriqué aux volets clos en plein jour, un cadenas neuf sur la porte. Un homme est assis devant sur une chaise de cuisine, un fusil en travers des genoux. Il ne surveille pas la route. Il surveille la porte.'),
      p('La porte s’ouvre. Deux adolescents sortent vider un seau, escortés. Une fille d’environ seize ans, un garçon plus jeune. Propres, nourris, bien coiffés. Le garçon porte un col roulé malgré le soleil de midi. La fille a un pansement à la base du cou, là où commence l’épaule.'),
      say('theo', '« Elle a un pansement au même endroit que moi », souffle Théo. Sa main est montée toute seule jusqu’à son épaule.', THEO),
      p('Au bout du village, la gare : un quai, une marquise de fonte, une remise de brique au toit de tôle. La voie unique part vers le nord en longeant le fleuve.'),
    ],
    onEnter: [set('r7_talus'), discover('voie_fleuve'), xp(15), journal('Brennes garde deux adolescents sous clé dans sa salle des fêtes.', false)],
    choices: [
      { id: 'descendre', text: 'Redescendre et se présenter au portail, comme si de rien n’était.', kind: 'move', time: 0.5, next: 'r7_accueil' },
    ],
  },
  {
    id: 'r7_accueil',
    chapter: C,
    location: 'brennes',
    title: 'Le maire',
    kind: 'story',
    text: [
      p('Le portail est une benne à ordures montée sur des roues de brouette. On la fait rouler pour vous. Derrière, une rue pavée, des enfants qui se taisent en vous voyant, et un homme qui vient à votre rencontre les deux mains tendues.'),
      p('Les sentinelles ont repéré votre manège sur le talus. Elles ne disent rien, mais deux canons vous suivent jusqu’au portail, et le sourire de l’homme qui vous accueille arrive une demi-seconde après lui.', flag('r7_surpris')),
      p('La soixantaine, un gilet de laine boutonné jusqu’en haut, des lunettes de presbyte pendues à un cordon. Il serre votre main entre les deux siennes, longtemps, chaudement. Pendant qu’il la serre, ses yeux font le tour de votre cou.'),
      say('vautrin', '« Bertrand Vautrin. Maire de Brennes avant, et encore maintenant, faute de candidats. » Il rit de sa propre plaisanterie. « Bienvenue. Ici, on ne demande pas aux gens d’où ils viennent. On leur demande s’ils ont faim. »'),
      p('Il serre ensuite la main de Théo. Plus longtemps. Il pose l’autre main sur l’épaule du garçon, paternel, et son pouce glisse sous le col du blouson, juste un peu, juste là où est la cicatrice. Théo recule d’un pas. Vautrin sourit comme si de rien n’était.', THEO),
      say('maelle', '« Ne le touchez pas. » Maëlle a parlé doucement. C’est pire que si elle avait crié.', all(withUs('maelle'), THEO)),
      p('Il se penche vers Nour, lui demande son âge, lui pince la joue. Nour ne répond pas. Elle remonte son col d’un geste sec, et Vautrin la regarde le faire avec beaucoup d’attention.', CIBLE_NOUR),
      say('vautrin', '« Il y a de la soupe à midi, à la cantine de l’école, pour tout le monde. Des lits à la mairie pour qui veut dormir. Un marché sous le préau, si vous avez de quoi troquer. Faites comme chez vous. » Il tapote la poche de son gilet. « Brennes, c’est une famille. »'),
      p('Sur la place, des traces de pneus larges dans la boue, encore fraîches. Un camion est passé ce matin. Vautrin suit votre regard. « Des transporteurs. Ils ne s’arrêtent jamais longtemps. »', THEO_CAGE),
    ],
    onEnter: [questFx('q_brennes', 'active', 'soupe'), journal('À Brennes, le maire Vautrin offre la soupe et des lits. Il regarde les nuques.')],
    choices: [{ id: 'suivre', text: 'Suivre le maire jusqu’à la place.', kind: 'move', next: 'r7_place' }],
  },

  // -------------------------------------------------------------------------
  // Le village
  // -------------------------------------------------------------------------
  {
    id: 'r7_place',
    chapter: C,
    location: 'brennes',
    title: 'La place de Brennes',
    kind: 'story',
    checkpoint: true,
    text: [
      p('La place de Brennes a une fontaine qui coule pour de vrai, un tilleul, une mairie aux volets bleus et, tout au bout, la salle des fêtes au cadenas neuf. Le marché se tient sous le préau de l’école : des tréteaux, des bocaux, des pièces de vélo. On y troque à voix basse, comme à l’église.'),
      p('Vautrin est reparti vers la mairie avec une tape dans votre dos. Depuis, il y a toujours quelqu’un pour vous regarder sans en avoir l’air : un homme qui répare une chaise, une femme qui étend du linge. Toujours les mêmes, qui changent de place.'),
      p('Le garde de la salle des fêtes ne vous lâche plus des yeux. Vautrin vous salue de loin, chaque fois que vous traversez la place. Il sait que vous avez regardé là où il ne fallait pas.', flag('r7_mefiance')),
      p('Un gamin, à la fontaine, raconte qu’hier soir les ampoules de la mairie se sont rallumées toutes seules pendant une heure. « Comme avant. » Il le dit comme on parle d’un miracle. Vous savez, vous, quel disjoncteur a été réenclenché à Vaulx.', quest('q_barrage', 'completed')),
      p('Kaz s’est assis sur la margelle de la fontaine et regarde le toit de la mairie. « Il y a une antenne, là-haut. Une vraie, de radio marine. Pour un village de betteraviers, c’est beaucoup. »', withUs('kaz')),
    ],
    choices: [
      { id: 'marche', text: 'Faire un tour au marché sous le préau.', kind: 'explore', time: 0.5, next: 'r7_marche' },
      { id: 'ecole', text: 'Entrer dans l’école, d’où monte le bruit d’une dictée.', kind: 'explore', time: 0.5, next: 'r7_ecole' },
      { id: 'gare', text: 'Pousser jusqu’à la gare, au bout du village.', kind: 'explore', time: 0.5, next: 'r7_gare' },
      {
        id: 'salle',
        text: 'Se glisser derrière la salle des fêtes pendant que le garde mange.',
        kind: 'stealth', time: 0.5,
        visibleIf: [notFlag('r7_pension_vue'), notFlag('r7_mefiance')],
        check: { stat: 'discretion', difficulty: 8, success: 'r7_pension', failure: 'r7_surpris_salle' },
      },
      { id: 'soupe', text: 'Se rendre à la cantine pour la soupe de midi.', kind: 'move', time: 0.5, next: 'r7_soupe' },
    ],
  },
  {
    id: 'r7_marche',
    chapter: C,
    location: 'brennes',
    title: 'Le préau',
    kind: 'story',
    text: [
      p('Sous le préau, chacun troque ce qu’il a. Des conserves sans étiquette, des chaussettes tricotées, des piles qui marchent peut-être. Une vieille femme en tablier tient l’étal le mieux garni : bocaux de haricots, pains de seigle, et une boîte à chaussures pleine de pansements.'),
      p('Elle s’appelle Mme Ribot. Elle a quatre-vingts ans et toute sa tête, et elle parle en surveillant la mairie par-dessus votre épaule.'),
      p('« La soupe de Bertrand est bonne, dit-elle. Moi, je n’en prends plus. Je mange chez moi. À mon âge, on dort bien assez. » Elle n’ajoute rien. Elle range ses bocaux, un par un, avec beaucoup de soin.'),
      p('« Ce matin, à l’aube, il est passé une dame maigre avec un petit garçon qui saluait tout le monde à l’envers, la main gauche au front. Elle n’a pas voulu de la soupe non plus. Elle a dit qu’elle connaissait les gens trop gentils. » Mme Ribot hoche la tête. « Une femme de bon sens. »', questStep('q_delmas', 'route')),
      p('« Et le camion de ce matin, ajoute-t-elle plus bas, il y avait des cages sous la bâche. Bertrand lui a fait le plein. Un garçon, dedans, dessinait sur la toile avec un clou. » Vous ne demandez pas ce qu’il dessinait. Vous le savez.', THEO_CAGE),
    ],
    onEnter: [set('r7_indice_marche')],
    choices: [
      {
        id: 'pain',
        text: 'Un pain de seigle et un bocal de haricots (2 rations) contre 2 ferrailles.',
        kind: 'negotiate',
        once: true,
        requires: [has('ferraille', 2)],
        effects: [take('ferraille', 2), give('ration', 2)],
      },
      {
        id: 'pansements',
        text: 'Deux bandages propres contre une bouteille d’alcool.',
        kind: 'negotiate',
        once: true,
        requires: [has('alcool')],
        effects: [take('alcool'), give('bandage', 2)],
      },
      {
        id: 'bricoles',
        text: 'Du fil de cuivre et des chiffons contre une ration.',
        kind: 'negotiate',
        once: true,
        requires: [has('ration')],
        effects: [take('ration'), give('composants'), give('chiffons', 2)],
      },
      {
        id: 'cartouches',
        text: 'Quatre cartouches de chasse contre une boîte d’antibiotiques.',
        kind: 'negotiate',
        once: true,
        requires: [has('antibiotiques')],
        effects: [take('antibiotiques'), give('cartouche', 4)],
      },
      {
        id: 'ribot',
        text: 'Demander à Mme Ribot ce que la soupe a de spécial.',
        kind: 'talk',
        once: true,
        effects: [journal('Mme Ribot : « Les jours où il y a des étrangers, Bertrand sort la marmite bleue. Les jours où il y a des étrangers, il y a toujours quelqu’un qui dort trop. »')],
      },
      { id: 'retour', text: 'Retourner sur la place.', kind: 'move', next: 'r7_place' },
    ],
  },
  {
    id: 'r7_ecole',
    chapter: C,
    location: 'brennes',
    title: 'L’école',
    kind: 'story',
    text: [
      p('Quatorze enfants dans une classe faite pour trente. Une dictée au tableau noir, d’une écriture ronde : « Le fleuve coule vers la mer. La mer est grande. Nous irons la voir. » La maîtresse, une jeune femme aux ongles rongés, vous fait signe d’attendre la fin de la phrase.'),
      p('Au mur, entre la carte de France et un alphabet illustré, une feuille punaisée : « Visite médicale de M. le Maire ». Des prénoms, des dates, des croix. Presque toutes les croix sont au crayon. Deux sont à l’encre rouge, et à côté de ces deux prénoms, Elsa et Samuel, quelqu’un a écrit : « En pension ».'),
      p('La maîtresse vous voit lire. Elle pâlit, puis elle reprend sa dictée un ton plus haut.'),
      p('Théo s’est assis au fond, sur une chaise trop petite. Il regarde les enfants écrire. Il n’a pas mis les pieds dans une classe depuis quatorze mois. Il a l’air d’avoir mal quelque part.', THEO),
      say('nour', '« Il y a seize chaises et quatorze enfants, dit Nour en sortant. Les deux chaises en trop ont encore des étiquettes avec des noms dessus. »', withUs('nour')),
      p('En vous raccompagnant, la maîtresse parle très vite, sans vous regarder : « Ils sont mieux nourris que nous, là-bas. Monsieur le maire dit qu’ils partiront soigner le monde. Il dit qu’il faut être fiers. » Elle referme la porte avant que vous ayez pu répondre.'),
    ],
    onEnter: [set('r7_indice_ecole')],
    choices: [
      {
        id: 'tiroir',
        text: 'Revenir pendant la récréation et ouvrir le tiroir du bureau de la maîtresse.',
        kind: 'explore', time: 0.5,
        once: true,
        effects: [doc('doc_r7_visites'), journal('Dans le tiroir de l’école : le carnet des « visites médicales » du maire. Les enfants porteurs partent « en pension ».', false)],
        next: 'r7_place',
      },
      { id: 'retour', text: 'Retourner sur la place.', kind: 'move', next: 'r7_place' },
    ],
  },
  {
    id: 'r7_gare',
    chapter: C,
    location: 'brennes',
    title: 'La gare de Brennes',
    kind: 'story',
    text: [
      p('La gare de Brennes est une boîte de brique avec une horloge arrêtée à midi moins huit, l’heure, peut-être, où le dernier train est passé. Un quai, une marquise de fonte, un banc. La voie unique file vers le nord entre deux talus de ronces, et le fleuve brille en contrebas, large et lent.'),
      p('Contre le quai, la remise : briques noircies, porte coulissante en tôle, et un cadenas de cheminot à barillet carré, du genre qui ne s’ouvre qu’avec une clé en T.'),
      p('Vous sortez la clé d’Armand. Elle entre dans le barillet comme dans du beurre et tourne avec le claquement net d’une mécanique bien graissée. Dans l’odeur d’huile et de poussière, une forme basse sous une bâche verte. Quatre roues de fer. Un balancier. Le vieux n’avait pas menti.', has('cle_aiguillage')),
      p('Vous refermez aussitôt. Pas maintenant, pas avec la moitié du village qui regarde depuis la place. Mais vous savez où elle est, et la voie part d’ici.', has('cle_aiguillage')),
      p('Vous secouez la porte. Elle ne bouge pas d’un millimètre. Par une fente entre deux tôles, on devine une bâche verte, une forme basse, quelque chose sur des roues. Il faudrait la clé. Ou beaucoup de bruit.', lacks('cle_aiguillage')),
      p('Un milicien fume au bout du quai, son fusil appuyé contre le banc. Il vous regarde venir et ne bouge pas. Il est là pour une seule chose : que personne ne quitte Brennes par les rails sans qu’on le sache.'),
    ],
    onEnter: [
      discover('voie_fleuve'),
      when(has('cle_aiguillage'), [set('r7_remise_ouverte'), journal('La draisine d’Armand attend sous une bâche verte, dans la remise de la gare de Brennes.', false)]),
    ],
    choices: [
      {
        id: 'aiguillage',
        text: '[Technicien] Débloquer en douce le levier d’aiguillage rouillé du bout du quai.',
        kind: 'explore', time: 0.5,
        once: true,
        requires: [profile('technicien')],
        effects: [set('r7_aiguillage_degage'), xp(10), journal('Vous avez dégagé l’aiguillage de la gare : par les jardins et le quai, on peut quitter Brennes sans passer devant le milicien.', false)],
        next: 'r7_place',
      },
      { id: 'retour', text: 'Retourner sur la place.', kind: 'move', next: 'r7_place' },
    ],
  },
  {
    id: 'r7_pension',
    chapter: C,
    location: 'brennes',
    title: 'Les pensionnaires',
    kind: 'story',
    text: [
      p('Derrière la salle des fêtes, une fenêtre de toilettes mal fermée. Vous la poussez du bout des doigts.'),
      p('Deux lits de camp faits au carré, une table, un jeu de dames, une corbeille de pommes. Une affiche « Bal du 14 Juillet » pend encore au mur. La fille du talus lit un livre de poche. Le garçon dort, ou fait semblant. Ils ont l’air en bonne santé. Ils ont l’air d’attendre un train.'),
      p('Elle lève les yeux. Elle ne crie pas. « Vous êtes de la barge ? Vous êtes en avance. Le maire a dit ce soir. » Puis elle voit votre visage, et elle comprend que non.'),
      p('« Je m’appelle Elsa. Lui, c’est Samuel, mon frère. Il nous a pris au marché de Saint-Aubin, avec nos parents. Nos parents sont repartis avec des bidons de gasoil et une caisse de médicaments. Ils croyaient bien faire. Le maire leur a juré que l’Institut nous soignerait. » Elle tire sur son col : une cicatrice ronde, blanche, à la base du cou. « On n’est pas malades. C’est ça, le problème. »'),
      p('Théo s’est approché de la fenêtre. Il baisse son col à son tour, lentement, et montre son épaule. Elsa regarde le croissant de dents longtemps. Personne ne dit rien. Il n’y a rien à dire.', THEO),
    ],
    onEnter: [set('r7_pension_vue'), xp(20), journal('Deux porteurs, Elsa et Samuel, sont gardés « en pension » dans la salle des fêtes de Brennes. La barge doit les prendre ce soir.')],
    choices: [
      {
        id: 'sortir',
        text: 'Les faire sortir par la fenêtre maintenant, et les cacher chez Mme Ribot.',
        kind: 'stealth', time: 0.5,
        check: {
          stat: 'discretion',
          difficulty: 9,
          success: 'r7_place',
          failure: 'r7_surpris_salle',
          successEffects: [set('r7_porteurs_liberes'), xp(20), journal('Elsa et Samuel sont sortis par la fenêtre. Mme Ribot les a cachés dans sa cave, derrière les bocaux, sans poser une question.')],
        },
      },
      {
        id: 'attendre',
        text: 'Leur dire de se tenir prêts : vous reviendrez les chercher.',
        kind: 'talk',
        effects: [set('r7_promesse_elsa')],
        next: 'r7_place',
      },
    ],
  },
  {
    id: 'r7_surpris_salle',
    chapter: C,
    location: 'brennes',
    title: 'Le garde',
    kind: 'story',
    text: [
      p('Un craquement de gravier derrière vous. Le garde de la salle des fêtes est là, son assiette encore dans une main et son fusil dans l’autre. La quarantaine, une alliance, l’air de quelqu’un qui n’a pas choisi ce travail mais qui le fera quand même.'),
      p('« Les toilettes publiques, c’est à la mairie », dit-il. Il ne tire pas. Il siffle, deux notes courtes, et Vautrin arrive en trottinant, son gilet boutonné de travers.'),
      say('vautrin', '« On se perd vite, à Brennes, toutes ces petites rues. » Il vous prend par le bras, chaleureux et ferme. « La salle des fêtes est fermée pour travaux. L’amiante, vous savez. On ne plaisante pas avec la santé, ici. »'),
    ],
    onEnter: [set('r7_mefiance')],
    choices: [{ id: 'retour', text: 'Se laisser raccompagner jusqu’à la place.', kind: 'move', next: 'r7_place' }],
  },

  // -------------------------------------------------------------------------
  // La soupe
  // -------------------------------------------------------------------------
  {
    id: 'r7_soupe',
    chapter: C,
    location: 'brennes',
    title: 'La soupe du maire',
    kind: 'story',
    checkpoint: true,
    text: [
      p('La cantine de l’école sent le poireau, la pomme de terre et le pain chaud. Trente personnes sur des bancs, des bols ébréchés, des cuillères qui tintent. Pour la première fois depuis la Fièvre, vous entendez des gens parler la bouche pleine.'),
      p('Vautrin sert lui-même. Il passe entre les tables avec une louche et un mot pour chacun. Sur le passe-plat, deux marmites : une grande, en fonte, et une petite, émaillée bleue, posée à part sur un réchaud.'),
      p('Quand votre tour vient, il plonge la louche dans la marmite bleue pour le bol de Théo. « Pour le jeune homme, la meilleure. Il a besoin de forces, à son âge. » Les autres bols, il les remplit à la grande, sans y penser.', THEO),
      p('Quand votre tour vient, il remplit le bol de Nour à la marmite bleue. « Pour la petite demoiselle, la meilleure. » Il le pose devant elle avec un clin d’œil. Les autres bols viennent de la grande.', CIBLE_NOUR),
      p('Quand votre tour vient, il remplit votre bol à la marmite bleue, comme pour personne d’autre dans la salle. « Pour qui vient de loin, la meilleure. » Il reste debout à côté de vous, la louche à la main. « Après le repas, un petit contrôle sanitaire. Une formalité. On ne laisse pas entrer la Fièvre, à Brennes. »', CIBLE_MOI),
      p('Cette fois, il s’assoit en face de vous. Il ne mange pas. Il vous regarde manger.', flag('r7_mefiance')),
      p('La soupe fume. Elle a une odeur de soupe. Presque.'),
    ],
    choices: [
      {
        id: 'maelle',
        text: 'Laisser Maëlle sentir le bol avant que quiconque y touche.',
        kind: 'talk', time: 0.5,
        visibleIf: [withUs('maelle')],
        effects: [set('r7_flair_maelle'), rel('maelle', 1)],
        next: 'r7_soupe_eventee',
      },
      {
        id: 'maelle_vous',
        text: '[Vous, Maëlle] Sentir le bol avant que quiconque y touche.',
        kind: 'explore', time: 0.5,
        visibleIf: [MAELLE_HEROS],
        effects: [set('r7_flair_maelle_vous'), xp(10)],
        next: 'r7_soupe_eventee',
      },
      {
        id: 'ines_vous',
        text: '[Vous, Inès] Ne pas manger ce que vous n’avez pas vu cuire. Jamais.',
        kind: 'explore', time: 0.5,
        visibleIf: [INES_HEROS],
        effects: [set('r7_flair_ines_vous'), xp(10)],
        next: 'r7_soupe_eventee',
      },
      {
        id: 'nour',
        text: 'Écouter Nour, qui vous tire par la manche en comptant les marmites.',
        kind: 'talk', time: 0.5,
        visibleIf: [withUs('nour')],
        effects: [set('r7_flair_nour'), rel('nour', 1)],
        next: 'r7_soupe_eventee',
      },
      {
        id: 'ambulancier',
        text: '[Ambulancier] Tremper le bout de la langue : vous connaissez ce goût de sirop.',
        kind: 'explore', time: 0.5,
        requires: [background('ambulancier')],
        effects: [set('r7_flair_amb'), xp(10)],
        next: 'r7_soupe_eventee',
      },
      {
        id: 'refuser',
        text: 'Ne pas toucher à la soupe. Vous en avez assez vu, dans ce village.',
        kind: 'talk', time: 0.5,
        visibleIf: [INDICE],
        next: 'r7_soupe_eventee',
      },
      {
        id: 'observer',
        text: 'Regarder ce que mange Vautrin, lui.',
        kind: 'explore', time: 0.5,
        check: { stat: 'astuce', difficulty: 8, success: 'r7_soupe_eventee', failure: 'r7_endormi' },
      },
      {
        id: 'gouter',
        text: 'Goûter du bout des lèvres et se fier à son palais.',
        kind: 'explore', time: 0.5,
        check: { stat: 'survie', difficulty: 9, success: 'r7_soupe_eventee', failure: 'r7_endormi' },
      },
      {
        id: 'manger',
        text: 'Manger. Vous avez faim, et ces gens ont l’air si gentils.',
        kind: 'explore', time: 0.5,
        next: 'r7_endormi',
      },
    ],
  },
  {
    id: 'r7_soupe_eventee',
    chapter: C,
    location: 'brennes',
    title: 'Le goût de poire',
    kind: 'story',
    text: [
      say('maelle', '« Chloral », souffle Maëlle en reposant le bol. « Ou un sirop pour dormir, de pharmacie. Ça sent la poire trop mûre. On en donnait aux vieux, à l’hôpital, pour qu’ils ne se lèvent pas la nuit. » Elle regarde Vautrin. « Celui-là est dosé pour qu’on ne se lève pas du tout. »', flag('r7_flair_maelle')),
      say('nour', '« Il a servi trente et un bols à la grande marmite, chuchote Nour. Un seul à la petite. Et lui, il ne mange pas. »', flag('r7_flair_nour')),
      p('Vous reposez le bol sans y avoir touché. Chloral, ou un sirop pour dormir, de pharmacie : ça sent la poire trop mûre. À l’hôpital, on en donnait aux vieux pour qu’ils ne se lèvent pas la nuit. Celui-ci est dosé pour qu’on ne se lève pas du tout.', flag('r7_flair_maelle_vous')),
      p('Sous la ville, c’était la première règle des passeurs : ne rien avaler qu’on n’a pas vu cuire. Vous l’aviez apprise à Malik, la première fois que vous l’avez emmené sous la ville. Vous regardez Vautrin. Lui non plus ne mange pas. Et la marmite bleue a un reflet huileux qui sent la poire.', flag('r7_flair_ines_vous')),
      p('Le goût vous revient d’un coup, d’avant : la poire trop mûre, l’amertume au fond. Le sirop qu’on donnait à la cuillère aux patients agités, à l’arrière de l’ambulance. Celui-ci est dosé pour un cheval.', flag('r7_flair_amb')),
      p('Le bol de la marmite bleue a un reflet huileux et une odeur de poire trop mûre. Une soupe de poireaux ne sent pas la poire.', FLAIR_GENERIQUE),
      p('Vous faites semblant. La cuillère monte et descend, et la soupe finit sous la table, dans la gamelle d’un vieux chien qui s’endort presque aussitôt, les pattes en l’air.'),
      p('Vautrin attend. Il consulte sa montre, une fois, deux fois. Au bout d’un quart d’heure, il fait un signe de tête à deux hommes près de la porte.'),
      p('Les deux hommes s’approchent de Théo. Théo les regarde venir, les yeux grands ouverts, et le sourire de Vautrin se fige.', THEO),
      p('Les deux hommes s’approchent de Nour. Nour les regarde venir, bien droite sur son banc, et dit tout haut : « Je n’ai pas sommeil. » Le sourire de Vautrin se fige.', CIBLE_NOUR),
      say('vautrin', '« Bien. Ce petit contrôle sanitaire, maintenant. Ça ne prendra qu’une minute. » Une main se pose sur votre épaule, par-derrière, et elle serre.', CIBLE_MOI),
    ],
    onEnter: [set('r7_soupe_refusee'), xp(20)],
    choices: [{ id: 'lever', text: 'Se lever, lentement, et repousser le banc.', kind: 'fight', next: 'r7_crise' }],
  },
  {
    id: 'r7_endormi',
    chapter: C,
    location: 'brennes',
    title: 'Le sommeil de Brennes',
    kind: 'story',
    text: [
      p('La cuillère pèse de plus en plus lourd. Les voix de la cantine s’étirent, comme un disque qui ralentit. Vous voyez Vautrin sourire, et vous trouvez ce sourire très gentil, et puis vous ne voyez plus rien.'),
      p('Vous revenez à vous avec une bouche de carton, le front sur la table. Quelqu’un vous a mis une couverture sur les épaules. Dehors, la lumière a tourné.', any(THEO, CIBLE_NOUR)),
      p('Deux hommes portent Théo vers la porte, un sous chaque bras. Ses pieds traînent sur le carrelage. Il a les yeux mi-clos, il vous regarde, et il essaie de dire votre nom.', THEO),
      p('Un homme emporte Nour vers la porte, toute molle, ses tresses qui pendent. Elle ouvre un œil. Elle compte encore, du bout des lèvres, les pas qui la séparent de la sortie.', CIBLE_NOUR),
      p('Vous revenez à vous dans le bureau du maire, sur une chaise, les poignets collés aux accoudoirs par du ruban adhésif. Une bandelette de papier jaune trempe dans un godet de verre, avec trois gouttes de votre sang. Vautrin l’observe à contre-jour, ses lunettes sur le nez.', CIBLE_MOI),
      say('vautrin', '« Elle reste jaune. » Il soupire, sincèrement déçu. « Dommage. Vraiment. Enfin, l’Institut prend aussi des bras pour les cales. C’est moins cher, mais c’est quelque chose. »', CIBLE_MOI),
      say('ines', '« Je ne mange jamais ce que je n’ai pas vu cuire. » Inès est derrière vous, l’arbalète armée sous sa veste. Elle vous a laissé dormir le temps de compter les hommes. « Quatre. Lève-toi. »', withUs('ines')),
    ],
    onEnter: [set('r7_drogue'), hurt(2, 'le sirop de Brennes')],
    choices: [
      {
        id: 'ines',
        text: 'Laisser Inès ouvrir le chemin.',
        kind: 'fight', time: 0.5,
        visibleIf: [withUs('ines')],
        effects: [rel('ines', 1)],
        next: 'r7_crise',
      },
      {
        id: 'forcer',
        text: 'Se jeter sur eux, la tête encore pleine de coton.',
        kind: 'fight', time: 0.5,
        check: { stat: 'force', difficulty: 8, success: 'r7_crise', failure: 'r7_crise', failureEffects: [hurt(2, 'une crosse de fusil')] },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Le dénouement
  // -------------------------------------------------------------------------
  {
    id: 'r7_crise',
    chapter: C,
    location: 'brennes',
    title: 'Devant la fontaine',
    kind: 'story',
    checkpoint: true,
    text: [
      p('Tout se joue sur la place, devant la fontaine, en plein jour. Les gens de la cantine sont sortis, la serviette encore à la main. Quatre hommes de la milice font cercle, fusils de chasse à la hanche, sans savoir s’ils doivent les lever. Vautrin est au milieu, rouge, essoufflé, et il sourit encore. C’est son métier, sourire.'),
      p('Vous tenez debout, mais le sol penche. Le sirop est encore dans vos veines, lourd et sucré.', flag('r7_drogue')),
      p('Théo est contre vous, une main crispée sur votre manche. Il tient debout. Il le fait exprès.', THEO),
      say('vautrin', '« Allons, allons. Personne ne va se faire mal. C’est un malentendu. » Il écarte les bras vers la foule. « Ces gens ont marché, ils sont fatigués, ils voient des complots partout. Nous, à Brennes, nous protégeons nos enfants. Rentrez chez vous. »'),
      p('Personne ne rentre. La maîtresse est là, les bras croisés très fort. Mme Ribot est là, appuyée sur sa canne. Ils attendent. Ils attendent quelque chose depuis longtemps, peut-être, sans avoir jamais su quoi.'),
      say('kaz', '« Je connais ces gens, souffle Kaz. Ils ne sont pas méchants. Ils ont peur. Donne-leur une raison d’avoir moins peur de nous que de lui. »', withUs('kaz')),
      p('Vous connaissez ces gens. Vous avez bu leur cidre à l’écluse d’en bas, du temps des péniches. Ils ne sont pas méchants. Ils ont peur. Il faut leur donner une raison d’avoir moins peur de vous que de lui.', KAZ_HEROS),
    ],
    choices: [
      {
        id: 'ordre',
        text: 'Brandir l’ordre de mission du convoi et le lire à voix haute.',
        kind: 'talk', time: 1,
        requires: [has('ordre_mission')],
        effects: [set('r7_preuve_ordre')],
        next: 'r7_demasque',
      },
      {
        id: 'cassette',
        text: 'Faire écouter à la place la voix de Rousset : « Le reste est négociable. »',
        kind: 'negotiate', time: 1,
        visibleIf: [has('enregistrement')],
        check: { stat: 'astuce', difficulty: 7, success: 'r7_demasque', failure: 'r7_milice', successEffects: [set('r7_preuve_cassette')] },
      },
      {
        id: 'dossier',
        text: 'Lire la circulaire de l’Institut : « transfert prioritaire des porteurs asymptomatiques ».',
        kind: 'negotiate', time: 1,
        visibleIf: [has('dossier_ferrand')],
        check: { stat: 'astuce', difficulty: 9, success: 'r7_demasque', failure: 'r7_milice', successEffects: [set('r7_preuve_dossier')] },
      },
      {
        id: 'ribot',
        text: 'Faire signe à Mme Ribot : qu’elle amène Elsa et Samuel sur la place.',
        kind: 'talk', time: 0.5,
        visibleIf: [flag('r7_porteurs_liberes')],
        effects: [set('r7_preuve_porteurs')],
        next: 'r7_demasque',
      },
      {
        id: 'ines_salle',
        text: 'Envoyer Inès par la fenêtre des toilettes de la salle des fêtes.',
        kind: 'stealth', time: 0.5,
        visibleIf: [withUs('ines'), flag('r7_pension_vue'), notFlag('r7_porteurs_liberes')],
        effects: [set('r7_preuve_porteurs'), set('r7_porteurs_liberes'), rel('ines', 1)],
        next: 'r7_demasque',
      },
      {
        id: 'salle',
        text: 'Courir à la salle des fêtes, faire sauter le cadenas et montrer à tous ce qu’il y a dedans.',
        kind: 'fight', time: 0.5,
        visibleIf: [notFlag('r7_porteurs_liberes')],
        check: {
          stat: 'force',
          difficulty: 8,
          success: 'r7_demasque',
          failure: 'r7_milice',
          successEffects: [set('r7_preuve_porteurs'), set('r7_porteurs_liberes')],
        },
      },
      {
        id: 'guerrier',
        text: '[Guerrier] Arracher le fusil du premier milicien et tenir le cercle en respect le temps de rejoindre la gare.',
        kind: 'fight', time: 0.5,
        requires: [profile('guerrier')],
        effects: [xp(15)],
        next: 'r7_fuite_ok',
      },
      { id: 'fuir', text: 'Profiter de la confusion pour filer vers la gare et la voie ferrée.', kind: 'flee', time: 0.5, next: 'r7_fuite' },
      { id: 'frapper', text: 'Frapper le premier.', kind: 'fight', next: 'r7_milice' },
    ],
  },
  {
    id: 'r7_milice',
    chapter: C,
    location: 'brennes',
    title: 'La milice',
    kind: 'combat',
    text: [
      p('Le premier milicien lève son fusil. Le cercle se resserre. Vautrin recule derrière la fontaine en criant de viser les jambes, « les jambes, seulement les jambes ! » Même maintenant, il pense à la marchandise.'),
    ],
    encounter: {
      enemies: ['pillard', 'pillard'],
      canFlee: true,
      victory: 'r7_fuite_ok',
      defeat: 'r7_rosse',
      flee: 'r7_fuite',
      intro: 'Deux miliciens de Brennes, fusils de chasse et gilets de laine. Ce ne sont pas des tueurs. Ils ont peur, et c’est ce qui les rend dangereux.',
    },
    choices: [],
  },
  {
    id: 'r7_fuite',
    chapter: C,
    location: 'brennes',
    title: 'Les jardins',
    kind: 'story',
    text: [
      p('Vous coupez par les potagers, entre les rangs de poireaux et les tuteurs de haricots, le dos courbé sous les draps qui sèchent. Derrière, des cris, un sifflet, des portes qui claquent. Devant, le talus de la voie et la marquise de la gare.'),
      p('Kaz porte Théo sur son dos comme un sac de grain. Théo a les yeux ouverts et il ne lâche pas son cou.', all(THEO, flag('r7_drogue'), withUs('kaz'))),
      p('Le milicien du quai a entendu le sifflet. Il a jeté sa cigarette et il attend, le fusil épaulé, au bout du banc.'),
    ],
    choices: [
      {
        id: 'aiguillage',
        text: 'Passer par l’aiguillage que vous avez dégagé, derrière la remise, hors de sa vue.',
        kind: 'stealth', time: 0.5,
        visibleIf: [flag('r7_aiguillage_degage')],
        next: 'r7_fuite_ok',
      },
      {
        id: 'ramper',
        text: 'Ramper le long du talus jusqu’au quai sans vous faire voir.',
        kind: 'stealth', time: 0.5,
        visibleIf: [notFlag('r7_mefiance')],
        check: { stat: 'discretion', difficulty: 8, success: 'r7_fuite_ok', failure: 'r7_milice_gare' },
      },
      {
        id: 'ramper_guette',
        text: 'Ramper le long du talus jusqu’au quai, sous les yeux d’un garde qui vous guette depuis votre arrivée.',
        kind: 'stealth', time: 0.5,
        visibleIf: [flag('r7_mefiance')],
        check: { stat: 'discretion', difficulty: 10, success: 'r7_fuite_ok', failure: 'r7_milice_gare' },
      },
      { id: 'courir', text: 'Courir droit sur le quai, tant pis pour le bruit.', kind: 'flee', time: 0.5, next: 'r7_milice_gare' },
    ],
  },
  {
    id: 'r7_milice_gare',
    chapter: C,
    location: 'brennes',
    title: 'Le quai',
    kind: 'combat',
    text: [p('Le milicien du quai tire en l’air, puis lâche le chien de la gare, un griffon noir qui ne vous connaît pas et qui vous déteste déjà.')],
    encounter: {
      enemies: ['pillard', 'chien'],
      canFlee: true,
      victory: 'r7_fuite_ok',
      defeat: 'r7_rosse',
      flee: 'r7_fuite_ok',
      intro: 'Le milicien du quai et son chien vous barrent la voie ferrée.',
    },
    choices: [],
  },
  {
    id: 'r7_fuite_ok',
    chapter: C,
    location: 'voie_fleuve',
    title: 'Les rails',
    kind: 'story',
    text: [
      p('Le ballast crisse sous vos semelles. Derrière vous, le mur de Brennes se referme sur lui-même : remorques, sacs de sable, herses. Sur le rempart, les silhouettes ne tirent pas. Elles regardent partir ce qu’elles n’ont pas su retenir.'),
      p('Personne ne vous suit sur la voie. Un village qui a peur ne sort pas de ses murs.'),
      p('Mme Ribot a caché Elsa et Samuel dans sa cave, derrière les bocaux. Vous ne saurez sans doute jamais si ça aura suffi.', flag('r7_porteurs_liberes')),
      p('Derrière un cadenas neuf, dans une salle des fêtes qui sent la pomme, deux adolescents attendent toujours la barge de ce soir.', notFlag('r7_porteurs_liberes')),
    ],
    onEnter: [
      set('brennes_fuite'),
      when(flag('r7_porteurs_liberes'), [questFx('q_brennes', 'completed'), xp(20)], [questFx('q_brennes', 'failed')]),
      journal('Vous avez fui Brennes par la voie ferrée.'),
    ],
    choices: [{ id: 'quai', text: 'Reprendre votre souffle au bout du quai, là où commence la ligne du fleuve.', kind: 'move', next: 'r7_fin' }],
  },
  {
    id: 'r7_rosse',
    chapter: C,
    location: 'voie_fleuve',
    title: 'Hors les murs',
    kind: 'story',
    text: [
      p('Vous revenez à vous dans le fossé, au pied du mur, côté voie ferrée. La milice a vidé vos poches, puis vous a fait passer de l’autre côté du mur, comme on sort les ordures.'),
      p('Maëlle nettoie l’entaille de votre arcade avec un coin de chiffon. Elle a un œil qui gonfle, elle aussi. « Ils n’ont pas osé nous garder, dit-elle. Ils n’ont même pas osé nous tuer. Ce sont des boutiquiers. »', withUs('maelle')),
      p('Théo est assis sur un rail, entier. Il a les genoux sous le menton et regarde le mur. Personne ne l’a emmené. C’est la seule victoire de l’après-midi, et c’est la seule qui compte.', THEO),
      p('Sur le rempart, le garde de la salle des fêtes vous regarde vous relever. Il hésite, puis il lance par-dessus les sacs de sable un bocal de haricots qui roule jusqu’à vos pieds sans se briser.'),
    ],
    onEnter: [
      hurt(3, 'les coups de crosse de la milice'),
      take('ration', 2),
      give('ration', 1),
      set('brennes_fuite'),
      when(flag('r7_porteurs_liberes'), [questFx('q_brennes', 'completed')], [questFx('q_brennes', 'failed')]),
      journal('La milice de Brennes a vidé vos poches et vous a mis à la porte du village, à coups de crosse.'),
    ],
    choices: [{ id: 'quai', text: 'Se relever et marcher jusqu’au quai de la gare, de l’extérieur du mur.', kind: 'move', time: 0.5, next: 'r7_fin' }],
  },
  {
    id: 'r7_demasque',
    chapter: C,
    location: 'brennes',
    title: 'La place se retourne',
    kind: 'story',
    text: [
      p('Vous lisez lentement. « Collecte de porteurs, secteur Valombre-Nord. Priorité : sujets jeunes. » Vous lisez la signature. Puis vous tendez la feuille plastifiée à la maîtresse, qui la lit à son tour et la passe à son voisin. Elle fait le tour de la place, de main en main, tachée de sang, et chaque main tremble un peu plus que la précédente.', flag('r7_preuve_ordre')),
      p('Le dictaphone grésille au milieu du silence. La voix de Rousset en sort, métallique, minuscule : « Le protocole prévoit les porteurs. Le reste est négociable. » Vous rembobinez. Vous la faites entendre une deuxième fois. À la deuxième, un milicien baisse son fusil.', flag('r7_preuve_cassette')),
      p('Vous lisez la circulaire de l’Institut, son tampon « Confidentiel », ses phrases propres comme des draps repassés : « identification », « transfert », « porteurs asymptomatiques ». À Brennes, personne n’avait jamais vu ces mots écrits. Tous regardent leur maire.', flag('r7_preuve_dossier')),
      p('Elsa et Samuel traversent la place en clignant des yeux au soleil. Elsa baisse son col devant tout le monde. La cicatrice est là, ronde et blanche. « Il a dit à nos parents que l’Institut nous soignerait. On n’est pas malades. On est à vendre. » Sa voix ne tremble pas. C’est celle de Samuel qui tremble, derrière.', flag('r7_preuve_porteurs')),
      p('Vautrin ouvre la bouche. Rien ne sort. Pour la première fois, il ne trouve pas le mot gentil.'),
      p('C’est Mme Ribot qui parle. « Bertrand. Mon petit-fils Lucas. Tu nous as dit qu’il était parti à l’Institut se faire soigner. Il n’était pas malade, Lucas. » Elle ne crie pas. Personne ne crie. Quelqu’un ôte le fusil des mains d’un milicien, doucement, comme on reprend un couteau à un enfant.'),
      say('kaz', '« Je t’ai connu, Vautrin, quand tu vendais tes betteraves au poids, le pouce sur la balance. » Kaz crache par terre. « Tu n’as pas changé de métier. »', withUs('kaz')),
      say('moi', '« Je t’ai connu, Vautrin, quand tu vendais tes betteraves au poids, le pouce sur la balance. » Vous crachez par terre. « Tu n’as pas changé de métier. »', KAZ_HEROS),
      p('Théo, à côté de vous, a remis son col en place. Il regarde Vautrin sans haine. C’est pire.', THEO),
      p('Une heure plus tard, Bertrand Vautrin quitte Brennes à pied par le portail-benne, une valise à la main, son gilet de laine boutonné jusqu’en haut. Personne ne le frappe. Personne ne lui dit au revoir. Dans l’école, la maîtresse décroche la feuille des visites médicales et la brûle dans le poêle.'),
      p('Le village vous remplit les sacs sans qu’on ait rien demandé : du pain de seigle, des haricots, des bandes propres. Mme Ribot vous prend le visage entre ses mains sèches et ne dit rien du tout.'),
      p('Reste la radio de la mairie, et son antenne marine. Ce soir, la barge attend un appel de Brennes.'),
    ],
    onEnter: [
      set('brennes_demasque'),
      set('r7_porteurs_liberes'),
      questFx('q_brennes', 'completed'),
      give('ration', 2),
      give('bandage', 1),
      xp(60),
      journal('Brennes a chassé son maire. Elsa et Samuel ne seront pas livrés à la barge.'),
    ],
    choices: [
      {
        id: 'bureau',
        text: 'Fouiller le bureau de Vautrin avant que quelqu’un d’autre le fasse.',
        kind: 'explore', time: 0.5,
        once: true,
        effects: [doc('doc_r7_bordereau'), give('cartouche', 2), journal('Dans le bureau de Vautrin : le bordereau de la Destinée. Deux porteurs contre du gasoil, des antibiotiques et six places à bord, dont la sienne.', false)],
      },
      {
        id: 'couper',
        text: 'Arracher les lampes de la radio : que Rousset croie Brennes à lui jusqu’à l’aube.',
        kind: 'sacrifice', time: 0.5,
        warning: 'Brennes ne pourra plus appeler personne.',
        effects: [set('r7_radio_muette'), journal('Vous avez réduit au silence la radio de Brennes. À la barge, on attend toujours la livraison.')],
        next: 'r7_fin',
      },
      {
        id: 'appeler',
        text: 'Laisser la maîtresse appeler la barge et dire que Brennes ne livrera plus personne.',
        kind: 'talk', time: 0.5,
        warning: 'Le capitaine Rousset saura que quelqu’un défait ses marchés.',
        effects: [set('r7_barge_prevenue'), journal('Brennes a prévenu la barge par radio : plus de livraison. Rousset sait.')],
        next: 'r7_fin',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Fin
  // -------------------------------------------------------------------------
  {
    id: 'r7_fin',
    chapter: C,
    location: 'brennes',
    title: 'Le quai de Brennes',
    kind: 'chapterEnd',
    text: [
      p('La lumière a pris la couleur du blé. Au bout du quai, quelqu’un a remonté l’horloge de la gare, et elle repart, avec des mois de retard. Le village est derrière vous, sa fontaine, sa cantine, son école où l’on écrit que nous irons voir la mer.', flag('brennes_demasque')),
      p('Dans le micro de la mairie, la maîtresse a parlé d’une voix nette : « Ici Brennes. Nous ne livrerons personne. » Un long silence, puis une voix d’homme, sèche : « Bien reçu. » Rousset sait, maintenant, que quelqu’un marche vers lui en défaisant ce qu’il achète.', flag('r7_barge_prevenue')),
      p('Dans la mairie, la radio n’est plus qu’une boîte vide. À l’écluse, Rousset croit encore que Brennes lui livrera deux enfants ce soir. Il attendra.', flag('r7_radio_muette')),
      p('Vous mangez assis sur le quai, les jambes au-dessus des rails, avec ce que Brennes vous a laissé emporter. Le mur du village a l’air plus petit, vu d’ici. Un mur ne protège que de ce qui vient du dehors.', flag('brennes_fuite')),
      p('Dans votre dos, la remise d’Armand, sa porte de tôle, sa bâche verte. Devant, la ligne du fleuve file vers le nord, deux rails luisants qui se rejoignent au loin, à l’endroit exact où il faut aller.', has('cle_aiguillage')),
      p('Devant, la ligne du fleuve file vers le nord entre ses talus de ronces. Deux rails, du ballast, et beaucoup de kilomètres. La remise de la gare reste fermée sur sa forme bâchée.', lacks('cle_aiguillage')),
      p('Le camion du matin a pris la route du gué. Les rails la longent. Quelque part devant, Théo dessine sur une bâche avec un clou.', THEO_CAGE),
      p('Théo a sorti son carnet. Il dessine Brennes : le mur, la fontaine, la salle des fêtes. Sur la porte de la salle, il ne dessine pas de cadenas.', all(THEO, flag('r7_porteurs_liberes'))),
      p('Il reste {reste} avant l’aube du septième.'),
    ],
    onEnter: [meal(), diary('r7')],
    choices: [{ id: 'suite', text: 'Chapitre 12 : La Draisine', kind: 'move', time: 1, next: 'r8_quai' }],
  },
];

export const DOCUMENTS_R7: DocumentDef[] = [
  {
    id: 'doc_r7_visites',
    title: 'Carnet des visites médicales',
    source: 'Tiroir du bureau de la maîtresse, école de Brennes',
    body:
      'VISITES DE M. LE MAIRE — CLASSE UNIQUE\n' +
      'Contrôle de la nuque et des épaules. Trois gouttes de sang sur bandelette (fournies par l’Institut). Jaune : rien. Bleue : « à signaler ».\n\n' +
      '— Lucas R., 13 ans. Bleue. Parti à l’Institut le 3 mars « pour être soigné ».\n' +
      '— Camille D., 9 ans. Jaune.\n' +
      '— Hugo et Léna P., 7 et 11 ans. Jaunes.\n' +
      '— Elsa M., 16 ans, et Samuel M., 12 ans, arrivés de Saint-Aubin. Bleues toutes les deux. En pension.\n' +
      '— (onze autres lignes, toutes jaunes)\n\n' +
      'En bas de la page, d’une écriture ronde, au crayon, puis raturée : « Bleu, ça veut dire qu’ils partent. Je ne sais pas où. Je ne sais pas si je dois dire aux parents de cacher les épaules de leurs enfants. Je ne sais pas si je suis lâche ou prudente. »',
  },
  {
    id: 'doc_r7_bordereau',
    title: 'Bordereau de fourniture',
    source: 'Bureau du maire, mairie de Brennes',
    body:
      'INSTITUT FERRAND — NAVIRE MÉDICAL DESTINÉE\n' +
      'Accord de fourniture n° 4 — Commune de Brennes (M. B. Vautrin, maire)\n\n' +
      'Objet : deux (2) sujets porteurs asymptomatiques, état sanitaire satisfaisant, à remettre à l’équipe de collecte au quai de la gare de Brennes, veille du départ, à la tombée de la nuit.\n\n' +
      'Contrepartie : 400 litres de gazole ; une caisse d’antibiotiques ; priorité d’embarquement pour six (6) habitants désignés par le maire.\n\n' +
      'Pour le capitaine A. Rousset, le chef de collecte.\n\n' +
      'Au dos, au stylo, de la main de Vautrin : « Désignés : moi, Mireille, mon frère Georges, sa femme, les deux petits. Ne pas en parler au conseil. Le village tiendra très bien sans nous. »',
  },
];

export const DIARY_R7: DiaryRule[] = [
  { chapter: 'r7', text: 'Brennes avait une fontaine qui coulait, une école, une soupe chaude. Pendant une heure, j’ai cru que le monde savait encore être gentil.' },
  { chapter: 'r7', if: flag('r7_soupe_refusee'), text: 'Une soupe de poireaux qui sentait la poire. Je crois que je ne pourrai plus jamais m’asseoir à une table sans regarder les marmites.' },
  { chapter: 'r7', if: flag('r7_drogue'), text: 'Le sirop m’a pris comme une vague. Je me souviens du sourire de Vautrin, et de l’avoir trouvé gentil. C’est ça qui me fait peur.' },
  { chapter: 'r7', if: all(withUs('theo'), flag('r7_pension_vue')), text: 'Théo a montré sa cicatrice à une fille qui avait la même. Ils ne se sont rien dit. Ils n’en avaient pas besoin.' },
  { chapter: 'r7', if: flag('brennes_demasque'), text: 'Personne n’a frappé Vautrin. Il est parti avec sa valise, et le village l’a regardé s’en aller comme on regarde passer un orage.' },
  { chapter: 'r7', if: all(flag('brennes_fuite'), notFlag('r7_porteurs_liberes')), text: 'On a fui par les rails. Elsa et Samuel sont restés derrière un cadenas neuf. Je compte les heures qui restent, et je compte aussi ça.' },
  { chapter: 'r7', if: all(flag('brennes_fuite'), flag('r7_porteurs_liberes')), text: 'Elsa et Samuel sont dans une cave, derrière des bocaux de haricots. C’est peu. C’est mieux qu’une cale.' },
  { chapter: 'r7', if: flag('r7_barge_prevenue'), text: '« Ici Brennes. Nous ne livrerons personne. » Rousset sait qu’on arrive. Tant mieux, peut-être. Qu’il ait peur, lui aussi.' },
  { chapter: 'r7', if: flag('r7_radio_muette'), text: 'J’ai arraché les lampes de la radio. Quelque part à Morvan, quelqu’un attend une livraison qui ne viendra pas.' },
  { chapter: 'r7', if: flag('r7_remise_ouverte'), text: 'La draisine d’Armand est là où il l’avait dit, sous sa bâche verte. Le vieux n’a pas menti. Je lui dois ça.' },
];
