import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { GalleryImage } from '../lib/supabase';
import { STATIC_IMAGES } from '../lib/staticGallery';
import { BUCKET, check, frError, labelFromFileName, storagePath, uploadImage } from './adminUtils';
import {
  Upload, Trash2, Plus, AlertCircle, Image as ImageIcon, CheckCircle2,
  ChevronUp, ChevronDown, Edit2, Check, X, Download,
} from 'lucide-react';

/* Sur ordinateur, les boutons apparaissent au survol ; sur téléphone/tablette (pas de survol), ils restent visibles. */
const HOVER_REVEAL = '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity';

export default function GalleryManager() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editAlt, setEditAlt] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlLabel, setUrlLabel] = useState('');
  const [urlAlt, setUrlAlt] = useState('');
  const [showUrlForm, setShowUrlForm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data, error: err } = await supabase
      .from('gallery_images')
      .select('*')
      .eq('section', 'gallery')
      .order('sort_order')
      .order('created_at');
    if (err) setError(frError(err, 'Impossible de charger la galerie.'));
    else setImages((data ?? []) as GalleryImage[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  /** Exécute une action, affiche son erreur en français, puis recharge la liste. */
  const run = async (action: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(frError(err, fallback));
    } finally {
      await load();
      setBusy(false);
      setProgress(null);
    }
  };

  const nextOrder = () => images.reduce((max, img) => Math.max(max, img.sort_order), -1) + 1;

  const uploadFiles = (files: File[]) => run(async () => {
    let order = nextOrder();
    const failed: string[] = [];
    let ok = 0;
    for (const [i, file] of files.entries()) {
      setProgress(files.length > 1 ? `Envoi ${i + 1}/${files.length}…` : 'Envoi…');
      try {
        const src = await uploadImage(file, 'gallery');
        const label = labelFromFileName(file.name);
        check(await supabase.from('gallery_images').insert({
          src, alt: label, label, section: 'gallery', sort_order: order++,
        }));
        ok++;
      } catch (err) {
        failed.push(`${file.name} : ${frError(err, "échec de l'envoi")}`);
      }
    }
    if (ok) setNotice(`${ok} photo${ok > 1 ? 's ajoutées' : ' ajoutée'}. Pensez à modifier les libellés si besoin.`);
    if (failed.length) throw new Error(failed.join('\n'));
  }, "Erreur lors de l'envoi de la photo.");

  const addByUrl = () => {
    const src = urlInput.trim();
    if (!src) { setError("Indiquez l'adresse (URL) de l'image."); return; }
    if (!/^https?:\/\//i.test(src) && !src.startsWith('/')) { setError("L'adresse doit commencer par https://"); return; }
    return run(async () => {
      const label = urlLabel.trim() || 'Image';
      check(await supabase.from('gallery_images').insert({
        src, alt: urlAlt.trim() || label, label, section: 'gallery', sort_order: nextOrder(),
      }));
      setUrlInput(''); setUrlLabel(''); setUrlAlt(''); setShowUrlForm(false);
      setNotice('Image ajoutée.');
    }, "Erreur lors de l'ajout de l'image.");
  };

  /** La galerie du site affiche des photos intégrées tant que la base est vide : on les recopie ici pour pouvoir les gérer. */
  const importSitePhotos = () => run(async () => {
    check(await supabase.from('gallery_images').insert(
      STATIC_IMAGES.map((img, i) => ({
        src: img.src, alt: img.alt, label: img.label, section: 'gallery', sort_order: i,
      })),
    ));
    setNotice(`${STATIC_IMAGES.length} photos du site importées. Vous pouvez maintenant les modifier, les réordonner ou en ajouter.`);
  }, "Erreur lors de l'import des photos du site.");

  const deleteImage = (img: GalleryImage) => {
    if (!confirm(`Supprimer « ${img.label || 'cette photo'} » ?`)) return;
    return run(async () => {
      check(await supabase.from('gallery_images').delete().eq('id', img.id));
      const path = storagePath(img.src);
      // Le fichier n'est supprimé qu'une fois la ligne retirée : pas d'image cassée sur le site en cas d'échec.
      if (path) await supabase.storage.from(BUCKET).remove([path]);
      setNotice('Photo supprimée.');
    }, 'Erreur lors de la suppression.');
  };

  const saveEdit = (id: string) => run(async () => {
    check(await supabase.from('gallery_images').update({ label: editLabel.trim(), alt: editAlt.trim() }).eq('id', id));
    setEditingId(null);
  }, "Erreur lors de l'enregistrement.");

  const startEdit = (img: GalleryImage) => {
    setEditingId(img.id);
    setEditLabel(img.label);
    setEditAlt(img.alt);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= images.length) return;
    const arr = [...images];
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setImages(arr); // affichage immédiat
    return run(async () => {
      const results = await Promise.all(
        arr.map((img, i) => img.sort_order === i
          ? Promise.resolve({ error: null })
          : supabase.from('gallery_images').update({ sort_order: i }).eq('id', img.id)),
      );
      results.forEach(check);
    }, "Erreur lors du changement d'ordre.");
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-blue-dark font-display">Galerie photos</h1>
          <p className="text-slate-500 mt-1">{images.length} photo{images.length !== 1 ? 's' : ''} en galerie</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setShowUrlForm(!showUrlForm)}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-brand-blue text-brand-blue font-semibold text-sm hover:bg-brand-blue-bg transition-colors disabled:opacity-60"
          >
            <Plus size={16} /> Ajouter par URL
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="btn-primary text-sm py-2.5 px-5 rounded-xl disabled:opacity-60"
          >
            <Upload size={16} />
            {progress ?? 'Ajouter des photos'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = ''; // permet de renvoyer le même fichier
              if (files.length) uploadFiles(files);
            }}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm text-red-700 whitespace-pre-line">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
        </div>
      )}
      {notice && !error && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6 text-sm text-green-800">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice(null)} className="text-green-500 hover:text-green-700"><X size={14} /></button>
        </div>
      )}

      {showUrlForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <h2 className="font-bold text-brand-blue-dark mb-4">Ajouter une image par URL</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label className="form-label">URL de l'image</label>
              <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                className="form-input" placeholder="https://…" />
            </div>
            <div>
              <label className="form-label">Libellé affiché</label>
              <input type="text" value={urlLabel} onChange={e => setUrlLabel(e.target.value)}
                className="form-input" placeholder="Fenêtre PVC" />
            </div>
            <div>
              <label className="form-label">Description (accessibilité)</label>
              <input type="text" value={urlAlt} onChange={e => setUrlAlt(e.target.value)}
                className="form-input" placeholder="Fenêtre PVC blanche" />
            </div>
            <div className="flex items-end gap-3">
              <button onClick={addByUrl} disabled={busy} className="btn-primary py-3 px-6 rounded-xl text-sm disabled:opacity-60">Ajouter</button>
              <button onClick={() => setShowUrlForm(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-100">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <ImageIcon size={28} className="text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">La galerie de la base est vide</p>
          <p className="text-slate-400 text-sm mt-1 max-w-md">
            Le site affiche pour l'instant ses {STATIC_IMAGES.length} photos d'origine. Importez-les ici pour pouvoir
            les gérer : sinon, dès la première photo ajoutée, elles disparaîtront du site.
          </p>
          <button onClick={importSitePhotos} disabled={busy} className="btn-primary mt-6 text-sm py-2.5 px-5 rounded-xl disabled:opacity-60">
            <Download size={16} /> Importer les {STATIC_IMAGES.length} photos du site
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {images.map((img, idx) => (
            <div key={img.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 group">
              <div className="relative aspect-square bg-slate-100">
                <img src={img.src} alt={img.alt} className="w-full h-full object-cover" loading="lazy" />
                <div className={`absolute top-2 left-2 flex flex-col gap-1 ${HOVER_REVEAL}`}>
                  <button onClick={() => move(idx, -1)} disabled={busy || idx === 0} title="Avancer"
                    className="w-8 h-8 bg-white/90 rounded-lg shadow flex items-center justify-center disabled:opacity-30 hover:bg-brand-blue hover:text-white transition-colors">
                    <ChevronUp size={15} />
                  </button>
                  <button onClick={() => move(idx, 1)} disabled={busy || idx === images.length - 1} title="Reculer"
                    className="w-8 h-8 bg-white/90 rounded-lg shadow flex items-center justify-center disabled:opacity-30 hover:bg-brand-blue hover:text-white transition-colors">
                    <ChevronDown size={15} />
                  </button>
                </div>
                <div className={`absolute top-2 right-2 flex gap-1 ${HOVER_REVEAL}`}>
                  <button onClick={() => startEdit(img)} disabled={busy} title="Modifier"
                    className="w-8 h-8 bg-white/90 rounded-lg shadow flex items-center justify-center hover:bg-brand-blue hover:text-white transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => deleteImage(img)} disabled={busy} title="Supprimer"
                    className="w-8 h-8 bg-white/90 rounded-lg shadow flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {editingId === img.id ? (
                <div className="p-3 space-y-2">
                  <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                    className="form-input text-xs py-2" placeholder="Libellé" />
                  <input value={editAlt} onChange={e => setEditAlt(e.target.value)}
                    className="form-input text-xs py-2" placeholder="Description" />
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(img.id)} disabled={busy} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-brand-green text-white rounded-lg text-xs font-semibold disabled:opacity-60">
                      <Check size={12} /> Enregistrer
                    </button>
                    <button onClick={() => setEditingId(null)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">
                      <X size={12} /> Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2.5">
                  <p className="text-brand-blue-dark font-semibold text-sm truncate">{img.label || '—'}</p>
                  <p className="text-slate-400 text-xs truncate mt-0.5">{img.alt}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
