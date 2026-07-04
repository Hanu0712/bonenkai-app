// 申込を保存し、自動返信メール（設定済みの場合）を送る
import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const { name, kana, email, tel, insta } = req.body || {};
  if (!name || !kana || !email || !tel) {
    return res.status(400).json({ error: 'missing fields' });
  }

  const rec = {
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
アートグレイス ポートサイドヴィラにて
お会いできますことを心より楽しみにしております。

今日を生きる、日本は生きる
Today Japan`,
      });
      mailed = true;
    } catch (e) {
      console.error('mail send failed', e);
    }
  }

  return res.status(200).json({ ok: true, mailed });
}
