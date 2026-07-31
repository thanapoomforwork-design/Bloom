// Vercel serverless function (Node.js runtime).
// Calls the Google Gemini API (with vision, free tier) to give a real,
// grounded content-marketing analysis of the shop's uploaded photos and
// public page link.
// Requires GEMINI_API_KEY set in the Vercel project's Environment Variables —
// get a free key at https://aistudio.google.com/apikey. Never hardcode it
// here or expose it to the browser.

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_IMAGES = 6;
const MAX_LINK_FETCH_BYTES = 300000;
// Kept short on purpose: many social sites (TikTok/IG) stall bot requests, and
// this fetch shares the same function timeout budget as the Gemini call.
const LINK_FETCH_TIMEOUT_MS = 3000;
const GEMINI_TIMEOUT_MS = 45000;

function extractMeta(html) {
  const pick = (re) => {
    const m = re.exec(html);
    return m ? m[1].trim() : '';
  };
  const title = pick(/<title[^>]*>([^<]*)<\/title>/i);
  const ogTitle = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i);
  const ogDesc = pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i);
  const desc = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  return { title: ogTitle || title, description: ogDesc || desc };
}

// Reads only public, unauthenticated HTML the link already serves anonymously
// (title/meta tags) — no login, no platform API, no private analytics.
async function fetchLinkMeta(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    const res = await fetch(u.href, {
      redirect: 'follow',
      signal: AbortSignal.timeout(LINK_FETCH_TIMEOUT_MS),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ContentBloomBot/1.0)' },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const html = buf.subarray(0, MAX_LINK_FETCH_BYTES).toString('utf-8');
    return extractMeta(html);
  } catch {
    return null;
  }
}

// Google issues two credential styles for Gemini: classic API keys (AIza…)
// authenticate via the ?key= query param, while the newer AQ.… keys are OAuth
// access tokens and must go in an Authorization: Bearer header. Sending the
// wrong style returns 401, so try the likely one first and fall back.
async function geminiFetch(apiKey, path, { method = 'GET', payload, timeoutMs = 15000 } = {}) {
  const useBearerFirst = !apiKey.startsWith('AIza');
  const attempts = useBearerFirst ? ['bearer', 'query'] : ['query', 'bearer'];
  let last = null;

  for (const mode of attempts) {
    const url = mode === 'query'
      ? `${GEMINI_BASE}${path}${path.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`
      : `${GEMINI_BASE}${path}`;
    const headers = { 'content-type': 'application/json' };
    if (mode === 'bearer') headers.authorization = `Bearer ${apiKey}`;

    const res = await fetch(url, {
      method,
      headers,
      signal: AbortSignal.timeout(timeoutMs),
      body: payload ? JSON.stringify(payload) : undefined,
    });

    if (res.ok) return { res, mode };
    last = { res, mode, body: await res.text().catch(() => '') };
    // Only an auth rejection is worth retrying with the other style.
    if (res.status !== 401 && res.status !== 403) break;
  }
  return { res: last.res, mode: last.mode, errorBody: last.body, failed: true };
}

// Model availability changes over time and retired names return 404, so the
// usable model is discovered from the account's own model list rather than
// hardcoded. Cached per warm instance.
let cachedModel = null;
// Models that were listed but rejected the actual call, so a retry moves on
// to the next candidate instead of picking the same dead one again.
const deadModels = new Set();

// Used when the model listing is unavailable (restricted key, network blip).
// The "-latest" aliases track whatever Google currently ships, so they keep
// working after a specific dated model is retired.
const FALLBACK_MODELS = [
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-flash-lite-latest',
  'gemini-pro-latest',
];

function scoreModel(name) {
  const n = name.toLowerCase();
  // Wrong tool for image analysis, or not a chat model at all.
  if (/embedding|aqa|imagen|veo|tts|image-generation|audio|live|learnlm|gemma/.test(n)) return -1;
  let score = 0;
  const ver = /gemini-(\d+(?:\.\d+)?)/.exec(n);
  if (ver) score += parseFloat(ver[1]) * 10;
  if (n.includes('flash')) score += 8;      // fast + cheap, ideal here
  if (n.includes('pro')) score += 4;
  if (n.includes('lite')) score -= 3;
  if (/preview|exp/.test(n)) score -= 5;    // prefer stable
  if (/\d{3,}/.test(n)) score -= 2;         // dated snapshots
  return score;
}

