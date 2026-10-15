import { getStore } from '@netlify/blobs';
import {
  json, fail, requireAdmin, parseN, shardOf, summarize, blobKeysOf,
  cleanText, cleanDate, cleanFileRef, TOTAL_ACTAS
} from '../lib/common.mjs';
import { SEED } from '../lib/seed.mjs';

const TIPOS = ['', 'Ordinaria', 'Extraordinaria'];
const emptyRecord = () => ({ fecha: '', titulo: '', tipo: '', intro: '', actaFile: null, anexos: [] });

async function readRecord(store, n) {
  const stored = await store.get(`acta/${n}`, { type: 'json' }).catch(() => null);
  if (stored) return stored.deleted ? null : stored;
  return SEED[n] || SEED[String(n)] || null;
}

async function removeFiles(keys) {
  if (!keys.length) return;
  const files = getStore('files');
  for (const key of keys) {
    const { blobs } = await files.list({ prefix: `${key}/` });
    await Promise.all(blobs.map((b) => files.delete(b.key)));
  }
}

async function buildIndex(store) {
  const index = {};
  for (const [n, record] of Object.entries(SEED)) {
    const s = summarize(record);
    if (s) index[n] = s;
  }
  const { blobs } = await store.list({ prefix: 'idx/' });
  const shards = await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' }).catch(() => null)));
  for (const shard of shards) {
    for (const [n, s] of Object.entries((shard && shard.items) || {})) {
      if (s === null) delete index[n];
      else index[n] = s;
    }
  }
  return index;
}

async function setIndexEntry(store, n, summary) {
  const key = `idx/${shardOf(n)}`;
  const shard = (await store.get(key, { type: 'json' }).catch(() => null)) || { items: {} };
  shard.items[n] = summary;
  await store.setJSON(key, shard);
}

export default async (req) => {
  const store = getStore('actas');
  const url = new URL(req.url);

  if (req.method === 'GET') {
    if (url.searchParams.get('mode') === 'index') return json(await buildIndex(store));
    const n = parseN(url.searchParams.get('n'));
    if (!n) return fail('Número de acta inválido (1 a 5000).');
    return json((await readRecord(store, n)) || emptyRecord());
  }

  const denied = requireAdmin(req);
  if (denied) return denied;

  const n = parseN(url.searchParams.get('n'));
  if (!n) return fail(`Número de acta inválido (1 a ${TOTAL_ACTAS}).`);

  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return fail('Cuerpo inválido.'); }

    const record = {
      fecha: cleanDate(body.fecha),
      titulo: cleanText(body.titulo, 200),
      tipo: TIPOS.includes(body.tipo) ? body.tipo : '',
      intro: cleanText(body.intro, 6000),
      actaFile: cleanFileRef(body.actaFile),
      anexos: (Array.isArray(body.anexos) ? body.anexos : []).map(cleanFileRef).filter(Boolean).slice(0, 60),
      updated: Date.now()
    };

    // Borrado limpio: los archivos que ya no están referenciados se eliminan de Netlify Blobs.
    const previous = await readRecord(store, n);
    const keep = new Set(blobKeysOf(record));
    const orphans = blobKeysOf(previous).filter((k) => !keep.has(k));

    await store.setJSON(`acta/${n}`, record);
    await setIndexEntry(store, n, summarize(record));
    await removeFiles(orphans);
    return json(record);
  }

  if (req.method === 'DELETE') {
    const previous = await readRecord(store, n);
    await store.setJSON(`acta/${n}`, { deleted: true, updated: Date.now() });
    await setIndexEntry(store, n, null);
    await removeFiles(blobKeysOf(previous));
    return json({ ok: true });
  }

  return fail('Método no permitido', 405);
};

export const config = { path: '/api/actas' };
