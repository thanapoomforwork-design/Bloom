(() => {
  'use strict';

  const app = document.getElementById('app');

  const MAX_UPLOAD_IMAGES = 6;

  const categories = [
    'ร้านอาหาร', 'คาเฟ่/เครื่องดื่ม', 'เบเกอรี่/ขนมหวาน', 'เครื่องประดับ/จิวเวลรี่',
    'แฟชั่น/เสื้อผ้า', 'ความงาม/สกินแคร์', 'ของแฮนด์เมด/DIY', 'ฟิตเนส/สุขภาพ',
    'ของใช้ในบ้าน/ไลฟ์สไตล์', 'สัตว์เลี้ยง', 'การศึกษา/คอร์สเรียน', 'อื่นๆ'
  ];

  const state = {
    screen: 'form',
    shopName: '',
    category: '',
    shopLink: '',
    showValidation: false,
    uploadImages: [],
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
      day, weekNum, title: raw.title, format: raw.format || 'Reels', duration: raw.duration, hook: raw.hook,
      steps, script, subtitles,
      voiceTone: raw.voiceTone || 'น้ำเสียงสดใส กระตือรือร้น พูดเร็วกระชับ เป็นกันเอง เหมือนคุยกับเพื่อน',
      music: raw.music || 'เพลงจังหวะสนุกสดใส แนวป็อปอัพบีท BPM 120-130 ให้ความรู้สึกน่ารักมีพลัง',
      caption, hashtags: raw.hashtags,
    };
  }

  // Per-category vocabulary so the same 28-day angle skeleton reads as
  // genuinely different content depending on the kind of business.
  const CATEGORY_PROFILES = {
    'ร้านอาหาร': { noun: 'เมนู', unit: 'จาน', place: 'ในครัว/หน้าร้าน', customer: 'ลูกค้า', verb: 'ปรุง',
      highlight: 'ควันร้อนๆ และเนื้อสัมผัสของอาหารตอนตัก', tip: 'เคล็ดลับเลือกวัตถุดิบสดใหม่ทุกเช้า',
      transform: 'เมนูจานแรกที่ปรุงตอนเปิดร้านกับฝีมือตอนนี้ที่พัฒนาสูตรขึ้นมาก',
      secret: 'สูตรลับที่ใช้เวลาคิดค้นนานที่สุดในเมนู', extraTags: ['#ของกินอร่อย', '#รีวิวร้านอาหาร'] },
    'คาเฟ่/เครื่องดื่ม': { noun: 'เครื่องดื่ม', unit: 'แก้ว', place: 'หลังบาร์กาแฟ', customer: 'ลูกค้า', verb: 'ชง',
      highlight: 'ลาเต้อาร์ตและฟองนมตอนเท', tip: 'เคล็ดลับชงให้รสชาติคงที่ทุกแก้ว',
      transform: 'แก้วแรกที่ชงกับฝีมือตอนนี้ที่ชำนาญขึ้นมาก',
      secret: 'เมล็ดกาแฟ/วัตถุดิบที่คัดพิเศษเฉพาะร้าน', extraTags: ['#คาเฟ่', '#กาแฟ'] },
    'เบเกอรี่/ขนมหวาน': { noun: 'ขนม', unit: 'ชิ้น', place: 'หน้าเตาอบ', customer: 'ลูกค้า', verb: 'อบ',
      highlight: 'ไส้ขนมตอนตัดและความกรอบนอกนุ่มใน', tip: 'เคล็ดลับอบให้กรอบนอกนุ่มในทุกครั้ง',
      transform: 'ขนมชิ้นแรกที่อบกับฝีมือที่พัฒนาขึ้นจนถึงตอนนี้',
      secret: 'ส่วนผสมลับที่ทำให้ขนมอร่อยไม่เหมือนที่ไหน', extraTags: ['#เบเกอรี่', '#ขนมหวาน'] },
    'เครื่องประดับ/จิวเวลรี่': { noun: 'เครื่องประดับ', unit: 'ชิ้น', place: 'โต๊ะจัดแสดงเครื่องประดับ', customer: 'ลูกค้า', verb: 'ออกแบบ',
      highlight: 'แสงสะท้อนประกายของอัญมณี', tip: 'เคล็ดลับเลือกไซส์แหวน/สร้อยให้พอดี',
      transform: 'ภาพร่างดีไซน์แรกกับชิ้นงานจริงที่เสร็จสมบูรณ์',
      secret: 'แรงบันดาลใจเบื้องหลังดีไซน์ยอดนิยม', extraTags: ['#เครื่องประดับ', '#จิวเวลรี่'] },
    'แฟชั่น/เสื้อผ้า': { noun: 'ชุด', unit: 'ชุด', place: 'ห้องลองชุด', customer: 'ลูกค้า', verb: 'ตัดเย็บ',
      highlight: 'รายละเอียดผ้าและตะเข็บตอนสวมใส่', tip: 'เคล็ดลับมิกซ์แอนด์แมตช์ชุดให้ดูมีสไตล์',
      transform: 'ลุคก่อนแต่งตัวกับหลังใส่ชุดจากร้าน',
      secret: 'แรงบันดาลใจการออกแบบคอลเลกชั่นล่าสุด', extraTags: ['#แฟชั่น', '#OOTD'] },
    'ความงาม/สกินแคร์': { noun: 'ผลิตภัณฑ์', unit: 'ขวด', place: 'เคาน์เตอร์สกินแคร์', customer: 'ลูกค้า', verb: 'คิดค้น',
      highlight: 'เนื้อสัมผัสตอนเทหรือทาลงผิว', tip: 'เคล็ดลับใช้ผลิตภัณฑ์ให้เห็นผลไวขึ้น',
      transform: 'สภาพผิวก่อนใช้กับหลังใช้ต่อเนื่อง',
      secret: 'ส่วนผสมสำคัญที่ทำให้ผลิตภัณฑ์นี้พิเศษ', extraTags: ['#สกินแคร์', '#ความงาม'] },
    'ของแฮนด์เมด/DIY': { noun: 'ผลงานแฮนด์เมด', unit: 'ชิ้น', place: 'โต๊ะทำงานฝีมือ', customer: 'ลูกค้า', verb: 'ประดิษฐ์',
      highlight: 'รายละเอียดลวดลายที่ทำด้วยมือ', tip: 'เคล็ดลับดูแลรักษาให้งานแฮนด์เมดอยู่ได้นาน',
      transform: 'ชิ้นงานแรกที่ทำกับฝีมือที่ประณีตขึ้นตอนนี้',
      secret: 'เทคนิคเฉพาะตัวที่ใช้เวลาฝึกฝนนานที่สุด', extraTags: ['#แฮนด์เมด', '#DIY'] },
    'ฟิตเนส/สุขภาพ': { noun: 'โปรแกรมออกกำลังกาย', unit: 'ท่า', place: 'ในยิม/สตูดิโอ', customer: 'สมาชิก', verb: 'ออกแบบ',
      highlight: 'ฟอร์มท่าออกกำลังกายที่ถูกต้อง', tip: 'เคล็ดลับออกกำลังกายให้เห็นผลไวและไม่บาดเจ็บ',
      transform: 'หุ่นก่อนเริ่มโปรแกรมกับหลังฝึกต่อเนื่อง',
      secret: 'ความลับของโปรแกรมที่สมาชิกชอบที่สุด', extraTags: ['#ฟิตเนส', '#ออกกำลังกาย'] },
    'ของใช้ในบ้าน/ไลฟ์สไตล์': { noun: 'ของแต่งบ้าน', unit: 'ชิ้น', place: 'มุมจัดวางของแต่งบ้าน', customer: 'ลูกค้า', verb: 'คัดสรร',
      highlight: 'การจัดวางและพื้นผิวของสินค้า', tip: 'เคล็ดลับจัดบ้านให้ดูมีสไตล์ง่ายๆ',
      transform: 'มุมบ้านก่อนจัดกับหลังจัดด้วยของจากร้าน',
      secret: 'ที่มาของดีไซน์สินค้าที่ขายดีที่สุด', extraTags: ['#ของแต่งบ้าน', '#ไลฟ์สไตล์'] },
    'สัตว์เลี้ยง': { noun: 'สินค้าสำหรับสัตว์เลี้ยง', unit: 'ชิ้น', place: 'ในร้าน/พื้นที่ดูแลสัตว์เลี้ยง', customer: 'ทาสน้องหมาน้องแมว', verb: 'คัดสรร',
      highlight: 'พฤติกรรมน่ารักของสัตว์เลี้ยงตอนใช้สินค้า', tip: 'เคล็ดลับเลือกของให้เหมาะกับสัตว์เลี้ยงแต่ละตัว',
      transform: 'น้องก่อนใช้สินค้ากับหลังใช้ต่อเนื่อง',
      secret: 'เรื่องน่ารักที่ลูกค้าเล่าถึงน้องๆ ที่ใช้สินค้า', extraTags: ['#สัตว์เลี้ยง', '#ทาสหมาแมว'] },
    'การศึกษา/คอร์สเรียน': { noun: 'คอร์สเรียน', unit: 'คอร์ส', place: 'ในห้องเรียน/สตูดิโอ', customer: 'นักเรียน', verb: 'สอน',
      highlight: 'จุดที่นักเรียนเข้าใจและทำได้จริง', tip: 'เคล็ดลับเรียนให้เข้าใจไวและจำได้นาน',
      transform: 'นักเรียนก่อนเรียนกับหลังจบคอร์ส',
      secret: 'เทคนิคการสอนที่นักเรียนชอบที่สุด', extraTags: ['#คอร์สเรียน', '#เรียนออนไลน์'] },
    'อื่นๆ': { noun: 'สินค้า/บริการ', unit: 'ชิ้น', place: 'หน้าร้าน', customer: 'ลูกค้า', verb: 'ทำ',
      highlight: 'รายละเอียดเด่นของสินค้า/บริการ', tip: 'เคล็ดลับเลือกใช้สินค้า/บริการให้คุ้มค่าที่สุด',
      transform: 'ตอนเริ่มต้นกับตอนนี้ที่พัฒนาขึ้นมาก',
      secret: 'เบื้องหลังเล็กๆ ที่ทำให้ร้านนี้พิเศษ', extraTags: ['#รีวิวสินค้า', '#แนะนำร้าน'] },
  };

  // 4 weeks x 7 days = 28 daily content angles. Every angle is worded with
  // the category profile (p) so the wording, product noun, and scenes
  // genuinely differ by business type instead of only swapping the label.
  const ANGLES_BY_WEEK = [
    [ // Week 1 — เริ่มต้นให้คนรู้จัก
      (shop, cat, p, tag, shopTag) => ({
        title: `แนะนำร้าน ${shop} แบบเร็วๆ รู้จักภายใน 15 วิ`, duration: '15 วิ',
        hook: `เปิดตัว ${shop} ให้คนรู้จักในไม่กี่วินาที`,
        mainAction: `พาชม${p.place}และไฮไลต์${p.noun}เด่น 2-3 ${p.unit}แบบเร็วๆ`,
        detailPoint: `ซูมเข้าจุดที่ทำให้ ${shop} ต่างจากร้าน${cat}เจ้าอื่น`,
        cta: `ปิดท้ายด้วย "แวะมาทักทายกันได้ที่ ${shop}" พร้อมโลโก้และช่องทางติดต่อ`,
        captionIntro: `รู้จัก ${shop} ใน 15 วิ! 🌸✨`, captionBody: `ร้าน${cat}ที่ตั้งใจ${p.verb}ทุก${p.unit}ด้วยใจ มาลองกันได้เลยนะคะ`,
        hashtags: [`#${tag}`, p.extraTags[0], '#แนะนำร้าน', `#${shopTag}`],
        subs: ['นี่แหละร้านที่ตามหา!', 'จุดเด่นที่ทำให้คนรัก 💕', 'ของมันต้องมี!', `${shop} รอคุณอยู่ 🌟`] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `พาทัวร์${p.place}ของ ${shop} วันธรรมดา`, duration: '20 วิ',
        hook: `เปิดประตูพาไปดูว่าเบื้องหลัง ${shop} หน้าตาเป็นยังไง`,
        mainAction: `เดินสำรวจ${p.place} โชว์บรรยากาศการทำงานจริงแบบวันต่อวัน`,
        detailPoint: `แทรกช็อต${p.highlight}ระหว่างทาง`,
        cta: `ชวนกดติดตามเพื่อดูเบื้องหลังวันอื่นๆ ต่อ`,
        captionIntro: `พาทัวร์${p.place}วันนี้กัน 👀`, captionBody: `บรรยากาศจริงของ ${shop} ที่ไม่ค่อยมีใครเห็น`,
        hashtags: [`#${tag}`, p.extraTags[1], '#BehindTheScene', `#${shopTag}`],
        subs: ['มาดูข้างในกัน', 'ตรงนี้แหละที่ทุกอย่างเริ่มต้น', 'บรรยากาศจริงๆ', 'ติดตามตอนต่อไปนะ!'] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `เปิดตัว${p.noun}เด่นตัวแรกของ ${shop}`, duration: '25 วิ',
        hook: `${p.noun}ตัวนี้คือของที่ ${shop} ภูมิใจนำเสนอที่สุด`,
        mainAction: `โชว์ขั้นตอนการ${p.verb}${p.noun}ตัวเด่นแบบใกล้ชิด`,
        detailPoint: `ซูมเข้า${p.highlight}ให้เห็นชัดๆ`,
        cta: `ชวนคนดูมาลอง${p.noun}ตัวนี้ที่ ${shop}`,
        captionIntro: `${p.noun}ตัวเด่นที่ต้องลอง! ✨`, captionBody: `กว่าจะออกมาเป็น${p.noun}ตัวนี้ ${shop} ตั้งใจ${p.verb}ทุกขั้นตอน`,
        hashtags: [`#${tag}`, p.extraTags[0], '#สินค้าเด่น', `#${shopTag}`],
        subs: ['ตัวนี้แหละของดี', 'ทุกขั้นตอนใส่ใจ', 'รายละเอียดที่ต้องดู', 'ลองแล้วจะติดใจ 💕'] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `จุดเริ่มต้นของ ${shop} ทำไมถึงมาทำ${cat}`, duration: '30 วิ',
        hook: `เปิดด้วยประโยคจากใจ "กว่าจะมาเป็น ${shop} วันนี้..."`,
        mainAction: `เล่าเหตุผลและแรงบันดาลใจที่ทำให้เริ่ม${p.verb}${p.noun}`,
        detailPoint: `แทรกภาพช่วงเริ่มต้นเทียบกับตอนนี้`,
        cta: `ขอบคุณคนที่ติดตามมาตั้งแต่ต้น`,
        captionIntro: `จุดเริ่มต้นเล็กๆ ของ ${shop} 🌷`, captionBody: `ทุกอย่างเริ่มจากใจรักใน${cat} จนมาเป็น ${shop} วันนี้`,
        hashtags: [`#${tag}`, p.extraTags[1], '#เรื่องราวร้าน', `#${shopTag}`],
        subs: ['จุดเริ่มต้นเล็กๆ', 'ผ่านอะไรมาบ้าง', 'ทำไมถึงยังทำต่อ', 'ขอบคุณที่อยู่ด้วยกันนะ'] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `โปรต้อนรับ${p.customer}ใหม่ของ ${shop}`, duration: '20 วิ',
        hook: `เปิดด้วย "${p.customer}ใหม่ห้ามพลาด!"`,
        mainAction: `อธิบายโปรโมชั่น/ส่วนลดต้อนรับ พร้อมโชว์${p.noun}ที่ร่วมรายการ`,
        detailPoint: `เน้นวิธีรับสิทธิ์แบบง่ายๆ ภายใน 1 ขั้นตอน`,
        cta: `ชวนกดแชร์ให้เพื่อนมารับสิทธิ์ด้วยกัน`,
        captionIntro: `ต้อนรับ${p.customer}ใหม่ด้วยของดี! 🎁`, captionBody: `แวะมาที่ ${shop} วันนี้รับสิทธิพิเศษไปเลย`,
        hashtags: [`#${tag}`, p.extraTags[0], '#โปรโมชั่น', `#${shopTag}`],
        subs: [`${p.customer}ใหม่ห้ามพลาด!`, 'รับสิทธิ์ง่ายมาก', 'แค่ทำตามนี้', 'แชร์ให้เพื่อนด้วยนะ'] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `เคล็ดลับ${cat}ที่ ${shop} อยากบอกต่อ`, duration: '30 วิ',
        hook: `เปิดด้วย "มีเคล็ดลับดีๆ มาฝาก${p.customer}ทุกคน"`,
        mainAction: `อธิบาย${p.tip}แบบเข้าใจง่าย พร้อมตัวอย่างจริง`,
        detailPoint: `เน้นจุดที่คนมักพลาดหรือไม่รู้มาก่อน`,
        cta: `ชวนคนดูเซฟคลิปนี้ไว้ดูซ้ำ`,
        captionIntro: `เคล็ดลับที่ ${p.customer}ควรรู้! 📌`, captionBody: `${p.tip} — ลองเอาไปใช้ได้เลยนะ`,
        hashtags: [`#${tag}`, p.extraTags[1], '#เคล็ดลับ', `#${shopTag}`],
        subs: ['เคล็ดลับที่ต้องรู้', 'หลายคนพลาดตรงนี้', 'ทำแบบนี้แหละ', 'เซฟไว้ดูซ้ำได้เลย'] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `สัปดาห์แรกผ่านไป ${shop} อยากรู้ว่าอยากดูอะไรต่อ`, duration: '20 วิ',
        hook: `สรุปสั้นๆ ว่าสัปดาห์นี้ ${shop} พาไปรู้จักอะไรมาบ้าง`,
        mainAction: `รวมไฮไลต์คลิปที่ผ่านมาในสัปดาห์แบบเร็วๆ`,
        detailPoint: `ถามคนดูว่าอยากให้รีวิว${p.noun}ตัวไหนต่อ`,
        cta: `ชวนคอมเมนต์โหวตกันเข้ามาได้เลย`,
        captionIntro: `สัปดาห์แรกผ่านไปแล้ว! 🎉`, captionBody: `อยากให้ ${shop} ทำคลิปแบบไหนต่อ คอมเมนต์บอกกันได้เลยนะ`,
        hashtags: [`#${tag}`, p.extraTags[0], '#รีแคป', `#${shopTag}`],
        subs: ['สัปดาห์แรกผ่านไปแล้ว', 'ขอบคุณที่ติดตามนะ', 'อยากดูอะไรต่อ', 'คอมเมนต์บอกมาได้เลย'] }),
    ],
    [ // Week 2 — สร้างฐานคนดู
      (shop, cat, p, tag, shopTag) => ({
        title: `รีวิว${p.noun}ขายดีจากมุมมอง${p.customer}จริง`, duration: '30 วิ',
        hook: `เปิดด้วยคำถาม "ทำไม${p.noun}ตัวนี้ถึงขายดีที่สุดใน ${shop}?"`,
        mainAction: `สัมภาษณ์/พากย์รีวิวจากมุมมอง${p.customer} พร้อมโชว์การใช้งานจริง`,
        detailPoint: `เน้นจุดที่${p.customer}ประทับใจที่สุด 1-2 จุด`,
        cta: `ชวนคนดูคอมเมนต์ว่าอยากให้รีวิว${p.noun}ตัวไหนต่อ`,
        captionIntro: `ทำไมทุกคนถึงติดใจ${p.noun}ตัวนี้? 🤍`, captionBody: `มาฟังจากปาก${p.customer}ตัวจริงของ ${shop} กันเลย`,
        hashtags: [`#${tag}`, p.extraTags[1], '#รีวิวลูกค้า', `#${shopTag}`],
        subs: [`${p.noun}ขายดีอันดับ 1`, `${p.customer}พูดเองเลย!`, 'จุดเด่นที่ทุกคนชอบ', 'ลองแล้วจะรู้ 💕'] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `Q&A ตอบคำถามที่${p.customer}ถามบ่อยเกี่ยวกับ${cat}`, duration: '45 วิ',
        hook: `เปิดด้วย "คำถามที่ทักมาบ่อยที่สุดในเดือนนี้คือ..."`,
        mainAction: `ตอบคำถามยอดฮิต 3-4 ข้อแบบกระชับ ตรงประเด็น`,
        detailPoint: `ใส่ตัวอย่างจริงหรือภาพประกอบสั้นๆ ต่อคำถาม`,
        cta: `ชวนทักแชทถามเพิ่มเติมได้เลย`,
        captionIntro: `รวมคำถามที่ถูกถามบ่อยที่สุด 💬`, captionBody: `${shop} รวบรวมคำตอบมาให้ในคลิปเดียว`,
        hashtags: [`#${tag}`, '#QA', p.extraTags[0], `#${shopTag}`],
        subs: ['คำถามที่ถามบ่อยที่สุด', 'คำตอบคือ...', 'อย่าลืมจุดนี้!', 'ทักมาถามเพิ่มได้เลย'] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `จัดอันดับ${p.noun}ขายดี Top 3 ของ ${shop}`, duration: '35 วิ',
        hook: `เปิดด้วย "3 อันดับที่${p.customer}สั่งซ้ำมากที่สุด"`,
        mainAction: `ไล่โชว์${p.noun}อันดับ 3 → 1 พร้อมเหตุผลที่ขายดี`,
        detailPoint: `เน้นจุดขายเฉพาะของอันดับ 1 ให้ชัดที่สุด`,
        cta: `ชวนคนดูโหวตว่าจะลองอันดับไหนก่อน`,
        captionIntro: `3 อันดับ${p.noun}ขายดีที่สุดของเรา 🏆`, captionBody: `ใครยังไม่เคยลอง พลาดมากนะบอกเลย`,
        hashtags: [`#${tag}`, p.extraTags[1], '#TopSeller', `#${shopTag}`],
        subs: ['อันดับ 3 คือ...', 'อันดับ 2 มาแรง!', 'อันดับ 1 ตัวจริง', 'โหวตว่าจะลองอันไหน'] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `วิธีเลือก/ใช้${p.noun}ให้คุ้มที่สุด`, duration: '40 วิ',
        hook: `เปิดด้วย "${p.customer}หลายคนยังไม่รู้เรื่องนี้"`,
        mainAction: `สอนวิธีเลือกหรือใช้${p.noun}ทีละขั้นตอนแบบเข้าใจง่าย`,
        detailPoint: `เน้น${p.highlight}ที่ควรสังเกตก่อนตัดสินใจ`,
        cta: `ชวนเซฟคลิปไว้ใช้เป็นไกด์`,
        captionIntro: `วิธีเลือก${p.noun}ให้คุ้มที่สุด 📋`, captionBody: `${shop} สรุปมาให้ครบในคลิปเดียว`,
        hashtags: [`#${tag}`, '#HowTo', p.extraTags[0], `#${shopTag}`],
        subs: ['หลายคนพลาดตรงนี้', 'ทำตามนี้เลย', 'ข้อนี้สำคัญมาก', 'เซฟไว้ใช้ได้เลย'] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `เบื้องหลังขั้นตอนการ${p.verb}${p.noun}ของ ${shop}`, duration: '30 วิ',
        hook: `พาไปดูความตั้งใจเบื้องหลังก่อนที่${p.noun}จะถึงมือ${p.customer}`,
        mainAction: `โชว์ขั้นตอน${p.verb}${p.noun}ในร้านแบบ time-lapse สั้นๆ`,
        detailPoint: `เน้นช็อตมือ/${p.highlight}`,
        cta: `ชวนกดติดตามเพื่อดูเบื้องหลังตอนต่อไป`,
        captionIntro: `กว่าจะมาเป็น${p.noun}แต่ละ${p.unit}... 👀`, captionBody: `ความตั้งใจเล็กๆ ที่ ${shop} อยากให้ทุกคนเห็น`,
        hashtags: [`#${tag}`, p.extraTags[1], '#BehindTheScene', `#${shopTag}`],
        subs: ['กว่าจะเป็นชิ้นนี้...', 'ทุกขั้นตอนใส่ใจ', `${p.verb}ด้วยมือ ทำด้วยใจ`, 'ติดตามตอนต่อไปนะ!'] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `ก่อน-หลัง: ${p.transform}`, duration: '25 วิ',
        hook: `เปิดด้วยภาพ "ก่อน" ที่หลายคนอาจไม่เคยเห็น`,
        mainAction: `เทียบให้เห็นความเปลี่ยนแปลงชัดๆ แบบ split screen หรือสลับภาพ`,
        detailPoint: `เน้นรายละเอียดที่เปลี่ยนไปมากที่สุด`,
        cta: `ชวนคนดูคอมเมนต์ว่าเห็นความต่างตรงไหนบ้าง`,
        captionIntro: `ก่อน-หลัง ที่ต้องดู! 😳`, captionBody: `${p.transform} — ใครเห็นความต่างมั่ง`,
        hashtags: [`#${tag}`, '#BeforeAfter', p.extraTags[0], `#${shopTag}`],
        subs: ['ก่อนหน้านี้เป็นแบบนี้', 'พอเทียบกับตอนนี้...', 'เห็นความต่างมั้ย?', 'คอมเมนต์บอกหน่อย'] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `2 สัปดาห์ที่ผ่านมาของ ${shop} เป็นยังไงบ้าง`, duration: '25 วิ',
        hook: `เปิดด้วย "2 สัปดาห์แรกของ ${shop} ผ่านไปเร็วมาก"`,
        mainAction: `รวมไฮไลต์คลิปที่คนชอบที่สุดในสัปดาห์ที่ผ่านมา`,
        detailPoint: `เน้นคอมเมนต์หรือฟีดแบ็กที่ประทับใจที่สุด`,
        cta: `ขอบคุณ${p.customer}ทุกคนที่ติดตามมาตลอด`,
        captionIntro: `2 สัปดาห์แรกผ่านไปแล้ว 🥹`, captionBody: `ขอบคุณทุกคนที่ทำให้ ${shop} มีวันนี้`,
        hashtags: [`#${tag}`, p.extraTags[1], '#ขอบคุณ', `#${shopTag}`],
        subs: ['2 สัปดาห์ผ่านไปเร็วมาก', 'ขอบคุณทุกคนเลย', 'คอมเมนต์นี้ประทับใจสุด', 'ไปต่อสัปดาห์หน้ากัน!'] }),
    ],
    [ // Week 3 — ขยายผลให้คนแชร์ต่อ
      (shop, cat, p, tag, shopTag) => ({
        title: `เอาเทรนด์ฮิตมาเล่นกับ${p.noun}ของ ${shop}`, duration: '18 วิ',
        hook: `เปิดด้วยจังหวะเพลง/ท่าเต้นเทรนด์ที่กำลังฮิต`,
        mainAction: `ผสม${p.noun}ของร้านเข้ากับเทรนด์นั้นอย่างมีชั้นเชิง`,
        detailPoint: `ใส่มุกหรือจุดหักมุมที่ทำให้คนอยากแชร์ต่อ`,
        cta: `ปิดท้ายด้วยแฮชแท็กชวนทำตาม/challenge`,
        captionIntro: `เทรนด์นี้ต้องมี ${shop} ด้วยสิ! 😂`, captionBody: `ใครทันเทรนด์นี้ยกมือขึ้น 🙋‍♀️`,
        hashtags: [`#${tag}`, '#เทรนด์ฮิต', p.extraTags[0], `#${shopTag}`],
        subs: ['เทรนด์นี้ต้องลอง', 'ผสมกับร้านเราแบบนี้', 'ใครทันมั่งยกมือ', 'แท็กเพื่อนมาดูด่วน!'] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `Storytelling เบื้องหลังการทำงานของทีม ${shop}`, duration: '58 วิ',
        hook: `เปิดด้วยประโยคที่มาจากใจ "กว่าจะมาเป็น ${shop} วันนี้..."`,
        mainAction: `เล่าเรื่องราวจุดเริ่มต้น อุปสรรค และแรงบันดาลใจของร้าน`,
        detailPoint: `แทรกภาพเบื้องหลังทีมงาน/ช่วงเวลาสำคัญ`,
        cta: `ปิดท้ายด้วยขอบคุณ${p.customer}ที่ติดตามมาตลอด`,
        captionIntro: `เรื่องราวที่ไม่เคยเล่าที่ไหน 🌷`, captionBody: `กว่าจะมาเป็น ${shop} วันนี้ ผ่านอะไรมาบ้าง`,
        hashtags: [`#${tag}`, '#Storytelling', p.extraTags[1], `#${shopTag}`],
        subs: ['จุดเริ่มต้นเล็กๆ', 'ผ่านอุปสรรคมาด้วยกัน', 'สิ่งที่ทำให้ยังไปต่อ', 'ขอบคุณที่อยู่ด้วยกันนะ'] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `Duet/Collab กับ${p.customer}หรืออินฟลูฯตัวเล็ก`, duration: '30 วิ',
        hook: `เปิดฉากแนะนำแขกรับเชิญที่มาเยี่ยมชม ${shop}`,
        mainAction: `พาแขกรับเชิญทดลอง${p.noun}สดๆ พร้อมรีแอคชั่นจริง`,
        detailPoint: `เก็บโมเมนต์รีแอคชั่นที่ตลกหรือประทับใจที่สุด`,
        cta: `ชวนแท็กเพื่อนที่อยากมาลองด้วยกัน`,
        captionIntro: `วันนี้พาเพื่อนมาลองด้วย! 🎉`, captionBody: `รีแอคชั่นแบบไม่มีสคริปต์ล้วนๆ จาก ${shop}`,
        hashtags: [`#${tag}`, '#Collab', p.extraTags[0], `#${shopTag}`],
        subs: ['แขกรับเชิญวันนี้คือ...', 'ลองครั้งแรกเป็นไง?', 'รีแอคชั่นสุดจริงใจ', 'แท็กเพื่อนมาลองด้วย!'] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `ชวน${p.customer}เล่น Challenge กับ ${shop}`, duration: '20 วิ',
        hook: `เปิดด้วยกติกาสั้นๆ ของ challenge สนุกๆ`,
        mainAction: `ทำ challenge ที่เกี่ยวกับ${p.noun}ให้ดูเป็นตัวอย่าง`,
        detailPoint: `เน้นจังหวะสนุกหรือเซอร์ไพรส์ที่ทำให้คนอยากลองทำตาม`,
        cta: `ชวนถ่ายคลิปทำตามแล้วแท็ก ${shop} มาได้เลย`,
        captionIntro: `ใครกล้าเล่น Challenge นี้บ้าง? 😆`, captionBody: `ลองทำตามแล้วแท็ก ${shop} มาโชว์กันได้เลย`,
        hashtags: [`#${tag}`, '#Challenge', p.extraTags[1], `#${shopTag}`],
        subs: ['กติกาง่ายๆ แค่นี้', 'ลองดูสิเป็นไง', 'สนุกกว่าที่คิด!', 'แท็กมาโชว์กันได้เลย'] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `ความลับของ ${shop} ที่ไม่เคยเล่าที่ไหน`, duration: '25 วิ',
        hook: `เปิดด้วย "มีเรื่องนึงที่ไม่เคยบอกใครมาก่อน"`,
        mainAction: `เล่า${p.secret}ให้คนดูฟังแบบเป็นกันเอง`,
        detailPoint: `ใส่ภาพประกอบหรือหลักฐานสนุกๆ ที่ทำให้เรื่องน่าเชื่อถือ`,
        cta: `ถามคนดูว่ามีความลับร้านค้าที่อยากรู้เรื่องไหนอีก`,
        captionIntro: `ความลับที่เพิ่งเปิดเผยครั้งแรก 🤫`, captionBody: `${p.secret} — เพิ่งเคยเล่าที่นี่ที่แรก`,
        hashtags: [`#${tag}`, '#FunFact', p.extraTags[0], `#${shopTag}`],
        subs: ['ไม่เคยเล่าที่ไหนมาก่อน', 'เรื่องนี้แหละที่ลับสุด', 'เชื่อมั้ยว่าจริง?', 'อยากรู้เรื่องไหนอีกบอกมา'] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `โพลสนุกๆ นี่หรือนั่น กับ ${shop}`, duration: '15 วิ',
        hook: `เปิดด้วยคำถามเลือกง่ายๆ ที่เกี่ยวกับ${p.noun}`,
        mainAction: `โชว์ตัวเลือก 2 แบบให้คนดูโหวตแบบสนุกๆ`,
        detailPoint: `เน้นความแตกต่างของแต่ละตัวเลือกให้ชัดเจน`,
        cta: `ชวนคอมเมนต์โหวตว่าเลือกอันไหน`,
        captionIntro: `นี่หรือนั่น โหวตกันหน่อย! 🗳️`, captionBody: `อยากรู้ว่า${p.customer}ส่วนใหญ่ชอบแบบไหนมากกว่ากัน`,
        hashtags: [`#${tag}`, '#โพลสนุกๆ', p.extraTags[1], `#${shopTag}`],
        subs: ['เลือกยากมาก!', 'แบบไหนดีกว่ากัน?', 'โหวตกันเข้ามาเลย', 'ผลโหวตน่าสนใจมาก'] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `รวมคอมเมนต์/DM ตลกๆ จาก${p.customer}ของ ${shop}`, duration: '30 วิ',
        hook: `เปิดด้วย "มีคอมเมนต์นึงที่ฮามาก ต้องเอามาเล่าให้ฟัง"`,
        mainAction: `รวมคอมเมนต์หรือข้อความตลกๆ ที่ได้รับมาตลอดสัปดาห์`,
        detailPoint: `เน้นรีแอคชั่นสดของแอดมิน/เจ้าของร้านตอนอ่าน`,
        cta: `ชวนคนดูส่งคอมเมนต์ตลกๆ มาเพิ่มได้เลย`,
        captionIntro: `รวมคอมเมนต์ฮาๆ ประจำสัปดาห์ 😂`, captionBody: `${p.customer}ของ ${shop} น่ารักกวนตีนสุดๆ`,
        hashtags: [`#${tag}`, '#รวมคอมเมนต์', p.extraTags[0], `#${shopTag}`],
        subs: ['คอมเมนต์นี้ฮามาก', 'อ่านแล้วอมยิ้ม', 'มีคอมเมนต์ไหนฮากว่านี้อีกมั้ย', 'ส่งมาเพิ่มได้เลยนะ'] }),
    ],
    [ // Week 4 — ปิดเดือนให้ปัง
      (shop, cat, p, tag, shopTag) => ({
        title: `รวมรีวิว${p.customer}จริง + ยอดที่เติบโตตลอดเดือน`, duration: '30 วิ',
        hook: `เปิดด้วยตัวเลข/กราฟการเติบโตแบบง่ายๆ ที่เข้าใจได้ไว`,
        mainAction: `ตัดต่อรวมโมเมนต์รีวิว${p.customer}จริงตลอดเดือนที่ผ่านมา`,
        detailPoint: `เน้นคำพูดหรือคอมเมนต์ที่ประทับใจที่สุดจาก${p.customer}`,
        cta: `ขอบคุณ${p.customer}ทุกคนที่ทำให้ ${shop} เติบโต พร้อมชวนติดตามต่อ`,
        captionIntro: `เดือนนี้เราเติบโตได้เพราะทุกคนเลย 🥹💕`, captionBody: `ขอบคุณที่ไว้ใจ ${shop} มาตลอดเดือนนี้`,
        hashtags: [`#${tag}`, '#ขอบคุณลูกค้า', p.extraTags[1], `#${shopTag}`],
        subs: ['เดือนนี้เราโตขึ้นมาก', 'ต้องขอบคุณทุกคนเลย', 'คอมเมนต์นี้ประทับใจสุด', 'แล้วเจอกันเดือนหน้า!'] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `แคมเปญ/โปรโมชั่นพิเศษฉลองยอดผู้ติดตาม`, duration: '20 วิ',
        hook: `เปิดด้วย "ฉลองครบเดือนนี้ ${shop} จัดโปรพิเศษ!"`,
        mainAction: `อธิบายเงื่อนไขแคมเปญ/ส่วนลดแบบเข้าใจง่าย`,
        detailPoint: `เน้นระยะเวลาจำกัด (limited time) เพื่อกระตุ้นให้รีบตัดสินใจ`,
        cta: `ชวนกดสั่งซื้อ/ทักแชทก่อนโปรหมด`,
        captionIntro: `ฉลองเดือนแรกด้วยโปรสุดพิเศษ! 🎊`, captionBody: `จำกัดเวลา อย่าพลาดนะที่ ${shop}`,
        hashtags: [`#${tag}`, '#แคมเปญพิเศษ', p.extraTags[0], `#${shopTag}`],
        subs: ['ฉลองเดือนแรกด้วยกัน!', 'โปรพิเศษจำกัดเวลา', 'รีบเลยก่อนหมด', 'ทักมาได้เลยตอนนี้'] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `พรีวิว${p.noun}ใหม่ที่กำลังจะมาที่ ${shop}`, duration: '25 วิ',
        hook: `เปิดด้วย "แอบกระซิบ...มีอะไรใหม่กำลังจะมา"`,
        mainAction: `แง้มภาพหรือรายละเอียด${p.noun}ใหม่แบบยังไม่เผยหมด`,
        detailPoint: `เน้นจุดที่ทำให้คนอยากรู้เพิ่ม (สร้างความอยากรู้)`,
        cta: `ชวนกดติดตามเพื่อเป็นคนแรกที่ได้เห็นตัวเต็ม`,
        captionIntro: `แอบกระซิบเรื่องใหม่ 👀✨`, captionBody: `เร็วๆ นี้ที่ ${shop} มีเซอร์ไพรส์รอทุกคนอยู่`,
        hashtags: [`#${tag}`, '#เร็วๆนี้', p.extraTags[1], `#${shopTag}`],
        subs: ['มีอะไรใหม่กำลังจะมา', 'แอบดูนิดนึงนะ', 'อยากรู้ใช่มั้ยล่ะ', 'ติดตามไว้ไม่พลาดแน่นอน'] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `Q&A ปิดเดือน ตอบทุกคำถามที่ค้างคาใจ`, duration: '45 วิ',
        hook: `เปิดด้วย "เดือนนี้มีคำถามเข้ามาเพียบ มาตอบรวดเดียวกันเลย"`,
        mainAction: `ไล่ตอบคำถามที่ยังไม่ได้ตอบตลอดเดือนที่ผ่านมา`,
        detailPoint: `เลือกคำถามที่คนถามซ้ำกันบ่อยที่สุดมาตอบก่อน`,
        cta: `ชวนทักคำถามใหม่สำหรับเดือนหน้าเข้ามาได้เลย`,
        captionIntro: `รวบคำถามค้างคามาตอบให้หมดในคลิปนี้ 💬`, captionBody: `${shop} ไม่อยากให้คำถามของใครตกหล่น`,
        hashtags: [`#${tag}`, '#QAปิดเดือน', p.extraTags[0], `#${shopTag}`],
        subs: ['คำถามที่ค้างไว้นานสุด', 'คำตอบคือแบบนี้', 'ยังมีคำถามอีกมั้ย?', 'ทักมาได้เลยเดือนหน้า'] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `ขอบคุณ${p.customer}คนพิเศษที่ทำให้ ${shop} ประทับใจ`, duration: '30 วิ',
        hook: `เปิดด้วยเรื่องราวของ${p.customer}ที่ประทับใจที่สุดในเดือนนี้`,
        mainAction: `เล่าเหตุการณ์หรือข้อความที่${p.customer}ส่งมาให้กำลังใจ`,
        detailPoint: `เน้นความรู้สึกจริงใจของเจ้าของร้านตอนเล่าเรื่องนี้`,
        cta: `ขอบคุณ${p.customer}คนนั้นและทุกคนที่สนับสนุนกัน`,
        captionIntro: `เรื่องนี้ทำเอาน้ำตาซึม 🥹`, captionBody: `ขอบคุณ${p.customer}ทุกคนที่ทำให้ ${shop} มีวันนี้`,
        hashtags: [`#${tag}`, '#ขอบคุณ', p.extraTags[1], `#${shopTag}`],
        subs: ['เรื่องนี้ประทับใจมาก', 'ขอบคุณจริงๆ นะ', 'มีแบบนี้อีกเยอะเลย', 'ซึ้งใจสุดๆ'] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `นับถอยหลังก่อนโปรหมดเขตที่ ${shop}`, duration: '15 วิ',
        hook: `เปิดด้วยตัวเลขนับถอยหลังวันสุดท้ายของโปรโมชั่น`,
        mainAction: `ย้ำรายละเอียดโปรที่กำลังจะหมดเขตแบบกระชับ`,
        detailPoint: `เน้นคำว่า "วันสุดท้าย" ให้ชัดเจนที่สุด`,
        cta: `ชวนรีบทักแชท/สั่งซื้อก่อนหมดเขต`,
        captionIntro: `เหลือเวลาไม่มากแล้วนะ! ⏰`, captionBody: `วันสุดท้ายของโปรนี้ที่ ${shop} อย่าปล่อยให้พลาด`,
        hashtags: [`#${tag}`, '#โปรใกล้หมด', p.extraTags[0], `#${shopTag}`],
        subs: ['เหลือเวลาไม่มากแล้ว', 'วันสุดท้ายจริงๆ', 'อย่าปล่อยให้พลาดนะ', 'ทักมาด่วนเลย'] }),
      (shop, cat, p, tag, shopTag) => ({
        title: `สรุปเส้นทาง 1 เดือนที่ผ่านมาของ ${shop} + แผนต่อไป`, duration: '40 วิ',
        hook: `เปิดด้วย "1 เดือนที่ผ่านมาของ ${shop} เป็นยังไงบ้าง?"`,
        mainAction: `รีแคปไฮไลต์สำคัญตลอดเดือน (คลิปที่คนชอบที่สุด/โมเมนต์เด่น)`,
        detailPoint: `แย้มแผนหรือ${p.noun}ใหม่ที่กำลังจะมาเดือนหน้า`,
        cta: `ชวนกดติดตามเพื่อไม่พลาดคอนเทนต์เดือนหน้า`,
        captionIntro: `สรุป 1 เดือนแรกของเรา 📈`, captionBody: `เดือนหน้ามีของใหม่รอทุกคนอยู่นะ ติดตามไว้เลย`,
        hashtags: [`#${tag}`, '#รีแคปเดือน', p.extraTags[1], `#${shopTag}`],
        subs: ['1 เดือนที่ผ่านมา...', 'ไฮไลต์ที่ทุกคนชอบ', 'เดือนหน้ามีของใหม่', 'ติดตามไว้ไม่พลาดแน่นอน'] }),
    ],
  ];

  const WEEK_META = [
    { num: 1, title: 'สัปดาห์ที่ 1 — เริ่มต้นให้คนรู้จัก', goal: 'เป้าหมาย: แนะนำตัวตนร้าน สร้างความคุ้นเคยกับคนดูกลุ่มแรก', accent: '#ffb0c9' },
    { num: 2, title: 'สัปดาห์ที่ 2 — สร้างฐานคนดู', goal: 'เป้าหมาย: สร้างความน่าเชื่อถือ ให้คนดูรู้สึกอยากกลับมาดูซ้ำ', accent: '#ff8fb3' },
    { num: 3, title: 'สัปดาห์ที่ 3 — ขยายผลให้คนแชร์ต่อ', goal: 'เป้าหมาย: เกาะกระแส/ทำคอนเทนต์ที่แชร์ง่าย เพิ่มการมองเห็น', accent: '#ff6f9c' },
    { num: 4, title: 'สัปดาห์ที่ 4 — ปิดเดือนให้ปัง', goal: 'เป้าหมาย: กระตุ้นยอดขาย/การติดตาม ปิดเดือนด้วยแรงส่งสูงสุด', accent: '#e8467a' },
  ];

  function generatePlan(shop, cat) {
    const p = CATEGORY_PROFILES[cat] || CATEGORY_PROFILES['อื่นๆ'];
    const tag = cat.replace(/[^ก-๙a-zA-Z0-9]/g, '');
    const shopTag = shop.replace(/\s/g, '');

    return WEEK_META.map((meta, weekIndex) => ({
      num: meta.num, title: meta.title, goal: meta.goal, accent: meta.accent,
      ideas: ANGLES_BY_WEEK[weekIndex].map((angleFn, dayIndex) => {
        const day = weekIndex * 7 + dayIndex + 1;
        const raw = angleFn(shop, cat, p, tag, shopTag);
        return buildIdea(meta.num, day, raw);
      }),
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
            <label>3. แนบรูป/ผลงานคอนเทนต์เก่า (ถ้ามี ใส่ได้หลายรูป สูงสุด ${MAX_UPLOAD_IMAGES} รูป)</label>
            ${state.uploadImages.length === 0 ? `
              <div class="upload-box" id="uploadBox" tabindex="0" role="button" aria-label="แนบรูปคอนเทนต์เก่า">
                <div class="upload-placeholder">ลากรูปคอนเทนต์เก่ามาวางที่นี่ (เลือกได้หลายรูป) เพื่อให้ AI วิเคราะห์สไตล์เดิม</div>
                <input type="file" accept="image/png,image/jpeg,image/webp,image/avif" id="uploadInput" multiple hidden />
              </div>
            ` : `
              <div class="upload-grid" id="uploadGrid">
                ${state.uploadImages.map((src, i) => `
                  <div class="upload-thumb">
                    <img src="${src}" alt="รูปที่แนบ ${i + 1}" />
                    <button type="button" class="upload-thumb-remove" data-idx="${i}" aria-label="ลบรูปนี้">✕</button>
                  </div>
                `).join('')}
                ${state.uploadImages.length < MAX_UPLOAD_IMAGES ? `
                  <div class="upload-add-tile" id="uploadAddTile" tabindex="0" role="button" aria-label="เพิ่มรูป">+</div>
                ` : ''}
              </div>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/avif" id="uploadInput" multiple hidden />
            `}
          </div>
          <div class="field">
            <label for="shopLink">4. ลิงก์ร้านค้า (เพจ/เว็บไซต์/โซเชียล) — ถ้ามี</label>
            <input type="url" id="shopLink" placeholder="เช่น https://facebook.com/yourshop" />
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

    const shopLinkInput = wrap.querySelector('#shopLink');
    shopLinkInput.value = state.shopLink;
    shopLinkInput.addEventListener('input', (e) => { state.shopLink = e.target.value; });

    const uploadInput = wrap.querySelector('#uploadInput');
    const dropZone = wrap.querySelector('#uploadBox') || wrap.querySelector('#uploadGrid');

    const openPicker = () => uploadInput.click();

    if (wrap.querySelector('#uploadBox')) {
      const uploadBox = wrap.querySelector('#uploadBox');
      uploadBox.addEventListener('click', openPicker);
      uploadBox.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); }
      });
    }

    const addTile = wrap.querySelector('#uploadAddTile');
    if (addTile) {
      addTile.addEventListener('click', openPicker);
      addTile.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); }
      });
    }

    wrap.querySelectorAll('.upload-thumb-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute('data-idx'));
        state.uploadImages.splice(idx, 1);
        render();
      });
    });

    uploadInput.addEventListener('change', () => {
      ingestFiles(uploadInput.files);
    });

    if (dropZone) {
      ['dragenter', 'dragover'].forEach(evt => {
        dropZone.addEventListener(evt, (e) => {
          e.preventDefault();
          dropZone.classList.add('drag-over');
        });
      });
      ['dragleave', 'drop'].forEach(evt => {
        dropZone.addEventListener(evt, (e) => {
          e.preventDefault();
          dropZone.classList.remove('drag-over');
        });
      });
      dropZone.addEventListener('drop', (e) => {
        ingestFiles(e.dataTransfer && e.dataTransfer.files);
      });
    }

    function ingestFiles(fileList) {
      const files = Array.from(fileList || []).filter(f => /^image\/(png|jpeg|webp|avif)$/.test(f.type));
      const room = MAX_UPLOAD_IMAGES - state.uploadImages.length;
      files.slice(0, Math.max(0, room)).forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          if (state.uploadImages.length >= MAX_UPLOAD_IMAGES) return;
          state.uploadImages.push(reader.result);
          render();
        };
        reader.readAsDataURL(file);
      });
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

  function safeHttpUrl(url) {
    try {
      const u = new URL(String(url).trim());
      return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '';
    } catch {
      return '';
    }
  }

  function renderResult() {
    const totalIdeas = state.weeks.reduce((sum, w) => sum + w.ideas.length, 0);
    const shopLinkHref = safeHttpUrl(state.shopLink);
    const wrap = el(`
      <div class="screen-result">
        <div class="result-head">
          <div>
            <h1>แผนเติบโตของ ${escapeHtml(state.shopName)}</h1>
            <div class="result-sub">${escapeHtml(state.category)} • เล่นคอนเทนต์ทุกวัน รวม ${totalIdeas} ไอเดีย ภายใน 4 สัปดาห์</div>
            ${shopLinkHref ? `<div class="result-link"><a href="${escapeHtml(shopLinkHref)}" target="_blank" rel="noopener noreferrer">🔗 ${escapeHtml(shopLinkHref)}</a></div>` : ''}
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
              <span class="tag-day">วันที่ ${idea.day}</span>
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
          <span class="badge-day">วันที่ ${idea.day}</span>
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
