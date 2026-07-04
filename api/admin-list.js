// 幹事専用：申込者一覧（ADMIN_PASSWORD で保護）
import { list } from '@vercel/blob';

export default async function handler(req, res) {
  const key = (req.query && req.query.key) || '';
  if (!process.env.ADMIN_PASSWORD || key !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const out = [];
  let cursor;
  do {
    const page = await list({ prefix: 'signups/', limit: 1000, cursor });
    for (const b of page.blobs) {
      try {
        const r = await fetch(b.url);
        if (r.ok) out.push(await r.json());
      } catch (e) { /* skip broken record */ }
    }
    cursor = page.cursor;
  } while (cursor);

  out.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  return res.status(200).json({ count: out.length, signups: out });
}
