/**
 * Plans filmés dans la vraie application (mode capture `?promo=<maquette>`).
 *
 * Chaque plan part d'un état de la galerie de maquettes (produit par le moteur)
 * et enchaîne de vraies interactions : défilement, appuis, ouverture de
 * feuilles. Les instants sont en secondes depuis le début du plan.
 *
 * Actions :
 *  - { at, scroll: { to, dur } }   défilement doux du contenu principal
 *    (`to` : pixels, ou { text } pour amener un texte vers le haut de l'écran)
 *  - { at, tap: { label | text | role+name } }   appui (enregistré pour la vidéo)
 */
export const CLIPS = [
  {
    id: 'howler',
    mockup: 'story-art',
    duration: 6.5,
    actions: [{ at: 1.2, scroll: { to: 470, dur: 3.6 } }],
  },
  { id: 'title', mockup: 'title', duration: 5 },
  {
    id: 'choice',
    mockup: 'story',
    duration: 6,
    actions: [
      { at: 0.3, scroll: { to: { text: { fr: 'Que faites-vous ?', en: 'What do you do?' } }, offset: 300, dur: 1.6 } },
      { at: 2.6, tap: { label: { fr: /% de réussite/, en: /% chance of success/ } } },
    ],
  },
  {
    id: 'dice',
    mockup: 'story-check',
    duration: 5,
    actions: [{ at: 0.6, scroll: { to: 260, dur: 3.4 } }],
  },
  {
    id: 'combat',
    mockup: 'combat',
    duration: 5.5,
    actions: [
      { at: 1.1, tap: { label: { fr: /^Frapper/, en: /^Strike/ } } },
      { at: 3.0, tap: { label: { fr: /^Frapper/, en: /^Strike/ } } },
    ],
  },
  {
    id: 'people',
    mockup: 'character',
    duration: 6,
    actions: [{ at: 0.8, scroll: { to: { text: { fr: 'Rencontres', en: 'People' } }, offset: 150, dur: 4.2 } }],
  },
  { id: 'map', mockup: 'map', duration: 4.5, actions: [{ at: 1.0, scroll: { to: 260, dur: 3 } }] },
  {
    id: 'archives',
    mockup: 'archives',
    duration: 4.5,
    actions: [{ at: 1.3, tap: { text: { fr: 'La carte de Théo', en: 'Théo’s map' } } }],
  },
  {
    id: 'workshop',
    mockup: 'workshop',
    duration: 4.5,
    actions: [{ at: 1.2, tap: { role: 'tab', name: { fr: /^Atelier/, en: /^Workshop/ } } }],
  },
  { id: 'transition', mockup: 'transition', duration: 3.6 },
  { id: 'ending', mockup: 'ending', duration: 5, actions: [{ at: 0.8, scroll: { to: 380, dur: 3.6 } }] },
];
