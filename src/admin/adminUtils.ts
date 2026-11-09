import { supabase } from '../lib/supabase';

export const BUCKET = 'site-images';

/** Taille maximale acceptée par le stockage Supabase (bucket site-images : 10 Mo). */
const BUCKET_LIMIT = 10 * 1024 * 1024;
/** Côté le plus long après redimensionnement : suffisant pour le site, léger à charger. */
const MAX_SIDE = 1920;
const QUALITY = 0.82;

/** Traduit en français les erreurs Supabase les plus courantes. */
export function frError(err: unknown, fallback = 'Une erreur est survenue.'): string {
  const raw =
    err instanceof Error ? err.message
    : typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message)
    : typeof err === 'string' ? err
    : '';
  const m = raw.toLowerCase();
  if (!m) return fallback;
  if (m.includes('invalid login credentials')) return 'E-mail ou mot de passe incorrect.';
  if (m.includes('email not confirmed')) return "Adresse e-mail non confirmée : ouvrez le lien reçu par e-mail.";
  if (m.includes('jwt expired') || m.includes('invalid jwt') || m.includes('refresh token'))
    return 'Votre session a expiré. Déconnectez-vous puis reconnectez-vous.';
  if (m.includes('row-level security') || m.includes('permission denied') || m.includes('unauthorized'))
    return "Action refusée : vous n'êtes pas connecté ou vous n'avez pas les droits nécessaires.";
  if (m.includes('bucket not found'))
    return "L'espace de stockage des images (« site-images ») n'existe pas dans la base.";
  if (m.includes('exceeded the maximum allowed size') || m.includes('payload too large') || m.includes('entity too large'))
    return "L'image est trop lourde (10 Mo maximum).";
  if (m.includes('mime type') || m.includes('invalid_mime_type'))
    return "Format d'image non accepté. Utilisez une photo JPG, PNG ou WebP.";
  if (m.includes('duplicate key') && m.includes('slug'))
    return "Un autre article utilise déjà cette adresse (slug). Modifiez le titre ou le slug.";
  if (m.includes('duplicate key') || m.includes('already exists'))
    return 'Cet élément existe déjà.';
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed'))
    return 'Connexion impossible avec le serveur. Vérifiez votre connexion internet puis réessayez.';
  return raw;
}

/** Lève l'erreur Supabase si présente (pour les appels dont on ignorait le résultat). */
export function check<T extends { error: unknown }>(res: T): T {
  if (res.error) throw res.error;
  return res;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
    img.src = url;
  });
}

/**
 * Prépare une photo pour le site : redimensionne (1920 px max) et convertit en WebP
 * (ou JPEG si le navigateur ne sait pas produire du WebP). Les photos de téléphone
 * de 5 à 15 Mo deviennent ainsi des fichiers de quelques centaines de Ko.
 */
export async function prepareImage(file: File): Promise<{ blob: Blob; ext: string; type: string }> {
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
    if (file.type === 'image/svg+xml') throw new Error("Les images SVG ne sont pas acceptées. Utilisez une photo JPG, PNG ou WebP.");
    if (file.size > BUCKET_LIMIT) throw new Error("L'image GIF est trop lourde (10 Mo maximum).");
    return { blob: file, ext: 'gif', type: 'image/gif' };
  }

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    const isHeic = /\.(heic|heif)$/i.test(file.name) || /heic|heif/i.test(file.type);
    throw new Error(
      isHeic
        ? "Format iPhone (HEIC) non lisible par ce navigateur. Sur l'iPhone : Réglages → Appareil photo → Formats → « Le plus compatible », ou envoyez la photo depuis Safari."
        : "Ce fichier n'est pas une image lisible. Utilisez une photo JPG, PNG ou WebP.",
    );
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Impossible de préparer l'image sur cet appareil.");
  ctx.drawImage(img, 0, 0, w, h);

  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));

  let blob = await toBlob('image/webp');
  let type = 'image/webp';
  let ext = 'webp';
  if (!blob || blob.type !== 'image/webp') {
    blob = await toBlob('image/jpeg');
    type = 'image/jpeg';
    ext = 'jpg';
  }
  if (!blob) throw new Error("Impossible de préparer l'image sur cet appareil.");
  if (blob.size > BUCKET_LIMIT) throw new Error("L'image est trop lourde même après compression (10 Mo maximum).");
  return { blob, ext, type };
}

/** Prépare puis envoie une image dans le stockage ; renvoie son URL publique. */
export async function uploadImage(file: File, folder: 'gallery' | 'actualites'): Promise<string> {
  const { blob, ext, type } = await prepareImage(file);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Chemin dans le stockage d'une URL publique du bucket, ou null si l'image est ailleurs. */
export function storagePath(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = publicUrl.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(publicUrl.slice(i + marker.length).split('?')[0]);
}

/** Libellé lisible tiré d'un nom de fichier (« porte_entree-alu.jpg » → « porte entree alu »). */
export function labelFromFileName(name: string): string {
  return name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Photo';
}
