// みんなのアルバム：共有された写真・動画の一覧
import { list } from '@vercel/blob';

export default async function handler(req, res) {
  const items = [];
  let cursor;
  do {
    const page = await list({ prefix: 'media/', limit: 1000, cursor });
    for (const b of page.blobs) {
      items.push({
        url: b.url,
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt,
      });
    }
    cursor = page.cursor;
  } while (cursor);

  items.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
  return res.status(200).json({ items });
}
