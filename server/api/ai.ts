import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../auth.js';
import { GoogleGenAI } from '@google/genai';

export const aiRouter = Router();

let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

// POST /api/ai/pedagogical-advice - AI assisted support strategy or observation
aiRouter.post('/pedagogical-advice', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { studentName, domain, difficulty, level, target } = req.body;

  const client = getAIClient();
  if (client) {
    try {
      const prompt = `أنت مستشار تربوي مغربي متخصص في الدعم التربوي ومقاربة TaRL والتعليم الصريح.
المتعلم: ${studentName || 'المتعلم'}
المجال: ${domain || 'اللغة العربية'}
الصعوبة المرصودة: ${difficulty || 'صعوبة في التهجي والربط بين الحروف'}
المستوى الحالي: ${level || 'مبتدئ'}
الهدف المطلوب: ${target || 'خطة دعم علاجية عملية ميسرة وملاحظة تربوية مشجعة'}

يرجى تزويدي بـ:
1. ملاحظة تربوية تشجيعية دقيقة ومحفزة للتقرير المدرسي (سطرين إلى 3 أسطر).
2. اقتراح 3 أنشطة دعم تفاعلية عملية يمكن للأستاذ تطبيقها في الصف (بمقاربة TaRL أو ألعاب قرائية/حسابية).
3. نصيحة بسيطة موجهة لأسرة المتعلم للمتابعة المنزلية دون إجهاد.
الجواب باللغة العربية الفصحى التربوية الهادئة.`;

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      return res.json({ advice: response.text });
    } catch (e: any) {
      console.error('Gemini error:', e);
      // Fall through to fallback
    }
  }

  // Fallback high-quality pedagogical templates
  const templates: Record<string, string> = {
    'القراءة': `• ملاحظة تربوية مقترحة: يُظهر المتعلم ${studentName || ''} شغفاً بالتعلم ورغبة صادقة في التطور؛ ويحتاج فقط إلى تثبيت التمييز البصري والصوتي للمقاطع الصوتية المتشابهة من خلال القراءة المقطعية اليومية.
• أنشطة دعم صفية مقترحة:
  1. لعبة البطاقات الخاطفة (Flashcards) للكلمات الأكثر تداولاً.
  2. نشاط القراءة الثنائية التبادلية مع زميل متمكن.
  3. استخراج المقاطع وتركيب كلمات جديدة بالسبورة التفاعلية أو العجين.
• توجيه للأسرة: تخصيص 10 دقائق مساءً لقراءة قصة قصيرة مصورة بصوت مسموع مع الثناء على كل محاولة ناجحة.`,
    'الرياضيات': `• ملاحظة تربوية مقترحة: يمتلك المتعلم ${studentName || ''} حساً منطقياً واعداً، ويحتاج إلى مرافقة مستمرة في فهم التموضع المكاني وقراءة المسألة الرياضية بتأنٍ قبل الشروع في الحل.
• أنشطة دعم صفية مقترحة:
  1. الاستعانة بمحسوسات (خشيبات، قريصات، حبات فاصوليا) لتجسيد العمليات الحسابية.
  2. لعبة "بائع المتجر" للتدرب على الجمع والطرح الذهني.
  3. تمثيل المسائل بالرسم والمخططات المبسطة.
• توجيه للأسرة: إشراك المتعلم في مهام يومية تطبيقية كعد النقود أو حساب مقادير المطبخ.`
  };

  const advice = templates[domain] || templates['القراءة'];
  return res.json({ advice });
});
