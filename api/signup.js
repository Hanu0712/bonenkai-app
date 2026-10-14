// 申込を保存し、スプレッドシートに転送、自動返信メール（設定済みの場合）を送る
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

  // 自動返信メール（RESEND_API_KEY が設定されたら有効になる）
  let mailed = false;
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.MAIL_FROM || 'Today Japan <onboarding@resend.dev>',
        to: rec.email,
        subject: '【望年会】お申し込みありがとうございます｜当日ページのご案内',
        text:
`${rec.name} 様

この度は「2026年 望年会」へお申し込みいただき、
誠にありがとうございます。

当日のご案内ページをご覧いただくための
パスワードをお送りいたします。

　パスワード：おむすび

招待状の「次に進む」からパスワード入力画面にお進みください。
　https://yoshiko2026.vercel.app

2026年12月18日（金）、
アニヴェルセル みなとみらい横浜にて
お会いできますことを心より楽しみにしております。

今日を生きる　日本は生きる
Today Japan`,
      });
      mailed = true;
    } catch (e) {
      console.error('mail send failed', e);
    }
  }

  return res.status(200).json({ ok: true, mailed, sheeted });
}
