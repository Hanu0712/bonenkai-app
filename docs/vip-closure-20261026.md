# VIP受付終了・未公開修正版（2026-10-26）

GitHub保存用の検証済みソース。公開時は下記の全プロジェクトと共通受付をデプロイすること。

- 大元LP：musubu-redcarpet-2026/public/guide/。VIP申込リンクを斜めの赤い満員御礼表示に置換。
- 各フォーム：musubu-redcarpet-2026-{general,vip,specialvip,premiumvip}/public/index.html。
- VIP/SPECIAL/PREMIUMの各ソースは公開中の既存ページHTMLを取得して復元し、既存の特典・金額・初期選択を保持。
- VIPの選択肢をdisabled化。VIP個別ページは受付終了案内・スタンプ・確認ボタン停止。他コースへの変更は可能。
- 選択欄はコース名と料金のみ。限定人数は欄の下へ改行可能なテキストとして表示。
- 前段5プロジェクトのlib/signup.mjs、および最終共通受付api/signup.jsでVIP/旧VIP LUNCH/旧VIP GIFTの受付を409で拒否。保存・外部転送より前に判定。
- APIテストは全外部サービスをモック。実申込・実メール・スプシ追記は行っていません。

検証：node --experimental-vm-modules scripts/verify-vip-closure.mjs
53ケース。ブラウザでも全4ページを375px/320pxで確認、通常3コースの確認画面・VIP直接アクセス時の受付終了・VIP→GENERALの切替を確認。

デプロイする際は、大元LPだけでなく4個別プロジェクトと最終共通受付を更新する必要があります。
