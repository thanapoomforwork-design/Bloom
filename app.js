(() => {
  'use strict';

  const app = document.getElementById('app');

  const categories = [
    'ร้านอาหาร', 'คาเฟ่/เครื่องดื่ม', 'เบเกอรี่/ขนมหวาน', 'เครื่องประดับ/จิวเวลรี่',
    'แฟชั่น/เสื้อผ้า', 'ความงาม/สกินแคร์', 'ของแฮนด์เมด/DIY', 'ฟิตเนส/สุขภาพ',
    'ของใช้ในบ้าน/ไลฟ์สไตล์', 'สัตว์เลี้ยง', 'การศึกษา/คอร์สเรียน', 'อื่นๆ'
  ];

  const state = {
    screen: 'form',
    shopName: '',
    category: '',
    showValidation: false,
    uploadDataUrl: null,
    weeks: null,
    selectedIdea: null,
  };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ---------- mock plan generation (ported from the design prototype) ----------

  function buildIdea(weekNum, day, raw) {
    const steps = [
      { shot: 1, scene: 'เปิดฉาก / หน้าร้านหรือจุดถ่ายหลัก มุมกว้าง', angle: 'มุมระดับสายตา (Eye level) เคลื่อนกล้องเข้าช้าๆ', lighting: 'แสงธรรมชาติช่วงเช้า หรือเปิดไฟหน้าร้านให้ครบ', action: raw.hook },
      { shot: 2, scene: 'เนื้อหาหลักของคลิป', angle: 'มุมเฉียง 45° ซูมระยะกลาง', lighting: 'แสงนุ่ม (soft light) หลีกเลี่ยงเงาแข็ง', action: raw.mainAction },
      { shot: 3, scene: 'จุดเด่น/รายละเอียดที่อยากให้คนสังเกต', angle: 'Close-up มาโคร', lighting: 'ไฟเสริมด้านข้างหรือแสงจากหน้าต่าง', action: raw.detailPoint },
      { shot: 4, scene: 'ปิดท้าย โลโก้/ชื่อร้าน + Call to action', angle: 'มุมตรง (Straight-on) เห็นหน้าชัดเจน', lighting: 'แสงสว่างทั่วถึง เน้นหน้าคนพูด', action: raw.cta },
    ];
    const script = [
      { time: '0-3 วิ', speaker: 'พิธีกร/เจ้าของร้าน', line: raw.hook },
      { time: '3-12 วิ', speaker: 'พิธีกร', line: raw.mainAction },
      { time: '12-20 วิ', speaker: 'พิธีกร', line: raw.detailPoint },
      { time: `20-${raw.duration}`, speaker: 'พิธีกร', line: raw.cta },
    ];
    const subtitles = raw.subs.map((s, i) => ({ time: ['0-3วิ', '4-10วิ', '11-16วิ', '17-จบ'][i] || `#${i + 1}`, text: s }));
    const caption = `${raw.captionIntro}\n${raw.captionBody}`;
    return {
      day, weekNum, title: raw.title, format: raw.format, duration: raw.duration, hook: raw.hook,
      steps, script, subtitles,
      voiceTone: raw.voiceTone || 'น้ำเสียงสดใส กระตือรือร้น พูดเร็วกระชับ เป็นกันเอง เหมือนคุยกับเพื่อน',
      music: raw.music || 'เพลงจังหวะสนุกสดใส แนวป็อปอัพบีท BPM 120-130 ให้ความรู้สึกน่ารักมีพลัง',
      caption, hashtags: raw.hashtags,
    };
  }

  function generatePlan(shop, cat) {
    const tag = cat.replace(/[^ก-๙a-zA-Z0-9]/g, '');
    const shopTag = shop.replace(/\s/g, '');
    const weekDefs = [
      { num: 1, title: 'สัปดาห์ที่ 1 — เริ่มต้นให้คนรู้จัก', goal: 'เป้าหมาย: แนะนำตัวตนร้าน สร้างความคุ้นเคยกับคนดูกลุ่มแรก', accent: '#ffb0c9', days: [1, 3, 5],
        raws: [
          { title: `แนะนำร้าน ${shop} แบบเร็วๆ 15 วิรู้จบ`, format: 'Reels', duration: '15 วิ',
            hook: `เปิดตัว ${shop} ให้คนรู้จักในไม่กี่วินาที`,
            mainAction: `พาชมภายในร้าน/พื้นที่ทำงาน และไฮไลต์สินค้าเด่น 2-3 ชิ้นแบบเร็วๆ`,
            detailPoint: `ซูมเข้าจุดที่ทำให้ ${shop} ต่างจากร้าน${cat}เจ้าอื่น`,
            cta: `ปิดท้ายด้วย "แวะมาทักทายกันได้ที่ ${shop}" พร้อมโลโก้และช่องทางติดต่อ`,
            captionIntro: `รู้จัก ${shop} ใน 15 วิ! 🌸✨`, captionBody: `ร้าน${cat}ที่ตั้งใจทำทุกชิ้นด้วยใจ มาลองกันได้เลยนะคะ`,
            hashtags: [`#${tag}`, '#ร้านใหม่', '#แนะนำร้าน', `#${shopTag}`],
            subs: ['นี่แหละร้านที่ตามหา!', 'จุดเด่นที่ทำให้คนรัก 💕', 'ของมันต้องมี!', `${shop} รอคุณอยู่ 🌟`] },
          { title: `Behind the scene เบื้องหลังก่อนเปิดร้านของ ${shop}`, format: 'Reels', duration: '25 วิ',
            hook: `พาไปดูความตั้งใจเบื้องหลังก่อนที่สินค้าจะถึงมือลูกค้า`,
            mainAction: `โชว์ขั้นตอนเตรียม/ทำสินค้าในร้าน ${shop} แบบ time-lapse สั้นๆ`,
            detailPoint: `เน้นช็อตมือ/รายละเอียดงานฝีมือหรือความใส่ใจของทีม`,
            cta: `ชวนกดติดตามเพื่อดูเบื้องหลังตอนต่อไป`,
            captionIntro: `กว่าจะมาเป็นสินค้าแต่ละชิ้น... 👀`, captionBody: `ความตั้งใจเล็กๆ ที่ ${shop} อยากให้ทุกคนเห็น`,
            hashtags: [`#${tag}`, '#BehindTheScene', '#ตั้งใจทำ', `#${shopTag}`],
            subs: ['กว่าจะเป็นชิ้นนี้...', 'ทุกขั้นตอนใส่ใจ', 'ทำด้วยมือ ทำด้วยใจ', 'ติดตามตอนต่อไปนะ!'] },
          { title: `แนะนำโปรโมชั่นต้อนรับลูกค้าใหม่ของ ${shop}`, format: 'Reels', duration: '20 วิ',
            hook: `เปิดด้วย "ลูกค้าใหม่ห้ามพลาด!"`,
            mainAction: `อธิบายโปรโมชั่น/ส่วนลดต้อนรับ พร้อมโชว์สินค้าที่ร่วมรายการ`,
            detailPoint: `เน้นวิธีรับสิทธิ์แบบง่ายๆ ภายใน 1 ขั้นตอน`,
            cta: `ชวนกดแชร์ให้เพื่อนมารับสิทธิ์ด้วยกัน`,
            captionIntro: `ต้อนรับลูกค้าใหม่ด้วยของดี! 🎁`, captionBody: `แวะมาที่ ${shop} วันนี้รับสิทธิพิเศษไปเลย`,
            hashtags: [`#${tag}`, '#โปรโมชั่น', '#ลูกค้าใหม่', `#${shopTag}`],
            subs: ['ลูกค้าใหม่ห้ามพลาด!', 'รับสิทธิ์ง่ายมาก', 'แค่ทำตามนี้', 'แชร์ให้เพื่อนด้วยนะ'] },
        ] },
      { num: 2, title: 'สัปดาห์ที่ 2 — สร้างฐานคนดู', goal: 'เป้าหมาย: สร้างความน่าเชื่อถือ ให้คนดูรู้สึกอยากกลับมาดูซ้ำ', accent: '#ff8fb3', days: [8, 10, 12],
        raws: [
          { title: `รีวิวสินค้าขายดีจากมุมมองลูกค้าจริง`, format: 'Reels', duration: '30 วิ',
            hook: `เปิดด้วยคำถาม "ทำไมสินค้าตัวนี้ถึงขายดีที่สุดใน ${shop}?"`,
            mainAction: `สัมภาษณ์/พากย์รีวิวจากมุมมองลูกค้า พร้อมโชว์การใช้งานจริง`,
            detailPoint: `เน้นจุดที่ลูกค้าประทับใจที่สุด 1-2 จุด`,
            cta: `ชวนคนดูคอมเมนต์ว่าอยากให้รีวิวสินค้าตัวไหนต่อ`,
            captionIntro: `ทำไมทุกคนถึงติดใจสินค้าตัวนี้? 🤍`, captionBody: `มาฟังจากปากลูกค้าตัวจริงของ ${shop} กันเลย`,
            hashtags: [`#${tag}`, '#รีวิวสินค้า', '#ลูกค้ารีวิว', `#${shopTag}`],
            subs: ['สินค้าขายดีอันดับ 1', 'ลูกค้าพูดเองเลย!', 'จุดเด่นที่ทุกคนชอบ', 'ลองแล้วจะรู้ 💕'] },
          { title: `Q&A ตอบคำถามที่ลูกค้าถามบ่อยเกี่ยวกับ${cat}`, format: 'Reels', duration: '45 วิ',
            hook: `เปิดด้วย "คำถามที่ทักมาบ่อยที่สุดในเดือนนี้คือ..."`,
            mainAction: `ตอบคำถามยอดฮิต 3-4 ข้อแบบกระชับ ตรงประเด็น`,
            detailPoint: `ใส่ตัวอย่างจริงหรือภาพประกอบสั้นๆ ต่อคำถาม`,
            cta: `ชวนทักแชทถามเพิ่มเติมได้เลย`,
            captionIntro: `รวมคำถามที่ถูกถามบ่อยที่สุด 💬`, captionBody: `${shop} รวบรวมคำตอบมาให้ในคลิปเดียว`,
            hashtags: [`#${tag}`, '#QA', '#ถามตอบ', `#${shopTag}`],
            subs: ['คำถามที่ถามบ่อยที่สุด', 'คำตอบคือ...', 'อย่าลืมจุดนี้!', 'ทักมาถามเพิ่มได้เลย'] },
          { title: `จัดอันดับสินค้าขายดี Top 3 ของ ${shop}`, format: 'Reels', duration: '35 วิ',
            hook: `เปิดด้วย "3 อันดับที่ลูกค้าสั่งซ้ำมากที่สุด"`,
            mainAction: `ไล่โชว์สินค้าอันดับ 3 → 1 พร้อมเหตุผลที่ขายดี`,
            detailPoint: `เน้นจุดขายเฉพาะของอันดับ 1 ให้ชัดที่สุด`,
            cta: `ชวนคนดูโหวตว่าจะลองอันดับไหนก่อน`,
            captionIntro: `3 อันดับสินค้าขายดีที่สุดของเรา 🏆`, captionBody: `ใครยังไม่เคยลอง พลาดมากนะบอกเลย`,
            hashtags: [`#${tag}`, '#TopSeller', '#จัดอันดับ', `#${shopTag}`],
            subs: ['อันดับ 3 คือ...', 'อันดับ 2 มาแรง!', 'อันดับ 1 ตัวจริง', 'โหวตว่าจะลองอันไหน'] },
        ] },
      { num: 3, title: 'สัปดาห์ที่ 3 — ขยายผลให้คนแชร์ต่อ', goal: 'เป้าหมาย: เกาะกระแส/ทำคอนเทนต์ที่แชร์ง่าย เพิ่มการมองเห็น', accent: '#ff6f9c', days: [16, 18, 20],
        raws: [
          { title: `เอาเทรนด์ฮิตมาเล่นกับสินค้าของ ${shop}`, format: 'Reels', duration: '18 วิ',
            hook: `เปิดด้วยจังหวะเพลง/ท่าเต้นเทรนด์ที่กำลังฮิต`,
            mainAction: `ผสมสินค้า/บริการของร้านเข้ากับเทรนด์นั้นอย่างมีชั้นเชิง`,
            detailPoint: `ใส่มุกหรือจุดหักมุมที่ทำให้คนอยากแชร์ต่อ`,
            cta: `ปิดท้ายด้วยแฮชแท็กชวนทำตาม/challenge`,
            captionIntro: `เทรนด์นี้ต้องมี ${shop} ด้วยสิ! 😂`, captionBody: `ใครทันเทรนด์นี้ยกมือขึ้น 🙋‍♀️`,
            hashtags: [`#${tag}`, '#เทรนด์ฮิต', '#Challenge', `#${shopTag}`],
            subs: ['เทรนด์นี้ต้องลอง', 'ผสมกับร้านเราแบบนี้', 'ใครทันมั่งยกมือ', 'แท็กเพื่อนมาดูด่วน!'] },
          { title: `Storytelling เบื้องหลังการทำงานของทีม ${shop}`, format: 'Reels', duration: '58 วิ',
            hook: `เปิดด้วยประโยคที่มาจากใจ "กว่าจะมาเป็น ${shop} วันนี้..."`,
            mainAction: `เล่าเรื่องราวจุดเริ่มต้น อุปสรรค และแรงบันดาลใจของร้าน`,
            detailPoint: `แทรกภาพเบื้องหลังทีมงาน/ช่วงเวลาสำคัญ`,
            cta: `ปิดท้ายด้วยขอบคุณลูกค้าที่ติดตามมาตลอด`,
            captionIntro: `เรื่องราวที่ไม่เคยเล่าที่ไหน 🌷`, captionBody: `กว่าจะมาเป็น ${shop} วันนี้ ผ่านอะไรมาบ้าง`,
            hashtags: [`#${tag}`, '#Storytelling', '#เบื้องหลัง', `#${shopTag}`],
            subs: ['จุดเริ่มต้นเล็กๆ', 'ผ่านอุปสรรคมาด้วยกัน', 'สิ่งที่ทำให้ยังไปต่อ', 'ขอบคุณที่อยู่ด้วยกันนะ'] },
          { title: `Duet/Collab กับลูกค้าหรืออินฟลูฯ ตัวเล็ก`, format: 'Reels', duration: '30 วิ',
            hook: `เปิดฉากแนะนำแขกรับเชิญที่มาเยี่ยมชม ${shop}`,
            mainAction: `พาแขกรับเชิญทดลองสินค้า/บริการสดๆ พร้อมรีแอคชั่นจริง`,
            detailPoint: `เก็บโมเมนต์รีแอคชั่นที่ตลกหรือประทับใจที่สุด`,
            cta: `ชวนแท็กเพื่อนที่อยากมาลองด้วยกัน`,
            captionIntro: `วันนี้พาเพื่อนมาลองด้วย! 🎉`, captionBody: `รีแอคชั่นแบบไม่มีสคริปต์ล้วนๆ จาก ${shop}`,
            hashtags: [`#${tag}`, '#Collab', '#รีแอคชั่น', `#${shopTag}`],
            subs: ['แขกรับเชิญวันนี้คือ...', 'ลองครั้งแรกเป็นไง?', 'รีแอคชั่นสุดจริงใจ', 'แท็กเพื่อนมาลองด้วย!'] },
        ] },
      { num: 4, title: 'สัปดาห์ที่ 4 — ปิดเดือนให้ปัง', goal: 'เป้าหมาย: กระตุ้นยอดขาย/การติดตาม ปิดเดือนด้วยแรงส่งสูงสุด', accent: '#e8467a', days: [24, 27, 30],
        raws: [
          { title: `รวมรีวิวลูกค้าจริง + ยอดที่เติบโตตลอดเดือน`, format: 'Reels', duration: '30 วิ',
            hook: `เปิดด้วยตัวเลข/กราฟการเติบโตแบบง่ายๆ ที่เข้าใจได้ไว`,
            mainAction: `ตัดต่อรวมโมเมนต์รีวิวลูกค้าจริงตลอดเดือนที่ผ่านมา`,
            detailPoint: `เน้นคำพูดหรือคอมเมนต์ที่ประทับใจที่สุดจากลูกค้า`,
            cta: `ขอบคุณลูกค้าทุกคนที่ทำให้ ${shop} เติบโต พร้อมชวนติดตามต่อ`,
            captionIntro: `เดือนนี้เราเติบโตได้เพราะทุกคนเลย 🥹💕`, captionBody: `ขอบคุณที่ไว้ใจ ${shop} มาตลอดเดือนนี้`,
            hashtags: [`#${tag}`, '#ขอบคุณลูกค้า', '#รีแคป', `#${shopTag}`],
            subs: ['เดือนนี้เราโตขึ้นมาก', 'ต้องขอบคุณทุกคนเลย', 'คอมเมนต์นี้ประทับใจสุด', 'แล้วเจอกันเดือนหน้า!'] },
          { title: `แคมเปญ/โปรโมชั่นพิเศษฉลองยอดผู้ติดตาม`, format: 'Reels', duration: '20 วิ',
            hook: `เปิดด้วย "ฉลองครบเดือนนี้ ${shop} จัดโปรพิเศษ!"`,
            mainAction: `อธิบายเงื่อนไขแคมเปญ/ส่วนลดแบบเข้าใจง่าย`,
            detailPoint: `เน้นระยะเวลาจำกัด (limited time) เพื่อกระตุ้นให้รีบตัดสินใจ`,
            cta: `ชวนกดสั่งซื้อ/ทักแชทก่อนโปรหมด`,
            captionIntro: `ฉลองเดือนแรกด้วยโปรสุดพิเศษ! 🎊`, captionBody: `จำกัดเวลา อย่าพลาดนะที่ ${shop}`,
            hashtags: [`#${tag}`, '#แคมเปญพิเศษ', '#จำกัดเวลา', `#${shopTag}`],
            subs: ['ฉลองเดือนแรกด้วยกัน!', 'โปรพิเศษจำกัดเวลา', 'รีบเลยก่อนหมด', 'ทักมาได้เลยตอนนี้'] },
          { title: `สรุปเส้นทาง 1 เดือนที่ผ่านมา + แผนต่อไป`, format: 'Reels', duration: '40 วิ',
            hook: `เปิดด้วย "1 เดือนที่ผ่านมาของ ${shop} เป็นยังไงบ้าง?"`,
            mainAction: `รีแคปไฮไลต์สำคัญตลอดเดือน (คลิปที่คนชอบที่สุด/โมเมนต์เด่น)`,
            detailPoint: `แย้มแผนหรือสินค้าใหม่ที่กำลังจะมาเดือนหน้า`,
            cta: `ชวนกดติดตามเพื่อไม่พลาดคอนเทนต์เดือนหน้า`,
            captionIntro: `สรุป 1 เดือนแรกของเรา 📈`, captionBody: `เดือนหน้ามีของใหม่รอทุกคนอยู่นะ ติดตามไว้เลย`,
            hashtags: [`#${tag}`, '#รีแคปเดือน', '#เร็วๆนี้', `#${shopTag}`],
            subs: ['1 เดือนที่ผ่านมา...', 'ไฮไลต์ที่ทุกคนชอบ', 'เดือนหน้ามีของใหม่', 'ติดตามไว้ไม่พลาดแน่นอน'] },
        ] },
    ];

    return weekDefs.map(w => ({
      num: w.num, title: w.title, goal: w.goal, accent: w.accent,
      ideas: w.raws.map((raw, i) => buildIdea(w.num, w.days[i], raw)),
    }));
  }

  // ---------- rendering ----------

  function render() {
    app.innerHTML = '';
    if (state.screen === 'form') app.appendChild(renderForm());
    else if (state.screen === 'analyzing') app.appendChild(renderAnalyzing());
    else if (state.screen === 'result') app.appendChild(renderResult());
    else if (state.screen === 'detail') app.appendChild(renderDetail());
  }

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function renderForm() {
    const wrap = el(`
      <div class="screen-form">
        <div class="form-hero">
          <h1>เริ่มต้นแผนคอนเทนต์<br/>ของร้านคุณ</h1>
          <p>กรอกข้อมูลร้าน แนบผลงานเก่า แล้วให้ AI วางแผนให้ตั้งแต่ศูนย์จนช่องดัง</p>
        </div>
        <div class="form-card">
          <div class="field">
            <label for="shopName">1. ชื่อร้านของคุณ</label>
            <input type="text" id="shopName" placeholder="เช่น ร้านดอกไม้น้องพลอย" />
            ${state.showValidation && !state.shopName.trim() ? '<div class="field-error">กรุณากรอกชื่อร้าน</div>' : ''}
          </div>
          <div class="field">
            <label for="category">2. ประเภทสินค้า/ร้าน</label>
            <select id="category">
              <option value="">-- เลือกประเภท --</option>
              ${categories.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('')}
            </select>
            ${state.showValidation && !state.category.trim() ? '<div class="field-error">กรุณาเลือกประเภทร้าน</div>' : ''}
          </div>
          <div class="field">
            <label>3. แนบรูป/ผลงานคอนเทนต์เก่า (ถ้ามี)</label>
            <div class="upload-box${state.uploadDataUrl ? ' filled' : ''}" id="uploadBox" tabindex="0" role="button" aria-label="แนบรูปคอนเทนต์เก่า">
              <div class="upload-placeholder">ลากรูปคอนเทนต์เก่ามาวางที่นี่ เพื่อให้ AI วิเคราะห์สไตล์เดิม</div>
              <img class="upload-preview" alt="ตัวอย่างรูปที่แนบ" src="${state.uploadDataUrl || ''}" />
              <button type="button" class="upload-clear" id="uploadClear">ลบรูป</button>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/avif" id="uploadInput" hidden />
            </div>
          </div>
          <button type="button" class="submit-btn" id="submitBtn">วิเคราะห์และวางแผนคอนเทนต์ ✨</button>
        </div>
      </div>
    `);

    const shopNameInput = wrap.querySelector('#shopName');
    shopNameInput.value = state.shopName;
    shopNameInput.addEventListener('input', (e) => { state.shopName = e.target.value; });

    const categorySelect = wrap.querySelector('#category');
    categorySelect.value = state.category;
    categorySelect.addEventListener('change', (e) => { state.category = e.target.value; });

    const uploadBox = wrap.querySelector('#uploadBox');
    const uploadInput = wrap.querySelector('#uploadInput');
    const uploadClear = wrap.querySelector('#uploadClear');

    const openPicker = () => uploadInput.click();
    uploadBox.addEventListener('click', (e) => {
      if (e.target === uploadClear) return;
      openPicker();
    });
    uploadBox.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); }
    });

    uploadInput.addEventListener('change', () => {
      const f = uploadInput.files && uploadInput.files[0];
      if (f) ingestImage(f);
    });

    ['dragenter', 'dragover'].forEach(evt => {
      uploadBox.addEventListener(evt, (e) => {
        e.preventDefault();
        uploadBox.classList.add('drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(evt => {
      uploadBox.addEventListener(evt, (e) => {
        e.preventDefault();
        uploadBox.classList.remove('drag-over');
      });
    });
    uploadBox.addEventListener('drop', (e) => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) ingestImage(f);
    });

    uploadClear.addEventListener('click', (e) => {
      e.stopPropagation();
      state.uploadDataUrl = null;
      render();
    });

    function ingestImage(file) {
      if (!/^image\/(png|jpeg|webp|avif)$/.test(file.type)) return;
      const reader = new FileReader();
      reader.onload = () => {
        state.uploadDataUrl = reader.result;
        render();
      };
      reader.readAsDataURL(file);
    }

    wrap.querySelector('#submitBtn').addEventListener('click', handleSubmit);

    return wrap;
  }

  function handleSubmit() {
    if (!state.shopName.trim() || !state.category.trim()) {
      state.showValidation = true;
      render();
      return;
    }
    state.showValidation = false;
    state.screen = 'analyzing';
    render();
    setTimeout(() => {
      state.weeks = generatePlan(state.shopName.trim(), state.category.trim());
      state.screen = 'result';
      render();
    }, 1200);
  }

  function renderAnalyzing() {
    return el(`
      <div class="screen-analyzing">
        <div class="spinner"></div>
        <div class="analyzing-title">กำลังวิเคราะห์ข้อมูลร้าน "${escapeHtml(state.shopName)}"...</div>
        <div class="analyzing-sub">กำลังวางแผนคอนเทนต์ตั้งแต่เริ่มต้นจนช่องเติบโต 🌱</div>
      </div>
    `);
  }

  function renderResult() {
    const totalIdeas = state.weeks.reduce((sum, w) => sum + w.ideas.length, 0);
    const wrap = el(`
      <div class="screen-result">
        <div class="result-head">
          <div>
            <h1>แผนเติบโตของ ${escapeHtml(state.shopName)}</h1>
            <div class="result-sub">${escapeHtml(state.category)} • รวม ${totalIdeas} ไอเดียคอนเทนต์ ใน 4 เฟส</div>
          </div>
          <button type="button" class="pill-btn" id="backToFormBtn">← แก้ไขข้อมูลร้าน</button>
        </div>
        <div class="weeks" id="weeksWrap"></div>
      </div>
    `);

    wrap.querySelector('#backToFormBtn').addEventListener('click', () => {
      state.screen = 'form';
      state.weeks = null;
      state.selectedIdea = null;
      render();
    });

    const weeksWrap = wrap.querySelector('#weeksWrap');
    state.weeks.forEach(week => {
      const row = el(`
        <div class="week-row">
          <div class="week-rail">
            <div class="week-num" style="background:${week.accent}">${week.num}</div>
            <div class="week-line"></div>
          </div>
          <div class="week-body">
            <div class="week-title">${escapeHtml(week.title)}</div>
            <div class="week-goal">${escapeHtml(week.goal)}</div>
            <div class="idea-grid"></div>
          </div>
        </div>
      `);
      const grid = row.querySelector('.idea-grid');
      week.ideas.forEach(idea => {
        const card = el(`
          <button type="button" class="idea-card">
            <div class="tag-row">
              <span class="tag-format">${escapeHtml(idea.format)}</span>
              <span class="tag-duration">${escapeHtml(idea.duration)}</span>
            </div>
            <div class="idea-title">${escapeHtml(idea.title)}</div>
            <div class="idea-hook">${escapeHtml(idea.hook)}</div>
            <div class="idea-cta">ดูรายละเอียดการถ่ายทำ →</div>
          </button>
        `);
        card.addEventListener('click', () => {
          state.selectedIdea = idea;
          state.screen = 'detail';
          render();
          window.scrollTo(0, 0);
        });
        grid.appendChild(card);
      });
      weeksWrap.appendChild(row);
    });

    return wrap;
  }

  function renderDetail() {
    const idea = state.selectedIdea;
    const wrap = el(`
      <div class="screen-detail">
        <button type="button" class="pill-btn" id="backToResultBtn">← กลับไปดูแผนทั้งหมด</button>
        <div class="detail-badges">
          <span class="badge-format">${escapeHtml(idea.format)}</span>
          <span class="badge-duration">ความยาว ${escapeHtml(idea.duration)}</span>
        </div>
        <div class="detail-title">${escapeHtml(idea.title)}</div>

        <div class="detail-section">
          <h2>🎬 Step ถ่ายทำละเอียด</h2>
          <div class="steps-list">
            ${idea.steps.map(step => `
              <div class="step-card">
                <div class="step-num">${step.shot}</div>
                <div class="step-body">
                  <div class="step-scene">${escapeHtml(step.scene)}</div>
                  <div class="step-meta"><b>มุมกล้อง:</b> ${escapeHtml(step.angle)}</div>
                  <div class="step-meta"><b>แสง:</b> ${escapeHtml(step.lighting)}</div>
                  <div class="step-meta"><b>แอคชั่น:</b> ${escapeHtml(step.action)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="detail-section">
          <h2>📝 บทพูด/สคริปต์เต็ม</h2>
          <div class="script-card">
            ${idea.script.map(line => `
              <div class="script-line">
                <div class="script-time">${escapeHtml(line.time)}</div>
                <div>
                  <div class="script-speaker">${escapeHtml(line.speaker)}</div>
                  <div class="script-text">${escapeHtml(line.line)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="detail-section">
          <h2>💬 ซับไตเติล</h2>
          <div class="subtitle-list">
            ${idea.subtitles.map(sub => `
              <div class="subtitle-row">
                <div class="subtitle-time">${escapeHtml(sub.time)}</div>
                <div class="subtitle-text">${escapeHtml(sub.text)}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="tone-grid">
          <div class="tone-card">
            <h3>🎙️ น้ำเสียง</h3>
            <p>${escapeHtml(idea.voiceTone)}</p>
          </div>
          <div class="tone-card">
            <h3>🎵 เพลงประกอบ</h3>
            <p>${escapeHtml(idea.music)}</p>
          </div>
        </div>

        <div class="detail-section">
          <h2>🏷️ แคปชั่น + แฮชแท็ก</h2>
          <div class="caption-card">
            <div class="caption-text">${escapeHtml(idea.caption)}</div>
            <div class="hashtag-row">
              ${idea.hashtags.map(tag => `<span class="hashtag">${escapeHtml(tag)}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>
    `);

    wrap.querySelector('#backToResultBtn').addEventListener('click', () => {
      state.screen = 'result';
      render();
      window.scrollTo(0, 0);
    });

    return wrap;
  }

  render();
})();
