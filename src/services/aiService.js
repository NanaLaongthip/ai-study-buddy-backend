const OpenAI = require('openai');

/**
 * Configure OpenAI / Gemini / Groq / Local LLM client
 * Automatically detects OpenAI API Key, Google Gemini API Key, Groq API Key, or Ollama
 */
function getLLMClient() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY;
  let baseURL = process.env.OPENAI_BASE_URL;

  if (!baseURL) {
    if (process.env.GEMINI_API_KEY) {
      // Google Gemini OpenAI-compatible REST API
      baseURL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
    } else if (process.env.GROQ_API_KEY) {
      // Groq high-speed OpenAI-compatible API
      baseURL = 'https://api.groq.com/openai/v1';
    }
  }

  if (!apiKey && !baseURL) {
    return null;
  }

  return new OpenAI({
    apiKey: apiKey || 'local-key',
    baseURL: baseURL || undefined,
  });
}

/**
 * Utility: Fisher-Yates array shuffle for randomizing flashcards
 */
function shuffleArray(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Intelligent semantic content parser for uploaded text when LLM key is not provided.
 * Generates extensive, in-depth multi-paragraph study notes and randomized diverse flashcards.
 */
function generateMockStudyContent(extractedText) {
  // Clean raw lines
  const rawLines = extractedText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => {
      if (l.length < 3) return false;
      if (l.startsWith('--') && l.endsWith('--')) return false; // Page markers
      if (/^[\d\s\.\/\-\,\(\)]+$/.test(l)) return false; // Pure numbers/symbols
      return true;
    });

  // Extract definition lines (contains =, :, —, –, ●, •)
  const definitionLines = rawLines.filter((l) =>
    (l.includes('=') || l.includes('—') || l.includes('–') || l.includes(':') || l.startsWith('●') || l.startsWith('•')) &&
    l.length >= 6 &&
    l.length <= 150
  );

  // Extract significant headings / key concept lines
  const potentialHeadings = Array.from(
    new Set(
      rawLines.filter(
        (l) =>
          l.length >= 5 &&
          l.length <= 70 &&
          !l.includes('sigmoid +') &&
          !l.includes('z1 z2') &&
          !l.startsWith('http')
      )
    )
  );

  // Try to find the primary title from first meaningful lines
  const primaryTitle =
    potentialHeadings.find((h) => h.length > 10 && !h.includes('=')) ||
    potentialHeadings[0] ||
    'เอกสารประกอบการเรียนรู้';

  // Extract important terms and bullet concepts
  const keyBulletPoints = Array.from(
    new Set([
      ...definitionLines.map((d) => d.replace(/^[●•\-\*]\s*/, '').trim()),
      ...potentialHeadings,
    ])
  ).filter((b) => b.length > 5);

  // 1. Executive Overview based on real document contents
  const overviewText = `เอกสารบทเรียนนี้มุ่งเน้นการศึกษาเชิงลึกในเรื่อง "${primaryTitle}" โดยเนื้อหาครอบคลุมโครงสร้างพื้นฐาน กระบวนการประมวลผลตามลำดับขั้นตอน และการวิเคราะห์ทางทฤษฎีที่สำคัญ ได้แก่ ${
    keyBulletPoints.slice(0, 5).join(', ') || 'หลักการพื้นฐานและการประยุกต์ใช้งาน'
  }\n\nบทเรียนนี้ได้รับการออกแบบมาเพื่อให้ผู้เรียนสามารถเชื่อมโยงแนวคิดหลักเข้ากับการแก้ปัญหาจริง โดยเน้นความแม่นยำในนิยาม การคำนวณหรือการเขียนโปรแกรมอย่างเป็นระบบ และการตรวจสอบผลลัพธ์เพื่อลดข้อผิดพลาดในขั้นตอนปฏิบัติงานจริงและการเตรียมความพร้อมสำหรับข้อสอบ`;

  // 2. Build in-depth, long multi-paragraph study topics from detected real content
  const structuredTopics = [];
  const chunkCount = Math.min(5, Math.max(3, Math.floor(potentialHeadings.length / 3)));
  const step = Math.max(1, Math.floor(potentialHeadings.length / (chunkCount || 1)));

  for (let i = 0; i < chunkCount; i++) {
    const heading = potentialHeadings[i * step] || `หัวข้อหลักที่ ${i + 1}`;
    const relatedDefs = definitionLines.slice(i * 3, (i + 1) * 3);
    const relatedHeadings = potentialHeadings.slice(i * step + 1, i * step + 4);

    // Multi-paragraph detailed explanation
    const para1 = `【ความหมายและภาพรวมของหัวข้อ】\nหัวข้อ "${heading}" ถือเป็นองค์ประกอบหัวใจสำคัญในบทเรียนนี้ โดยทำหน้าที่เป็นรากฐานในการทำความเข้าใจระบบโดยรวม การศึกษาหัวข้อนี้ช่วยให้เข้าใจถึงวัตถุประสงค์และข้อกำหนดพื้นฐานที่เกี่ยวข้อง เช่น ${
      relatedDefs.slice(0, 2).join(' และ ') || 'แนวคิดและหลักการทำงานหลักที่อธิบายไว้ในเอกสาร'
    } ซึ่งช่วยสร้างความเข้าใจที่ถูกต้องเกี่ยวกับโครงสร้างของระบบ`;

    const para2 = `【กลไกการทำงานและขั้นตอนเชิงลึก (In-Depth Mechanism)】\nในส่วนของกระบวนการทำงานจริง หัวข้อนี้มีการดำเนินงานอย่างเป็นขั้นตอน โดยเริ่มจากการรับข้อมูลนำเข้า การส่งต่อค่าผ่านส่วนประมวลผลย่อย และการคำนวณตามเงื่อนไขที่กำหนด องค์ประกอบที่ตรวจพบในบทเรียน ได้แก่:\n${
      relatedDefs.length > 0
        ? relatedDefs.map((d, dIdx) => `  ${dIdx + 1}) ${d}`).join('\n')
        : relatedHeadings.map((h, hIdx) => `  ${hIdx + 1}) การทำงานร่วมกับ ${h}`).join('\n')
    }\nการเข้าใจความสัมพันธ์ระหว่างองค์ประกอบเหล่านี้มีความสำคัญอย่างยิ่งต่อการวิเคราะห์ผลลัพธ์และคำนวณค่าต่างๆ ได้อย่างแม่นยำ`;

    const para3 = `【แนวทางการประยุกต์ใช้และจุดเน้นสำหรับข้อสอบ】\nในการนำไปใช้งานจริง ผู้เรียนควรระมัดระวังเกี่ยวกับข้อผิดพลาดที่มักพบบ่อย (Common Pitfalls) โดยเฉพาะกรณีขอบเขตหรือการกำหนดค่าพารามิเตอร์ไม่เหมาะสม ข้อสอบมักจะเน้นวัดความเข้าใจในความสัมพันธ์ของตัวแปร ขั้นตอนลำดับก่อน-หลัง และผลกระทบต่อระบบหากเกิดการเปลี่ยนแปลงค่าในส่วนนี้`;

    const fullDetailedContent = `${para1}\n\n${para2}\n\n${para3}`;

    const subPoints = relatedDefs.length > 0
      ? relatedDefs.map((d) => d.replace(/^[●•\-\*]\s*/, ''))
      : relatedHeadings.length > 0
      ? relatedHeadings
      : [`ทำความเข้าใจแนวคิดหลักของ ${heading}`, `ทบทวนความเชื่อมโยงกับเนื้อหาส่วนอื่น`];

    structuredTopics.push({
      topic: `${i + 1}. ${heading}`,
      explanation: fullDetailedContent,
      key_points: subPoints.slice(0, 4),
    });
  }

  // 3. Exam Focus Topics based on detected concepts
  const examFocusTopics = potentialHeadings
    .slice(1, 6)
    .map((h, i) => `นิยามศัพท์ การวิเคราะห์ขั้นตอน และโจทย์ประยุกต์เกี่ยวกับ "${h}"`);

  if (examFocusTopics.length < 3) {
    examFocusTopics.push(
      `การคำนวณและขั้นตอนการทำงานตามที่ระบุในเอกสาร ${primaryTitle}`,
      'การเปรียบเทียบข้อดีและข้อจำกัดระหว่างวิธีการต่างๆ ที่ปรากฏในสไลด์'
    );
  }

  // 4. Diverse & Randomized Flashcards from across the document
  const rawFlashcards = [];

  // Type A: Definition / Variable cards
  definitionLines.forEach((item) => {
    if (item.includes('=')) {
      const [term, def] = item.split('=');
      rawFlashcards.push({
        front: `[นิยาม & ตัวแปร] ในบทเรียนนี้ สัญลักษณ์หรือตัวแปร "${term.trim()}" หมายถึงอะไร และมีบทบาทอย่างไร?`,
        back: `${term.trim()} หมายถึง: ${def.trim()}\n(เป็นตัวแปรสำคัญในบทเรียนที่ต้องใช้ในการคำนวณและวิเคราะห์ผลลัพธ์)`,
      });
    } else if (item.includes('—') || item.includes('–')) {
      const [term, def] = item.split(/[—–]/);
      rawFlashcards.push({
        front: `[แนวคิดสำคัญ] นิยามและความหมายของ "${term.trim()}" ในเอกสารนี้คืออะไร?`,
        back: `${def.trim()}`,
      });
    } else if (item.includes(':')) {
      const [term, def] = item.split(':');
      rawFlashcards.push({
        front: `[หน้าที่การทำงาน] หัวข้อ "${term.replace(/^[●•\-\*]\s*/, '').trim()}" มีหน้าที่ครอบคลุมเรื่องใด?`,
        back: `${def.trim()}`,
      });
    }
  });

  // Type B: Mechanism / Process cards
  potentialHeadings.slice(0, 6).forEach((h) => {
    rawFlashcards.push({
      front: `[กระบวนการ] ขั้นตอนและหลักการทำงานของ "${h}" ในสไลด์บทเรียนนี้มีสาระสำคัญอย่างไร?`,
      back: `"${h}" เป็นแกนหลักที่ทำหน้าที่ประมวลผลตามลำดับขั้นตอน เพื่อให้ได้ผลลัพธ์ที่ถูกต้องตามทฤษฎีในบทเรียน`,
    });
  });

  // Type C: Why / Reasoning cards
  potentialHeadings.slice(2, 6).forEach((h) => {
    rawFlashcards.push({
      front: `[เหตุผลเชิงทฤษฎี] ทำไมผู้เรียนจึงจำเป็นต้องทำความเข้าใจ "${h}" อย่างแม่นยำก่อนนำไปใช้งาน?`,
      back: `เพราะ "${h}" มีผลโดยตรงต่อความแม่นยำของระบบ และมักเป็นหัวข้อที่ถูกนำมาออกข้อสอบวัดความเข้าใจเชิงลึก`,
    });
  });

  // Type D: Scenario & Pitfalls cards
  if (potentialHeadings.length >= 2) {
    rawFlashcards.push({
      front: `[ข้อควรระวัง] ข้อควรระวังที่สำคัญที่สุดเมื่อศึกษาเนื้อหาเรื่อง "${primaryTitle}" คืออะไร?`,
      back: `ต้องตรวจสอบลำดับขั้นตอน การกำหนดค่าพารามิเตอร์ และนิยามศัพท์ให้ถูกต้องเพื่อป้องกันข้อผิดพลาดในการประมวลผล`,
    });
  }

  // Shuffle and pick 10-14 diverse flashcards
  const shuffledFlashcards = shuffleArray(rawFlashcards);
  const flashcards = shuffledFlashcards.slice(0, Math.min(14, Math.max(8, shuffledFlashcards.length)));

  // Ensure minimum 6 cards if text was short
  while (flashcards.length < 6) {
    flashcards.push({
      front: `[สรุปภาพรวม] หัวข้อหลักของเอกสารนี้ครอบคลุมเรื่องใดบ้าง?`,
      back: `ครอบคลุมเรื่อง "${primaryTitle}" และรายละเอียดการทำงานขององค์ประกอบสำคัญตามที่ระบุในสไลด์`,
    });
  }

  // 5. Quiz Questions based on actual document vocabulary
  const sampleTerm1 = potentialHeadings[0] || 'หัวข้อหลัก';
  const sampleTerm2 = potentialHeadings[1] || 'กระบวนการทำงาน';
  const sampleTerm3 = potentialHeadings[2] || 'การวิเคราะห์ผลลัพธ์';

  const quiz_questions = [
    {
      question: `ข้อใดสรุปวัตถุประสงค์และหัวข้อสำคัญของเอกสาร "${primaryTitle}" ได้ตรงกับเนื้อหามากที่สุด?`,
      options: [
        `การทำความเข้าใจและวิเคราะห์เรื่อง ${sampleTerm1} และแนวคิดที่เกี่ยวข้องในบทเรียนอย่างเป็นระบบ`,
        'การท่องจำประวัติศาสตร์โบราณโดยไม่มีการคำนวณหรือวิเคราะห์เชิงระบบ',
        'การละเว้นการทดสอบระบบและการคำนวณค่าความผิดพลาด',
        'การใช้แนวทางที่ไม่รองรับการต่อยอดหรือการวิเคราะห์ข้อมูล',
      ],
      answer: `การทำความเข้าใจและวิเคราะห์เรื่อง ${sampleTerm1} และแนวคิดที่เกี่ยวข้องในบทเรียนอย่างเป็นระบบ`,
      explanation: `เนื้อหาในเอกสารมุ่งเน้นการอธิบาย ${sampleTerm1} เพื่อให้ผู้เรียนเข้าใจทั้งในเชิงทฤษฎีและการประยุกต์ใช้งานจริง`,
    },
    {
      question: `จากเนื้อหาในสไลด์ หัวข้อใดต่อไปนี้เป็นหนึ่งในประเด็นสำคัญที่ปรากฏในบทเรียน?`,
      options: [
        sampleTerm2,
        'การเขียนโปรแกรมด้วยภาษาแอสเซมบลีสำหรับระบบปฏิบัติการยุคแรก',
        'การจัดการระบบฮาร์ดแวร์เชิงกลไกแบบไม่ใช้คอมพิวเตอร์',
        'การวิเคราะห์การตลาดและการซื้อขายหุ้นเบื้องต้น',
      ],
      answer: sampleTerm2,
      explanation: `หัวข้อ "${sampleTerm2}" เป็นหนึ่งในเนื้อหาสำคัญที่ปรากฏและถูกอธิบายไว้ในสไลด์ของเอกสารนี้`,
    },
    {
      question: `ในการทำความเข้าใจเนื้อหาเรื่อง "${sampleTerm3}" ผู้เรียนควรให้ความสำคัญกับประเด็นใดมากที่สุด?`,
      options: [
        'ความเข้าใจในนิยาม ขั้นตอนการทำงาน และผลลัพธ์ที่ได้จากการประมวลผล',
        'การอ่านข้ามสูตรและนิยามศัพท์ทั้งหมดเพื่อความรวดเร็ว',
        'การคาดเดาคำตอบโดยไม่อิงตามหลักการที่อธิบายในเอกสาร',
        'การจำเฉพาะชื่อสไลด์โดยไม่ศึกษาคำอธิบายรายละเอียด',
      ],
      answer: 'ความเข้าใจในนิยาม ขั้นตอนการทำงาน และผลลัพธ์ที่ได้จากการประมวลผล',
      explanation: 'การศึกษาเนื้อหาในบทเรียนนี้เน้นการเข้าใจกระบวนการอย่างเป็นระบบและความเชื่อมโยงของแต่ละขั้นตอน',
    },
  ];

  return {
    key_takeaways: {
      overview: overviewText,
      detailed_topics: structuredTopics,
      quick_bullets: keyBulletPoints.slice(0, 6),
    },
    exam_focus: examFocusTopics.slice(0, 4),
    flashcards,
    quiz_questions,
  };
}

