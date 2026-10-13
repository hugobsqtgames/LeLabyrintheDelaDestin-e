/**
 * Journal intime : à la fin de chaque chapitre, le protagoniste écrit une page.
 * Les phrases retenues dépendent de ce qui a réellement été vécu.
 */
import type { DiaryRule } from '../engine/types';
import { all, companionIs, flag, not, notFlag, quest, withUs } from './helpers';

export const DIARY_RULES: DiaryRule[] = [
  // --- Chapitre 1 ---------------------------------------------------------
  { chapter: 'c1', text: 'J’écris à la lampe, dans une cave qui sent la bière tournée. La pharmacie a brûlé cette nuit.' },
  { chapter: 'c1', if: flag('theo_soigne'), text: 'Théo a gardé les cachets. Sa fièvre est tombée vers quatre heures, et Maëlle a pleuré sans bruit, le dos tourné.' },
  { chapter: 'c1', if: flag('theo_malade'), text: 'Théo brûle encore. Je l’entends respirer trop vite sous sa couverture, et je sais que c’est un peu ma faute.' },
  { chapter: 'c1', if: flag('menti_antibio'), text: 'J’ai menti à Maëlle. Les cachets sont dans mon sang, pas dans celui de son fils. Je ne sais pas encore si je m’en veux.' },
  { chapter: 'c1', if: all(flag('kaz_accueilli'), notFlag('kaz_refuse')), text: 'Kaz ronfle contre un fût. J’ai ouvert la porte à un inconnu, et c’est peut-être la meilleure chose que j’aie faite depuis des mois.' },
  { chapter: 'c1', if: flag('kaz_refuse'), text: 'Je repense au visage de Kaz derrière la grille. « Je m’en souviendrai. » Moi aussi.' },
  { chapter: 'c1', if: flag('odilon_aide'), text: 'Les cloches ont sonné plus fort ce soir. Quelque part en haut d’un clocher, un vieil homme a mangé grâce à nous, et il nous l’a rendu.' },
  { chapter: 'c1', if: flag('odilon_vole'), text: 'Les cloches ne sonnaient pas. Je sais pourquoi.' },
  { chapter: 'c1', if: flag('maelle_mordue'), text: 'Maëlle cache son bras. Je l’ai vue serrer le bandage. Elle croit que je n’ai rien remarqué.' },
  { chapter: 'c1', if: flag('lettre_volee'), text: 'La lettre est dans ma poche. Je ne l’ai pas encore ouverte. Je n’ose pas.' },
  { chapter: 'c1', if: flag('question_cicatrice'), text: '« Cache la cicatrice, ils vont m’emmener. » Je n’arrive pas à me sortir cette phrase de la tête.' },
  { chapter: 'c1', text: 'Demain, on descend sous la ville. Il paraît qu’on appelle ça le Labyrinthe.' },

  // --- Chapitre 2 ---------------------------------------------------------
  { chapter: 'c2', text: 'Trois jours sans voir le ciel. On finit par parler à voix basse même dans ses pensées.' },
  { chapter: 'c2', if: quest('q_malik', 'completed'), text: 'Inès a refermé le carnet de son frère et ne l’a plus lâché. Elle marche devant, comme avant. Mais plus lentement.' },
  { chapter: 'c2', if: companionIs('maelle', 'dead'), text: 'Maëlle est partie dans le noir avec sa lampe. J’ai regardé la lumière jusqu’à ce qu’elle s’éteigne. Théo aussi.' },
  { chapter: 'c2', if: flag('maelle_soignee'), text: 'La ligne rouge sur le bras de Maëlle a reculé jusqu’au poignet. Elle m’a dit merci comme on rend une dette.' },
  { chapter: 'c2', if: flag('theo_verite'), text: 'Théo est porteur. Mordu, jamais transformé. Tout le monde veut ce qu’il a dans les veines. Personne ne lui a demandé ce qu’il voulait, lui.' },
  { chapter: 'c2', if: flag('veilleurs_allies'), text: 'Les Veilleurs ont de l’eau claire, maintenant. Quarante personnes, six enfants qui récitent leurs tables. C’est la chose la plus normale que j’aie vue depuis la Fièvre.' },
  { chapter: 'c2', if: flag('berger_tue'), text: 'La cloche du Berger est dans mon sac. Elle tinte quand je marche. Je l’ai entourée d’un chiffon.' },
  { chapter: 'c2', if: flag('berger_evite'), text: 'Nous sommes passés à trois mètres du troupeau sans qu’il le sache. Je n’ai jamais eu aussi peur d’un pas de travers.' },
  { chapter: 'c2', if: flag('theo_veilleurs'), text: 'J’ai laissé Théo aux Veilleurs. C’est la bonne décision. Je me le répète depuis la berge.' },
  { chapter: 'c2', if: flag('pense_vaccin'), text: 'Et si son sang pouvait vraiment sauver tout le monde ? La question ne me lâche pas.' },

  // --- Chapitre 3 ---------------------------------------------------------
  { chapter: 'c3', text: 'Le port sent le gasoil et la rouille. De l’autre côté du pont, il n’y a plus que des champs et le fleuve.' },
  { chapter: 'c3', if: flag('verite_ferrand'), text: 'J’ai la voix du capitaine Rousset sur une cassette. « Le reste est négociable. » Le reste, c’est nous.' },
  { chapter: 'c3', if: flag('kaz_traitre'), text: 'Kaz a vendu Théo pendant que je dormais.' },
  { chapter: 'c3', if: flag('kaz_rachete'), text: 'Il a essayé de le reprendre, après. Gaspard l’a fait battre. Je lui ai tendu la main. Je ne sais pas si j’ai eu raison.' },
  { chapter: 'c3', if: flag('kaz_pardonne'), text: 'Kaz m’a tout avoué : la dette, le calcul, la honte. Il aurait pu se taire. Il ne l’a pas fait.' },
  { chapter: 'c3', if: flag('prisonniers_liberes'), text: 'Les cages de la casse sont vides. Une petite fille, Nour, m’a regardé comme si j’étais quelqu’un de bien.' },
  { chapter: 'c3', if: flag('gaspard_tue'), text: 'J’ai tué Gaspard Lenoir à genoux. C’est comme ça que ça marche, maintenant. Il l’a dit lui-même.' },
  { chapter: 'c3', if: flag('gaspard_epargne'), text: 'Gaspard est vivant. Sans royaume, sans chiens. C’est peut-être pire pour lui.' },
  { chapter: 'c3', if: flag('theo_vendu'), text: 'J’ai vendu Théo. J’écris la phrase pour voir si elle devient plus facile à lire. Non.' },
  { chapter: 'c3', if: flag('theo_abandonne'), text: 'Théo est resté dans une cage. Je suis de l’autre côté du pont.' },
  { chapter: 'c3', if: all(withUs('theo'), not(flag('theo_veilleurs'))), text: 'Théo dessine le fleuve sur une page arrachée. Il dit qu’il veut voir la mer. Il ne l’a jamais vue.' },
  { chapter: 'c3', text: 'Demain, l’écluse.' },
];
