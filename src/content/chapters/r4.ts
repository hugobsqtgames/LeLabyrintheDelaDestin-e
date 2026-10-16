/**
 * Chapitre 8 — Le Barrage (« La nuit de Vaulx »)
 * Le barrage et la centrale de Vaulx : la ligne de Morvan coupée par
 * l’Institut, le fusible de la galerie noyée, le courant rendu au fleuve,
 * et une nuit de veille dans la tour de commande.
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
  questFx,
  rel,
  rest,
  say,
  set,
  step,
  take,
  when,
  withUs,
  xp,
} from '../helpers';

const C = 'r4';
const THEO_CAGE = companionIs('theo', 'captured');
const PERSONNE = all(notWithUs('maelle'), notWithUs('theo'), notWithUs('kaz'), notWithUs('ines'), notWithUs('nour'));
const QUELQUUN = not(PERSONNE);
const COURANT = flag('courant_retabli');
/** La porte de la galerie est restée ouverte : quelque chose remontera pendant la nuit. */
const PORTE_OUVERTE: Condition = all({ type: 'visited', scene: 'r4_galerie' }, notFlag('r4_porte_fermee'), notFlag('r4_intrus_venu'));
const ABANDON = [when(not(COURANT), [questFx('q_barrage', 'failed')])];

