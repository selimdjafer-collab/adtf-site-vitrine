/** Photos affichées sur le site tant que la galerie de la base est vide. */
export type StaticGalleryImage = {
  id: string;
  src: string;
  alt: string;
  label: string;
  section: string;
  sort_order: number;
  created_at: string;
};

export const STATIC_IMAGES: StaticGalleryImage[] = [
  { id: 's1', src: '/ChatGPT_Image_22_juin_2026,_08_55_06.png', alt: 'Baie vitrée aluminium', label: 'Baie vitrée aluminium', section: 'gallery', sort_order: 0, created_at: '' },
  { id: 's2', src: '/ChatGPT_Image_22_juin_2026,_10_46_50.png', alt: 'Fenêtre PVC', label: 'Fenêtre PVC', section: 'gallery', sort_order: 1, created_at: '' },
  { id: 's3', src: '/ChatGPT_Image_22_juin_2026,_10_43_01.png', alt: "Porte d'entrée", label: "Porte d'entrée", section: 'gallery', sort_order: 2, created_at: '' },
  { id: 's4', src: '/files_4349414-2026-06-22T07-22-25-429Z-ChatGPT_Image_22_juin_2026,_08_58_54.webp', alt: 'Portail aluminium', label: 'Portail aluminium', section: 'gallery', sort_order: 3, created_at: '' },
  { id: 's5', src: '/ChatGPT_Image_25_juin_2026,_10_54_06.png', alt: 'Pergola bioclimatique', label: 'Pergola bioclimatique', section: 'gallery', sort_order: 4, created_at: '' },
  { id: 's6', src: '/ChatGPT_Image_25_juin_2026,_10_57_58.png', alt: 'Volets roulants', label: 'Volets roulants', section: 'gallery', sort_order: 5, created_at: '' },
  { id: 's7', src: 'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800&q=80', alt: 'Verrière intérieure', label: 'Verrière', section: 'gallery', sort_order: 6, created_at: '' },
  { id: 's8', src: 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=800&q=80', alt: 'Porte de garage sectionnelle', label: 'Porte de garage', section: 'gallery', sort_order: 7, created_at: '' },
];
