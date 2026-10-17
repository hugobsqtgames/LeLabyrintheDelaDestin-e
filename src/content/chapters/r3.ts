/**
 * Chapitre 7 — Le Prieuré (« Ceux qu’on garde »)
 * Le prieuré de Saint-Aubin : Mère Agathe et ses sœurs soignent les vivants
 * et gardent dans la crypte douze malades enchaînés qu’elles appellent par
 * leur prénom. Elles savent ce que sont les porteurs.
 */
import type { Condition, DiaryRule, DocumentDef, Effect, Scene } from '../../engine/types';
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
  heal,
  hurt,
  infected,
  journal,
  meal,
  not,
  notFlag,
  notWithUs,
  p,
  rel,
  relMax,
  relMin,
  rest,
  say,
  set,
  take,
  when,
  withUs,
  xp,
} from '../helpers';

const C = 'r3';
const THEO_ICI = withUs('theo');
const THEO_CAGE = companionIs('theo', 'captured');
const MAELLE_ICI = withUs('maelle');
const KAZ_ICI = withUs('kaz');
const INES_ICI = withUs('ines');
const NOUR_ICI = withUs('nour');
const PERSONNE = all(notWithUs('maelle'), notWithUs('theo'), notWithUs('kaz'), notWithUs('ines'), notWithUs('nour'));
const COMBAT_VIGNE: Condition = { type: 'visited', scene: 'r3_vigne_combat' };
const SOIGNER: Effect = { type: 'cureInfection' };
const KAZ_HEROS = companionIs('kaz', 'hero');
const MAELLE_HEROS = companionIs('maelle', 'hero');
const INES_HEROS = companionIs('ines', 'hero');

