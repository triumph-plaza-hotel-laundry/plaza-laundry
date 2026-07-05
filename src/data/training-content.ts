export type LocalizedText = {
  en: string;
  ar: string;
};

export type TrainingLesson = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  contentHtml: LocalizedText;
  lastUpdated: string;
};

export type TrainingVideo = {
  id: string;
  youtubeUrl: string;
  duration: string;
  description: LocalizedText;
};

export type TrainingState = {
  lessons: TrainingLesson[];
  videos: TrainingVideo[];
};

export const defaultTrainingState: TrainingState = {
  lessons: [
    {
      id: 'lesson-001',
      title: {
        en: 'Luxury Linen Handling Standards',
        ar: 'معايير التعامل مع بياضات الضيوف الفاخرة',
      },
      description: {
        en: 'Core standards for sorting, washing, and preserving premium linen quality.',
        ar: 'المعايير الأساسية لفرز وغسيل وحفظ جودة البياضات الفاخرة.',
      },
      contentHtml: {
        en: `
          <h3>Guest Linen Excellence Protocol</h3>
          <p>Follow this flow for every VIP and suite linen batch.</p>
          <ul>
            <li>Separate by fabric family before loading.</li>
            <li>Use approved low-alkaline chemistry only.</li>
            <li>Record any stain escalation in the shift log.</li>
          </ul>
          <table>
            <thead><tr><th>Fabric</th><th>Wash Temp</th><th>Dry Method</th></tr></thead>
            <tbody>
              <tr><td>Egyptian Cotton</td><td>40C</td><td>Low tumble</td></tr>
              <tr><td>Sateen</td><td>30C</td><td>Air finish</td></tr>
            </tbody>
          </table>
          <p><strong>Inspection:</strong> Check seams, texture, and fragrance before dispatch.</p>
        `,
        ar: `
          <h3>بروتوكول التميز لبياضات الضيوف</h3>
          <p>اتبع هذا التسلسل لكل دفعة خاصة بالأجنحة وكبار الضيوف.</p>
          <ul>
            <li>افصل حسب نوع القماش قبل التحميل.</li>
            <li>استخدم فقط المواد المعتمدة منخفضة القلوية.</li>
            <li>سجل أي تصعيد للبقع في سجل المناوبة.</li>
          </ul>
          <table>
            <thead><tr><th>القماش</th><th>حرارة الغسيل</th><th>طريقة التجفيف</th></tr></thead>
            <tbody>
              <tr><td>قطن مصري</td><td>40</td><td>تجفيف منخفض</td></tr>
              <tr><td>ساتان</td><td>30</td><td>تهوية طبيعية</td></tr>
            </tbody>
          </table>
          <p><strong>الفحص:</strong> افحص الخياطة والملمس والرائحة قبل التسليم.</p>
        `,
      },
      lastUpdated: '2026-06-30',
    },
  ],
  videos: [
    {
      id: 'video-001',
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      duration: '03:32',
      description: {
        en: 'Machine preparation and pre-cycle inspection workflow.',
        ar: 'إعداد الماكينات وخطوات الفحص قبل دورة التشغيل.',
      },
    },
  ],
};
