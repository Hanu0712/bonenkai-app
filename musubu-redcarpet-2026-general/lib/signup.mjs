// Keep the completed original registration service and its spreadsheet integration.
const SIGNUP_URL = "https://yoshiko2026.vercel.app/api/signup";
export const COURSES = Object.freeze({
  "GENERAL（15,000円）": 15000,
  "VIP GIFT（30,000円）": 30000,
  "VIP LUNCH（30,000円）": 30000,
  "SPECIAL VIP（50,000円）": 50000,
});

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function register(request, fetchService = fetch) {
  if (request.method !== "POST") return json({ ok: false, error: "送信方法をご確認ください。" }, 405);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ ok: false, error: "お申込みページからお手続きください。" }, 403);
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return json({ ok: false, error: "入力内容を確認して、もう一度お試しください。" }, 415);
  }
  let value;
  try {
    const body = await request.text();
    if (body.length > 8000) return json({ ok: false, error: "入力内容が長すぎます。" }, 413);
    value = JSON.parse(body);
  } catch {
    return json({ ok: false, error: "入力内容を確認して、もう一度お試しください。" }, 400);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return json({ ok: false, error: "入力内容をご確認ください。" }, 400);
  const limits = { name: 100, kana: 100, email: 254, tel: 40, insta: 100, tier: 60 };
  const record = {};
  for (const [key, max] of Object.entries(limits)) {
    if (value[key] == null && key === "insta") record[key] = "";
    else if (typeof value[key] !== "string" || value[key].length > max || /[\u0000-\u001f\u007f]/.test(value[key])) {
      return json({ ok: false, error: "入力内容をご確認ください。" }, 400);
    } else record[key] = value[key].trim();
  }
  if (!Object.hasOwn(COURSES, record.tier)) return json({ ok: false, error: "ご参加コースをお選びください。" }, 400);
  if (!record.name || !record.kana || !record.tel || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(record.email)) {
    return json({ ok: false, error: "必須項目を正しくご入力ください。" }, 400);
  }
  try {
    const response = await fetchService(SIGNUP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(record),
      redirect: "error",
      signal: AbortSignal.timeout(45000),
    });
    if (response.status >= 400 && response.status < 500) {
      return json({ ok: false, error: "お申込みを受け付けられませんでした。入力内容をご確認ください。" }, 422);
    }
    let result;
    try { result = await response.json(); } catch { result = null; }
    if (!response.ok || !result || result.error || !(result.ok === true || result.success === true)) {
      return json({ ok: false, uncertain: true, error: "受付結果を確認できませんでした。重複を防ぐため、再送せずご案内メールの到着をお待ちください。届かない場合は主催者へお問い合わせください。" }, 502);
    }
    return json({ ok: true });
  } catch {
    return json({ ok: false, uncertain: true, error: "通信が途中で切れたため、受付結果を確認できませんでした。重複を防ぐため、再送せずご案内メールの到着をご確認ください。" }, 502);
  }
}
