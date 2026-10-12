import type { SummaryRule } from '../engine/types';
import { all, companionIs, flag, not, notFlag, quest } from './helpers';

/** Lignes du récapitulatif de fin, filtrées selon l'état réellement vécu. */
export const SUMMARY_RULES: SummaryRule[] = [
  { if: flag('theo_soigne'), text: 'Vous avez trouvé de quoi faire tomber la fièvre de Théo.', tone: 'good' },
  { if: flag('menti_antibio'), text: 'Vous avez gardé pour vous les antibiotiques destinés à Théo.', tone: 'bad' },
  { if: flag('odilon_aide'), text: 'Odilon, le carillonneur de Saint-Clair, a continué de sonner pour les vivants.', tone: 'good' },
  { if: flag('odilon_vole'), text: 'Vous avez dépouillé un vieil homme. Les cloches de Saint-Clair se sont tues.', tone: 'bad' },
  { if: flag('kaz_refuse'), text: 'Vous avez laissé Kaz dehors. Il est devenu Ferrailleur.', tone: 'bad' },
  { if: all(flag('kaz_traitre'), flag('kaz_rachete')), text: 'Kaz vous a trahi, puis s’est racheté.', tone: 'neutral' },
  { if: all(flag('kaz_traitre'), notFlag('kaz_rachete')), text: 'Kaz a livré Théo aux Ferrailleurs.', tone: 'bad' },
  { if: flag('kaz_pardonne'), text: 'Kaz vous a avoué sa dette, et vous lui avez pardonné.', tone: 'good' },
  { if: flag('kaz_sacrifice'), text: 'Kaz a tenu la manivelle de l’écluse jusqu’au bout.', tone: 'good' },
  { if: flag('maelle_soignee'), text: 'Vos derniers antibiotiques ont sauvé Maëlle.', tone: 'good' },
  { if: companionIs('maelle', 'dead'), text: 'Maëlle est partie mourir seule dans les Carrières.', tone: 'bad' },
  { if: quest('q_malik', 'completed'), text: 'Vous avez retrouvé Malik et rendu son carnet à Inès.', tone: 'good' },
  { if: flag('veilleurs_allies'), text: 'Vous avez rendu l’eau claire aux Veilleurs de l’ossuaire.', tone: 'good' },
  { if: flag('berger_tue'), text: 'Vous avez abattu le Berger dans la Grande Salle.', tone: 'good' },
  { if: flag('berger_evite'), text: 'Vous avez contourné le Berger par l’aqueduc romain.', tone: 'neutral' },
  { if: flag('theo_veilleurs'), text: 'Vous avez confié Théo aux Veilleurs.', tone: 'neutral' },
  { if: flag('verite_ferrand'), text: 'Vous avez enregistré la vérité sur le commerce des porteurs.', tone: 'good' },
  { if: flag('prisonniers_liberes'), text: 'Vous avez ouvert les cages de la casse Lenoir.', tone: 'good' },
  { if: all(quest('q_cages', 'failed')), text: 'Les prisonniers des cages sont restés aux mains de Gaspard.', tone: 'bad' },
  { if: flag('gaspard_tue'), text: 'Vous avez exécuté Gaspard Lenoir.', tone: 'neutral' },
  { if: flag('gaspard_epargne'), text: 'Vous avez laissé vivre Gaspard Lenoir.', tone: 'neutral' },
  { if: flag('theo_vendu'), text: 'Vous avez vendu Théo à Gaspard Lenoir.', tone: 'bad' },
  { if: flag('theo_abandonne'), text: 'Vous avez abandonné Théo dans la casse.', tone: 'bad' },
  { if: flag('theo_livre'), text: 'Vous avez livré Théo au capitaine Rousset.', tone: 'bad' },
  { if: all(flag('promis_maelle'), not(flag('theo_vendu')), not(flag('theo_livre')), not(flag('theo_abandonne'))), text: 'Vous avez tenu votre promesse : personne n’a vendu Théo.', tone: 'good' },
  { if: flag('foule_soulevee'), text: 'Vous avez fait entendre la vérité à toute la foule de l’écluse.', tone: 'neutral' },
  { if: flag('cloche_utilisee'), text: 'La cloche du Berger a emmené la horde loin de l’écluse.', tone: 'good' },
];