/**
 * Sends extracted document text to LLM and returns structured JSON in Thai
 * @param {string} text - Cleaned text from PDF
 * @returns {Promise<{ key_takeaways: object|string[], exam_focus: string[], flashcards: Array<{front: string, back: string}>, quiz_questions: Array<{question: string, options: string[], answer: string, explanation?: string}> }>}
 */
async function processDocumentWithAI(text) {
  const client = getLLMClient();
  const model =
    process.env.OPENAI_MODEL ||
    (process.env.GEMINI_API_KEY ? 'gemini-1.5-flash' : process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini');

  // If no LLM credentials or local server configured, or explicit MOCK_AI=true
  if (!client || process.env.MOCK_AI === 'true') {
    console.log('ℹ️ [AI Service] No LLM API key detected in .env. Running semantic content extractor on PDF text.');
    return generateMockStudyContent(text);
  }

  console.log(`🤖 [AI Service] Calling LLM (${model}) with extracted PDF content...`);

  // Truncate to safe token limit (approx 35,000 characters)
  const truncatedText =
    text.length > 35000
      ? text.slice(0, 35000) + '\n\n[...ตัดทอนเนื้อหาเนื่องจากความยาวเกินขีดจำกัด]'
      : text;

  const systemPrompt = `คุณคือสุดยอดผู้ช่วยติวหนังสืออัจฉริยะและอาจารย์มหาวิทยาลัยระดับแนวหน้า (Elite Academic AI Study Buddy)
จงวิเคราะห์เนื้อหาจากสไลด์บทเรียนหรือเอกสารการสอนที่ได้รับอย่างละเอียด และสกัดเนื้อหาเพื่อการเรียนรู้ที่มีประสิทธิภาพสูงสุด

ข้อกำหนดด้านภาษาที่เคร่งครัดมาก:
เนื้อหาผลลัพธ์ทั้งหมดที่คุณสร้าง ไม่ว่าจะเป็น key_takeaways (ทั้ง overview, detailed_topics, quick_bullets), exam_focus, flashcards, และ quiz_questions "จะต้องเป็นภาษาไทยที่ถูกต้อง สละสลวย อ่านเข้าใจง่าย และวิเคราะห์ตรงตามเนื้อหาในเอกสารที่ได้รับมาจริงๆ 100%"

═══════════════════════════════════════════════════════════════════════════════════
ข้อกำหนดสำคัญเรื่องความยาวและความละเอียดของเนื้อหา (COMPREHENSIVE FULL STUDY TEXT):
═══════════════════════════════════════════════════════════════════════════════════
1. ในส่วนของ "detailed_topics":
   - ห้ามเขียนแค่ 1-2 บรรทัดหรือ bullet point สั้นๆ เด็ดขาด!
   - ในแต่ละหัวข้อ (detailed_topics) จะต้องเขียนสรุปออกมาเป็น "เนื้อหาบทเรียนฉบับสมบูรณ์ (Full Study Content)" ที่ยาวและละเอียด (อย่างน้อย 3-5 ย่อหน้า หรือ 250-450 คำต่อหัวข้อ) ให้อ่านทบทวนได้อย่างจริงจังเหมือนอ่านชีทสรุปบทเรียน
   - แต่ละหัวข้อต้องครอบคลุม:
     1) นิยาม ความหมาย ความเป็นมา และขอบเขตของหัวข้อนี้
     2) กลไกการทำงาน กระบวนการขั้นตอนเชิงลึก (Step-by-Step) และการวิเคราะห์ทฤษฎี/สูตร/ตัวแปร/สัญลักษณ์ หรือโค้ดตัวอย่าง
     3) การประยุกต์ใช้งานจริง ตัวอย่างประกอบ และข้อควรระวังหรือประเด็นที่มักออกสอบ
   - มี "key_points" เป็นจุดสังเกตย่อย 3-5 ข้อใต้แต่ละหัวข้อ

2. ข้อกำหนดสำหรับแฟลชการ์ด (VARIED & RANDOMIZED FLASHCARDS):
   - จะต้องสร้างแฟลชการ์ดจำนวน 10 ถึง 16 ใบ
   - สุ่มคำถามกระจายจากทุกส่วนของเอกสาร (ครอบคลุมทั้งต้น กลาง และท้ายบทเรียน)
   - ต้องมีความหลากหลายของประเภทคำถาม ไม่ซ้ำซาก:
     • คำถามเชิงนิยามและบทบาทหน้าที่ (Definition & Role)
     • คำถามเชิงกระบวนการและลำดับขั้นตอน (Step-by-step mechanism)
     • คำถามเชิงเหตุผล (Why/Reasoning - ทำไมถึงต้องใช้วิธีนี้?)
     • คำถามเชิงเปรียบเทียบความแตกต่าง (Comparison)
     • คำถามเกี่ยวกับสูตร ตัวแปร หรือสัญลักษณ์ (Formula & Variables)
     • คำถามกรณีศึกษาหรือโจทย์สถานการณ์ (Scenario-based)
     • คำถามข้อควรระวังและจุดที่มักเข้าใจผิด (Common Pitfalls)

รูปแบบ JSON ที่ต้องส่งกลับ (ต้องเป็น JSON ที่ถูกต้องตามโครงสร้างนี้เท่านั้น):
{
  "key_takeaways": {
    "overview": "บทนำสรุปภาพรวมเนื้อหาทั้งหมดของเอกสารอย่างละเอียดและชัดเจน (3-5 ประโยคที่สรุปใจความและเป้าหมายของบทเรียน)",
    "detailed_topics": [
      {
        "topic": "ชื่อหัวข้อสำคัญที่ 1 (ภาษาไทย)",
        "explanation": "เนื้อหาบทเรียนขนาดยาวและละเอียด 3-5 ย่อหน้า อธิบายทฤษฎี กลไกการทำงาน ตัวแปร ขั้นตอน และตัวอย่างการใช้งานจริงอย่างครบถ้วน",
        "key_points": [
          "จุดสำคัญหรือข้อสังเกตย่อย 1",
          "จุดสำคัญหรือข้อสังเกตย่อย 2",
          "จุดสำคัญหรือข้อสังเกตย่อย 3"
        ]
      }
    ],
    "quick_bullets": [
      "สรุปประเด็นหลักแบบกระชับข้อที่ 1 (ภาษาไทย)",
      "สรุปประเด็นหลักแบบกระชับข้อที่ 2 (ภาษาไทย)",
      "สรุปประเด็นหลักแบบกระชับข้อที่ 3 (ภาษาไทย)",
      "สรุปประเด็นหลักแบบกระชับข้อที่ 4 (ภาษาไทย)"
    ]
  },
  "exam_focus": [
    "หัวข้อที่เน้นออกสอบข้อที่ 1 (ภาษาไทย)",
    "หัวข้อที่เน้นออกสอบข้อที่ 2 (ภาษาไทย)",
    "หัวข้อที่เน้นออกสอบข้อที่ 3 (ภาษาไทย)"
  ],
  "flashcards": [
    {
      "front": "[ประเภทคำถาม] คำถามที่สุ่มจากเนื้อหาในสไลด์อย่างหลากหลาย",
      "back": "คำตอบที่ชัดเจน ละเอียด และตรงประเด็นตามเนื้อหาสไลด์"
    }
  ],
  "quiz_questions": [
    {
      "question": "โจทย์คำถามแบบปรนัย (ภาษาไทย)",
      "options": ["ตัวเลือกที่ 1", "ตัวเลือกที่ 2", "ตัวเลือกที่ 3", "ตัวเลือกที่ 4"],
      "answer": "ตัวเลือกที่ถูกต้องตรงกับหนึ่งใน options เป๊ะๆ",
      "explanation": "คำอธิบายเหตุผลว่าทำไมข้อนี้จึงถูกต้อง (ภาษาไทย)"
    }
  ]
}

ตอบกลับด้วย JSON บริสุทธิ์เท่านั้น ห้ามใส่เครื่องหมาย markdown codeblock ใดๆ`;

  const userPrompt = `นี่คือเนื้อหาจากเอกสารประกอบการสอน:\n\n${truncatedText}\n\nกรุณาวิเคราะห์และสร้างชุดเนื้อหาบทเรียนขนาดยาวแบบละเอียดในแต่ละหัวข้อ พร้อมแฟลชการ์ดที่หลากหลายและสุ่มคำถามจากเนื้อหาในรูปแบบ JSON ตอนนี้:`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const rawContent = response.choices[0]?.message?.content || '{}';

    // Clean potential markdown wrap
    const cleanedJson = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleanedJson);

    // Shuffle flashcards for variety
    const rawCards = Array.isArray(parsed.flashcards)
      ? parsed.flashcards.map((f) => ({
          front: String(f.front || f.question || '').trim(),
          back: String(f.back || f.answer || '').trim(),
        }))
      : [];

    const shuffledCards = shuffleArray(rawCards);

    // Validate and sanitize structure
    return {
      key_takeaways: parsed.key_takeaways || {},
      exam_focus: Array.isArray(parsed.exam_focus) ? parsed.exam_focus : [],
      flashcards: shuffledCards,
      quiz_questions: Array.isArray(parsed.quiz_questions)
        ? parsed.quiz_questions.map((q) => ({
            question: String(q.question || '').trim(),
            options: Array.isArray(q.options) ? q.options.map((opt) => String(opt).trim()) : [],
            answer: String(q.answer || '').trim(),
            explanation: q.explanation ? String(q.explanation).trim() : '',
          }))
        : [],
    };
  } catch (error) {
    console.error('LLM API Call failed:', error.message);
    console.warn('Falling back to intelligent semantic extractor on PDF text.');
    return generateMockStudyContent(text);
  }
}

module.exports = {
  processDocumentWithAI,
  generateMockStudyContent,
};
