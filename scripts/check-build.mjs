// Garde-fou : vérifie que le site construit pointe bien vers la base Supabase du SITE VITRINE
// (et pas vers celle de l'appli de devis, dont l'URL peut traîner dans les variables d'environnement).
import { readdirSync, readFileSync } from 'node:fs';

const EXPECTED = 'wvybfdghrglkdoapntko.supabase.co';
const files = readdirSync('dist/assets').filter((f) => f.endsWith('.js'));
const hosts = new Set();
for (const f of files) {
  for (const m of readFileSync(`dist/assets/${f}`, 'utf8').matchAll(/[a-z0-9]{20}\.supabase\.co/g)) hosts.add(m[0]);
}
if (hosts.size !== 1 || !hosts.has(EXPECTED)) {
  console.error(`✗ Mauvaise base Supabase dans le build : ${[...hosts].join(', ') || 'aucune'} (attendu : ${EXPECTED})`);
  process.exit(1);
}
console.log(`✓ Build relié à ${EXPECTED}`);
