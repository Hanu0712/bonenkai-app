# MUSUBU RED CARPET 2026

申込みLP。既存の受付サービスを維持するため、元のアプリとは別のVercelプロジェクトで公開する。

## Vercel設定

- Project: `musubu-redcarpet-2026`
- Repository: `Hanu0712/bonenkai-app`
- Production Branch: `master`
- Root Directory: `musubu-redcarpet-2026`
- Framework Preset: Other
- Output Directory: `public`
- Node.js: 22.x

`vercel.json`に公開・API設定を記載。`api/signup.js`は既存の`https://yoshiko2026.vercel.app/api/signup`へ受付を委譲する。この旧受付サービスを新LPのプロキシに置き換えないこと（循環呼び出しを防ぐ）。

## 確認

2026-10-10、Chromiumで幅320/375/390/430/768/1366pxの表示と、入力→確認→完了の遷移を確認。横方向のはみ出しなし。送信APIは模擬し、実際の申込み・メール送信は行っていない。実機のSafari確認は未実施。