export const chapterR3: Scene[] = [
  // -------------------------------------------------------------------------
  // La colline
  // -------------------------------------------------------------------------
  {
    id: 'r3_vigne',
    chapter: C,
    location: 'prieure',
    title: 'La colline de Saint-Aubin',
    kind: 'story',
    checkpoint: true,
    text: [
      p('La route quitte la vallée et monte entre des rangs de vigne que personne n’a taillés depuis deux hivers. Les sarments ont poussé dans tous les sens, se sont noués d’un rang à l’autre, et la colline entière ressemble à une chevelure qu’on n’aurait jamais peignée.'),
      p('Au sommet, un mur de pierre blonde, un clocher carré, des toits de tuile. Le prieuré de Saint-Aubin. Une fumée mince sort d’une cheminée. Quelque part derrière le mur, quelqu’un tire de l’eau d’un puits : le grincement de la poulie descend jusqu’à vous, régulier, tranquille, comme s’il ne s’était rien passé dans le monde.'),
      p('Plus bas dans les rangs, deux silhouettes se balancent sur place, accrochées aux sarments par leurs vêtements. Leurs dents claquent doucement. Elles n’ont encore rien remarqué.'),
      p('Sur le bas-côté, des traces de pneus larges, fraîches, dans la boue du fossé. Un camion lourd est passé ici ce matin, sans s’arrêter, vers l’aval. Vous savez lequel.', THEO_CAGE),
      p('Théo s’est arrêté pour dessiner le clocher. Trois traits, une croix, la ligne de la colline. Il range son carnet avant que vous ayez à le lui demander.', THEO_ICI),
      say('kaz', '« Un couvent. » Kaz plisse les yeux. « Ma grand-mère disait : chez les sœurs, on te nourrit d’abord, on te fait la morale après. Je prends la première moitié. »', KAZ_ICI),
    ],
    choices: [
      {
        id: 'sonner',
        text: 'Monter tout droit jusqu’à la porte et tirer la cloche.',
        kind: 'talk', time: 0.5,
        next: 'r3_porte',
      },
      {
        id: 'mur',
        text: 'Longer le mur à couvert, et regarder d’abord ce qu’il y a derrière.',
        kind: 'stealth', time: 0.5,
        check: { stat: 'discretion', difficulty: 8, success: 'r3_mur', failure: 'r3_vigne_combat' },
      },
    ],
  },
  {
    id: 'r3_mur',
    chapter: C,
    location: 'prieure',
    title: 'Par-dessus le mur',
    kind: 'story',
    text: [
      p('Une brèche dans le mur, à hauteur d’épaule, envahie de lierre. De l’autre côté : un potager tenu au cordeau, des poireaux, des choux, des fèves sur des tuteurs de roseau. Un cloître aux arcades basses. Du linge blanc sur une corde.'),
      p('Deux religieuses traversent la cour, chacune avec deux seaux. Elles ne vont pas vers la cuisine. Elles descendent un escalier de pierre qui s’enfonce sous la chapelle. L’une des deux a l’avant-bras bandé jusqu’au coude.'),
      p('Pendant qu’elles descendent, un son monte de sous la terre. Un bruit de métal qui traîne sur la pierre, et par-dessous, un cliquetis que vous connaissez trop bien. Beaucoup de dents. Puis une voix de femme, très calme, qui dit un prénom, et le métal se tait.'),
      say('ines', '« Douze, peut-être plus », murmure Inès. « Et elles leur portent à manger. »', INES_ICI),
    ],
    onEnter: [set('r3_vu_crypte'), xp(10)],
    choices: [{ id: 'porte', text: 'Faire le tour jusqu’à la porte.', kind: 'move', next: 'r3_porte' }],
  },
  {
    id: 'r3_vigne_combat',
    chapter: C,
    location: 'prieure',
    title: 'Dans les sarments',
    kind: 'combat',
    text: [p('Un sarment craque sous votre pied. Les deux silhouettes se retournent ensemble et s’arrachent à la vigne en laissant des lambeaux de manteau sur les branches.')],
    encounter: {
      enemies: ['rodeur', 'rodeur'],
      canFlee: true,
      victory: 'r3_porte',
      defeat: 'r3_vigne_defaite',
      flee: 'r3_porte',
      intro: 'Deux Rôdeurs se dégagent des rangs de vigne et marchent sur vous.',
    },
    choices: [],
  },
  {
    id: 'r3_vigne_defaite',
    chapter: C,
    location: 'prieure',
    title: 'Des mains propres',
    kind: 'story',
    text: [
      p('Vous tombez dans la boue entre deux ceps. Quelque chose pèse sur vous, claque des dents contre votre col. Puis le poids disparaît d’un coup, tiré en arrière par une corde passée autour de son cou.'),
      p('Quand vous rouvrez les yeux, il y a un banc de pierre sous votre dos, une arcade au-dessus, et une femme en habit gris nettoie votre sourcil fendu avec un linge qui sent le thym. Elle ne sourit pas, mais ses gestes sont doux. Elle dit s’appeler Mère Agathe.'),
      say('agathe', '« On ne les tue pas, ici. On les ramène. Les vôtres sont attachés dans la grange, ils ne vous feront plus rien. Ne bougez pas. »'),
      p('Vos compagnons sont assis contre le mur, en sueur, couverts de boue. Ils ont aidé à tirer la corde.', not(PERSONNE)),
    ],
    onEnter: [hurt(2, 'les ongles d’un Rôdeur'), set('r3_vigne_ramenes')],
    choices: [{ id: 'cloitre', text: 'Se redresser.', kind: 'move', time: 0.5, next: 'r3_cloitre' }],
  },
  {
    id: 'r3_porte',
    chapter: C,
    location: 'prieure',
    title: 'Mère Agathe',
    kind: 'story',
    text: [
      p('La cloche de la porte est une petite cloche de bronze au bout d’une chaîne. Elle sonne aigre. Un judas s’ouvre, se referme, et la porte cochère s’entrouvre sur une femme d’une soixantaine d’années, en habit gris et tablier de toile, les manches retroussées sur des avant-bras secs. Elle a des mains d’infirmière : courtes, rouges, propres jusque sous les ongles.'),
      say('agathe', '« Je suis Mère Agathe. Vous avez soif, vous avez faim, et quelqu’un parmi vous a mal quelque part. C’est toujours comme ça. Entrez. »'),
      say('agathe', '« J’ai entendu, depuis le mur, ce qui s’est passé dans mes vignes. » Elle regarde vos manches, sans colère. « Ceux d’en bas avaient un nom, eux aussi. Je ne le connaissais pas. »', COMBAT_VIGNE),
      say('moi', '« Vous ne demandez pas si quelqu’un est mordu ? »'),
      say('agathe', '« Ailleurs, on vous laisse dehors pour une morsure. Ici, c’est justement pour ça qu’on ouvre. »'),
    ],
    choices: [
      {
        id: 'crypte',
        text: 'Lui demander, tout de suite, ce qu’elles gardent sous la chapelle.',
        kind: 'talk', time: 0.5,
        visibleIf: [flag('r3_vu_crypte')],
        effects: [rel('agathe', 1), set('r3_franchise')],
        next: 'r3_cloitre',
      },
      { id: 'entrer', text: 'Entrer.', kind: 'move', next: 'r3_cloitre' },
    ],
  },

  // -------------------------------------------------------------------------
  // Le cloître
  // -------------------------------------------------------------------------
  {
    id: 'r3_cloitre',
    chapter: C,
    location: 'prieure',
    title: 'Le cloître',
    kind: 'story',
    checkpoint: true,
    text: [
      say('agathe', '« Vous avez regardé par la brèche du potager. » Elle n’a pas l’air surprise. « Bien. Je préfère qu’on me pose la question en face. Je vous répondrai en bas, après la soupe. On ne parle pas de ces choses le ventre vide. »', flag('r3_franchise')),
      p('On vous fait asseoir sur un banc, sous les arcades, et une vieille sœur voûtée — Sœur Marthe — pose devant chacun un bol de soupe de fèves, un quignon de pain et un gobelet d’eau du puits. L’eau est froide. Elle a un goût de pierre. C’est la meilleure chose que vous ayez bue depuis la ville.'),
      p('Elles sont quatre. Mère Agathe ; Sœur Marthe, qui a quatre-vingts ans et n’entend plus que d’une oreille ; Sœur Clémence, vingt ans à peine, qui vous regarde manger comme on regarde des bêtes rares ; et Sœur Bénédicte, la plus jeune après elle, qui garde son bras bandé contre son ventre et transpire à grosses gouttes sous sa guimpe, alors qu’il ne fait pas chaud.'),
      p('Maëlle a repéré le bras de Bénédicte avant tout le monde. Elle ne dit rien. Elle regarde la sueur, la pâleur, la façon dont la sœur tient son coude. Vous connaissez ce regard : elle compte les jours.', MAELLE_ICI),
      p('Vous avez repéré le bras de Bénédicte avant tout le monde. La sueur, la pâleur, la façon dont elle tient son coude. Vous ne dites rien. Vous comptez les jours, comme vous les avez comptés sur votre propre bras.', all(MAELLE_HEROS, flag('maelle_mordue'))),
      p('Vous avez repéré le bras de Bénédicte avant tout le monde. La sueur, la pâleur, la façon dont elle tient son coude. Vous ne dites rien. Vous comptez les jours, comme à l’hôpital.', all(MAELLE_HEROS, notFlag('maelle_mordue'))),
      say('agathe', '« Un homme seul est passé vers midi », dit Agathe en vous resservant. « Énorme. Du cambouis à moitié lavé sur la figure. Il a bu au puits, il n’a pas voulu entrer, il a dit merci comme si ça lui arrachait la gorge. Il descendait vers l’écluse, lui aussi. »', flag('gaspard_epargne')),
    ],
    onEnter: [heal(6), xp(10)],
    choices: [
      {
        id: 'decoction',
        text: 'Montrer votre morsure à Mère Agathe.',
        kind: 'talk', time: 0.5,
        once: true,
        visibleIf: [infected()],
        next: 'r3_decoction',
      },
      {
        id: 'infirmerie',
        text: 'Aider Sœur Clémence à ranger l’infirmerie.',
        kind: 'explore', time: 0.5,
        once: true,
        effects: [
          give('bandage', 2),
          give('chiffons', 2),
          give('alcool', 1),
          doc('doc_r3_benedicte'),
          rel('agathe', 1),
          journal('Dans l’infirmerie du prieuré, le carnet de soins de Sœur Bénédicte : elle a été mordue en nourrissant les malades de la crypte.', false),
        ],
      },
      {
        id: 'repos',
        text: 'Fermer les yeux une heure, à l’ombre des arcades.',
        kind: 'rest', time: 1,
        once: true,
        effects: [rest(6)],
      },
      { id: 'crypte', text: 'Suivre Mère Agathe sous la chapelle.', kind: 'move', time: 0.5, next: 'r3_crypte' },
    ],
  },
  {
    id: 'r3_decoction',
    chapter: C,
    location: 'prieure',
    title: 'L’écorce de saule',
    kind: 'story',
    text: [
      p('Agathe défait votre pansement sans rien demander, renifle la plaie, appuie deux doigts autour. Elle hoche la tête, comme un médecin qui reconnaît une vieille connaissance.'),
      say('agathe', '« C’est encore jeune. Ça se rattrape. » Elle verse dans un gobelet un liquide brun, épais, amer à faire pleurer : écorce de saule, thym, ail, et autre chose qu’elle ne nomme pas. « Trois gorgées maintenant, le reste ce soir. Nos derniers antibiotiques sont partis cet hiver, avec des gens qui en avaient besoin. Il nous reste les plantes. Elles font ce qu’elles peuvent. Chez vous, ça suffira. »'),
      p('La brûlure sous votre peau recule pendant la demi-heure qui suit. Vous sentez la fièvre se retirer de vos tempes comme une marée.'),
      say('agathe', '« En échange, vous me prêterez vos bras à la crypte. Les seaux sont lourds, et nous ne sommes plus assez nombreuses. »'),
    ],
    onEnter: [SOIGNER, set('r3_decoction'), rel('agathe', 1), journal('Mère Agathe a soigné votre morsure avec une décoction de son jardin.')],
    choices: [{ id: 'retour', text: 'Retourner sous les arcades.', kind: 'move', next: 'r3_cloitre' }],
  },

  // -------------------------------------------------------------------------
  // La crypte
  // -------------------------------------------------------------------------
  {
    id: 'r3_crypte',
    chapter: C,
    location: 'prieure',
    title: 'Ceux qu’on garde',
    kind: 'story',
    illustration: 'prieure',
    text: [
      p('L’escalier descend sous la chapelle, vingt marches usées au milieu par des siècles de pas. En bas, une crypte voûtée, éclairée par trois lampes à huile. L’air sent le savon de Marseille, la paille fraîche et, par-dessous, cette odeur douceâtre qu’aucun savon n’enlève.'),
      p('Ils sont douze. Assis ou debout contre les piliers, chacun au bout d’une chaîne scellée dans la pierre. Lavés. Peignés. Vêtus de chemises propres, trop grandes. Au-dessus de chaque anneau, une ardoise, et sur chaque ardoise, un prénom à la craie : Paul. Josiane. Lucas. Madeleine. Henri. Les autres. Leurs dents claquent doucement dans la pénombre, toutes ensemble, comme des aiguilles à tricoter.'),
      say('agathe', '« Ne les appelez pas des Muets. Ils ne sont pas muets. Ils n’ont plus de mots, c’est tout. Ce n’est pas la même chose. »'),
      p('Les chaînes sont anciennes. Pas des chaînes de quincaillerie : de vieux fers noirs, forgés à la main, dont les anneaux sont pris dans la pierre depuis bien avant la Fièvre. Agathe suit votre regard.'),
      say('agathe', '« Au dix-neuvième siècle, on gardait ici les agités de la vallée. Les familles les amenaient en charrette. Nous avons trouvé les fers dans la sacristie, graissés, rangés dans de la toile. Quelqu’un, un jour, avait pensé qu’ils serviraient encore. »'),
      p('Au fond, contre le dernier pilier, un treizième anneau est vide. Sœur Bénédicte, qui verse de l’eau dans une écuelle, évite de le regarder.'),
      say('nour', '« Treize anneaux », dit Nour à voix basse. « Douze qui servent. » Agathe l’entend. « Le treizième est pour qui en aura besoin. » Bénédicte renverse un peu d’eau.', NOUR_ICI),
      say('kaz', '« Chez nous, on enterrait les morts. C’était plus simple pour tout le monde. » Kaz se tait un moment. Il regarde Madeleine, qui a l’âge qu’aurait Irena. « Si elle était revenue comme ça… je ne sais pas. Je l’aurais peut-être attachée dans la cave, moi aussi. »', KAZ_ICI),
      say('maelle', '« Ça se soigne encore, ton bras », dit Maëlle à Bénédicte, de soignante à soignante. « Avec ce qu’il faut. Pas avec de l’écorce. Pas à ce stade. »', MAELLE_ICI),
      p('Inès ne dit rien. Elle a gardé la main sur la crosse de son arbalète depuis la première marche, et elle compte les maillons qui retiennent le grand homme du premier pilier. Il y en a un qui est rouge de rouille.', INES_ICI),
      p('Vous gardez la main sur la crosse de votre arbalète depuis la première marche. Malik vous a appris à compter ce qui retient les choses : vous comptez les maillons du grand homme du premier pilier. Il y en a un qui est rouge de rouille.', INES_HEROS),
      p('Vous restez longtemps au pied de l’escalier, sans personne à côté de vous, face à douze visages qui ne vous voient pas.', PERSONNE),
    ],
    choices: [
      {
        id: 'registre',
        text: 'Lire le registre posé sur le lutrin, près de l’escalier.',
        kind: 'explore', time: 0.5,
        once: true,
        effects: [doc('doc_r3_registre'), xp(10)],
      },
      {
        id: 'benedicte',
        text: 'Donner vos antibiotiques à Sœur Bénédicte.',
        kind: 'item',
        once: true,
        requires: [has('antibiotiques')],
        warning: 'Vous n’en trouverez peut-être pas d’autres avant l’écluse.',
        effects: [
          take('antibiotiques', 1),
          set('r3_benedicte_soignee'),
          rel('agathe', 2),
          when(MAELLE_ICI, [rel('maelle', 1)]),
          xp(25),
          journal('Vous avez donné vos antibiotiques à Sœur Bénédicte, mordue en soignant les malades de la crypte.'),
        ],
      },
      {
        id: 'dur',
        text: 'Lui dire ce que vous pensez : ce ne sont plus des gens, et un jour, une chaîne cédera.',
        kind: 'talk',
        once: true,
        effects: [rel('agathe', -1), set('r3_dur')],
      },
      {
        id: 'pourquoi',
        text: 'Lui demander pourquoi elle les garde.',
        kind: 'talk', time: 0.5,
        once: true,
        effects: [rel('agathe', 1), set('r3_pourquoi')],
        next: 'r3_pourquoi',
      },
      { id: 'remonter', text: 'Remonter les seaux vides et sortir à l’air.', kind: 'move', next: 'r3_refectoire' },
    ],
  },
  {
    id: 'r3_pourquoi',
    chapter: C,
    location: 'prieure',
    title: 'Paul',
    kind: 'story',
    text: [
      p('Agathe s’approche du premier pilier. L’homme qui y est attaché est immense, voûté, avec des mains comme des pelles et une chemise qui ne ferme plus sur sa poitrine. Il tire sur sa chaîne quand elle arrive, puis s’arrête.'),
      say('agathe', '« Frère Paul. Le jardinier. Il est venu de l’abbaye d’en face il y a trente et un ans pour nous aider à tailler la vigne, et il n’est jamais reparti. Il a été mordu en enterrant le facteur. »'),
      say('agathe', '« Quand il pleut, il tourne la tête vers le soupirail, du côté du potager. Tous les jours de pluie. Ce n’est peut-être rien. Un réflexe, une odeur. Mais tant que je ne sais pas que ce n’est rien, je n’ai pas le droit de l’abattre comme un chien. »'),
      say('agathe', '« Vous me trouvez folle. Je vois bien. Moi, je trouve fou un monde qui a décidé en deux semaines que des gens n’étaient plus des gens. Il a fallu des siècles pour décider le contraire. »'),
    ],
    onEnter: [xp(10)],
    choices: [{ id: 'retour', text: 'Revenir près de l’escalier.', kind: 'move', next: 'r3_crypte' }],
  },

  // -------------------------------------------------------------------------
  // Le réfectoire : la barge, ou le sang de Théo
  // -------------------------------------------------------------------------
  {
    id: 'r3_refectoire',
    chapter: C,
    location: 'prieure',
    title: 'Le réfectoire',
    kind: 'story',
    routes: [{ if: THEO_ICI, to: 'r3_sang' }],
    text: [
      p('Le réfectoire est une longue salle blanchie à la chaux, une table de chêne, un crucifix, une fenêtre sur la vallée. Agathe s’assoit en face de vous et croise ses mains rouges sur la table.'),
      say('agathe', '« La barge est montée il y a deux semaines. Coque blanche, croix rouge, de beaux projecteurs. Ils se sont arrêtés au ponton du bas pour faire de l’eau. Un homme en gris est monté jusqu’ici. Très poli. Il m’a demandé si nous avions des enfants qui ne tombaient pas malades. Il a parlé de prix. »'),
      say('agathe', '« La semaine dernière, une femme est passée dans l’autre sens. Elle avait vendu son fils à la barge pour une couchette. En route, elle s’est aperçue qu’elle n’en voulait pas, de la couchette. Elle est remontée vers Valombre à pied, pour rien. Elle a dormi une nuit ici. Le matin, elle était partie, et elle avait laissé ses chaussures. »'),
      say('moi', '« Leur capitaine appelle ça le protocole Ferrand. Le reste est négociable. »', flag('verite_ferrand')),
      say('agathe', '« Ce matin, un camion est passé sur la route, en bas. Des hommes au visage noirci, des cages sous une bâche. Dans la dernière, un garçon. Il avait passé le doigt dehors, et il dessinait quelque chose sur la bâche, avec la buée. Je n’ai pas vu quoi. » Elle vous regarde. « Vous le connaissez. »', THEO_CAGE),
      p('Vous ne répondez pas. Vous n’en avez pas besoin.', THEO_CAGE),
      p('Vous pensez à Théo, chez les Veilleurs, au milieu des crânes et des clochettes. Pour la première fois, vous n’avez plus aucun doute : vous avez eu raison de le laisser.', flag('theo_veilleurs')),
      p('Nour a tiré sa manche sur son poignet et ne quitte pas Agathe des yeux. Agathe le voit. Elle ne pose aucune question. C’est peut-être pour ça que Nour finit par s’asseoir.', NOUR_ICI),
    ],
    onEnter: [set('r3_barge_racontee')],
    choices: [{ id: 'soir', text: 'Sortir dans la cour. Le jour baisse.', kind: 'move', time: 0.5, next: 'r3_soir' }],
  },
  {
    id: 'r3_sang',
    chapter: C,
    location: 'prieure',
    title: 'Ce qu’elle demande',
    kind: 'story',
    text: [
      p('Au réfectoire, Agathe ne s’assoit pas en face de vous. Elle s’assoit en face de Théo. Elle a posé sur la table une seringue dans un linge bouilli, deux tubes de verre, un garrot de caoutchouc. Elle n’essaie pas de les cacher.'),
      say('agathe', '« Tu as une cicatrice à l’épaule. Je l’ai vue quand tu as retiré ton pull, tout à l’heure. Une morsure ancienne, bien fermée. Tu sais ce que ça veut dire. Moi aussi. »'),
      say('agathe', '« Je voudrais un peu de ton sang. Deux tubes. Je ne sais pas ce que j’en ferai vraiment, je ne suis pas un laboratoire. J’ai un microscope d’école et des livres de l’ancien temps. Je voudrais essayer sur Bénédicte. Et sur Paul. Ça ne marchera probablement pas. Je te le dis parce que c’est vrai. »'),
      say('agathe', '« Personne ne te forcera, ici. Si tu dis non, tu manges ta soupe et tu dors dans un lit, comme si je n’avais rien demandé. »'),
      p('Théo ne vous regarde pas. Il regarde la seringue. Puis Agathe. Il a l’air de quelqu’un qui entend une langue qu’il ne connaît pas et qui la comprend quand même.'),
      say('theo', '« Ils veulent tous mon sang. » Sa voix est très basse. « Vous, vous demandez. »'),
      say('maelle', '« Il a quinze ans. » La voix de Maëlle est sèche comme une gifle. Puis elle se tait, longtemps, les mains à plat sur la table. « … C’est à lui. Pas à moi. Pas à vous. »', MAELLE_ICI),
      p('« Il a quinze ans. » Vous l’entendez dans votre propre voix avant d’avoir décidé de parler, sèche comme une gifle. Puis vous vous taisez, longtemps, les mains à plat sur la table. Vous l’avez porté, soigné, caché. Et ce bras-là n’est pas le vôtre. « C’est à lui. Pas à moi. Pas à vous. »', MAELLE_HEROS),
      say('moi', '« Et si c’était ça, un remède ? Pas sur la barge. Ici, dans une crypte, avec un microscope d’école. »', flag('pense_vaccin')),
      say('moi', '« La barge, elle, achète. Elle ne demande pas. »', flag('verite_ferrand')),
      p('Nour s’est rapprochée de Théo, sur le banc. Elle ne dit rien. Elle attend de voir ce qu’il va faire, comme si sa réponse valait aussi pour elle.', NOUR_ICI),
    ],
    choices: [
      {
        id: 'encourager',
        text: 'Encourager Théo : si ça peut sauver Bénédicte, ça vaut deux tubes.',
        kind: 'talk', time: 0.5,
        effects: [set('r3_pousse')],
        next: 'r3_sang_donne',
      },
      {
        id: 'laisser',
        text: 'Ne rien dire. Lui faire comprendre, d’un regard, que c’est à lui de décider.',
        kind: 'talk', time: 0.5,
        effects: [set('r3_laisse'), rel('theo', 2)],
        next: 'r3_sang_donne',
      },
      {
        id: 'refuser',
        text: 'Répondre à sa place : non. Son sang n’est à personne.',
        kind: 'talk', time: 0.5,
        effects: [set('r3_refuse_pour_lui'), rel('theo', -2), when(MAELLE_ICI, [rel('maelle', 1)])],
        next: 'r3_sang_refuse',
      },
    ],
  },
  {
    id: 'r3_sang_donne',
    chapter: C,
    location: 'prieure',
    title: 'Deux tubes',
    kind: 'story',
    routes: [{ if: all(flag('r3_pousse'), relMax('theo', 2)), to: 'r3_sang_refuse' }],
    text: [
      say('theo', '« D’accord. » Il relève sa manche lui-même. « Mais c’est moi qui tiens les tubes. »', flag('r3_pousse')),
      p('Théo vous regarde, attend une phrase qui ne vient pas. Alors il regarde Bénédicte, de l’autre côté de la fenêtre, qui traverse la cour avec ses seaux en se tenant le coude. Il relève sa manche.', flag('r3_laisse')),
      say('theo', '« Elle a demandé, elle. » Il tend le bras. « Personne m’avait jamais demandé. »', flag('r3_laisse')),
      p('C’est Maëlle qui pose le garrot. Agathe lui tend la seringue sans un mot, d’une infirmière à une autre. Les mains de Maëlle ne tremblent pas. Elles n’ont jamais tremblé. Mais elle garde les yeux sur le visage de son fils pendant tout le temps où le verre se remplit, et pas une seule fois sur l’aiguille.', MAELLE_ICI),
      p('Agathe pose le garrot elle-même. Elle trouve la veine du premier coup, elle explique chaque geste à Théo avant de le faire, et Théo la laisse faire en serrant le poing.', not(MAELLE_ICI)),
      p('Deux tubes. Un sang sombre, ordinaire. On ne dirait pas que le monde entier en veut. Théo les tient un moment dans ses mains, les fait tourner dans la lumière de la fenêtre, puis les donne à Agathe.'),
      say('agathe', '« Merci, Théo. » Elle dit son prénom, pas « mon garçon », pas « mon enfant ». « Si ça ne marche pas, ce ne sera pas ta faute. Si ça marche, ce ne sera pas grâce à moi. »'),
      p('Elle lui donne en échange une trousse de soins complète, la dernière de l’infirmerie. Elle la lui donne à lui, pas à vous.'),
    ],
    onEnter: [
      set('prieure_sang_donne'),
      rel('theo', 1),
      rel('agathe', 3),
      give('trousse', 1),
      xp(30),
      journal('Théo a donné deux tubes de son sang à Mère Agathe. Il a décidé seul.'),
    ],
    choices: [{ id: 'soir', text: 'Sortir dans la cour. Le jour baisse.', kind: 'move', time: 0.5, next: 'r3_soir' }],
  },
  {
    id: 'r3_sang_refuse',
    chapter: C,
    location: 'prieure',
    title: 'Non',
    kind: 'story',
    text: [
      say('theo', '« Toi aussi. » Théo vous regarde comme si vous veniez de le frapper. « Toi aussi, tu veux qu’on me le prenne. Tu dis que c’est pour elle, et c’est toujours pour quelqu’un. » Il repousse le garrot. « Non. »', flag('r3_pousse')),
      say('theo', '« C’est mon sang. » Théo s’est levé. Il tremble. « C’est mon bras, c’est mon sang, et c’est moi qui réponds. Tout le monde décide pour moi. Même toi. » Il sort du réfectoire. Il ne dit pas s’il aurait dit oui.', flag('r3_refuse_pour_lui')),
      p('Maëlle ne le suit pas tout de suite. Elle vous regarde, et dans son regard il y a de la reconnaissance, et autre chose qui ressemble à de la honte.', all(MAELLE_ICI, flag('r3_refuse_pour_lui'))),
      say('agathe', '« Alors c’est non. C’est une réponse, et elle vaut autant qu’un oui. » Agathe range la seringue dans son linge, sans hâte, sans reproche. « Bénédicte n’en saura rien. Je ne lui avais pas dit, pour ne pas lui donner d’espoir. »'),
    ],
    onEnter: [when(flag('r3_pousse'), [rel('theo', -1)]), set('r3_sang_refuse')],
    choices: [{ id: 'soir', text: 'Sortir dans la cour. Le jour baisse.', kind: 'move', time: 0.5, next: 'r3_soir' }],
  },

  // -------------------------------------------------------------------------
  // Le soir : Frère Paul
  // -------------------------------------------------------------------------
  {
    id: 'r3_soir',
    chapter: C,
    location: 'prieure',
    title: 'Les vêpres',
    kind: 'story',
    checkpoint: true,
    text: [
      p('La lumière a tourné. Elle entre maintenant de biais sous les arcades et pose des carrés dorés sur les dalles du cloître. Sœur Marthe sonne les vêpres à la main, trois coups, et les quatre sœurs se rassemblent dans la chapelle. Leurs voix montent, minces, un peu fausses, et sous leurs voix, par la grille du soupirail, le cliquetis des dents ne s’arrête pas.'),
      p('Le barrage de Vaulx est à deux heures de marche, plus bas sur le fleuve. Si vous voulez l’atteindre avant la nuit noire, il faut partir maintenant.'),
      p('Théo dessine le cloître, assis sur la margelle du puits. Il dessine les douze ardoises en dessous, de mémoire, avec les prénoms.', all(THEO_ICI, flag('prieure_sang_donne'))),
      p('Théo est assis seul sur la margelle du puits, dos tourné au réfectoire. Il ne dessine pas.', all(THEO_ICI, flag('r3_sang_refuse'))),
    ],
    choices: [
      {
        id: 'cellier',
        text: 'Passer par le cellier, où Sœur Marthe vous a dit de vous servir.',
        kind: 'explore', time: 0.5,
        once: true,
        effects: [give('ration', 1), give('alcool', 1), give('chiffons', 1), journal('Au cellier du prieuré : du pain de seigle, du fromage de chèvre et une bouteille d’eau-de-vie de la vigne.', false)],
      },
      { id: 'partir', text: 'Rassembler vos affaires et traverser la cour vers la porte.', kind: 'move', time: 0.5, next: 'r3_paul' },
    ],
  },
  {
    id: 'r3_paul',
    chapter: C,
    location: 'prieure',
    title: 'La chaîne',
    kind: 'story',
    timed: { seconds: 12, fallback: 'tuer' },
    text: [
      p('Vous êtes au milieu de la cour quand le chant s’arrête net. Un bruit de fer qui éclate, sous la terre. Un cri de femme. Puis des pas lourds dans l’escalier de la crypte, et le cliquetis qui monte, qui monte.'),
      p('Frère Paul jaillit dans la lumière du soir. Deux mètres de chaîne pendent encore à son poignet, avec un morceau d’anneau rouillé au bout. Sœur Clémence est tombée sur les marches derrière lui ; elle se tient la jambe, et il se retourne vers elle en claquant des dents.'),
      say('agathe', '« Ne le tuez pas ! » Agathe sort de la chapelle en courant, sa robe relevée à deux mains. « Paul ! Paul, c’est moi ! »'),
      p('La chaîne traîne sur les dalles. Le maillon rouge, celui qu’Inès avait compté. Inès a déjà épaulé.', INES_ICI),
      p('La chaîne traîne sur les dalles. Le maillon rouge, celui que vous aviez compté. Vous avez déjà épaulé.', INES_HEROS),
      p('La cloche du Berger, dans votre sac, tinte une fois sous le chiffon quand vous vous retournez.', has('cloche_berger')),
    ],
    choices: [
      {
        id: 'cloche',
        text: 'Défaire le chiffon et faire tinter la cloche du Berger, doucement, en reculant vers la crypte.',
        kind: 'item',
        requires: [has('cloche_berger')],
        effects: [set('r3_cloche'), xp(20)],
        next: 'r3_paul_grille',
      },
      {
        id: 'ines',
        text: 'Crier à Inès de viser la chaîne, pas la tête.',
        kind: 'fight',
        visibleIf: [INES_ICI],
        effects: [set('r3_ines_tir'), rel('ines', 1)],
        next: 'r3_paul_grille',
      },
      {
        id: 'ines_heros',
        text: '[Vous, Inès] Viser la chaîne, pas la tête.',
        kind: 'fight',
        visibleIf: [INES_HEROS],
        requires: [has('arbalete')],
        effects: [set('r3_ines_tir'), xp(15)],
        next: 'r3_paul_grille',
      },
      {
        id: 'kaz',
        text: 'Attraper la chaîne à deux avec Kaz et le tirer en arrière.',
        kind: 'fight',
        visibleIf: [KAZ_ICI],
        effects: [set('r3_kaz_chaine'), rel('kaz', 1), hurt(1, 'la chaîne de Frère Paul')],
        next: 'r3_paul_grille',
      },
      {
        id: 'kaz_heros',
        text: '[Vous, Kaz] Empoigner la chaîne et haler, comme une amarre de péniche.',
        kind: 'fight',
        visibleIf: [KAZ_HEROS],
        effects: [set('r3_kaz_chaine'), hurt(1, 'la chaîne de Frère Paul')],
        next: 'r3_paul_grille',
      },
      {
        id: 'pompier',
        text: '[Ancien pompier] Lui jeter le linge mouillé de la corde sur la tête, et le guider à l’aveugle vers l’escalier.',
        kind: 'stealth',
        requires: [background('pompier')],
        effects: [set('r3_drap'), xp(15)],
        next: 'r3_paul_grille',
      },
      {
        id: 'repousser',
        text: 'Saisir la chaîne et le repousser vous-même dans l’escalier.',
        kind: 'fight',
        check: { stat: 'force', difficulty: 8, success: 'r3_paul_grille', failure: 'r3_paul_combat', successEffects: [set('r3_force')] },
      },
      {
        id: 'tuer',
        text: 'Le frapper avant qu’il atteigne Clémence.',
        kind: 'fight',
        next: 'r3_paul_combat',
      },
    ],
  },
  {
    id: 'r3_paul_combat',
    chapter: C,
    location: 'prieure',
    title: 'Frère Paul',
    kind: 'combat',
    text: [p('Il vous voit. Il lâche Clémence et vient vers vous, avec deux mètres de fer qui battent contre ses jambes. Derrière lui, Agathe crie son nom.')],
    encounter: {
      enemies: ['rodeur'],
      canFlee: false,
      victory: 'r3_paul_mort',
      defeat: 'r3_paul_defaite',
      intro: 'Frère Paul, le jardinier. Il est immense, et il ne sent plus les coups.',
    },
    choices: [],
  },
  {
    id: 'r3_paul_mort',
    chapter: C,
    location: 'prieure',
    title: 'Le jardinier',
    kind: 'story',
    text: [
      p('Frère Paul tombe sur les dalles du cloître, tout son long, la tête du côté du potager. Le cliquetis s’arrête. Dans la crypte, en dessous, les onze autres se taisent aussi, tous en même temps, et ce silence-là est pire que le bruit.'),
      p('Agathe s’agenouille près de lui. Elle ne pleure pas. Elle lui ferme les yeux, ce qui ne sert à rien, et elle remet de l’ordre dans sa chemise. Puis elle dit son prénom, une fois, comme on le dit à quelqu’un qui part en voyage.'),
      say('agathe', '« Clémence est vivante. Je sais. Je sais ce que vous allez me dire. » Elle ne vous regarde pas. « Je vous remercie pour elle. Je ne vous pardonne pas pour lui. Les deux sont vrais. Laissez-moi, maintenant. »'),
      say('kaz', '« Il fallait le faire », dit Kaz, très bas, seulement pour vous. « Ça n’empêche pas que c’est moche. »', KAZ_ICI),
    ],
    onEnter: [set('r3_paul_tue'), rel('agathe', -3), journal('Vous avez tué Frère Paul, le jardinier du prieuré. Mère Agathe ne vous l’a pas pardonné.')],
    choices: [{ id: 'apres', text: 'Laisser Agathe avec lui.', kind: 'move', next: 'r3_apres' }],
  },
  {
    id: 'r3_paul_defaite',
    chapter: C,
    location: 'prieure',
    title: 'Le prénom',
    kind: 'story',
    text: [
      p('Il vous jette au sol comme un sac de grain. Sa chaîne vous fouette l’épaule, ses dents passent à un doigt de votre gorge, et puis quelqu’un tire sur le fer de toutes ses forces, et il recule d’un pas.'),
      p('C’est Agathe. Elle a enroulé la chaîne autour de ses avant-bras, elle s’arc-boute sur les dalles, et elle parle. Elle ne crie pas. Elle lui parle comme on parle à un vieux cheval effrayé : « Paul. Les poireaux, Paul. Il va pleuvoir cette nuit. Viens. Viens voir la pluie. »'),
      p('Ça ne veut rien dire. Ça ne peut rien vouloir dire. Mais il recule, pas à pas, vers l’escalier, et les sœurs referment la grille sur lui pendant que vous reprenez votre souffle sur la pierre.'),
    ],
    onEnter: [hurt(3, 'les poings de Frère Paul'), set('r3_paul_sauve'), rel('agathe', 1), journal('Mère Agathe a ramené Frère Paul dans la crypte à mains nues, en lui parlant.')],
    choices: [{ id: 'apres', text: 'Se relever.', kind: 'move', next: 'r3_apres' }],
  },
  {
    id: 'r3_paul_grille',
    chapter: C,
    location: 'prieure',
    title: 'La grille',
    kind: 'story',
    text: [
      p('Vous défaites le chiffon. La cloche tinte, claire, au milieu de la cour. Frère Paul s’arrête. Sa tête se tourne vers le son, lentement, comme une girouette, et quand vous reculez vers l’escalier en sonnant à petits coups, il vous suit. Marche après marche. Jusqu’à son pilier. Agathe vous regarde faire avec une expression que vous ne lui avez pas encore vue : de la peur, mais pas pour elle.', flag('r3_cloche')),
      p('Le carreau d’Inès traverse le maillon rouillé et va se planter dans la porte de chêne de la crypte, à travers la chaîne. Paul est cloué sur place, à un mètre de Clémence. Il tire, il tire, et le bois tient. Inès recharge sans le quitter des yeux. Elle ne tirera pas une deuxième fois. Pas à la tête.', all(flag('r3_ines_tir'), INES_ICI)),
      p('Votre carreau traverse le maillon rouillé et va se planter dans la porte de chêne de la crypte, à travers la chaîne. Paul est cloué sur place, à un mètre de Clémence. Il tire, il tire, et le bois tient. Vous rechargez sans le quitter des yeux. Vous ne tirerez pas une deuxième fois. Pas à la tête.', all(flag('r3_ines_tir'), INES_HEROS)),
      p('Kaz attrape la chaîne à pleines mains, vous juste derrière lui, et vous tirez ensemble comme on hale une péniche. Le fer vous scie les paumes. Paul recule, d’un pas, de deux, jusqu’en haut de l’escalier, et Kaz le pousse dedans d’un coup d’épaule, sans méchanceté. « Allez, vieux. Au lit. »', all(flag('r3_kaz_chaine'), KAZ_ICI)),
      p('Vous attrapez la chaîne à pleines mains et vous tirez comme on hale une péniche. Le fer vous scie les paumes. Paul recule, d’un pas, de deux, jusqu’en haut de l’escalier, et vous le poussez dedans d’un coup d’épaule, sans méchanceté. « Allez, vieux. Au lit. »', all(flag('r3_kaz_chaine'), KAZ_HEROS)),
      p('Vous arrachez le drap de la corde à linge, vous le trempez dans le seau du puits, et vous le lui lancez sur la tête. Aveugle, il ralentit, tourne sur lui-même. Vous le guidez par la chaîne, au son de votre voix, jusqu’à la première marche, comme on sort quelqu’un d’un immeuble en feu.', flag('r3_drap')),
      p('Vous saisissez la chaîne à deux mains et vous tirez. Il est lourd, il est fort, mais il ne sait plus se servir de ses jambes. Vous le ramenez en arrière, marche par marche, jusqu’à la crypte, en sentant ses dents claquer à vingt centimètres de vos doigts.', flag('r3_force')),
      p('Les sœurs referment la grille. Agathe passe une chaîne neuve dans l’anneau de Paul, avec un cadenas de vélo, et elle reste un moment la main posée sur son épaule. Il regarde le soupirail. Dehors, il commence à pleuvoir.'),
      p('« Merci », dit Agathe. Elle le dit à vous, puis à chacun des autres, un par un, en les regardant dans les yeux.', not(PERSONNE)),
      p('« Merci », dit Agathe, en vous regardant longtemps dans les yeux.', PERSONNE),
      say('agathe', '« Vous ne savez pas ce que vous venez de garder. Moi non plus. Mais vous l’avez gardé. »'),
    ],
    onEnter: [set('r3_paul_sauve'), rel('agathe', 2), xp(25), journal('Vous avez ramené Frère Paul dans la crypte sans le tuer.')],
    choices: [{ id: 'apres', text: 'Remonter dans la cour.', kind: 'move', next: 'r3_apres' }],
  },

  // -------------------------------------------------------------------------
  // Le départ
  // -------------------------------------------------------------------------
  {
    id: 'r3_apres',
    chapter: C,
    location: 'prieure',
    title: 'La porte cochère',
    kind: 'story',
    text: [
      p('La pluie fine tombe sur le cloître. Clémence boite jusqu’à la porte, la jambe bandée par Sœur Marthe. Rien de cassé, seulement une grande peur. Elle vous tend un paquet de pain enveloppé dans un torchon.'),
      p('Agathe n’est pas venue à la porte. Elle est restée en bas, dans la crypte, près du pilier vide. C’est Clémence qui vous dit au revoir pour elle.', flag('r3_paul_tue')),
      p('Agathe vous raccompagne jusqu’à la porte cochère, un châle de laine sur la tête.', notFlag('r3_paul_tue')),
      p('Sœur Bénédicte est dans la cour, sous l’arcade. La fièvre a déjà reculé ; elle a les joues moins grises, et elle vous fait un signe de la main, son bras valide levé très haut, comme une enfant sur un quai.', flag('r3_benedicte_soignee')),
      p('Sœur Bénédicte n’est pas dans la cour. Par le soupirail de la crypte, vous l’apercevez, assise par terre contre le dernier pilier, à côté du treizième anneau. Elle ne s’est pas encore attachée. Elle attend, les mains sur les genoux, pour être prête.', notFlag('r3_benedicte_soignee')),
      say('agathe', '« Si un jour vous revenez par ici, la porte s’ouvrira. Pour vous, et pour ceux que vous amènerez. Même mordus. Surtout mordus. »', notFlag('r3_paul_tue')),
    ],
    onEnter: [give('ration', 1)],
    choices: [
      {
        id: 'promettre',
        text: 'Promettre de revenir, après l’écluse. Quoi qu’il arrive là-bas.',
        kind: 'talk',
        effects: [
          set('prieure_refuge'),
          rel('agathe', 1),
          journal('Vous avez promis à Mère Agathe de revenir au prieuré de Saint-Aubin, après l’écluse.'),
        ],
        next: 'r3_fin',
      },
      {
        id: 'nour',
        text: 'Proposer à Nour de rester ici, avec les sœurs, jusqu’à votre retour.',
        kind: 'sacrifice',
        visibleIf: [NOUR_ICI],
        requires: [notFlag('r3_paul_tue'), relMin('nour', 3)],
        warning: 'Nour ne vous accompagnera pas jusqu’à l’écluse.',
        effects: [
          companion('nour', 'away'),
          set('r3_nour_prieure'),
          set('prieure_refuge'),
          rel('nour', 1),
          journal('Nour est restée au prieuré de Saint-Aubin. Vous lui avez promis de revenir la chercher.'),
        ],
        next: 'r3_fin',
      },
      { id: 'partir', text: 'Partir sans rien promettre. Vous ne savez pas ce qu’il restera de vous à l’écluse.', kind: 'move', next: 'r3_fin' },
    ],
  },
  {
    id: 'r3_fin',
    chapter: C,
    location: 'prieure',
    title: 'Fin du chapitre 7',
    kind: 'chapterEnd',
    text: [
      p('Vous redescendez la colline par les rangs de vigne, sous la pluie fine. En bas, la route rejoint le fleuve, et loin en aval, dans le gris du crépuscule, une ligne droite barre la vallée d’une rive à l’autre : le barrage de Vaulx. Pas une lumière dessus.'),
      p('Derrière vous, la cloche des complies sonne. Trois coups, puis une volée courte. Vous ne vous retournez pas, mais vous les comptez.', notFlag('r3_paul_tue')),
      p('Derrière vous, le prieuré ne sonne pas les complies. Il n’y a que la pluie, et quelque part sous la chapelle, onze rangées de dents.', flag('r3_paul_tue')),
      p('Avant le tournant, vous vous retournez quand même. Nour est sur le mur, à côté de Sœur Clémence. Elle ne fait pas de signe. Elle compte les pas qui vous séparent du tournant, pour savoir combien il en faudra au retour. Vous le savez sans avoir besoin de le voir.', flag('r3_nour_prieure')),
      p('Théo marche à côté de vous, la manche encore roulée sur le coton du pansement. Il ne dit rien. Mais il marche à côté de vous.', all(THEO_ICI, flag('prieure_sang_donne'))),
      p('Théo marche devant, seul, à dix pas. Il n’a pas envie de vous entendre. Vous le laissez.', all(THEO_ICI, flag('r3_sang_refuse'))),
      p('Quelque part en aval, sur cette même route, un camion roule vers l’écluse avec un garçon dans une cage. Le barrage est sur le chemin. Le camion aussi.', THEO_CAGE),
      p('Il reste {reste} avant l’aube du septième.'),
    ],
    onEnter: [meal(), diary('r3')],
    choices: [{ id: 'suite', text: 'Chapitre 8 : Le Barrage', kind: 'move', time: 1, next: 'r4_couronnement' }],
  },
];

