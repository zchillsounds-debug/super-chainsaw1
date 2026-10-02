// Arabic interface with right-to-left layout. The UI is built in English across many modules, so rather than
// threading keys through all of them, a MutationObserver translates interface text as it appears:
// exact strings from the table, plus a few patterns for strings with numbers or names in them.
// Story dialogue and codex entries stay in English (marked in the settings note).
const AR = {
  'Enter the Sands': 'ادخل الرمال', 'Continue': 'متابعة', 'New Chronicle': 'سيرة جديدة', 'Settings': 'الإعدادات',
  'Inventory': 'المتاع', 'Disciplines': 'المهارات', 'Journal': 'اليوميات', 'Codex': 'الموسوعة', 'Map': 'الخريطة', 'Controls': 'التحكّم',
  'The Renegade of the Sawad': 'المتمرّد في السواد',
  'Defeat Ziyad at the old caravanserai': 'اهزم زيادًا عند الخان القديم',
  'Drive Hisham\'s men from the kiln yard': 'اطرد رجال هشام من ساحة الأفران',
  'Face Ghassan at the ruined Persian arch': 'واجه غسّان عند الطاق الفارسي المهدّم',
  'Choose Salim\'s Discipline': 'اختر فنّ سالم', 'You can change it later at the training yard in the suq.': 'يمكنك تغييره لاحقًا في ساحة التدريب في السوق.',
  'Faris': 'فارس', 'Rami': 'رامٍ', 'Naffat': 'نفّاط', '\'Ayyar': 'عيّار',
  'You Have Fallen': 'لقد سقطت', 'Rise Again': 'انهض من جديد', 'Victory': 'النصر', 'Continue Exploring': 'تابع الاستكشاف',
  'Open your stash': 'افتح خزانتك', 'Descend into the kiln tunnels': 'انزل إلى أنفاق الأفران', 'Descend the qanat shaft': 'انزل في بئر القناة',
  'Climb back to the surface': 'اصعد إلى السطح', 'Open the chest': 'افتح الصندوق',
  'Yusuf · Merchant': 'يوسف · التاجر', 'Bishr · Blacksmith': 'بشر · الحدّاد', 'Your Stash': 'خزانتك', '\'Amr · Training Yard': 'عمرو · ساحة التدريب',
  'Upgrade': 'تحسين', 'Salvage': 'تفكيك', 'Enchant': 'نقش', 'Temper': 'اسقِ الحديد', 'Descend': 'انزل',
  'For sale: tap to buy': 'للبيع: انقر للشراء', 'Your pack: tap to sell': 'متاعك: انقر للبيع', 'Stash: tap to take': 'الخزانة: انقر للأخذ', 'Your pack: tap to store': 'متاعك: انقر للتخزين',
  'Normal': 'عادي', 'Veteran': 'محنّك', 'Elite': 'نخبة', 'Torment I': 'عذاب ١', 'Torment II': 'عذاب ٢', 'Torment III': 'عذاب ٣',
  'The Ruined Qanats': 'القنوات المهدّمة', 'Farewell.': 'وداعًا.', 'Back.': 'رجوع.', 'Hold to skip': 'اضغط مطوّلًا للتخطّي',
  'Not enough dinars': 'لا تكفي الدنانير', 'Your pack is full': 'متاعك ممتلئ', 'No sherbet left': 'نفد الشراب',
  'Weapon': 'السلاح', 'Armor': 'الدرع', 'Helm': 'الخوذة', 'Ring': 'الخاتم', 'Amulet': 'القلادة',
  'Graphics': 'الرسوميات', 'Audio': 'الصوت', 'Accessibility': 'سهولة الوصول', 'Language': 'اللغة',
  'Quality': 'الجودة', 'Resolution': 'الدقّة', 'Shadows': 'الظلال', 'Ambient occlusion': 'الإظلال المحيط', 'Bloom': 'التوهّج', 'Atmosphere': 'الأجواء', 'Show FPS': 'عرض الإطارات',
  'Master': 'العام', 'Music': 'الموسيقى', 'Effects': 'المؤثّرات', 'Ambience': 'الأجواء الصوتية',
  'Attack button': 'زر الهجوم', 'Hold to repeat': 'اضغط باستمرار للتكرار', 'Tap to toggle': 'انقر للتبديل', 'Camera shake': 'اهتزاز الكاميرا', 'Button size': 'حجم الأزرار', 'Button opacity': 'شفافية الأزرار',
  'Subtitle size': 'حجم الترجمة', 'Colour vision': 'رؤية الألوان', 'Off': 'إيقاف', 'On': 'تشغيل', 'Protanopia': 'عمى الأحمر', 'Deuteranopia': 'عمى الأخضر', 'Tritanopia': 'عمى الأزرق',
  'Reduce flashing': 'تقليل الوميض', 'Tutorial hints': 'تلميحات تعليمية', 'Low': 'منخفضة', 'High': 'عالية', 'Small': 'صغير', 'Medium': 'متوسّط', 'Large': 'كبير', 'Huge': 'ضخم',
  'Reload to apply': 'أعد التحميل للتطبيق', 'Gamepad': 'يد التحكّم', 'Tasks': 'المهام', 'Deeds': 'المآثر',
  'Show me your wares.': 'أرني بضاعتك.', 'Training.': 'التدريب.',
};
const PATTERNS = [
  [/^Level (\d+)$/, (m) => `المستوى ${m[1]}`],
  [/^Talk to (.+)$/, (m) => `تحدّث إلى ${({ Ishaq: 'إسحاق', Yusuf: 'يوسف', Bishr: 'بشر', '\'Amr': 'عمرو' })[m[1]] || m[1]}`],
  [/^◉ (\d+) Dinars$/, (m) => `◉ ${m[1]} دينار`],
  [/^(\d+) Dinars$/, (m) => `${m[1]} دينار`],
  [/^([◇✦·]) (.+)$/, (m) => AR[m[2]] ? `${m[1]} ${AR[m[2]]}` : null],
];
export let LANG = 'en';
const SKIP = new Set(['dmg', 'hpbars', 'perf']);
function tr(s) {
  const k = s.trim(); if (!k) return null;
  if (AR[k]) return s.replace(k, AR[k]);
  for (const [re, f] of PATTERNS) { const m = k.match(re); if (m) { const r = f(m); if (r) return s.replace(k, r); } }
  return null;
}
function walk(node) {
  if (node.nodeType === 3) { const r = tr(node.nodeValue); if (r) node.nodeValue = r; return; }
  if (node.nodeType !== 1 || SKIP.has(node.id)) return;
  if (node.title) { const r = tr(node.title); if (r) node.title = r; }
  for (const c of node.childNodes) walk(c);
}
let obs = null;
export function setLanguage(lang) {
  LANG = lang;
  document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.body.classList.toggle('ar', lang === 'ar');
  obs?.disconnect(); obs = null;
  if (lang !== 'ar') return;
  walk(document.body);
  obs = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') { const r = tr(m.target.nodeValue); if (r) m.target.nodeValue = r; continue; }
      for (const n of m.addedNodes) walk(n);
    }
  });
  obs.observe(document.body, { childList: true, subtree: true, characterData: true });
}
