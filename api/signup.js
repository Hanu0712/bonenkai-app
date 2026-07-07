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
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const { name, kana, email, tel, insta, tier } = req.body || {};
  if (!name || !kana || !email || !tel || !tier) {
    return res.status(400).json({ error: 'missing fields' });
  }

  const rec = {
    tier: String(tier).slice(0, 50),
    name: String(name).slice(0, 100),
    kana: String(kana).slice(0, 100),
    email: String(email).slice(0, 200),
    tel: String(tel).slice(0, 50),
    insta: String(insta || '').slice(0, 100),
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
    const r = await fetch(FORM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    sheeted = r.ok;
  } catch (e) {
    console.error('sheet forward failed', e);
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
