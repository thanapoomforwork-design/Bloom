// Vercel serverless function (Node.js runtime).
// Calls the Google Gemini API (with vision, free tier) to give a real,
// grounded content-marketing analysis of the shop's uploaded photos and
// public page link.
// Requires GEMINI_API_KEY set in the Vercel project's Environment Variables —
// get a free key at https://aistudio.google.com/apikey. Never hardcode it
// here or expose it to the browser.

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_IMAGES = 6;
const MAX_LINK_FETCH_BYTES = 300000;

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
      signal: AbortSignal.timeout(8000),
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

function dataUrlToInlinePart(dataUrl) {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(String(dataUrl || ''));
  if (!m) return null;
  return { inline_data: { mime_type: m[1], data: m[2] } };
}

module.exports = async function handler(req, res) {
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

  let apiRes;
  try {
    apiRes = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1500 },
      }),
    });
  } catch (e) {
    res.status(502).json({ error: 'เรียก Gemini API ไม่สำเร็จ: ' + (e && e.message ? e.message : String(e)) });
    return;
  }

  if (!apiRes.ok) {
    const errText = await apiRes.text().catch(() => '');
    res.status(502).json({ error: `Gemini API error (${apiRes.status}): ${errText.slice(0, 300)}` });
    return;
  }

  const data = await apiRes.json();
  const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');

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
