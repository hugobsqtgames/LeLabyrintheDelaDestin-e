/**
 * Archives : documents trouvés au fil de l'aventure. Ils enrichissent
 * l'univers et, pour certains, servent de preuves.
 */
import type { DocumentDef } from '../engine/types';

const list: DocumentDef[] = [
  {
    id: 'doc_radio',
    title: 'Message de la Destinée',
    source: 'Noté au crayon sur le toit de la pharmacie, jour 1',
    body:
      '« Ici la Destinée, barge médicale de l’Institut Ferrand. Nous embarquerons des survivants à l’écluse de Morvan, à l’aube du septième jour à compter de ce message. Je répète : écluse de Morvan, aube du septième jour. »\n\nFréquence 147,3. Voix de femme, calme, fatiguée. Pas d’indicatif militaire.',
  },
  {
    id: 'doc_carte_theo',
    title: 'La carte de Théo',
    source: 'Feutre noir sur le mur de la réserve',
    body:
      'Tout le quartier des Tanneurs, rue par rue, toit par toit. Croix rouges : nids de Muets (les halles, le parking de l’hôpital, la laverie). Étoiles : caches (le clocher, la brasserie Mauduit). En bas à droite, d’une écriture appliquée : « Valombre — relevé n° 4. Ne pas passer par le marché. »',
  },
  {
    id: 'doc_affiche',
    title: 'Avis d’évacuation',
    source: 'Affiche de la préfecture, abribus de la rue des Tanneurs',
    body:
      'PRÉFECTURE DE LA LISIÈRE — AVIS À LA POPULATION\n\nSuite à l’extension de l’épidémie dite « Grande Fièvre », l’évacuation du quartier des Tanneurs est organisée le 14 à partir de 8 h. Points de rassemblement : parvis de l’hôpital Delorme, gymnase Jean-Jaurès.\n\nLes personnes présentant fièvre, morsure ou griffure doivent se signaler. Elles seront prises en charge séparément.\n\nQuelqu’un a écrit au marqueur, en travers : « ILS ONT FERMÉ LES PORTES DU GYMNASE AVEC NOUS DEDANS ».',
  },
  {
    id: 'doc_casier',
    title: 'Le mot du casier',
    source: 'Réserve du supermarché Prixdoux',
    body:
      'Une photo d’école, coins cornés : une petite fille aux dents de devant manquantes. Au dos, au feutre violet : « Papa revient ce soir. Je t’ai gardé la place sur le canapé. Lila, 7 ans et demi. »',
  },
  {
    id: 'doc_varenne',
    title: 'Agenda du Dr Varenne',
    source: 'Comptoir de la clinique vétérinaire des Saules',
    body:
      'Mardi — Trois chiens amenés pour morsure humaine. Comportement normal. Les propriétaires, eux, ont de la fièvre.\nMercredi — Les chiens sentent les malades avant nous. Ils hurlent quand quelqu’un d’infecté passe devant la vitrine. Je les ai tous gardés. Meilleure alarme de la ville.\nJeudi — Plus de propriétaires. Plus de croquettes. Je reste.\nVendredi — (page arrachée)',
  },
  {
    id: 'doc_ferrand',
    title: 'Circulaire Ferrand n° 12',
    source: 'Bureau du pharmacien, hôpital Delorme',
    body:
      'INSTITUT FERRAND — CONFIDENTIEL\nObjet : identification et transfert prioritaire des porteurs asymptomatiques.\n\n1. Tout patient exposé (morsure confirmée) ne développant aucun symptôme sous 72 heures est classé « porteur ».\n2. Les porteurs constituent la ressource stratégique du programme vaccinal. Leur transfert vers l’île Ferrand est prioritaire sur toute autre évacuation.\n3. Le consentement du porteur est recherché. Il n’est pas requis.\n\nSigné : Dr P. Ferrand, directeur scientifique.',
  },
  {
    id: 'doc_lettre',
    title: 'Lettre à Maëlle Ternier',
    source: 'Enveloppe kraft tombée du sac de Maëlle',
    body:
      'Madame,\n\nVotre fils présente le profil recherché. Les éléments que vous nous avez transmis (morsure datée, absence totale de symptômes, sérologie artisanale) sont cohérents avec notre définition de porteur.\n\nPrésentez-vous à la Destinée. Il sera pris en charge. Vous pourrez l’accompagner jusqu’à l’île.\n\nNous comprenons votre hésitation. Comprenez la nôtre : il y a peut-être, dans le sang de votre enfant, la fin de tout cela.\n\nDr Anaïs Sorel, pour l’Institut Ferrand.',
  },
  {
    id: 'doc_craie',
    title: 'Les murs de la Galerie des Craies',
    source: 'Relevé des inscriptions, Carrières',
    body:
      '« ILS N’ENTENDENT PAS LA CRAIE » (répété partout, de mains différentes)\n« Famille Ndiaye — passés le 3 — tout le monde vivant »\n« Si tu lis ça, Paul, je suis à l’ossuaire. Viens. »\n« Ne buvez pas l’eau du puits »\n« M → » (une flèche, avec un M dans la pointe)\n« 1786 — Ici finit la carrière du Roi » (gravé, très ancien)',
  },
  {
    id: 'doc_malik',
    title: 'Carnet de Malik Bakari',
    source: 'Pierre plate, galerie secondaire',
    body:
      'Relevé 11. L’aqueduc romain longe la Grande Salle sur 300 mètres côté est. Entrée derrière l’autel des carriers. Passage sec. Silence absolu nécessaire : la paroi est fine.\n\nDernière page, écriture tremblée : « Ferrand paie. Un passage sur la Destinée pour chaque porteur livré. Les Ferrailleurs chassent les enfants qui ne tombent pas malades. Je l’ai vu au port. Il faut prévenir les Veilleurs. Inès, si c’est toi qui trouves ça : ne viens pas me chercher. »',
  },
  {
    id: 'doc_registre',
    title: 'Registre des Veilleurs',
    source: 'Table d’Hélène Vasseur, ossuaire Saint-Roch',
    body:
      'Entrées : 61. Naissances : 2. Décès : 14. Exils : 5.\n\nRègle 1 — On ne parle pas au-dessus du murmure.\nRègle 2 — Pas de fièvre, pas de morsure. Sans exception.\nRègle 3 — Celui qui sonne la cloche du nord ne mange qu’après les enfants.\nRègle 4 — On n’abandonne personne qui respecte les règles.\n\nEn marge, d’une autre main : « Exil n° 5 : ma sœur. Elle respectait les règles. H. V. »',
  },
  {
    id: 'doc_cazal',
    title: 'L’ardoise de Mère Cazal',
    source: 'Péniche La Mouette',
    body:
      'COURS DU JOUR\n1 ration = 6 carreaux = 3 cartouches\n1 boîte d’antibio = 3 rations (pas de crédit)\n1 nouvelle fraîche = 1 nouvelle fraîche\n\nEn dessous, effacé à moitié : « Gaspard paie double pour les gosses qui ne tombent pas malades. Moi je n’achète pas d’enfants. Je préviens, c’est tout. »',
  },
  {
    id: 'doc_bon',
    title: 'Bon de livraison',
    source: 'Cabine de la grue, port fluvial',
    body:
      'FERRAILLES LENOIR — LIVRAISON ÉCLUSE DE MORVAN\nDate : aube du 7.\nMarchandise : 3 (trois) unités P. confirmées + 1 à confirmer.\nContrepartie : 8 places pont inférieur, 20 L de gasoil, 1 caisse munitions.\nRéceptionnaire : cne Rousset.\n\n« Unités P. ». Il a fallu une seconde pour comprendre que P voulait dire porteur.',
  },
  {
    id: 'doc_rousset',
    title: 'Transcription radio',
    source: 'Capitainerie, canal interne de la Destinée',
    body:
      'ROUSSET : … les Ferrailleurs livrent trois porteurs à l’aube du septième. Paiement habituel : huit places sur le pont inférieur. Le reste du contingent sera trié à la grille.\nSOREL : Capitaine, nous avions dit volontaires. Les porteurs sont des patients, pas des marchandises. Ces gens-là les mettent en cage.\nROUSSET : Docteure, nous avons quatre-vingts couchettes et un continent à sauver. Le protocole prévoit les porteurs. Le reste est négociable. Terminé.',
  },
  {
    id: 'doc_protocole',
    title: 'Protocole d’embarquement',
    source: 'Panneau plastifié sur la grille de l’écluse',
    body:
      'INSTITUT FERRAND — PROTOCOLE D’EMBARQUEMENT\n\nPriorité 1 : porteurs confirmés (test sanguin sur place).\nPriorité 2 : familles directes des porteurs (2 personnes maximum).\nPriorité 3 : personnel médical et technique, selon besoins.\n\nCapacité : 80 couchettes. Aucun animal. Aucune arme. Toute tentative de franchissement de la grille entraînera l’usage de la force.\n\nQuelqu’un a gratté au couteau, sous « Priorité 3 » : « et nous ? »',
  },
];

export const DOCUMENTS: Record<string, DocumentDef> = Object.fromEntries(list.map((d) => [d.id, d]));