export const DOCUMENTS_R3: DocumentDef[] = [
  {
    id: 'doc_r3_registre',
    title: 'Registre des pensionnaires',
    source: 'Cahier d’écolier posé sur un lutrin, crypte du prieuré de Saint-Aubin',
    body:
      'Pensionnaires de la crypte. Tenu par Mère Agathe. À relire chaque soir.\n\n' +
      'Paul (frère convers, jardinier). Mordu le 3 novembre en enterrant M. Grosjean, le facteur. Premier pilier. Tourne la tête vers le soupirail quand il pleut. Ne pas oublier de lui couper les ongles.\n\n' +
      'Josiane Ferrié, boulangère de Saint-Aubin. Amenée par son mari, qui n’est pas revenu la voir. Mange mieux le matin.\n\n' +
      'Lucas, seize ans environ. Nom de famille inconnu. Trouvé dans la vigne. Avait une carte de bus de Valombre dans sa poche. Très calme. Le plus calme de tous.\n\n' +
      'Madeleine et Henri Vasseur-Petit, mariés. Les mettre l’un à côté de l’autre. Henri tire sur sa chaîne quand on éloigne Madeleine. (Est-ce que ça veut dire quelque chose ? Je ne le note pas pour me consoler. Je le note parce que je l’ai vu.)\n\n' +
      'Sept autres, sans nom. Je leur en ai donné un. Que Dieu et leurs mères me le pardonnent si je me suis trompée.\n\n' +
      'Treizième anneau : libre.\n\n' +
      'Dernière note : Bénédicte s’est fait mordre en donnant à boire à Lucas. Ce n’est pas la faute de Lucas.',
  },
  {
    id: 'doc_r3_benedicte',
    title: 'Carnet de soins de Sœur Bénédicte',
    source: 'Carnet à spirale, infirmerie du prieuré de Saint-Aubin',
    body:
      'Lundi. Morsure à l’avant-bras gauche, Lucas, en lui donnant à boire. Superficielle. Lavée à l’eau-de-vie, pansée. Je n’ai rien dit à Mère Agathe avant vêpres. Elle l’a su quand même.\n\n' +
      'Mardi. Rougeur jusqu’au poignet. Décoction de saule matin et soir. Pas de fièvre.\n\n' +
      'Mercredi. La ligne rouge passe le coude. 38,6. Mère Agathe dit que l’écorce ne suffira plus. Nous n’avons plus d’antibiotiques depuis janvier : la dernière boîte est partie avec la famille du camping-car, pour le petit qui avait la jambe ouverte. Je ne regrette pas. Je le note pour qu’on sache que je ne regrette pas.\n\n' +
      'Jeudi. 39,1. J’ai demandé à Clémence de graisser le treizième anneau. Elle a pleuré. Je lui ai dit que c’était un service à me rendre, et que les services, ici, on ne les refuse pas.',
  },
];

