// 写真・動画のアップロード許可証を発行（ブラウザから直接Blobへ大容量アップロード）
import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/*', 'video/*'],
        maximumSizeInBytes: 500 * 1024 * 1024, // 1ファイル500MBまで
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => { /* no-op */ },
    });
    return res.status(200).json(jsonResponse);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}