export const chapterR4: Scene[] = [
  // -------------------------------------------------------------------------
  // Le couronnement
  // -------------------------------------------------------------------------
  {
    id: 'r4_couronnement',
    chapter: C,
    location: 'barrage',
    title: 'Le couronnement',
    kind: 'story',
    checkpoint: true,
    text: [
      p('Le barrage de Vaulx barre la vallée d’un seul trait gris, quarante mètres de béton entre deux flancs de forêt. En amont, le lac est noir et parfaitement lisse. En aval, le fleuve repart mince, presque timide, comme s’il avait honte d’avoir été retenu.'),
      p('La nuit tombe vite, ici. Le vent remonte la vallée et siffle dans les garde-corps. Au bout du couronnement, à trois cents mètres, la tour de commande attend, toutes fenêtres éteintes.'),
      say('kaz', '« Vaulx. » Kaz pose la main sur le parapet, à plat, comme sur l’encolure d’un cheval. « J’ai fait deux ans de maintenance ici, avant l’écluse. C’est cette centrale qui envoyait le jus à Morvan. Les vannes, les portes, les lampadaires du quai. Tout. »', withUs('kaz')),
      p('Une plaque émaillée, au pied de la première pile : « Centrale de Vaulx — accès réservé au personnel ». Quelqu’un a rayé « personnel » au couteau et écrit en dessous : « vivants ».', notWithUs('kaz')),
      p('À mi-chemin, sur la passerelle métallique qui longe la crête, trois silhouettes se tiennent immobiles, tournées vers le lac. Le vent vous apporte le bruit, par bouffées : un cliquetis de dents, sec, patient.'),
      p('Théo a déjà sorti son carnet. Il dessine le barrage en quatre traits, et les trois silhouettes en trois points.', withUs('theo')),
    ],
    choices: [
      {
        id: 'escalier',
        text: 'Suivre Kaz par la galerie haute, à l’intérieur du mur.',
        kind: 'move', time: 1,
        visibleIf: [withUs('kaz')],
        next: 'r4_escalier',
      },
      {
        id: 'cloche',
        text: 'Faire tinter la cloche du Berger au-dessus du déversoir.',
        kind: 'item', time: 0.5,
        requires: [has('cloche_berger')],
        next: 'r4_cloche',
      },
      {
        id: 'discretion',
        text: 'Longer le parapet côté lac, courbé sous le vent, et passer derrière eux.',
        kind: 'stealth', time: 1,
        check: { stat: 'discretion', difficulty: 8, success: 'r4_salle', failure: 'r4_passerelle' },
      },
      {
        id: 'attaquer',
        text: 'Marcher droit sur la passerelle et les abattre.',
        kind: 'fight', time: 0.5,
        next: 'r4_passerelle',
      },
    ],
  },
  {
    id: 'r4_cloche',
    chapter: C,
    location: 'barrage',
    title: 'Le déversoir',
    kind: 'story',
    text: [
      p('Vous enjambez le garde-corps du côté aval, là où le béton plonge en pente douce vers le déversoir. Vous défaites le chiffon qui étouffe la cloche du Berger, et vous la secouez une fois, deux fois, au-dessus du vide.'),
      p('Les trois têtes se tournent ensemble. Les Rôdeurs quittent la passerelle et viennent vers le son, sans hâte, en ligne droite. Ils ne voient pas le garde-corps. Ils ne voient pas la pente. Le premier bascule sans un bruit, puis le deuxième. Le troisième reste accroché une seconde par sa veste, puis le vent décide pour lui.'),
      p('Tout en bas, l’eau du déversoir les reçoit sans même faire d’écume.'),
      say('ines', '« Propre », dit Inès. Elle ne range pas son arbalète pour autant.', withUs('ines')),
    ],
    onEnter: [xp(25), journal('La cloche du Berger a précipité les Rôdeurs du barrage dans le déversoir.', false)],
    choices: [{ id: 'tour', text: 'Gagner la tour de commande.', kind: 'move', time: 0.5, next: 'r4_salle' }],
  },
  {
    id: 'r4_escalier',
    chapter: C,
    location: 'barrage',
    title: 'La galerie haute',
    kind: 'story',
    text: [
      p('Kaz force une porte de fer au pied de la première pile, et vous entrez dans le barrage lui-même. Un couloir étroit court dans l’épaisseur du mur, sec, froid, éclairé par rien. Vos pas sonnent comme dans une église.'),
      say('kaz', '« La galerie d’inspection. On y passait deux fois par jour pour relever les fissures. » Il tapote un repère peint sur le béton, un chiffre et une date. « Celle-là, c’est moi qui l’ai notée. Elle n’a pas bougé. Au moins une chose qui tient. »'),
      say('kaz', '« Irena venait m’apporter à manger, le dimanche. Elle disait que le barrage ronronnait comme un chat. » Un temps. « Il ronronne plus. »'),
      say('kaz', '« Tu m’as repris après ce que j’ai fait. » Il ne se retourne pas. « Je te dois une lumière, au moins. On va voir si j’en suis encore capable. »', flag('kaz_rachete')),
      say('kaz', '« À la capitainerie, tu m’as laissé parler sans me couper. Personne ne fait ça. » Il hausse les épaules. « Bon. Tout droit, et on évite tes amis de la passerelle. »', flag('kaz_pardonne')),
      p('Au bout du couloir, un escalier en colimaçon remonte droit dans la tour. Kaz referme la porte derrière vous et la bloque avec sa clé à molette.'),
    ],
    onEnter: [rel('kaz', 1), xp(15)],
    choices: [{ id: 'monter', text: 'Monter dans la tour.', kind: 'move', next: 'r4_salle' }],
  },
  {
    id: 'r4_passerelle',
    chapter: C,
    location: 'barrage',
    title: 'La passerelle',
    kind: 'combat',
    text: [p('Le métal de la passerelle résonne sous vos pas. Les trois têtes se tournent en même temps. Le cliquetis s’accélère.')],
    encounter: {
      enemies: ['rodeur', 'rodeur'],
      canFlee: true,
      victory: 'r4_salle',
      defeat: 'r4_passerelle_defaite',
      flee: 'r4_salle',
      intro: 'Deux Rôdeurs vous barrent la passerelle ; le troisième a glissé dans le vide en se retournant. Le garde-corps est bas : ne vous laissez pas saisir.',
    },
    choices: [],
  },
  {
    id: 'r4_passerelle_defaite',
    chapter: C,
    location: 'barrage',
    title: 'Le garde-corps',
    kind: 'story',
    text: [
      p('Vous vous retrouvez à genoux contre le garde-corps, la moitié du corps au-dessus du vide. Votre sac pend à une seule bretelle, puis plus du tout. Vous le regardez tomber pendant très longtemps.'),
      p('Des mains vous agrippent par le col et vous ramènent sur la passerelle. Quelqu’un finit le dernier Rôdeur à coups de talon. On vous traîne jusqu’à la tour sans vous demander votre avis.', QUELQUUN),
      p('Vous rampez jusqu’à la porte de la tour, et vous la refermez avec le dos. Derrière, le cliquetis s’éloigne, perd votre trace, se perd dans le vent.', PERSONNE),
    ],
    onEnter: [hurt(3, 'une chute sur la passerelle'), take('ration', 1), take('bandage', 1)],
    choices: [{ id: 'tour', text: 'Reprendre votre souffle dans la tour.', kind: 'move', time: 0.5, next: 'r4_salle' }],
  },

  // -------------------------------------------------------------------------
  // La salle de commande
  // -------------------------------------------------------------------------
  {
    id: 'r4_salle',
    chapter: C,
    location: 'barrage',
    title: 'La salle de commande',
    kind: 'story',
    checkpoint: true,
    text: [
      p('La salle de commande occupe tout le dernier étage de la tour. Des pupitres en arc de cercle, des écrans morts, des rangées de voyants éteints. Au mur, un grand tableau synoptique dessine en traits de couleur le chemin du courant : les turbines, le poste, puis une longue ligne rouge qui descend la vallée jusqu’à un mot écrit en capitales : MORVAN.'),
      p('Il y a un lit de camp dans un coin, une couverture pliée au carré, une tasse avec un fond de café figé. Quelqu’un a vécu ici après la Fièvre. Quelqu’un de soigneux.'),
      p('Kaz fait le tour des pupitres en touchant chaque commande du bout des doigts, comme on retrouve les touches d’un vieux piano.', withUs('kaz')),
      p('Théo recopie le tableau synoptique dans son carnet, ligne par ligne, en tirant la langue.', withUs('theo')),
      p('Le tableau est clair, même pour vous : sur le départ « Morvan », un logement vide. Il manque une pièce, et c’est cette pièce qui manque à toute la vallée.', flag('r4_cahier_lu')),
    ],
    onEnter: [questFx('q_barrage', 'active', 'centrale')],
    choices: [
      {
        id: 'cahier',
        text: 'Lire le cahier de quart ouvert sur le pupitre central.',
        kind: 'explore', time: 0.5,
        visibleIf: [notFlag('r4_cahier_lu')],
        next: 'r4_cahier',
      },
      {
        id: 'bureau',
        text: 'Fouiller le bureau vitré du chef de centrale.',
        kind: 'explore', time: 0.5,
        once: true,
        effects: [
          doc('doc_r4_requisition'),
          give('ration', 1),
          give('composants', 1),
          journal('Dans le bureau du chef de centrale : un ordre de réquisition signé par le capitaine Rousset.', false),
        ],
      },
      {
        id: 'secours',
        text: 'Ouvrir la boîte de premiers secours fixée près de la porte.',
        kind: 'explore',
        once: true,
        effects: [give('bandage', 1), give('alcool', 1), give('chiffons', 1)],
      },
      {
        id: 'galerie',
        text: 'Descendre dans la galerie technique chercher un fusible de rechange.',
        kind: 'move', time: 0.5,
        visibleIf: [flag('r4_cahier_lu'), lacks('fusible'), notFlag('r4_fusible_brise')],
        next: 'r4_galerie',
      },
      {
        id: 'renoncer',
        text: 'Laisser la centrale à son silence et s’installer pour la nuit.',
        kind: 'rest',
        warning: 'Le courant de Morvan restera coupé.',
        effects: ABANDON,
        next: 'r4_nuit',
      },
    ],
  },
  {
    id: 'r4_cahier',
    chapter: C,
    location: 'barrage',
    title: 'Le cahier de quart',
    kind: 'story',
    text: [
      p('Un registre à couverture verte, d’une écriture penchée et régulière d’homme qui a l’habitude qu’on le relise. Les premières pages parlent de débits, de températures, de graissage. Puis la Fièvre, en trois lignes. Puis des mois où le chef de quart, un certain L. Marchal, continue seul de noter la hauteur du lac chaque matin, comme si quelqu’un allait passer vérifier.'),
      p('Et, il y a trois semaines, une autre écriture entre dans le cahier : celle de la peur.'),
      p('« Ils ont démonté le fusible du départ Morvan eux-mêmes. Emporté. Le capitaine dit qu’une écluse sans courant, ça se garde avec quatre hommes. »'),
      p('Vous connaissez la voix de ce capitaine. Vous l’avez sur une cassette, au fond de votre sac : « Le reste est négociable. » Il n’a pas seulement acheté des porteurs. Il a éteint une vallée pour être seul à tenir les portes.', flag('verite_ferrand')),
      say('kaz', '« Sans courant, les vannes de Morvan se tournent à la manivelle. Et la manivelle, c’est eux qui la tiendront. » Kaz referme le cahier très doucement. « Ils ont pas coupé une ligne. Ils ont coupé la sortie. »', withUs('kaz')),
      say('maelle', '« Les rechanges sont en bas, il le dit lui-même. Troisième rayonnage. » Maëlle a déjà posé le doigt sur la dernière page. « Et il dit aussi qu’il n’y descend pas seul. »', withUs('maelle')),
    ],
    onEnter: [set('r4_cahier_lu'), doc('doc_r4_cahier'), xp(20), journal('L’Institut Ferrand a coupé volontairement la ligne de Vaulx à Morvan, pour tenir seul les portes de l’écluse.')],
    choices: [{ id: 'retour', text: 'Relever les yeux vers le tableau.', kind: 'move', next: 'r4_salle' }],
  },

  // -------------------------------------------------------------------------
  // La galerie noyée
  // -------------------------------------------------------------------------
  {
    id: 'r4_galerie',
    chapter: C,
    location: 'barrage',
    title: 'La galerie −2',
    kind: 'story',
    text: [
      p('Une porte étanche, un volant d’acier, un escalier qui s’enfonce dans le béton. Dès le troisième palier, l’eau commence. Elle est noire, immobile, si froide qu’elle mord les chevilles, puis les genoux, puis les cuisses.'),
      p('La galerie technique file devant vous sous un plafond bas, hérissé de chemins de câbles. Votre lampe y découpe un tunnel de quelques mètres. Au-delà, rien. Et dans ce rien, quelque chose flotte : des formes pâles, ventrues, gonflées d’eau, collées au plafond comme des ballons d’enfant oubliés après une fête. Elles ne bougent pas.'),
      p('Puis l’une d’elles tourne lentement sur elle-même. Le cliquetis, ici, a un écho.'),
      say('ines', '« Éteins », souffle Inès. « Ils suivent la lumière. Moi, je suis l’eau. »', withUs('ines')),
      say('nour', '« Le magasin, c’est quatre-vingts pas, sur le plan de Théo », chuchote Nour. « Je compte. »', all(withUs('nour'), withUs('theo'))),
    ],
    choices: [
      {
        id: 'ines',
        text: 'Éteindre la lampe et suivre Inès, une main sur son épaule.',
        kind: 'stealth', time: 1,
        visibleIf: [withUs('ines')],
        effects: [set('r4_porte_fermee', false), rel('ines', 1)],
        check: { stat: 'discretion', difficulty: 7, success: 'r4_magasin', failure: 'r4_galerie_combat' },
      },
      {
        id: 'pompier',
        text: '[Ancien pompier] Passer par les chemins de câbles, au-dessus de l’eau, comme dans un sous-sol inondé.',
        kind: 'explore', time: 1,
        requires: [background('pompier')],
        effects: [set('r4_porte_fermee', false), xp(20)],
        next: 'r4_magasin',
      },
      {
        id: 'noir',
        text: 'Avancer dans le noir, à tâtons, en glissant les pieds sous l’eau.',
        kind: 'stealth', time: 1,
        effects: [set('r4_porte_fermee', false)],
        check: { stat: 'discretion', difficulty: 9, success: 'r4_magasin', failure: 'r4_galerie_combat' },
      },
      {
        id: 'foncer',
        text: 'Garder la lampe, lever votre arme et forcer le passage.',
        kind: 'fight', time: 0.5,
        effects: [set('r4_porte_fermee', false)],
        next: 'r4_galerie_combat',
      },
      { id: 'remonter', text: 'Remonter et refermer la porte étanche. Pas maintenant.', kind: 'flee', effects: [set('r4_porte_fermee')], next: 'r4_salle' },
    ],
  },
  {
    id: 'r4_galerie_combat',
    chapter: C,
    location: 'barrage',
    title: 'Dans l’eau noire',
    kind: 'combat',
    text: [p('La forme pâle se détache du plafond et tombe dans l’eau devant vous, avec un bruit de sac qu’on vide. Elle se redresse. Elle est énorme.')],
    encounter: {
      enemies: ['gonfle'],
      canFlee: true,
      victory: 'r4_magasin',
      defeat: 'r4_galerie_defaite',
      flee: 'r4_galerie_fuite',
      intro: 'Un Gonflé, dans l’eau jusqu’à la taille. Au corps à corps, sa bile vous affaiblira : frappez de loin si vous le pouvez.',
    },
    choices: [],
  },
  {
    id: 'r4_galerie_fuite',
    chapter: C,
    location: 'barrage',
    title: 'Le volant d’acier',
    kind: 'story',
    text: [
      p('Vous remontez l’escalier à reculons, de l’eau plein les bottes, et vous tournez le volant de la porte étanche jusqu’à ce qu’il bute. Derrière l’acier, quelque chose cogne une fois, mollement. Puis plus rien.'),
      p('Le fusible est toujours en bas.'),
    ],
    onEnter: [set('r4_porte_fermee')],
    choices: [{ id: 'salle', text: 'Remonter à la salle de commande.', kind: 'move', time: 0.5, next: 'r4_salle' }],
  },
  {
    id: 'r4_galerie_defaite',
    chapter: C,
    location: 'barrage',
    title: 'Remonté de l’eau',
    kind: 'story',
    text: [
      p('L’eau se referme sur votre tête. Elle a un goût de rouille et de chose morte. Vous ne savez plus où est le haut.'),
      p('Une main trouve votre col, une autre votre ceinture. On vous hisse marche après marche jusqu’au palier, et quelqu’un claque la porte étanche à la volée. Vous crachez de l’eau noire pendant de longues minutes, à quatre pattes sur le béton.', QUELQUUN),
      say('maelle', '« Respire. Non, pas comme ça. Lentement. » Elle vous tient la nuque d’une main ferme, et de l’autre elle cherche déjà une morsure sur vos bras.', withUs('maelle')),
      p('Vos doigts trouvent la première marche par hasard. Vous vous traînez dehors, vous fermez la porte avec ce qui vous reste de forces, et vous restez longtemps sur le palier, la joue contre le béton, les yeux ouverts dans le noir.', PERSONNE),
    ],
    onEnter: [set('r4_porte_fermee'), hurt(2, 'la noyade dans la galerie'), take('ration', 1)],
    choices: [{ id: 'salle', text: 'Remonter à la salle de commande.', kind: 'move', time: 1, next: 'r4_salle' }],
  },
  {
    id: 'r4_magasin',
    chapter: C,
    location: 'barrage',
    title: 'Le magasin des pièces',
    kind: 'story',
    text: [
      p('Le magasin est une pièce surélevée, au bout de la galerie, où l’eau n’arrive qu’aux chevilles. Des rayonnages d’acier, des étiquettes au feutre, des caisses de boulons, l’ordre maniaque des gens qui ont passé leur vie à prévoir les pannes.'),
      p('Troisième rayonnage. Dans une caisse capitonnée de paille, un cylindre de porcelaine blanche long comme l’avant-bras, marqué « 63 kV ». Il est plus lourd qu’il n’en a l’air. Il est intact.'),
      p('Sur l’étagère d’en face, quelqu’un a posé une lampe frontale, une paire de lunettes repliées, et un badge plastifié : « L. MARCHAL — chef de quart ». Il est descendu seul, finalement. Il n’a pas remonté le fusible. Vous ne cherchez pas ce qu’il est devenu. Au fond de la galerie, au-delà du magasin, l’eau clapote encore, et vous croyez le savoir.'),
      say('nour', '« Quatre-vingt-trois pas », dit Nour. « Le plan de Théo avait tort de trois. » Théo ne répond rien, mais il corrige son carnet.', all(withUs('nour'), withUs('theo'))),
      p('La porte étanche, en haut de l’escalier, est restée grande ouverte derrière vous. Le volant est grippé. La refermer prendrait du temps, et des bras.'),
    ],
    onEnter: [
      give('fusible'),
      step('q_barrage', 'piece'),
      give('composants', 1),
      give('chiffons', 1),
      set('r4_marchal'),
      xp(30),
      journal('Au magasin de la galerie noyée : un fusible de 63 kV, et le badge du chef de quart.'),
    ],
    choices: [
      {
        id: 'fermer',
        text: 'Remonter et refermer la porte étanche derrière vous, quoi qu’il en coûte.',
        kind: 'explore', time: 0.5,
        effects: [set('r4_porte_fermee')],
        next: 'r4_disjoncteur',
      },
      {
        id: 'vite',
        text: 'Remonter tout de suite, le fusible serré contre la poitrine.',
        kind: 'move',
        next: 'r4_disjoncteur',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Le disjoncteur
  // -------------------------------------------------------------------------
  {
    id: 'r4_disjoncteur',
    chapter: C,
    location: 'barrage',
    title: 'Le départ Morvan',
    kind: 'story',
    text: [
      p('L’armoire du départ Morvan est haute comme un homme, peinte d’un gris d’hôpital. Derrière la vitre, un sectionneur à levier, deux mâchoires de cuivre, et entre elles le vide exact où doit se loger le fusible. Une étiquette jaune, à hauteur d’yeux : « Danger de mort ».'),
      p('La dernière ligne du cahier vous revient : « Sectionneur d’abord, toujours. »'),
      say('kaz', '« Les turbines tournent encore à vide, elles ont jamais arrêté, le lac les pousse. Le courant est là, derrière. Il attend qu’on lui ouvre. » Il essuie ses mains sur son pantalon. « Ce qui tue, ici, c’est l’ordre des gestes. Pas la force. »', withUs('kaz')),
      p('Théo tient la lampe. Il ne tremble pas. C’est vous qui tremblez.', withUs('theo')),
    ],
    choices: [
      {
        id: 'technicien',
        text: '[Technicien] Vérifier chaque contact, ouvrir le sectionneur, poser le fusible, réarmer.',
        kind: 'explore', time: 1,
        requires: [profile('technicien')],
        check: { stat: 'astuce', difficulty: 7, success: 'r4_courant', failure: 'r4_court_circuit' },
      },
      {
        id: 'kaz',
        text: 'Laisser Kaz lire les voyants et vous dicter les gestes un par un.',
        kind: 'talk', time: 1,
        visibleIf: [withUs('kaz')],
        effects: [rel('kaz', 1)],
        check: { stat: 'astuce', difficulty: 7, success: 'r4_courant', failure: 'r4_court_circuit' },
      },
      {
        id: 'seul',
        text: 'Suivre les schémas collés dans la porte de l’armoire, et réarmer.',
        kind: 'explore', time: 1,
        check: { stat: 'astuce', difficulty: 9, success: 'r4_courant', failure: 'r4_court_circuit' },
      },
      {
        id: 'renoncer',
        text: 'Refermer l’armoire. Pas avec ces mains-là, pas cette nuit.',
        kind: 'rest',
        warning: 'Le courant de Morvan restera coupé.',
        effects: ABANDON,
        next: 'r4_nuit',
      },
    ],
  },
  {
    id: 'r4_court_circuit',
    chapter: C,
    location: 'barrage',
    title: 'L’arc',
    kind: 'story',
    text: [
      p('Un claquement, une lumière blanche qui vous traverse les paupières, une odeur d’ozone et de poils brûlés. Le pupitre d’en face vous cogne dans le dos ; vous ne savez pas comment vous avez traversé la pièce. Votre main droite ne vous appartient plus tout à fait.'),
      p('Dans l’armoire, le fusible est toujours entier. Une auréole noire lèche le cuivre de la mâchoire. Le levier est revenu tout seul en position ouverte : la sécurité a fait son travail. Vous avez fait le vôtre de travers.'),
      say('maelle', '« Montre. » Maëlle retourne votre paume, souffle dessus, verse de l’eau. « Brûlure du deuxième degré. Tu vivras. La prochaine, je ne sais pas. »', withUs('maelle')),
      say('kaz', '« Tu as réarmé avant de refermer. Tout le monde le fait une fois. » Il ne sourit pas. « Personne le fait deux fois. »', withUs('kaz')),
    ],
    onEnter: [hurt(3, 'un arc électrique')],
    choices: [
      {
        id: 'reprendre',
        text: 'Recommencer, lentement, en disant chaque geste à voix haute.',
        kind: 'explore', time: 1.5,
        check: { stat: 'astuce', difficulty: 7, success: 'r4_courant', failure: 'r4_panne' },
      },
      {
        id: 'renoncer',
        text: 'Laisser tomber. La vallée a vécu dans le noir, elle continuera.',
        kind: 'rest',
        warning: 'Le courant de Morvan restera coupé.',
        effects: ABANDON,
        next: 'r4_nuit',
      },
    ],
  },
  {
    id: 'r4_panne',
    chapter: C,
    location: 'barrage',
    title: 'La fêlure',
    kind: 'story',
    text: [
      p('Cette fois, il n’y a pas d’éclair. Juste un petit bruit sec, presque poli, comme une tasse qu’on pose trop fort sur une soucoupe. Une fêlure court en spirale sur la porcelaine, d’un bout à l’autre du fusible.'),
      p('Vous le retirez des mâchoires. Il est tiède. Il est mort.'),
      say('kaz', '« Il y en avait un. Il y en a plus. » Kaz referme l’armoire et reste longtemps la main posée sur la vitre. « Morvan s’ouvrira à la manivelle. Ou pas du tout. »', withUs('kaz')),
      p('Sur le tableau synoptique, la ligne rouge descend toujours vers Morvan. Elle ne mène plus nulle part.'),
    ],
    onEnter: [take('fusible'), set('r4_fusible_brise'), questFx('q_barrage', 'failed'), journal('Le fusible de Vaulx s’est fendu. Le courant de Morvan restera coupé.')],
    choices: [{ id: 'nuit', text: 'S’installer pour la nuit.', kind: 'rest', next: 'r4_nuit' }],
  },
  {
    id: 'r4_courant',
    chapter: C,
    location: 'barrage',
    title: 'La ligne de Morvan',
    kind: 'story',
    text: [
      p('Le levier descend avec un bruit de verrou qu’on pousse. Pendant une seconde, il ne se passe rien. Puis, sous vos pieds, très loin dans le béton, quelque chose se met à ronronner.'),
      p('Les voyants du pupitre s’allument un à un, verts, orange, un rouge qui clignote et se calme. Sur le tableau synoptique, la ligne de Morvan s’illumine sur toute sa longueur, comme une veine qui se remplit.'),
      p('Et par la grande baie, dans la vallée noire, une rangée de points orange s’allume le long du fleuve. Un, puis le suivant, puis le suivant, des lampadaires de berge qui se réveillent de proche en proche, jusqu’au coude du fleuve, et au-delà, vers l’aval, vers Morvan. Personne ne dit rien. On n’a plus l’habitude de voir la lumière aller dans le bon sens.'),
      say('kaz', '« Les vannes de l’écluse auront du jus. Les portes s’ouvriront avec un bouton, pas avec quatre hommes sur une manivelle. » Il rit, un rire bref, presque un sanglot. « Irena, t’entends ? Il ronronne. »', withUs('kaz')),
      say('nour', '« Quarante et un », dit Nour, le nez contre la vitre. « Jusqu’au virage. Après, je ne vois plus. »', withUs('nour')),
      say('maelle', '« Ils vont le voir, à l’écluse », dit Maëlle. Elle ne dit pas si c’est une bonne nouvelle.', withUs('maelle')),
      p('Quelque part sur cette route, un camion de Ferrailleurs roule vers l’écluse avec Théo dans une cage. Les lampadaires éclairent son chemin, maintenant. Vous ne savez pas si c’est une consolation.', THEO_CAGE),
      p('Il reste les projecteurs du couronnement, sur le dernier départ du pupitre. Un seul geste, et le barrage tout entier s’allumera comme un phare au-dessus de la vallée.'),
    ],
    onEnter: [
      take('fusible'),
      set('courant_retabli'),
      step('q_barrage', 'courant'),
      questFx('q_barrage', 'completed'),
      when(withUs('kaz'), [rel('kaz', 1)]),
      xp(60),
      journal('Vous avez rétabli le courant de Vaulx jusqu’à l’écluse de Morvan : ses vannes fonctionneront.'),
    ],
    choices: [
      {
        id: 'phare',
        text: 'Allumer les projecteurs. Que tout le fleuve sache qu’on peut encore rallumer quelque chose.',
        kind: 'explore',
        effects: [set('r4_phare'), journal('Les projecteurs du barrage de Vaulx brillent au-dessus de la vallée.', false)],
        next: 'r4_nuit',
      },
      {
        id: 'ombre',
        text: 'Les laisser éteints. La ligne suffit ; inutile d’annoncer à la barge qui arrive.',
        kind: 'stealth',
        effects: [set('r4_discret')],
        next: 'r4_nuit',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // La nuit de Vaulx
  // -------------------------------------------------------------------------
  {
    id: 'r4_nuit',
    chapter: C,
    location: 'barrage',
    title: 'La nuit de Vaulx',
    kind: 'story',
    text: [
      p('Vous bloquez la porte du couronnement avec un pupitre renversé. Un radiateur électrique, dans un coin, se met à tiquer en chauffant, et l’odeur de poussière grillée a quelque chose de domestique, de presque insupportable. Personne n’a eu chaud depuis des semaines.', COURANT),
      p('Vous bloquez la porte du couronnement avec un pupitre renversé. Le froid monte du béton et ne s’en va plus. Les voyants restent éteints, le tableau reste muet. Dehors, la vallée est noire jusqu’à l’horizon.', not(COURANT)),
      p('Le lac, derrière la vitre, a la couleur exacte du ciel. On ne sait plus où finit l’un et où commence l’autre.'),
      p('Il faudra veiller par tours. Qui prend le premier, avec vous ?', QUELQUUN),
      p('Personne pour prendre un tour. Vous tirerez la nuit d’une traite, le dos contre le mur, en laissant le sommeil venir par morceaux.', PERSONNE),
    ],
    choices: [
      {
        id: 'maelle',
        text: 'Veiller avec Maëlle.',
        kind: 'talk', time: 1,
        visibleIf: [withUs('maelle')],
        effects: [set('r4_veille_maelle'), rel('maelle', 1)],
        next: 'r4_veille',
      },
      {
        id: 'theo',
        text: 'Veiller avec Théo.',
        kind: 'talk', time: 1,
        visibleIf: [withUs('theo')],
        effects: [set('r4_veille_theo'), rel('theo', 1)],
        next: 'r4_veille',
      },
      {
        id: 'kaz',
        text: 'Veiller avec Kaz.',
        kind: 'talk', time: 1,
        visibleIf: [withUs('kaz')],
        effects: [set('r4_veille_kaz'), rel('kaz', 1)],
        next: 'r4_veille',
      },
      {
        id: 'ines',
        text: 'Veiller avec Inès.',
        kind: 'talk', time: 1,
        visibleIf: [withUs('ines')],
        effects: [set('r4_veille_ines'), rel('ines', 1)],
        next: 'r4_veille',
      },
      {
        id: 'nour',
        text: 'Veiller avec Nour, qui ne dort pas de toute façon.',
        kind: 'talk', time: 1,
        visibleIf: [withUs('nour')],
        effects: [set('r4_veille_nour'), rel('nour', 1)],
        next: 'r4_veille',
      },
      { id: 'seul', text: 'Prendre le premier tour sans réveiller personne.', kind: 'rest', time: 1, next: 'r4_veille' },
    ],
  },
  {
    id: 'r4_veille',
    chapter: C,
    location: 'barrage',
    title: 'La veille',
    kind: 'story',
    text: [
      // Maëlle
      say('maelle', '« La dernière nuit à l’hôpital, ils ont éteint les services un par un. Pédiatrie d’abord, parce qu’il n’y avait plus d’enfants. » Maëlle regarde les lampadaires, au loin. « Je n’aurais jamais cru revoir une lumière s’allumer au lieu de s’éteindre. »', all(flag('r4_veille_maelle'), COURANT)),
      say('maelle', '« La dernière nuit à l’hôpital, ils ont éteint les services un par un. Pédiatrie d’abord. » Maëlle remonte la couverture sur ses genoux. « On a l’habitude, au fond. Le noir, on sait faire. »', all(flag('r4_veille_maelle'), not(COURANT))),
      p('Elle tire machinalement sur la manche de son bras mordu, là où était le bandage. « Tu sais ce qui me fait peur ? Pas la morsure. Que mon fils soit le seul de nous deux à ne rien craindre, et qu’on me le prenne pour ça. »', all(flag('r4_veille_maelle'), flag('maelle_mordue'))),
      p('Elle parle longtemps de Théo petit, des cartes qu’il dessinait déjà sur les nappes en papier des restaurants. Puis elle s’arrête au milieu d’une phrase, et vous comprenez qu’elle s’est endormie assise.', flag('r4_veille_maelle')),
      // Théo
      p('Théo dessine le barrage à la lueur des voyants. Il trace la ligne de Morvan en pointillés, et chaque lampadaire en un petit rond.', all(flag('r4_veille_theo'), COURANT)),
      p('Théo dessine le barrage à la lampe, à l’abri de sa main. Il trace la ligne de Morvan, puis il la barre.', all(flag('r4_veille_theo'), not(COURANT))),
      say('theo', '« Le chef de quart, il notait la hauteur du lac tous les matins. Même tout seul. » Il ne lève pas les yeux du carnet. « Moi aussi, je noterai. Même si personne ne relit. Comme ça, si je disparais, il restera les cartes. »', flag('r4_veille_theo')),
      // Kaz
      say('kaz', '« Irena descendait du car au bout de la crête, avec sa gamelle sous le bras. Je la voyais arriver d’ici, toute petite. Elle faisait des signes, et moi je faisais clignoter les projecteurs pour lui répondre. Le chef me passait un savon chaque fois. »', flag('r4_veille_kaz')),
      say('kaz', '« Je lui ai jamais dit, pour la dette. Elle est morte en croyant que j’avais arrêté le poker. » Il fixe le lac. « Je vais pas te raconter que c’est pour ça que j’ai trahi le petit. Il y a pas de pour ça. Il y a juste ce que j’ai fait. »', all(flag('r4_veille_kaz'), any(flag('kaz_rachete'), flag('kaz_traitre')))),
      say('kaz', '« Je lui ai jamais dit, pour la dette. Elle est morte en croyant que j’avais arrêté le poker. » Il fixe le lac. « Toi, tu sais. C’est déjà moins lourd. »', all(flag('r4_veille_kaz'), not(any(flag('kaz_rachete'), flag('kaz_traitre'))))),
      // Inès
      p('Inès lit le carnet de son frère à la lumière d’un voyant vert, en suivant les lignes du doigt. Elle ne vous propose pas de lire avec elle. Elle vous laisse rester, c’est déjà beaucoup.', all(flag('r4_veille_ines'), COURANT)),
      p('Inès lit le carnet de son frère à la lampe, en économisant la pile, une page à la fois. Elle vous laisse rester, c’est déjà beaucoup.', all(flag('r4_veille_ines'), not(COURANT))),
      say('ines', '« Malik aurait aimé cet endroit. Il aimait ce qui tient debout contre l’eau. » Elle referme le carnet. « Les ponts, les digues, les gens. Surtout les gens. »', flag('r4_veille_ines')),
      // Nour
      say('nour', '« Sur la barge, ils comptent les gens comme moi je compte les lampadaires ? Un, deux, trois, sans les regarder ? »', all(flag('r4_veille_nour'), COURANT)),
      say('nour', '« Sur la barge, ils comptent les gens comme on compte les marches ? Un, deux, trois, sans les regarder ? »', all(flag('r4_veille_nour'), not(COURANT))),
      p('Vous cherchez une réponse honnête. Vous n’en trouvez pas. Nour hoche la tête, comme si c’était une réponse quand même, et elle se met à compter tout bas les rivets du plafond jusqu’à s’endormir au deux cent douzième.', flag('r4_veille_nour')),
      // Seul
      p('Vous veillez sans parler. À travers le béton, on entend le lac respirer, une pression lente et profonde contre le mur. Quarante mètres de béton, et derrière, tout ce poids d’eau qui attend.', all(notFlag('r4_veille_maelle'), notFlag('r4_veille_theo'), notFlag('r4_veille_kaz'), notFlag('r4_veille_ines'), notFlag('r4_veille_nour'))),
      // Gaspard
      p('Tard, très tard, une lanterne passe sur le chemin de la rive, au pied du barrage. Un homme seul, massif, qui marche vers l’aval sans se presser. Il s’arrête un instant, lève la tête vers la tour. Puis il repart. Vous connaissez cette carrure. Gaspard Lenoir marche, lui aussi, vers l’écluse.', flag('gaspard_epargne')),
    ],
    choices: [{ id: 'dormir', text: 'Dormir.', kind: 'rest', next: 'r4_sommeil' }],
  },
  {
    id: 'r4_intrus',
    chapter: C,
    location: 'barrage',
    title: 'Ce qui monte',
    kind: 'story',
    text: [
      p('Un bruit vous tire du sommeil. Pas un bruit fort : un clapotis. Puis un autre, un étage plus haut. Dans la cage d’escalier qui descend vers la galerie, quelque chose monte, marche après marche, lourd et mouillé.'),
      p('Vous aviez laissé la porte étanche ouverte. L’eau noire, en bas, n’était pas vide.'),
      say('ines', '« Il en reste un », chuchote Inès, déjà debout. « Gros. »', withUs('ines')),
      p('On vous secoue l’épaule. Tout le monde est réveillé, et personne ne fait de bruit.', all(QUELQUUN, notWithUs('ines'))),
    ],
    onEnter: [set('r4_intrus_venu')],
    choices: [
      {
        id: 'molotov',
        text: 'Allumer un cocktail Molotov et le lancer dans la cage d’escalier.',
        kind: 'item',
        requires: [has('molotov')],
        effects: [take('molotov'), xp(20)],
        next: 'r4_sommeil',
      },
      {
        id: 'porte',
        text: 'Pousser la porte de la salle et la tenir à l’épaule jusqu’à ce qu’il renonce.',
        kind: 'stealth', time: 0.5,
        check: {
          stat: 'force',
          difficulty: 8,
          success: 'r4_sommeil',
          failure: 'r4_intrus_combat',
          failureEffects: [hurt(1, 'une porte enfoncée')],
        },
      },
      { id: 'combat', text: 'L’attendre sur le palier, arme levée.', kind: 'fight', next: 'r4_intrus_combat' },
    ],
  },
  {
    id: 'r4_intrus_combat',
    chapter: C,
    location: 'barrage',
    title: 'Le palier',
    kind: 'combat',
    text: [p('La porte cède dans un éclat de gonds. Le Gonflé remplit tout l’encadrement, ruisselant, la peau tendue comme une outre.')],
    encounter: {
      enemies: ['gonfle'],
      canFlee: false,
      victory: 'r4_sommeil',
      defeat: 'r4_sommeil',
      intro: 'Un Gonflé remonté de la galerie, sur le palier de la salle de commande. Pas de recul possible : derrière vous, il y a les autres.',
    },
    choices: [],
  },
  {
    id: 'r4_sommeil',
    chapter: C,
    location: 'barrage',
    title: 'Le sommeil',
    kind: 'story',
    routes: [{ if: PORTE_OUVERTE, to: 'r4_intrus' }],
    text: [
      p('Quand c’est fini, le palier sent la bile et le fer. Vous traînez ce qui reste jusqu’à l’escalier, vous le laissez redescendre vers l’eau, et cette fois vous fermez la porte étanche, de toutes vos forces. Après, on ne dort plus vraiment. On attend le jour, les yeux fermés.', flag('r4_intrus_venu')),
      p('Vous dormez comme on tombe. Sans rêve, ou presque : une fois, vous croyez entendre une cloche, très loin. Ce n’est que le vent dans les garde-corps.', notFlag('r4_intrus_venu')),
      p('Toute la nuit, sous vos pieds, le barrage ronronne.', all(COURANT, notFlag('r4_intrus_venu'))),
    ],
    onEnter: [set('r4_porte_fermee'), { type: 'time', hours: 5 }, when(flag('r4_intrus_venu'), [rest(3)], [rest()])],
    choices: [{ id: 'aube', text: 'Se lever avec le jour.', kind: 'move', next: 'r4_fin' }],
  },

  // -------------------------------------------------------------------------
  // Fin du chapitre
  // -------------------------------------------------------------------------
  {
    id: 'r4_fin',
    chapter: C,
    location: 'barrage',
    title: 'Fin du chapitre 8',
    kind: 'chapterEnd',
    text: [
      p('Le jour se lève sur le lac sans le réchauffer. Une brume basse colle à l’eau, et la vallée, en aval, sort de la nuit lentement, champ après champ.'),
      p('Les lampadaires de la berge brûlent encore, pâles dans le petit matin, comme des bougies qu’on aurait oublié de souffler. Ils descendent le fleuve jusqu’au coude, et bien plus loin, jusqu’à Morvan. Là-bas, quelqu’un les a vus s’allumer. Quelqu’un se demande qui.', COURANT),
      p('Au-dessus de vous, les projecteurs du couronnement éclairent encore la crête. Sur l’autre rive, au pied des bois, un mince filet de fumée monte : quelqu’un a allumé un feu pendant la nuit, en face de la lumière, comme on répond à un signe.', flag('r4_phare')),
      p('La vallée est grise d’un bout à l’autre. Sur le tableau synoptique, la ligne de Morvan est toujours éteinte. À l’écluse, ce sont les hommes de l’Institut qui tiendront les manivelles.', not(COURANT)),
      p('Vous mangez debout, devant la grande baie, sans beaucoup parler. Puis vous redescendez sur la route qui longe le fleuve.'),
      p('Il reste {reste} avant l’aube du septième.'),
    ],
    onEnter: [meal(), diary('r4')],
    choices: [{ id: 'suite', text: 'Chapitre 9 : Le Convoi', kind: 'move', time: 1, next: 'r5_fosse' }],
  },
];

export const DOCUMENTS_R4: DocumentDef[] = [
  {
    id: 'doc_r4_cahier',
    title: 'Le cahier de quart de Vaulx',
    source: 'Registre ouvert sur le pupitre central de la salle de commande',
    body:
      '« Lac à 212,40. Groupe 1 seul, à vide. Ligne Morvan sous tension, éclairage du quai ok. Personne n’est venu. — L. M. »\n\n' +
      '« Visite de l’Institut Ferrand. Un capitaine et six hommes en gris. Demandent de couper la ligne de Morvan, « pour raisons sanitaires ». Refusé. L’écluse a besoin de ses vannes, les gens du fleuve aussi. »\n\n' +
      '« Ils sont revenus. Ont démonté le fusible du départ Morvan eux-mêmes. Emporté. Le capitaine dit qu’une écluse sans courant, ça se garde avec quatre hommes. Il veut que les portes ne s’ouvrent que quand il le décide. »\n\n' +
      '« Ils ont emmené Dédé et Paulin « pour l’entretien de la barge ». Je reste. Quelqu’un doit rester. »\n\n' +
      '« Les rechanges sont au magasin, galerie −2. L’eau est montée depuis la crue de mars, et il y a du monde dedans. Je n’y descends pas seul. Si quelqu’un lit ça : 63 kV, porcelaine, troisième rayonnage. Sectionneur d’abord, toujours. — L. M. »',
  },
  {
    id: 'doc_r4_requisition',
    title: 'Ordre de réquisition',
    source: 'Bureau du chef de centrale, barrage de Vaulx',
    body:
      'INSTITUT FERRAND — Navire médical Destinée\n\n' +
      'Réquisition de personnel technique. En application du protocole Ferrand, les agents André Dufour et Paulin Roche sont affectés sans délai à l’entretien du navire. Leurs familles ne sont pas concernées par la présente.\n\n' +
      'La ligne Vaulx–Morvan restera hors tension jusqu’à nouvel ordre, afin de garantir la maîtrise des accès lors du tri à l’écluse. Toute remise sous tension non autorisée sera considérée comme un acte d’hostilité envers l’Institut.\n\n' +
      'Le chef de quart L. Marchal, ayant refusé son affectation, demeure sur site à ses risques.\n\n' +
      'Pour l’Institut, le capitaine A. Rousset.',
  },
];

export const DIARY_R4: DiaryRule[] = [
  { chapter: C, text: 'Nous avons dormi dans la tour du barrage de Vaulx, au-dessus d’un lac noir qui ne fait aucun bruit.' },
  { chapter: C, if: flag('r4_cahier_lu'), text: 'L’Institut a coupé le courant exprès. « Une écluse sans courant, ça se garde avec quatre hommes. » Je ne pensais pas qu’on pouvait éteindre une vallée par calcul.' },
  { chapter: C, if: flag('r4_marchal'), text: 'Le chef de quart s’appelait L. Marchal. Il avait écrit « quelqu’un doit rester ». Il est resté.' },
  { chapter: C, if: COURANT, text: 'Les lampadaires se sont allumés le long du fleuve, un par un, jusqu’à Morvan. Pendant une minute, j’ai cru que le monde allait revenir avec eux.' },
  { chapter: C, if: flag('r4_fusible_brise'), text: 'Le fusible s’est fendu entre mes mains. Morvan restera dans le noir, et c’est Rousset qui tiendra les manivelles.' },
  { chapter: C, if: all(not(COURANT), notFlag('r4_fusible_brise')), text: 'Je n’ai pas réarmé la ligne de Morvan. Il y a des portes qu’on n’ose pas ouvrir, même quand on sait comment.' },
  { chapter: C, if: flag('r4_veille_kaz'), text: 'Kaz m’a parlé d’Irena. Elle disait que le barrage ronronnait comme un chat.' },
  { chapter: C, if: all(COURANT, THEO_CAGE), text: 'Les lampadaires éclairent la route où roule le camion de Théo. Je ne sais pas si c’est une consolation.' },
];
