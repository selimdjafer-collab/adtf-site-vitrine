import { useEffect, useState } from 'react';

type GalleryImage = {
  id: string;
  src: string;
  alt: string;
  label: string;
  section: string;
  sort_order: number;
  created_at: string;
};

const STATIC_IMAGES: GalleryImage[] = [
  { id: 's1', src: '/ChatGPT_Image_22_juin_2026,_08_55_06.png', alt: 'Baie vitrée aluminium', label: 'Baie vitrée aluminium', section: 'gallery', sort_order: 0, created_at: '' },
  { id: 's2', src: '/ChatGPT_Image_22_juin_2026,_10_46_50.png', alt: 'Fenêtre PVC', label: 'Fenêtre PVC', section: 'gallery', sort_order: 1, created_at: '' },
  { id: 's3', src: '/ChatGPT_Image_22_juin_2026,_10_43_01.png', alt: "Porte d'entrée", label: "Porte d'entrée", section: 'gallery', sort_order: 2, created_at: '' },
  { id: 's4', src: '/files_4349414-2026-06-22T07-22-25-429Z-ChatGPT_Image_22_juin_2026,_08_58_54.webp', alt: 'Portail aluminium', label: 'Portail aluminium', section: 'gallery', sort_order: 3, created_at: '' },
  { id: 's5', src: '/ChatGPT_Image_25_juin_2026,_10_54_06.png', alt: 'Pergola bioclimatique', label: 'Pergola bioclimatique', section: 'gallery', sort_order: 4, created_at: '' },
  { id: 's6', src: '/ChatGPT_Image_25_juin_2026,_10_57_58.png', alt: 'Volets roulants', label: 'Volets roulants', section: 'gallery', sort_order: 5, created_at: '' },
  { id: 's7', src: 'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800&q=80', alt: 'Verrière intérieure', label: 'Verrière', section: 'gallery', sort_order: 6, created_at: '' },
  { id: 's8', src: 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=800&q=80', alt: 'Porte de garage sectionnelle', label: 'Porte de garage', section: 'gallery', sort_order: 7, created_at: '' },
];

export default function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>(STATIC_IMAGES);

  useEffect(() => {
    import('../lib/supabase')
      .then(({ supabase }) =>
        supabase
          .from('gallery_images')
          .select('*')
          .eq('section', 'gallery')
          .order('sort_order')
          .order('created_at'),
      )
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) setImages(data as GalleryImage[]);
      })
      .catch(() => {/* keep static fallback */});
  }, []);

  return (
    <section id="realisations" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="eyebrow-bar" />
            <span className="eyebrow">Galerie photos</span>
            <div className="eyebrow-bar" />
          </div>
          <h2 className="section-title mb-4">Découvrez certains de nos projets et réalisations</h2>
          <p className="section-subtitle max-w-xl mx-auto">
            Chaque projet est unique. Voici quelques réalisations représentatives de notre savoir-faire
            en menuiseries sur mesure dans les Vosges, l'Alsace et la Moselle.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative overflow-hidden rounded-2xl aspect-square cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover brightness-105 group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 rounded-2xl border-4 border-brand-green opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-blue-dark/75 via-brand-blue-dark/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white font-bold text-sm translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-20">
                {img.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