// Returns an ordered list of models to try, best first. Never empty: if the
// listing call fails the hardcoded aliases are used instead.
async function candidateModels(apiKey) {
  let listed = [];
  let listError = '';

  try {
    const out = await geminiFetch(apiKey, '/models?pageSize=200');
    if (out.failed) {
      listError = `HTTP ${out.res.status} ${(out.errorBody || '').slice(0, 120)}`;
    } else {
      const data = await out.res.json().catch(() => ({}));
      listed = (data.models || [])
        .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map((m) => String(m.name || '').replace(/^models\//, ''))
        .filter((n) => scoreModel(n) >= 0)
        .sort((a, b) => scoreModel(b) - scoreModel(a));
    }
  } catch (e) {
    listError = e && e.message ? e.message : String(e);
  }

  const ordered = [...listed];
  for (const f of FALLBACK_MODELS) if (!ordered.includes(f)) ordered.push(f);

  // A previously-cached winner goes to the front; known-dead ones drop out.
  const alive = ordered.filter((m) => !deadModels.has(m));
  if (cachedModel && !deadModels.has(cachedModel)) {
    return { models: [cachedModel, ...alive.filter((m) => m !== cachedModel)], listed, listError };
  }
  return { models: alive, listed, listError };
}

// Walks the candidate list until one actually answers. A 404/400 means that
// model is gone for this account, so it is blocklisted and the next is tried;
// any other status is a real failure and stops the walk.
async function generateWithFallback(apiKey, payload, timeoutMs) {
  const { models, listed, listError } = await candidateModels(apiKey);
  if (!models.length) {
    return { failed: true, error: `ไม่มีโมเดลให้ใช้${listError ? ` (${listError})` : ''}`, listed };
  }

  let lastStatus = 0;
  let lastBody = '';
  const tried = [];

  for (const model of models.slice(0, 6)) {
    tried.push(model);
    const out = await geminiFetch(apiKey, `/models/${model}:generateContent`, {
      method: 'POST', payload, timeoutMs,
    });

    if (!out.failed) {
      cachedModel = model;
      return { res: out.res, model, tried, listed };
    }

    lastStatus = out.res.status;
    lastBody = out.errorBody || '';
    if (lastStatus === 404 || (lastStatus === 400 && /not found|not supported/i.test(lastBody))) {
      deadModels.add(model);
      continue; // retired for this account — try the next candidate
    }
    break; // quota, auth, safety: retrying other models will not help
  }

  return { failed: true, status: lastStatus, errorBody: lastBody, tried, listed, listError };
}

function dataUrlToInlinePart(dataUrl) {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(String(dataUrl || ''));
  if (!m) return null;
  return { inline_data: { mime_type: m[1], data: m[2] } };
}

module.exports = async function handler(req, res) {
  // Opening this URL in a browser (a GET) reports whether the function is
  // deployed and whether the key is configured — without revealing the key.
  if (req.method === 'GET') {
    const key = process.env.GEMINI_API_KEY || '';
    if (!key) {
      res.status(200).json({
        ok: false,
        message: 'backend ทำงานปกติ ✅ แต่ยังไม่ได้ตั้ง API key ❌',
        hasApiKey: false,
        hint: 'ตั้ง GEMINI_API_KEY ใน Vercel → Settings → Environment Variables แล้วกด Redeploy',
      });
      return;
    }

    let out;
    try {
      out = await generateWithFallback(key, {
        contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
        generationConfig: { maxOutputTokens: 8, thinkingConfig: { thinkingBudget: 0 } },
      }, 20000);
    } catch (e) {
      out = { failed: true, error: e && e.message ? e.message : String(e) };
    }

    const works = !out.failed;
    res.status(200).json({
      ok: works,
      message: works
        ? 'พร้อมใช้งานเต็มระบบ 🎉 backend + API key + โมเดล ทำงานได้จริง'
        : 'backend ทำงานปกติ ✅ แต่ยังเรียกโมเดลไม่ได้ ❌',
      hasApiKey: true,
      apiKeyLength: key.length,
      modelInUse: out.model || '(ยังใช้ไม่ได้สักตัว)',
      modelsTried: out.tried || [],
      modelsListedByGoogle: (out.listed || []).slice(0, 10),
      hint: works
        ? 'ตั้งค่าครบแล้ว กลับไปหน้าเว็บแล้วกดวิเคราะห์ได้เลย'
        : `ปัญหา: ${out.error || `HTTP ${out.status} ${(out.errorBody || '').slice(0, 180)}`}`,
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY ใน Vercel (Settings → Environment Variables) กรุณาตั้งค่าแล้ว redeploy — ขอฟรีได้ที่ aistudio.google.com/apikey' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: 'invalid JSON body' });
    return;
  }

  const shopName = String(body?.shopName || '').slice(0, 200);
  const category = String(body?.category || '').slice(0, 100);
  const shopLink = String(body?.shopLink || '').slice(0, 500);
  const images = Array.isArray(body?.images) ? body.images.slice(0, MAX_IMAGES) : [];

  if (!shopName || !category) {
    res.status(400).json({ error: 'missing shopName or category' });
    return;
  }

  const imageParts = images.map(dataUrlToInlinePart).filter(Boolean);
  const linkMeta = shopLink ? await fetchLinkMeta(shopLink) : null;

  const contextLines = [
    `ชื่อร้าน: ${shopName}`,
    `ประเภทธุรกิจ: ${category}`,
    shopLink ? `ลิงก์ร้าน: ${shopLink}` : null,
    linkMeta?.title ? `ชื่อเพจ/หัวข้อจากลิงก์ (ข้อมูลสาธารณะ): ${linkMeta.title}` : null,
    linkMeta?.description ? `คำอธิบายจากลิงก์ (ข้อมูลสาธารณะ): ${linkMeta.description}` : null,
    imageParts.length ? `แนบรูปคอนเทนต์เก่ามาด้วย ${imageParts.length} รูป (ดูรูปที่แนบมาประกอบการวิเคราะห์)` : 'ไม่มีรูปคอนเทนต์เก่าแนบมา — วิเคราะห์จากข้อมูลร้านและลิงก์เท่าที่มี',
  ].filter(Boolean).join('\n');

  const instructions = `คุณคือเจ้าแห่งการตลาดคอนเทนต์โซเชียลมีเดีย (content marketing guru) ที่คลุกคลีกับแบรนด์ SME ไทยมานานกว่า 15 ปี รู้ลึกทั้ง Reels/TikTok/IG
วิเคราะห์คอนเทนต์ของร้านนี้จากข้อมูลและรูปที่แนบมาอย่างตรงไปตรงมา สมจริง ไม่เข้าข้าง โดยพิจารณาจาก: องค์ประกอบภาพ, แสง, สี, ความสม่ำเสมอของแบรนด์, การจัดวาง, ความน่าดึงดูดสำหรับแพลตฟอร์มโซเชียล
ตอบกลับเป็น JSON เท่านั้นตามรูปแบบนี้เป๊ะๆ:
{
  "overallAssessment": "สรุปภาพรวม 2-3 ประโยค",
  "strengths": ["ข้อดีข้อที่ 1", "ข้อดีข้อที่ 2"],
  "weaknesses": ["ข้อเสีย/จุดที่ควรปรับปรุงข้อที่ 1", "ข้อที่ 2"],
  "recommendations": ["คำแนะนำเชิงปฏิบัติที่ทำได้จริงข้อที่ 1", "ข้อที่ 2"]
}
ให้ 3-5 ข้อในแต่ละ list ใช้ภาษาไทย น้ำเสียงมืออาชีพแต่เป็นกันเอง ตรงประเด็น เจาะจงกับร้านนี้จริงๆ ไม่พูดกว้างเกินไปจนใช้กับร้านไหนก็ได้`;

  const parts = [{ text: `${instructions}\n\nข้อมูลร้าน:\n${contextLines}` }, ...imageParts];

  let out;
  try {
    out = await generateWithFallback(apiKey, {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 4096,
        temperature: 0.7,
        // Gemini flash models spend output tokens on internal reasoning by
        // default; left on, the budget is consumed before any answer is
        // emitted and the response comes back empty.
        thinkingConfig: { thinkingBudget: 0 },
      },
    }, GEMINI_TIMEOUT_MS);
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    res.status(502).json({ error: `เรียก Gemini API ไม่สำเร็จ: ${msg}${/timeout|abort/i.test(msg) ? ' (หมดเวลา — ลองลดจำนวนรูปที่แนบลง)' : ''}` });
    return;
  }

  if (out.failed) {
    const errText = out.errorBody || '';
    let hint = '';
    if (out.status === 401 || /API key not valid|invalid authentication/i.test(errText)) {
      hint = ' — key ใช้ไม่ได้ ลองสร้าง key ใหม่ที่ aistudio.google.com/apikey';
    } else if (out.status === 403) {
      hint = ' — key ไม่มีสิทธิ์ใช้ Gemini API ลองสร้าง key ใหม่';
    } else if (out.status === 429) {
      hint = ' — ใช้เกินโควตาฟรีชั่วคราว รอสักครู่แล้วลองใหม่';
    } else if (out.status === 404) {
      hint = ` — ลองโมเดลครบทุกตัวแล้วไม่มีตัวไหนใช้ได้ (ลองแล้ว: ${(out.tried || []).join(', ')})`;
    }
    res.status(502).json({
      error: `Gemini API error (${out.status || '-'})${hint}: ${out.error || errText.slice(0, 200)}`,
    });
    return;
  }

  const apiRes = out.res;
  const data = await apiRes.json();
  const candidate = data?.candidates?.[0];
  const text = (candidate?.content?.parts || []).map((p) => p.text || '').join('');
  const finishReason = candidate?.finishReason || '';

  if (!text.trim()) {
    const why = finishReason === 'MAX_TOKENS'
      ? 'คำตอบยาวเกินโควตา token'
      : finishReason === 'SAFETY'
        ? 'ถูกระบบกรองเนื้อหาบล็อก ลองเปลี่ยนรูปที่แนบ'
        : `finishReason=${finishReason || 'ไม่ทราบ'}`;
    res.status(502).json({ error: `AI ไม่ได้ส่งข้อความกลับมา (${why})` });
    return;
  }

  let parsed;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    res.status(502).json({ error: 'AI ตอบกลับไม่ใช่ JSON ที่ถูกต้อง', raw: text.slice(0, 500) });
    return;
  }

  res.status(200).json({
    overallAssessment: String(parsed.overallAssessment || ''),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.map(String) : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : [],
  });
};
