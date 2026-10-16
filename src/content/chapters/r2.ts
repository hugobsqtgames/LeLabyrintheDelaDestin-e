/**
 * Chapitre 6 — La Rocade (« Le prix du passage »)
 * Le viaduc de l’autoroute, l’embouteillage figé depuis quatorze mois,
 * la gare de péage des gilets orange et leur chef, le Péage, qui tient les comptes.
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
  heal,
  hurt,
  journal,
  meal,
  not,
  notWithUs,
  p,
  profile,
  questStep,
  rel,
  say,
  set,
  take,
  when,
  withUs,
  xp,
} from '../helpers';

const C = 'r2';
const THEO_PRIS = companionIs('theo', 'captured');
const SEUL = all(notWithUs('maelle'), notWithUs('theo'), notWithUs('kaz'), notWithUs('ines'), notWithUs('nour'));
const SANG = flag('r2_sang');
const PAR_LE_CAISSON: Condition = { type: 'visited', scene: 'r2_caisson_combat' };

export const chapterR2: Scene[] = [
  // -------------------------------------------------------------------------
  // La bretelle
  // -------------------------------------------------------------------------
  {
    id: 'r2_bretelle',
    chapter: C,
    location: 'rocade',
    title: 'La bretelle',
    kind: 'story',
    checkpoint: true,
    text: [
      p('La route des vergers remonte en lacets jusqu’à la bretelle d’accès. Au-dessus du talus, l’autoroute. Le viaduc de la Rocade enjambe la vallée sur quarante mètres de vide : douze piles de béton, un tablier gris, et dessus, figé depuis quatorze mois, l’embouteillage du premier jour de la Fièvre.'),
      p('Des centaines de voitures, pare-chocs contre pare-chocs, dans les deux sens. Les vitres sont couvertes d’une buée qui a séché sur place, blanche, opaque, comme si chaque habitacle avait gardé pour lui le dernier souffle de ses passagers.'),
      p('Tout au bout, là où le viaduc rejoint l’autre versant, la gare de péage. Une fumée monte sous l’auvent. Des silhouettes en gilet orange vont et viennent entre les cabines. Sur la barrière, un drap peint en lettres rouges : « PÉAGE — UN TIERS DE CE QUE VOUS PORTEZ ».'),
      p('Sur la bande d’arrêt d’urgence, la poussière garde deux traces de pneus larges, fraîches de la nuit. Le camion des Ferrailleurs est passé par ici, avec sa cargaison de cages. Il n’a pas eu à pousser les voitures : quelqu’un les avait poussées pour lui.', THEO_PRIS),
      p('Théo s’est arrêté pour dessiner le viaduc. Maëlle lui remonte le col du blouson jusqu’aux oreilles, sans un mot, à cause des gilets orange là-bas.', all(withUs('theo'), withUs('maelle'))),
      say('nour', '« Douze piles », dit Nour. « Ça fait onze trous. »', withUs('nour')),
      say('kaz', '« Un péage qui marche encore », grogne Kaz. « C’est bien la seule administration qui ait survécu. »', withUs('kaz')),
      p('Le vent remonte la vallée et fait chanter les antennes des voitures. C’est le seul bruit. Vous êtes la seule chose qui bouge sur la Rocade, à part les gilets orange.', SEUL),
    ],
    onEnter: [journal('Le viaduc de la Rocade est le seul passage sec. Ceux qui le tiennent prélèvent un tiers de ce que l’on porte.', false)],
    choices: [
      {
        id: 'jumelles',
        text: 'Observer la gare de péage aux jumelles.',
        kind: 'explore', time: 0.5,
        once: true,
        requires: [has('jumelles')],
        effects: [
          set('r2_reperage'),
          journal('Aux jumelles : six hommes en gilet orange, un géant assis devant la cabine 7, et une porte de service grillagée au pied de la première pile, que personne ne surveille.', false),
        ],
      },
      { id: 'bouchon', text: 'Se glisser entre les voitures et fouiller l’embouteillage.', kind: 'explore', time: 0.5, next: 'r2_bouchon' },
      { id: 'bande', text: 'Marcher droit vers la barrière par la bande d’arrêt d’urgence.', kind: 'move', time: 1, next: 'r2_barriere' },
      { id: 'dessous', text: 'Descendre le talus et chercher un autre chemin sous le viaduc.', kind: 'stealth', time: 0.5, next: 'r2_structure' },
    ],
  },

  // -------------------------------------------------------------------------
  // L’embouteillage
  // -------------------------------------------------------------------------
  {
    id: 'r2_bouchon',
    chapter: C,
    location: 'rocade',
    title: 'L’embouteillage',
    kind: 'story',
    text: [
      p('Entre les voitures, il y a juste la place de passer de profil. Des tickets de parking jaunis sur les tableaux de bord. Une laisse de chien nouée à une poignée de portière, sans chien au bout. Des pare-brise couverts de fientes, et partout la même odeur de plastique cuit au soleil, puis refroidi, puis recuit, pendant quatorze mois.'),
      p('Certaines voitures ne sont pas vides. Derrière la buée blanche, des formes immobiles, la tête contre la vitre. Quand vous passez, l’une d’elles se tourne. Un cliquetis de dents, très faible, étouffé par le verre. Elle est toujours ceinturée. Les Muets n’ont jamais compris les ceintures.'),
      p('Sur certains capots, quelqu’un a bombé une croix orange. Voiture fouillée. Le tiers a déjà été pris, ici aussi.'),
      p('Maëlle marche en regardant droit devant elle. Elle a ouvert assez de portières dans sa vie pour savoir ce qu’il y a derrière.', withUs('maelle')),
    ],
    choices: [
      { id: 'monospace', text: 'Ouvrir le monospace gris aux deux sièges enfants.', kind: 'explore', time: 0.5, once: true, next: 'r2_monospace' },
      {
        id: 'break',
        text: 'Forcer le coffre d’un break chargé jusqu’au toit de valises. Pas de croix orange sur le capot.',
        kind: 'explore', time: 0.5,
        once: true,
        effects: [give('ration', 1), give('chiffons', 2), give('alcool', 1), journal('Dans le break : des vêtements d’été, une boîte de biscuits intacte, une bouteille d’alcool à brûler pour un réchaud de camping.', false)],
      },
      {
        id: 'plombier',
        text: 'Fouiller la camionnette d’un plombier, portes arrière ouvertes.',
        kind: 'explore', time: 0.5,
        once: true,
        effects: [give('ferraille', 1), give('composants', 1), journal('La camionnette du plombier : des raccords de cuivre, un détecteur de fuites dont l’électronique se récupère.', false)],
      },
      { id: 'avancer', text: 'Continuer vers la gare de péage, de voiture en voiture.', kind: 'stealth', time: 0.5, next: 'r2_ronde' },
    ],
  },
  {
    id: 'r2_monospace',
    chapter: C,
    location: 'rocade',
    title: 'Le monospace gris',
    kind: 'story',
    text: [
      p('Personne à l’intérieur. Deux sièges enfants à l’arrière, vides. Les sangles n’ont pas été détachées : elles ont été coupées, net, au couteau. Quelqu’un a sorti les enfants en hâte, une nuit, et n’a pas pris le temps de trouver les boucles.'),
      p('Sur la plage arrière, un lapin en peluche décoloré par le soleil, d’un rose devenu gris. Dans la boîte à gants, sous les papiers de la voiture, un petit carnet à spirale. La première page dit : « Carnet de bord — Vacances Arcachon ». La suite ne parle pas de vacances.'),
      say('nour', '« Ils sont partis à pied », dit Nour. Elle montre le tapis de sol. « Les chaussures ne sont plus là. Il reste seulement celles du papa. » Elle ne dit pas ce que ça veut dire. Elle le sait très bien.', withUs('nour')),
      p('Théo prend le lapin, le regarde longtemps, puis le repose exactement où il était. « Si quelqu’un revient le chercher », dit-il.', withUs('theo')),
    ],
    onEnter: [doc('doc_r2_carnet')],
    choices: [{ id: 'retour', text: 'Refermer doucement la portière.', kind: 'move', next: 'r2_bouchon' }],
  },

  // -------------------------------------------------------------------------
  // La ronde
  // -------------------------------------------------------------------------
  {
    id: 'r2_ronde',
    chapter: C,
    location: 'rocade',
    title: 'La ronde',
    kind: 'story',
    timed: { seconds: 12, fallback: 'cacher' },
    text: [
      p('Des voix, trois voitures plus loin. Deux hommes en gilet orange remontent la file en sens inverse, fusil à l’épaule. L’un frappe chaque vitre du plat de la crosse, l’autre tient une bombe de peinture. Ils ne cherchent rien en particulier. Ils comptent.'),
      p('Encore dix mètres, et ils seront sur vous.'),
    ],
    choices: [
      {
        id: 'cacher',
        text: 'Se coucher sous un camping-car et attendre qu’ils passent.',
        kind: 'stealth', time: 0.5,
        check: {
          stat: 'discretion',
          difficulty: 8,
          success: 'r2_barriere',
          failure: 'r2_ronde_combat',
          successEffects: [set('r2_ronde_evitee'), xp(10)],
        },
      },
      { id: 'embuscade', text: 'Les laisser passer à votre hauteur, puis frapper.', kind: 'fight', next: 'r2_ronde_embuscade' },
      {
        id: 'montrer',
        text: 'Se montrer, mains ouvertes, et demander à parler au patron.',
        kind: 'talk', time: 0.5,
        effects: [set('r2_escorte')],
        next: 'r2_barriere',
      },
    ],
  },
  {
    id: 'r2_ronde_combat',
    chapter: C,
    location: 'rocade',
    title: 'Entre les carrosseries',
    kind: 'combat',
    text: [p('Votre semelle racle le bitume. Le premier homme se fige, puis s’accroupit et vous voit, sous le camping-car. « Eh ben. Des resquilleurs. »')],
    encounter: {
      enemies: ['peagiste', 'peagiste'],
      canFlee: true,
      victory: 'r2_ronde_butin',
      defeat: 'r2_rancon',
      flee: 'r2_structure',
      intro: 'Deux Péagistes vous barrent l’allée entre les voitures. Les portières leur servent de boucliers.',
    },
    choices: [],
  },
  {
    id: 'r2_ronde_embuscade',
    chapter: C,
    location: 'rocade',
    title: 'Le tiers du tiers',
    kind: 'combat',
    text: [p('Ils passent à un mètre de vous, à se disputer pour une histoire de cigarettes. Le second n’a pas le temps de décrocher son fusil.')],
    encounter: {
      enemies: ['peagiste', 'peagiste'],
      canFlee: true,
      ambush: true,
      victory: 'r2_ronde_butin',
      defeat: 'r2_rancon',
      flee: 'r2_structure',
      intro: 'Embuscade : les deux Péagistes ne vous ont pas vus venir.',
    },
    choices: [],
  },
  {
    id: 'r2_ronde_butin',
    chapter: C,
    location: 'rocade',
    title: 'Deux gilets orange',
    kind: 'story',
    text: [
      p('Ils sont couchés entre une Clio et un camping-car. Le plus jeune n’a pas vingt ans. Sur son poignet, trois points tatoués en triangle, la marque de la maison d’arrêt de Valombre. Dans la poche de son gilet, un carnet de tickets de péage vierges et quatre cartouches.'),
      p('Puis un coup de sifflet, long, là-bas, vers la gare de péage. Un autre lui répond. On a entendu. On vous attend.'),
      say('kaz', '« Bon », dit Kaz en regardant les corps. « Maintenant, le prix a changé. »', withUs('kaz')),
      say('ines', '« On pouvait passer à côté », dit Inès. Ce n’est pas un reproche. C’est une remarque, et c’est pire.', withUs('ines')),
    ],
    onEnter: [set('r2_sang'), give('cartouche', 4), give('bandage', 1), journal('Vous avez tué deux hommes de la Rocade. Le Péage le sait.')],
    choices: [
      { id: 'barriere', text: 'Aller à la barrière quand même. Autant regarder le prix en face.', kind: 'move', time: 0.5, next: 'r2_barriere' },
      { id: 'dessous', text: 'Enjamber la glissière et descendre sous le viaduc.', kind: 'stealth', time: 0.5, next: 'r2_structure' },
    ],
  },
  {
    id: 'r2_rancon',
    chapter: C,
    location: 'rocade',
    title: 'Les frais de dossier',
    kind: 'story',
    text: [
      p('Vous reprenez conscience le dos contre une glissière de sécurité, les poignets liés par un serre-câble. Devant vous, une table pliante, une balance de cuisine, et vos sacs ouverts.'),
      p('Un homme énorme en combinaison orange trie vos affaires en trois tas, avec des gestes d’employé consciencieux. Il pose le plus petit tas dans une caisse à ses pieds. « Le tiers, plus les frais de dossier », dit-il sans lever les yeux. « Vous avez payé. Les morts ne paient pas, alors on ne tue pas les clients. C’est la règle de la maison. »'),
      p('Maëlle a déjà nettoyé votre arcade. Elle tient le coton d’une main qui ne tremble pas et regarde le gros homme d’un œil qui ne pardonne rien.', withUs('maelle')),
      p('On coupe votre serre-câble. La barrière se lève. Personne ne vous retient.'),
    ],
    onEnter: [
      set('peage_paye'),
      set('r2_rancon'),
      take('ration', 2),
      take('cartouche', 4),
      take('balle_9mm', 6),
      when(withUs('maelle'), [heal(4)]),
      journal('La ronde de la Rocade a eu le dessus. Le Péage a prélevé le tiers, « plus les frais », puis a fait lever la barrière.'),
    ],
    choices: [{ id: 'passer', text: 'Passer la barrière sans se retourner.', kind: 'move', time: 0.5, next: 'r2_viaduc' }],
  },

  // -------------------------------------------------------------------------
  // La barrière
  // -------------------------------------------------------------------------
  {
    id: 'r2_barriere',
    chapter: C,
    location: 'rocade',
    title: 'La gare de péage',
    kind: 'story',
    checkpoint: true,
    text: [
      p('La gare de péage compte douze voies. Onze sont mortes, cabines aux vitres brisées, bornes arrachées. La septième vit encore : des lampes à pétrole sous l’auvent, un brasero dans un bidon, du linge orange qui sèche sur un câble. Devant la barrière rouge et blanche, une table pliante, une balance de cuisine, un registre relié de toile verte.'),
      p('Derrière la table, l’homme le plus large que vous ayez vu depuis la Fièvre. Une combinaison orange de la société d’autoroute, fermée jusqu’au menton, tendue sur le ventre. Une casquette au logo effacé. Un stylo attaché au registre par une ficelle. Ses hommes l’appellent le Péage. Il ne semble pas avoir d’autre nom.'),
      p('« Bonjour, bienvenue sur la Rocade », dit-il, de la voix de quelqu’un qui a prononcé la phrase dix mille fois. « Le tarif, c’est un tiers. Vous posez vos sacs sur la balance, je fais le calcul, vous repartez avec les deux autres. C’est plus honnête que la plupart des choses qui restent. »'),
      p('Les deux hommes de la ronde ont fait le chemin derrière vous, fusil dans le dos, sans brutalité. Ici, on ne frappe pas les clients.', flag('r2_escorte')),
      p('Il plisse les yeux en vous voyant surgir d’entre les voitures. « Vous avez évité mes gars. » Il note quelque chose dans la marge du registre. « J’aime pas ça. J’aime bien, aussi. »', flag('r2_ronde_evitee')),
      p('« Deux de mes gars sont couchés entre les voitures. » Il ne lève pas les yeux du registre. Autour de lui, quatre fusils se sont tournés vers vous. « Ça se paie aussi. Le tarif a changé. »', SANG),
      p('« Vous venez de la ville ? Il m’est passé un drôle de client hier soir. Grand, gros, la figure peinte. Il disait qu’il avait été roi, quelque part. » Le Péage sourit. « Il a payé comme tout le monde. Il n’a même pas discuté. Un roi qui paie, ce n’est plus un roi. »', flag('gaspard_epargne')),
      p('Il tapote une ligne du registre. « Une dame maigre avec une valise et un gamin, tout à l’heure. Le gamin m’a fait un salut militaire à l’envers. Je lui ai fait cadeau d’une boîte de pêches au sirop. » Il hausse les épaules. « Je ne suis pas un monstre. Je suis un péage. »', questStep('q_delmas', 'route')),
      p('Son regard passe sur chacun de vous comme un lecteur de code-barres. Il s’arrête sur Théo une seconde de trop. « Les gosses, c’est gratuit », dit-il enfin. « Sauf ceux qui valent quelque chose. »', withUs('theo')),
      p('Maëlle fait un pas, un seul, et se retrouve entre la table et son fils.', all(withUs('theo'), withUs('maelle'))),
      p('Sur le bitume, derrière la barrière, une flaque d’huile encore fraîche et les mêmes traces de pneus larges. Le camion s’est arrêté ici. Puis il est reparti.', THEO_PRIS),
    ],
    choices: [
      {
        id: 'vivres',
        text: 'Payer le tiers en vivres : 2 rations.',
        kind: 'negotiate', time: 0.5,
        visibleIf: [not(SANG)],
        requires: [has('ration', 2)],
        effects: [take('ration', 2), set('peage_paye')],
        next: 'r2_paye',
      },
      {
        id: 'cartouches',
        text: 'Payer le tiers en munitions : 5 cartouches.',
        kind: 'negotiate', time: 0.5,
        visibleIf: [not(SANG)],
        requires: [has('cartouche', 5)],
        effects: [take('cartouche', 5), set('peage_paye')],
        next: 'r2_paye',
      },
      {
        id: 'jumelles',
        text: 'Lui céder vos jumelles militaires. Il les regarde depuis tout à l’heure.',
        kind: 'negotiate', time: 0.5,
        visibleIf: [not(SANG)],
        requires: [has('jumelles')],
        effects: [take('jumelles'), set('peage_paye')],
        next: 'r2_paye',
      },
      {
        id: 'sang',
        text: 'Payer le prix du sang : 3 rations et 4 cartouches.',
        kind: 'negotiate', time: 0.5,
        visibleIf: [SANG],
        requires: [has('ration', 3), has('cartouche', 4)],
        effects: [take('ration', 3), take('cartouche', 4), set('peage_paye')],
        next: 'r2_paye',
      },
      {
        id: 'kaz',
        text: '[Kaz] Laisser parler Kaz. Il a l’air de reconnaître cet homme.',
        kind: 'talk', time: 0.5,
        visibleIf: [withUs('kaz'), not(SANG)],
        effects: [set('peage_paye'), set('r2_gerard'), rel('kaz', 1), xp(20)],
        next: 'r2_paye',
      },
      {
        id: 'detenu',
        text: '[Ancien détenu] Repérer les tatouages de ses hommes et leur parler la langue de la promenade.',
        kind: 'negotiate', time: 0.5,
        visibleIf: [not(SANG)],
        requires: [background('detenu'), has('ration', 1)],
        effects: [take('ration', 1), set('peage_paye'), set('r2_detenu'), xp(20)],
        next: 'r2_paye',
      },
      {
        id: 'cassette',
        text: 'Lui faire écouter l’enregistrement de la capitainerie.',
        kind: 'talk', time: 0.5,
        requires: [has('enregistrement')],
        next: 'r2_cassette',
      },
      {
        id: 'registre',
        text: 'Lui demander qui est passé avant vous. Son registre doit le dire.',
        kind: 'talk', time: 0.5,
        once: true,
        next: 'r2_registre',
      },
      {
        id: 'refuser',
        text: 'Refuser de payer. Personne ne pèse vos sacs.',
        kind: 'fight',
        warning: 'Combat de boss. Une défaite serait fatale.',
        next: 'r2_boss',
      },
      { id: 'contourner', text: 'Reculer, et chercher un passage par la structure du viaduc.', kind: 'stealth', time: 0.5, next: 'r2_structure' },
    ],
  },
  {
    id: 'r2_registre',
    chapter: C,
    location: 'rocade',
    title: 'Le registre',
    kind: 'story',
    text: [
      p('« Lire, c’est gratuit », dit le Péage. « Copier, c’est payant. » Il fait pivoter le registre vers vous, un doigt énorme posé sur la page du jour, comme on montre un relevé de compte.'),
      p('Des colonnes tirées à la règle. Date, nombre de passants, tiers prélevé, observations. Une écriture ronde, appliquée, d’employé modèle. Des rations, des cartouches, une alliance, des chaussures de marche pointure 42. Et dans la colonne des observations, presque à chaque ligne : « direction Morvan ».'),
      p('À la ligne de l’aube : « Ferrailleurs, camion plateau, 3 cages. Exonéré (convention Institut). Livraison au gué de la Sauldre, réception par la barge. » Théo est dans l’une de ces cages. Vous savez maintenant où le camion s’arrêtera.', THEO_PRIS),
      p('« Le camion ne paie pas », dit le Péage en suivant votre regard. « Convention. Le capitaine de la barge m’a promis six places à Morvan, pour moi et mes gars, quand la Rocade n’aura plus personne à faire passer. En attendant, ses livraisons passent gratis. » Il referme le registre. « On est des gens d’accord. »'),
      say('nour', 'Nour a lu la page à l’envers, plus vite que vous à l’endroit. « Quatre cent douze personnes depuis l’hiver », dit-elle. « Toutes vers Morvan. » Elle relève la tête. « Il n’y a pas de colonne pour ceux qui reviennent. »', withUs('nour')),
    ],
    onEnter: [
      doc('doc_r2_registre'),
      when(THEO_PRIS, [set('r2_camion_registre'), journal('D’après le registre du Péage, le camion des Ferrailleurs livrera ses cages au gué de la Sauldre, où la barge les réceptionnera.')]),
      when(not(THEO_PRIS), [journal('Le Péage laisse passer gratuitement les livraisons des Ferrailleurs : le capitaine Rousset lui a promis six places sur la barge.', false)]),
    ],
    choices: [{ id: 'retour', text: 'Revenir à la question du tiers.', kind: 'move', next: 'r2_barriere' }],
  },
  {
    id: 'r2_cassette',
    chapter: C,
    location: 'rocade',
    title: 'Le reste est négociable',
    kind: 'story',
    text: [
      p('Le Péage a un radiocassette sur le comptoir de sa cabine, un vieux modèle de dépanneuse à deux compartiments. Il glisse la cassette dedans sans vous quitter des yeux.'),
      p('La voix du capitaine Rousset remplit la cabine. « Huit places sur le pont inférieur. » « Le reste du contingent sera trié à la grille. » « Le reste est négociable. »'),
      p('Le Péage l’écoute deux fois. La première, il hoche la tête comme un homme qui reconnaît un collègue. La seconde, il ne bouge plus du tout.'),
      p('« Six places », dit-il enfin. « Il m’a promis six places, par radio. Avec cette voix-là. » Il éjecte la cassette et la fait tourner entre ses gros doigts. « Avec ça, je le tiens, votre capitaine. Je ne monte pas sur sa barge en marchandise. Je monte en associé. » Il lève les yeux. « Laissez-la-moi, et vous passez. Gratuit. J’écris même « acquitté » dans le registre. »'),
    ],
    choices: [
      {
        id: 'donner',
        text: 'Lui laisser la cassette.',
        kind: 'sacrifice',
        warning: 'Vous n’aurez plus cette preuve à l’écluse de Morvan.',
        effects: [take('enregistrement'), set('peage_paye'), set('r2_cassette_donnee'), journal('Vous avez laissé l’enregistrement de Rousset au Péage, contre le passage.')],
        next: 'r2_paye',
      },
      {
        id: 'copier',
        text: '[Technicien] Proposer une copie : son radiocassette a deux compartiments.',
        kind: 'explore', time: 1,
        requires: [profile('technicien')],
        effects: [set('peage_paye'), set('r2_cassette_copiee'), xp(30), journal('Le Péage garde une copie de l’enregistrement de Rousset. Vous avez l’original.')],
        next: 'r2_paye',
      },
      { id: 'refuser', text: 'Reprendre la cassette. Elle est destinée à quelqu’un d’autre.', kind: 'talk', next: 'r2_barriere' },
    ],
  },
  {
    id: 'r2_paye',
    chapter: C,
    location: 'rocade',
    title: 'Acquitté',
    kind: 'story',
    text: [
      p('Kaz s’avance jusqu’à la table et retire son bonnet. « Gérard », dit-il. « Gérard Moulin. Barrière de Valombre-Est. Tu me faisais passer le dimanche, sans ticket, avec la camionnette d’Irena, quand elle allait vendre ses confitures au marché de Brennes. »', flag('r2_gerard')),
      p('Le Péage le regarde longtemps. Quelque chose bouge dans son visage, très loin sous la graisse et la fatigue. « Les confitures de prunes. » « De mirabelles », dit Kaz. Un silence. « Passe », dit le Péage. « Toi et ta famille. Pas de tiers. » Dans le registre, à la place du nom de Kaz, il écrit : « Irena ».', flag('r2_gerard')),
      p('Vous avez repéré les trois points tatoués au poignet de son second. Vous donnez le numéro de votre ancien bâtiment, le nom du surveillant que tout le monde haïssait, le prix d’un paquet de tabac à la cantine. Les gilets orange éclatent de rire. Le Péage, contrarié, applique le « tarif maison » : une ration, et qu’on n’en parle plus.', flag('r2_detenu')),
      p('Le Péage range la cassette dans la poche de poitrine de sa combinaison et remonte la fermeture éclair jusqu’en haut, comme on ferme un coffre.', flag('r2_cassette_donnee')),
      p('Les deux cassettes tournent ensemble pendant une heure, et vous surveillez les bobines comme on surveille une fièvre. Il garde la copie. Vous gardez l’original. Personne ne se fait confiance, et c’est précisément pour ça que l’arrangement tient.', flag('r2_cassette_copiee')),
      p('Il trace une croix à côté de deux noms, en haut de la page, puis il pèse votre paiement avec la même application que le reste.', SANG),
      p('« Nom ? » Vous le lui donnez. Il l’écrit en capitales : {nom}. Puis il tamponne la ligne avec un tampon encreur qui n’a plus d’encre depuis longtemps. « Acquitté. Bonne route sur la Rocade. Attention aux bouchons. » Il rit tout seul de sa plaisanterie, qui doit avoir quatorze mois.'),
      p('La barrière rouge et blanche se lève en grinçant, poussée à la main par un gamin en gilet trop grand.'),
    ],
    onEnter: [journal('Vous avez acquitté le péage de la Rocade.', false)],
    choices: [{ id: 'passer', text: 'Passer la barrière.', kind: 'move', time: 0.5, next: 'r2_viaduc' }],
  },

  // -------------------------------------------------------------------------
  // Sous le viaduc
  // -------------------------------------------------------------------------
  {
    id: 'r2_structure',
    chapter: C,
    location: 'rocade',
    title: 'Sous le tablier',
    kind: 'story',
    text: [
      p('Sous le viaduc, la vallée change de taille. Les piles montent vers un plafond de béton gris, rayé de coulures de rouille. Le vent passe entre elles avec un bruit d’orgue mal accordé. Quarante mètres plus bas, la rivière.'),
      p('Deux chemins, peut-être. Le long du bord du tablier court une corniche de béton, large comme une marche d’escalier, sous le parapet : de là-haut, personne ne la voit. Et le tablier lui-même est creux. Un caisson, comme disent les ingénieurs : un long couloir de béton qui traverse toute la vallée, avec une porte de visite au sommet de la première pile, au bout d’une échelle à crinoline.'),
      p('C’est la porte de service que vous aviez repérée aux jumelles. Une chaîne, un cadenas rouillé. Personne ne la garde.', flag('r2_reperage')),
      say('kaz', '« Un caisson de viaduc », dit Kaz en levant la tête. « J’en ai visité, pour le canal. Dedans, il fait noir comme dans une poche, et tout ce qui tombe du tablier finit par y rentrer. Tout. »', withUs('kaz')),
    ],
    choices: [
      {
        id: 'caisson',
        text: 'Forcer la porte de visite et traverser par l’intérieur du caisson.',
        kind: 'explore', time: 0.5,
        requires: [any(has('pied_de_biche'), has('outils'), has('rossignol'), has('barre_fer'))],
        next: 'r2_caisson',
      },
      {
        id: 'corde',
        text: 'Longer la corniche extérieure, encordés à la rambarde.',
        kind: 'explore', time: 1.5,
        requires: [has('corde')],
        check: {
          stat: 'force',
          difficulty: 8,
          success: 'r2_viaduc',
          failure: 'r2_chute',
          successEffects: [set('peage_contourne'), set('r2_corniche'), xp(20)],
        },
      },
      {
        id: 'ines',
        text: 'Laisser Inès ouvrir la voie sur la corniche, comme dans les Carrières.',
        kind: 'explore', time: 1.5,
        visibleIf: [withUs('ines')],
        check: {
          stat: 'survie',
          difficulty: 7,
          success: 'r2_viaduc',
          failure: 'r2_chute',
          successEffects: [set('peage_contourne'), set('r2_corniche'), rel('ines', 1), xp(20)],
        },
      },
      {
        id: 'nu',
        text: 'Longer la corniche sans corde, le ventre contre le béton.',
        kind: 'explore', time: 1.5,
        check: {
          stat: 'survie',
          difficulty: 10,
          success: 'r2_viaduc',
          failure: 'r2_chute',
          successEffects: [set('peage_contourne'), set('r2_corniche'), xp(25)],
        },
      },
      { id: 'remonter', text: 'Remonter sur l’autoroute et affronter la barrière.', kind: 'move', time: 0.5, next: 'r2_barriere' },
    ],
  },
  {
    id: 'r2_caisson',
    chapter: C,
    location: 'rocade',
    title: 'Le caisson',
    kind: 'story',
    text: [
      p('Le cadenas cède. Derrière la porte, un couloir rectangulaire de béton brut, haut de deux mètres, qui file droit dans le noir. Tous les quatre mètres, une cloison percée d’un trou d’homme, qu’il faut franchir à quatre pattes. L’air sent la fiente de pigeon, la poussière, et autre chose, plus loin, de sucré.'),
      say('nour', 'Nour compte à voix basse. « Cinquante-deux. Cinquante-trois. » Elle comptera jusqu’au bout. Ça l’empêche d’avoir peur, ou ça l’empêche de le montrer.', withUs('nour')),
      p('À mi-chemin, la lampe accroche des silhouettes. Une douzaine, debout entre deux cloisons, la tête basse, immobiles comme des gens qui attendent un bus. Des sacs à dos. Une valise à roulettes. Un manteau d’enfant. Ce sont ceux qui n’ont pas pu payer. Le Péage ne tue pas les clients : il les fait descendre par une trappe du tablier, et le caisson s’occupe du reste.'),
      p('Puis le cliquetis commence. Pas encore une alerte. Un réveil.'),
    ],
    choices: [
      {
        id: 'cataphile',
        text: '[Cataphile] Éteindre la lampe et passer au toucher, une main sur la paroi, comme sous Valombre.',
        kind: 'stealth', time: 0.5,
        requires: [background('cataphile')],
        effects: [xp(25)],
        next: 'r2_reserve',
      },
      {
        id: 'fusee',
        text: 'Allumer une fusée de détresse et la jeter loin derrière eux, vers l’entrée.',
        kind: 'item', time: 0.5,
        requires: [has('fusee')],
        effects: [take('fusee'), xp(15)],
        next: 'r2_reserve',
      },
      {
        id: 'passer',
        text: 'Passer entre eux, lampe masquée, en retenant votre souffle.',
        kind: 'stealth', time: 0.5,
        check: { stat: 'discretion', difficulty: 8, success: 'r2_reserve', failure: 'r2_caisson_combat' },
      },
      { id: 'reculer', text: 'Reculer jusqu’à la porte et ressortir.', kind: 'flee', time: 0.5, next: 'r2_structure' },
    ],
  },
  {
    id: 'r2_caisson_combat',
    chapter: C,
    location: 'rocade',
    title: 'Dans le noir',
    kind: 'combat',
    text: [p('Une valise à roulettes bascule et claque sur le béton. Toutes les têtes se lèvent en même temps.')],
    encounter: {
      enemies: ['rodeur', 'rodeur', 'coureur'],
      canFlee: true,
      victory: 'r2_reserve',
      defeat: 'r2_chute',
      flee: 'r2_chute',
      intro: 'Trois Muets se ruent sur vous dans le couloir du caisson. Il n’y a de place que pour un à la fois.',
    },
    choices: [],
  },
  {
    id: 'r2_reserve',
    chapter: C,
    location: 'rocade',
    title: 'La réserve',
    kind: 'story',
    text: [
      p('Au bout du caisson, juste avant la culée, la lampe éclaire des étagères métalliques, alignées contre la paroi comme dans un magasin. Le tiers. Des conserves classées par date de péremption. Des cartouches dans des boîtes à chaussures. Des chaussures dans des boîtes de cartouches. Et sur la dernière étagère, un bocal de cornichons rempli d’alliances.'),
      p('Une trappe dans la paroi, au-dessus d’une échelle, donne sur le talus de l’autre versant. Derrière vous, la gare de péage. Là-haut, personne n’a rien vu.'),
      say('maelle', '« Il doit y avoir trois cents alliances là-dedans », dit Maëlle. Elle ne touche pas au bocal.', withUs('maelle')),
    ],
    onEnter: [set('peage_contourne'), journal('Vous avez traversé le viaduc par l’intérieur du caisson, sans payer le péage.')],
    choices: [
      {
        id: 'prendre',
        text: 'Se servir dans la réserve. Ce n’est pas son tiers, c’est celui des autres.',
        kind: 'explore', time: 0.5,
        effects: [give('ration', 2), give('cartouche', 4), set('r2_reserve_pillee'), journal('Vous avez pris votre part dans la réserve du Péage.', false)],
        next: 'r2_viaduc',
      },
      { id: 'laisser', text: 'Ne toucher à rien et sortir par la trappe.', kind: 'move', next: 'r2_viaduc' },
    ],
  },
  {
    id: 'r2_chute',
    chapter: C,
    location: 'rocade',
    title: 'Le vide',
    kind: 'story',
    text: [
      p('Une plaque de béton se détache sous votre pied. Le monde bascule. Vous tombez de trois mètres sur la tête de la pile suivante, une plateforme couverte de mousse et de fientes, et le choc vous vide les poumons. Votre sac s’est ouvert. Des choses tombent encore, plus bas, longtemps, avant d’atteindre la rivière.', not(PAR_LE_CAISSON)),
      p('Vous courez dans le noir, les dents qui claquent derrière vous, et le sol se dérobe : une trappe de visite, mal refermée. Vous tombez dans la cellule suivante, la cheville tordue, le front ouvert contre une cloison. Au-dessus, quelqu’un rabat la plaque d’acier. Les mains griffent le métal, puis renoncent.', PAR_LE_CAISSON),
      p('Kaz vous hisse d’une seule main, comme un sac de ciment. Il ne dit rien. Il n’a pas besoin.', withUs('kaz')),
      p('Inès a déjà noué une corde autour de vous. « Regarde le béton. Pas le vide. Le béton. »', withUs('ines')),
      p('Maëlle vous fait asseoir, palpe la cheville, serre un bandage. « Rien de cassé. Tu boiteras jusqu’à ce soir. » Elle serre le nœud d’un coup sec. « Il y a pire, comme façon de tomber d’un viaduc. »', withUs('maelle')),
      p('Il vous faut longtemps pour reprendre votre souffle, et plus longtemps encore pour vous remettre à avancer. Mais vous avancez. Une heure plus tard, vous posez le pied sur le talus de l’autre versant, derrière la gare de péage.'),
    ],
    onEnter: [
      hurt(4, 'une chute sur le béton du viaduc'),
      take('ration', 1),
      { type: 'time', hours: 1 },
      when(withUs('maelle'), [heal(2)]),
      set('peage_contourne'),
      journal('Vous avez franchi le viaduc par sa structure, au prix d’une chute.', false),
    ],
    choices: [{ id: 'suite', text: 'Boiter jusqu’au bord de la route.', kind: 'move', next: 'r2_viaduc' }],
  },

  // -------------------------------------------------------------------------
  // Le Péage
  // -------------------------------------------------------------------------
  {
    id: 'r2_boss',
    chapter: C,
    location: 'rocade',
    title: 'Le Péage',
    kind: 'combat',
    text: [
      p('Le Péage soupire, comme devant un client qui conteste une facture. Il se lève. Il n’en finit pas de se lever. Il arrache d’un geste la barrière rouge et blanche de son axe et la soupèse, deux mètres de tôle et d’acier, qu’il tient comme un bouclier.'),
      p('« Personne ne tire », dit-il à ses hommes. « C’est une affaire de comptabilité. »'),
    ],
    encounter: {
      enemies: ['boss_peage'],
      canFlee: false,
      victory: 'r2_boss_victoire',
      defeat: 'r2_mort',
      intro: 'Le Péage. Derrière sa barrière, il encaisse tout : attendez qu’il la lève, et faites-lui baisser la garde.',
    },
    choices: [],
  },
  {
    id: 'r2_mort',
    chapter: C,
    location: 'rocade',
    title: 'Le tiers',
    kind: 'death',
    ending: 'mort',
    text: [
      p('Le dernier coup de barrière vous couche sur le bitume, entre la table pliante et la balance de cuisine. Vous entendez encore le Péage reprendre son souffle, puis le grattement du stylo sur le registre.'),
      p('On vide votre sac en trois tas. On en garde un. Le reste, on le jette par la trappe, dans le caisson, avec vous.'),
    ],
    choices: [],
  },
  {
    id: 'r2_boss_victoire',
    chapter: C,
    location: 'rocade',
    title: 'Les comptes',
    kind: 'story',
    text: [
      p('Le Péage s’assoit par terre, lentement, le dos contre sa cabine, au milieu de la poudre blanche de l’extincteur. Il respire mal. Ses hommes regardent la scène, puis ils regardent leurs fusils, puis ils s’en vont, un par un, entre les voitures. Personne ne leur doit plus rien.'),
      p('« Faut bien que quelqu’un tienne les comptes », dit-il. Ce sont ses derniers mots. Il les dit comme une excuse, ou comme un reproche, vous ne saurez jamais lequel.'),
      p('Dans la cabine 7 : un fusil à pompe, une boîte de cartouches, un gilet pare-balles de gendarme. Et le registre, sur la table, ouvert à la page du jour.'),
      p('Une ligne de l’aube : « Ferrailleurs, camion plateau, 3 cages. Exonéré (convention Institut). Livraison au gué de la Sauldre. » Vous savez maintenant où le camion de Théo s’arrêtera.', THEO_PRIS),
      p('Derrière la cabine, trois personnes enchaînées par la cheville à la glissière. Ceux qui ne pouvaient pas payer et qu’on n’a pas encore jetés dans le caisson. Ils poussent les voitures, nettoient les cabines, ne parlent pas. Ils vous regardent comme on regarde le nouveau propriétaire.'),
    ],
    onEnter: [
      set('peage_vaincu'),
      give('fusil'),
      give('cartouche', 6),
      give('gilet'),
      doc('doc_r2_registre'),
      when(THEO_PRIS, [set('r2_camion_registre'), journal('D’après le registre du Péage, le camion des Ferrailleurs livrera ses cages au gué de la Sauldre.')]),
      journal('Vous avez abattu le Péage. La Rocade n’a plus de barrière.'),
    ],
    choices: [
      {
        id: 'liberer',
        text: 'Chercher la clé des chaînes et libérer les trois gagés.',
        kind: 'talk', time: 0.5,
        effects: [set('r2_gages_liberes'), xp(25), give('ration', 1), journal('Vous avez libéré les gagés du Péage. L’un d’eux vous a donné tout ce qu’il avait : une ration.', false)],
        next: 'r2_viaduc',
      },
      {
        id: 'partir',
        text: 'Partir. Ils trouveront bien la clé eux-mêmes.',
        kind: 'move',
        warning: 'Les gagés resteront enchaînés à la glissière.',
        next: 'r2_viaduc',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // L’autre versant
  // -------------------------------------------------------------------------
  {
    id: 'r2_viaduc',
    chapter: C,
    location: 'rocade',
    title: 'L’autre versant',
    kind: 'story',
    text: [
      p('L’autoroute redescend en pente douce vers la vallée suivante. Derrière vous, le viaduc et son embouteillage immobile, comme un train de marchandises qu’on aurait oublié de faire partir.'),
      p('La barrière se rabaisse derrière vous dans un grincement. Quelqu’un bombe déjà une croix orange sur la borne. Le passage est réglé. Vous voilà dans le registre.', flag('peage_paye')),
      p('Personne ne tient plus la barrière. Déjà, des silhouettes sortent d’entre les voitures, prudemment, et passent de l’autre côté sans rien poser sur la balance.', flag('peage_vaincu')),
      p('Les trois gagés marchent un moment avec vous, puis s’arrêtent à un embranchement. L’un d’eux vous serre la main sans un mot et part vers le nord.', flag('r2_gages_liberes')),
      p('Vous remontez de la corniche par-dessus le parapet, les doigts blancs et les genoux en coton, juste derrière la gare de péage. Les gilets orange regardent tous de l’autre côté, vers ceux qui viennent.', flag('r2_corniche')),
      p('Loin devant, sur la route, une silhouette massive marche seule, sans se presser, un sac sur l’épaule. Même de dos, même sans couronne, vous reconnaissez la démarche de Gaspard Lenoir. Il ne se retourne pas.', flag('gaspard_epargne')),
      p('Kaz marche en silence, son bonnet à la main. Au bout d’un kilomètre, il dit seulement : « Elle faisait les meilleures confitures de la vallée. Tout le monde le savait, même lui. »', flag('r2_gerard')),
      p('Théo s’assoit sur la glissière et sort son carnet. Il dessine le viaduc, les douze piles, la gare de péage. Il dessine aussi quelque chose sous le tablier, mais il tourne la page avant que vous ayez vu quoi.', withUs('theo')),
    ],
    choices: [
      {
        id: 'theo',
        text: 'S’asseoir à côté de Théo et le regarder dessiner.',
        kind: 'talk', time: 0.5,
        once: true,
        visibleIf: [withUs('theo')],
        effects: [rel('theo', 1), set('r2_carte_theo'), journal('Théo a ajouté le viaduc de la Rocade à sa carte. Sous le tablier, il a dessiné les silhouettes du caisson.', false)],
      },
      { id: 'descendre', text: 'Prendre la route qui descend vers la vallée.', kind: 'move', time: 1, next: 'r2_fin' },
    ],
  },
  {
    id: 'r2_fin',
    chapter: C,
    location: 'rocade',
    title: 'Fin du chapitre 6',
    kind: 'chapterEnd',
    text: [
      p('Au bas de la descente, vous faites halte sous un pont de bretelle, à l’abri du vent, et vous mangez sans parler. Le viaduc n’est plus qu’un trait gris en travers du ciel.'),
      p('Devant vous, au-delà des champs en friche, une colline couverte de vigne, et sur la colline, un clocher de pierre blonde. Une cloche y sonne, une seule fois, puis se tait. Quelqu’un, là-haut, tient encore les heures.'),
      p('Théo vous montre la page du viaduc. Sous le tablier, il a dessiné des petites silhouettes debout, la tête basse. Il a écrit à côté, en lettres minuscules : « ceux qui n’ont pas payé ».', flag('r2_carte_theo')),
      p('Quelque part devant, un camion plateau roule vers le gué de la Sauldre avec trois cages sur le dos. Vous savez où il va. C’est une petite chose, savoir. C’est toujours plus que rien.', all(THEO_PRIS, flag('r2_camion_registre'))),
      p('Votre poche de poitrine est vide, là où se trouvait la cassette. Vous avez acheté le passage avec la voix de Rousset. Vous espérez ne pas avoir à le regretter à Morvan.', flag('r2_cassette_donnee')),
      p('Il reste {reste} avant l’aube du septième.'),
    ],
    onEnter: [meal(), diary('r2')],
    choices: [{ id: 'suite', text: 'Chapitre 7 : Le Prieuré', kind: 'move', time: 1, next: 'r3_vigne' }],
  },
];

export const DOCUMENTS_R2: DocumentDef[] = [
  {
    id: 'doc_r2_carnet',
    title: 'Carnet de bord — Vacances Arcachon',
    source: 'Carnet à spirale, boîte à gants d’un monospace gris, viaduc de la Rocade',
    body:
      'Samedi. Partis à 6 h pour éviter les bouchons. Raté. La radio dit un accident sur le viaduc, puis elle dit autre chose, qu’on ne comprend pas. Léa a vomi ses céréales. Tom compte les camions rouges.\n\n' +
      'Samedi soir. On n’avance plus du tout. Les gens sortent des voitures pour fumer. La radio dit de rester dans les véhicules et de garder les vitres fermées. Personne ne dit pourquoi.\n\n' +
      'Dimanche. Il y a eu des cris vers la sortie 14. Un homme est passé en courant, il saignait du cou. Nous avons gardé les vitres fermées. Il reste deux bouteilles d’eau et le paquet de biscuits de Tom.\n\n' +
      'Lundi. La dame de la Clio devant nous ne bouge plus. Elle a toujours sa ceinture. Elle tape contre la vitre avec la tête, doucement, sans arrêt. J’ai dit aux enfants qu’elle dormait mal.\n\n' +
      'Mardi. Léa a de la fièvre. Pas celle-là, je crois. Je crois. Des hommes en gilet orange de l’autoroute sont passés avec des bouteilles d’eau. Ils voulaient la moitié de nos affaires. J’ai donné la montre de papa.\n\n' +
      'Mercredi. Marc ne veut pas partir à pied. Il dit qu’il faut attendre les secours. Il ne veut pas laisser la voiture. Je ne comprends pas comment on peut tenir à une voiture.\n\n' +
      'Mercredi nuit. Je pars avec les enfants. Je n’ai pas trouvé les boucles des sièges dans le noir, j’ai coupé les sangles. Marc dort. Je lui laisse ce carnet pour qu’il sache où nous trouver : chez ma sœur, à Brennes. Marc, si tu lis ça, viens. Laisse la voiture.',
  },
  {
    id: 'doc_r2_registre',
    title: 'Registre de la Rocade',
    source: 'Registre de péage relié de toile verte, cabine 7, gare de péage du viaduc',
    body:
      'Gare de péage de la Rocade — voie 7. Tarif unique : un tiers.\n\n' +
      'Date | Passants | Tiers prélevé | Observations\n' +
      'J+402 | 3 | 4 boîtes de haricots, 1 couteau suisse | direction Morvan\n' +
      'J+403 | 1 | chaussures de marche (42), 1 alliance | direction Morvan. Pieds en sang. Réglé quand même.\n' +
      'J+404 | 5 | 2 rations, 6 cartouches | direction Morvan. Une famille, trois enfants. Le dernier portait les chaussures de son père.\n' +
      'J+405 | 2 | — | impayé. Descendus au caisson.\n' +
      'J+406 | 2 | 1 montre de plongée | direction Morvan. Un médecin, dit-il. A demandé si la barge avait encore besoin de médecins. Je n’ai pas su répondre.\n' +
      'J+407 | 3 cages | exonéré | Ferrailleurs, camion plateau. Convention Institut (cpt. R.). Livraison au gué de la Sauldre, réception barge.\n\n' +
      'En marge, d’une autre encre : « Six places à Morvan, promis par radio. Garder ce registre comme preuve. Au cas où. »',
  },
];

export const DIARY_R2: DiaryRule[] = [
  { chapter: 'r2', text: 'Quatorze mois que ces voitures attendent que le bouchon se résorbe. Il y a encore des gens dedans, ceinturés, qui attendent avec elles.' },
  { chapter: 'r2', if: flag('peage_paye'), text: 'J’ai payé le tiers. Mon nom est écrit dans un registre, en capitales, entre une alliance et une paire de chaussures. Acquitté.' },
  { chapter: 'r2', if: flag('r2_gerard'), text: 'Le Péage a écrit « Irena » à la place du nom de Kaz. Je n’aurais jamais cru qu’un homme pareil se souvienne de confitures.' },
  { chapter: 'r2', if: flag('r2_sang'), text: 'Le garçon de la ronde avait trois points tatoués au poignet et pas vingt ans. Le prix a changé, comme dit Kaz. Pour lui aussi.' },
  { chapter: 'r2', if: flag('peage_vaincu'), text: 'J’ai abattu le Péage. « Faut bien que quelqu’un tienne les comptes. » Je crois qu’il le pensait vraiment.' },
  { chapter: 'r2', if: flag('peage_contourne'), text: 'J’ai traversé le viaduc par son ventre. Ceux qui n’avaient pas payé y étaient encore, debout dans le noir, avec leurs valises.' },
  { chapter: 'r2', if: flag('r2_cassette_donnee'), text: 'J’ai donné la voix de Rousset à un homme qui veut s’en servir pour monter sur la barge. J’espère que je n’ai pas vendu la seule preuve qu’on avait.' },
  { chapter: 'r2', if: all(companionIs('theo', 'captured'), flag('r2_camion_registre')), text: 'Le gué de la Sauldre. C’est là que le camion livrera Théo. Je l’ai lu dans un registre, entre deux lignes de conserves.' },
  { chapter: 'r2', text: 'Ce soir, une cloche a sonné sur une colline. Une seule fois. Comme pour dire qu’il y a encore quelqu’un.' },
];
