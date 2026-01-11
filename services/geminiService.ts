
import { GoogleGenAI } from "@google/genai";
import { AttendanceRecord, Student } from "../types.ts";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAttendanceInsights = async (
  students: Student[],
  records: AttendanceRecord[]
) => {
  if (records.length === 0) {
    return "لا توجد سجلات كافية للتحليل. ابدأ بتسجيل حضور الطلاب للحصول على تقارير ذكية وتوصيات تربوية.";
  }

  // Aggregate stats for prompt
  const statsSummary = students.map(s => {
    const sRecords = records.filter(r => r.studentId === s.id);
    const present = sRecords.filter(r => r.status === 'present').length;
    const late = sRecords.filter(r => r.status === 'late').length;
    const absent = sRecords.filter(r => r.status === 'absent').length;
    const excused = sRecords.filter(r => r.status === 'excused').length;
    const total = sRecords.length;
    return `${s.name} (${s.group}): ${present} حاضر، ${late} متأخر، ${absent} غائب، ${excused} مستأذن (من أصل ${total})`;
  }).join("\n");

  const prompt = `
    أنت خبير تربوي ومستشار في إدارة المراكز التعليمية الإسلامية (الحلقات). 
    حلل التقرير التالي لحضور الطلاب وقدم توصيات استراتيجية ومحفزة:
    
    سجل الحضور المتراكم:
    ${statsSummary}

    المطلوب منك في الرد:
    1. تحليل سريع لمستوى الانضباط العام في المركز (تحديد الاتجاهات).
    2. ترشيح "فرسان الأسبوع": أفضل 3 طلاب التزاماً وحرصاً.
    3. تحديد الطلاب الذين يحتاجون إلى جلسة إرشادية خاصة أو تواصل مع أولياء أمورهم بسبب تكرار الغياب أو التأخر.
    4. نصيحة عملية للمشرف لجعل جلسة "فجر السبت" أكثر جاذبية للطلاب بناءً على الروح التربوية.

    اجعل الرد باللغة العربية بأسلوب راقٍ، مشجع، ومقسم لنقاط واضحة ومختصرة.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Correctly extract text output using the .text property
    return response.text || "عذراً، فشلت عملية استخراج البيانات الذكية.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "عذراً، تعذر الاتصال بالذكاء الاصطناعي حالياً. يرجى التأكد من اتصال الإنترنت أو مفتاح API.";
  }
};