export const DIARY_R3: DiaryRule[] = [
  { chapter: C, text: 'J’écris sous un pont, au pied de la colline. Mes mains sentent encore le savon des sœurs.' },
  { chapter: C, text: 'Douze ardoises, douze prénoms à la craie. Je n’arrive pas à décider si Mère Agathe est la dernière personne sensée du monde, ou la première à être devenue folle.' },
  { chapter: C, if: flag('prieure_sang_donne'), text: 'Théo a donné deux tubes de son sang. On lui a demandé, et il a dit oui. C’est la première fois depuis la Fièvre que quelqu’un lui demande quelque chose au lieu de le prendre.' },
  { chapter: C, if: flag('r3_sang_refuse'), text: 'Théo a dit non, ou c’est moi qui l’ai dit pour lui. Je ne sais plus très bien lequel des deux il me reproche.' },
  { chapter: C, if: flag('r3_paul_tue'), text: 'J’ai tué Frère Paul, le jardinier. Clémence est vivante. Agathe m’a dit merci et ne m’a pas pardonné, et elle avait raison deux fois.' },
  { chapter: C, if: flag('r3_paul_sauve'), text: 'Frère Paul est retourné à son pilier. Il pleuvait quand la grille s’est refermée, et il regardait le soupirail.' },
  { chapter: C, if: flag('r3_benedicte_soignee'), text: 'Mes derniers antibiotiques sont dans le sang de Sœur Bénédicte. Je n’en aurai peut-être plus. Elle m’a fait signe depuis l’arcade, et ça valait la boîte.' },
  { chapter: C, if: all(notFlag('r3_benedicte_soignee'), any(flag('r3_paul_tue'), flag('r3_paul_sauve'))), text: 'Bénédicte attendait près du treizième anneau quand j’ai quitté le prieuré. Je n’avais rien à lui donner.' },
  { chapter: C, if: flag('r3_nour_prieure'), text: 'Nour est restée là-haut. Elle a compté mes pas jusqu’au tournant. Il faudra que je les refasse dans l’autre sens.' },
  { chapter: C, if: all(flag('prieure_refuge'), notFlag('r3_nour_prieure')), text: 'J’ai promis de revenir. Je ne sais pas encore si c’est une promesse ou une prière.' },
];
