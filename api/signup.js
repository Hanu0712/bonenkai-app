// 申込を保存し、共通フォームへ転送。メールは既存のApps Scriptで送信する。
import { put } from '@vercel/blob';

// Googleフォーム受け口（スプレッドシート「望年会2026 申込者リスト」に直結）
const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScKKtAipp61-NZAI7DJw1Cu1_ohmojNdnHNGDJ1jd0yzABRlw/formResponse';
const FORM_ENTRIES = {
  name: 'entry.2040682742',
  kana: 'entry.1324035653',
  email: 'entry.1692374138',
  tel: 'entry.103747740',
  insta: 'entry.78520541',
  tier: 'entry.2056991175',
  redCarpet: 'entry.1859529812',
  lunchLocation: 'entry.1839797053',
  stageExpression: 'entry.1979743636',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const { name, kana, email, tel, insta, tier, redCarpet, lunchLocation, stageExpression } = req.body || {};
  if (/^VIP\s+(?:LUNCH|GIFT)(?:\s*[（(｜|]|$)/.test(String(tier || '').trim())) {
    return res.status(409).json({ ok: false, error: 'このVIPコースの受付は終了しました。' });
  }
  if (!name || !kana || !email || !tel || !tier) {
    return res.status(400).json({ error: 'missing fields' });
  }

  if (redCarpet != null && !['歩きたい', '歩きたくない', '悩み中'].includes(redCarpet)) {
    return res.status(400).json({ error: 'invalid red-carpet preference' });
  }
  const expression = stageExpression == null ? '' : stageExpression;
  if (typeof expression !== 'string' || expression.length > 100 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(expression)) {
    return res.status(400).json({ error: '表現については100文字以内でご入力ください。' });
  }
  const expressionFormEntry = FORM_ENTRIES.stageExpression;
  if (expression.trim() && !/^entry\.\d+$/.test(expressionFormEntry || '')) {
    return res.status(503).json({ error: '先行申込みの受付準備中です。主催者へお問い合わせください。' });
  }
  const lunchChoices = ['東京開催', '名古屋開催', 'どちらでも参加可能'];
  if (tier === 'VIP（30,000円）' && !lunchChoices.includes(lunchLocation)) {
    return res.status(400).json({ error: 'ランチ開催場所の希望をお選びください。' });
  }
  // Existing shared form: new spring lunch location preference.
  const lunchFormEntry = FORM_ENTRIES.lunchLocation;
  if (tier === 'VIP（30,000円）' && !/^entry\.\d+$/.test(lunchFormEntry || '')) {
    return res.status(503).json({ error: 'ランチ希望の受付準備中です。主催者へお問い合わせください。' });
  }
  const rec = {
    tier: String(tier).slice(0, 50),
    name: String(name).slice(0, 100),
    kana: String(kana).slice(0, 100),
    email: String(email).slice(0, 200),
    tel: String(tel).slice(0, 50),
    insta: String(insta || '').slice(0, 100),
    stageExpression: expression.trim(),
    ...(redCarpet ? { redCarpet } : {}),
    ...(tier === 'VIP（30,000円）' ? { lunchLocation } : {}),
    ts: Date.now(),
  };

  await put(`signups/${rec.ts}.json`, JSON.stringify(rec), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: true,
  });

  // スプレッドシートへ転送（申込順リストに1行追加される）
  let sheeted = false;
  try {
    const params = new URLSearchParams();
    params.set(FORM_ENTRIES.name, rec.name);
    params.set(FORM_ENTRIES.kana, rec.kana);
    params.set(FORM_ENTRIES.email, rec.email);
    params.set(FORM_ENTRIES.tel, rec.tel);
    if (rec.insta) params.set(FORM_ENTRIES.insta, rec.insta);
    params.set(FORM_ENTRIES.tier, rec.tier);
    if (rec.redCarpet) params.set(FORM_ENTRIES.redCarpet, rec.redCarpet);
    if (rec.lunchLocation) params.set(lunchFormEntry, rec.lunchLocation);
    if (rec.stageExpression) params.set(expressionFormEntry, rec.stageExpression);
    const r = await fetch(FORM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    sheeted = r.ok;
  } catch (e) {
    console.error('sheet forward failed', e);
  }

  if (!sheeted) {
    return res.status(502).json({ ok: false, uncertain: true, error: '受付結果を確認できませんでした。重複を防ぐため、再送せず主催者へお問い合わせください。' });
  }

  // 振込案内・入金お礼・催促は、共通シートの事務局メール自動処理に一本化。
  // 旧Resend経路には廃止済み会場・パスワードの案内があり、重複送信を防ぐため使わない。
  return res.status(200).json({ ok: true, mailed: false, sheeted });
}
