// Customer-facing product copy, following the owner's language rule (see
// CLAUDE.md "Language rule"): everything Google reads — <title>, meta
// description, product description — is English; the only Bangla is one
// short line at the end of each description.
//
// Used by the server-rendered SEO pages (routes/seo.routes.js) and by the
// bulk-import builder (scripts/noyonUpgrade). The frontend mirrors
// buildProductTitle/buildProductMetaDescription in
// frontend/src/utils/productSeo.js — keep the two in sync by hand.

const SITE_NAME = 'Noyon Telecom';
const TITLE_MAX = 65;

export function formatTaka(amount) {
  return `৳${Math.round(Number(amount) || 0).toLocaleString('en-US')}`;
}

// "{Brand} {Model} {Part} Wholesale Price in Bangladesh | Noyon Telecom",
// shortened step by step when it runs past ~65 characters (Google cuts
// longer titles off in results anyway).
export function buildProductTitle(name) {
  const candidates = [
    `${name} Wholesale Price in Bangladesh | ${SITE_NAME}`,
    `${name} Wholesale Price in Bangladesh`,
    `${name} Wholesale Price in BD`,
    `${name} Wholesale Price`,
  ];
  return candidates.find((c) => c.length <= TITLE_MAX) || name;
}

// `publicPrice` is the price customers can see — null while the owner
// hasn't published one, so a hidden draft price can never end up here.
// The page heading — the phrase people search for ("vivo y21 display price
// in bangladesh"); the <title> above carries the "Wholesale" variant.
export function buildProductH1(name) {
  return `${name} Price in Bangladesh`;
}

// `from`: the product comes in several grades and publicPrice is the cheapest.
export function buildProductMetaDescription(name, publicPrice, { from = false } = {}) {
  if (publicPrice > 0) {
    return `Wholesale ${name} for repair shops and dealers in Bangladesh ${from ? 'from' : 'at'} ${formatTaka(publicPrice)}. Pre-tested, 7-day testing warranty, fast delivery across Bangladesh. Order online or on WhatsApp.`;
  }
  return `Wholesale ${name} for repair shops and dealers in Bangladesh. Pre-tested, 7-day testing warranty, fast delivery across Bangladesh. Ask price on WhatsApp.`;
}

// Supplier quality labels -> the honest grade names used on our pages.
const GRADE_BY_OPTION = {
  'ips': 'IPS LCD (budget)',
  'copy': 'Budget copy',
  'market quality': 'Budget copy',
  'high quality': 'High copy',
  'market original': 'High copy',
  'original': 'Original / OEM',
  'original oem': 'Original / OEM',
  'original quality': 'Original / OEM',
  'set original': 'Original / OEM',
};
const GRADE_ORDER = ['IPS LCD (budget)', 'Budget copy', 'High copy', 'Original / OEM'];

export function qualityGrades(options = []) {
  const grades = new Set();
  for (const o of options) {
    const g = GRADE_BY_OPTION[String(o || '').trim().toLowerCase()];
    if (g) grades.add(g);
  }
  return GRADE_ORDER.filter((g) => grades.has(g));
}

function listText(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

// One template per part type. The product name already carries the phone
// model, so the intro doesn't repeat it. `bn` = the Bangla part word for the
// one Bangla line at the end.
export const PART_TYPES = {
  display: {
    label: 'Display',
    category: 'Display',
    bn: 'ডিসপ্লে',
    intro: (n) => `The ${n} is a complete replacement display (screen).`,
    detail: (grades) => [
      grades.length > 1
        ? `It is available in ${grades.length} grades — ${listText(grades)} — which differ in brightness, colour and price. Tell us which grade your customer needs and we will confirm today's stock.`
        : 'Similar-looking models often use different panels, so check the model number in Settings → About phone before a bulk order.',
    ],
  },
  upperGlass: {
    label: 'Display Upper Glass',
    category: 'Upper Glass',
    bn: 'ডিসপ্লে আপার গ্লাস',
    intro: (n) => `The ${n} is the front glass layer that sits on top of the display.`,
    detail: () => [
      'Technicians use it to refurbish a screen whose glass is cracked but whose display still works — a much cheaper job than replacing the whole display.',
      'Fitting it needs a separator or laminating machine, OCA glue and a dust-free bench, so it suits workshops that already do glass-only screen repairs.',
    ],
  },
  backGlass: {
    label: 'Back Glass',
    category: 'Back Glass',
    bn: 'ব্যাক গ্লাস',
    intro: (n) => `The ${n} is a replacement back panel (rear glass / back cover).`,
    detail: () => [
      'It brings back the look of a phone with a cracked or badly scratched back and keeps dust and moisture away from the parts inside.',
      'Colours depend on current stock — mention the colour you need when you order, and ask us whether the camera lens glass is included for this model.',
    ],
  },
  backCamera: {
    label: 'Back Camera',
    category: 'Camera',
    bn: 'ব্যাক ক্যামেরা',
    intro: (n) => `The ${n} is the rear (main) camera module.`,
    detail: () => [
      'Replace it when photos come out blurry, the camera app shows a black screen or the camera cannot focus.',
      'Phones with several rear lenses can use a separate module for each lens, so tell us which camera you need if you are not sure.',
    ],
  },
  frontCamera: {
    label: 'Front Camera',
    category: 'Camera',
    bn: 'ফ্রন্ট ক্যামেরা',
    intro: (n) => `The ${n} is the front (selfie) camera module.`,
    detail: () => [
      'Replace it when the selfie camera shows a black screen, takes blurry pictures or stops working in video calls.',
      'Front cameras of different models look alike but their connectors differ, so confirm the exact model before a bulk order.',
    ],
  },
  cameraGlass: {
    label: 'Camera Glass',
    category: 'Camera',
    bn: 'ক্যামেরা গ্লাস',
    intro: (n) => `The ${n} is the protective glass lens that covers the rear camera.`,
    detail: () => [
      'A cracked camera glass makes photos look hazy or blurry even when the camera itself is fine, and replacing only the glass is a quick, low-cost repair.',
      'Clean the frame well and use fresh adhesive so dust does not get under the new glass.',
    ],
  },
  chargingPort: {
    label: 'Charging Port',
    category: 'Charging Port',
    bn: 'চার্জিং পোর্ট',
    intro: (n) => `The ${n} is a replacement charging port (charging board / charging flex).`,
    detail: () => [
      'It fixes phones that do not charge, charge only at an angle, charge very slowly or are not detected by a computer.',
      'On many models the same board also carries the main microphone, so it can fix a "caller can\'t hear me" problem as well.',
    ],
  },
  simTray: {
    label: 'SIM Tray',
    category: 'SIM Tray',
    bn: 'সিম ট্রে',
    intro: (n) => `The ${n} is a replacement SIM card tray.`,
    detail: () => [
      'Replace it when the tray is lost, bent or broken, or when the phone stops reading SIM or memory cards because the old tray no longer sits flat.',
      'Colours depend on current stock — mention the colour you need when you order.',
    ],
  },
  loudspeaker: {
    label: 'Loudspeaker',
    category: 'Speaker',
    bn: 'লাউড স্পিকার',
    intro: (n) => `The ${n} is the bottom loudspeaker (ringer) — the speaker used for ringtones, notifications, speakerphone calls and media sound.`,
    detail: () => [
      'Replace it when the sound is low, distorted, rattling or missing completely.',
      'Speakers of different models can look alike but differ in size and contacts, so confirm the exact model before a bulk order.',
    ],
  },
  earSpeaker: {
    label: 'Ear Speaker',
    category: 'Speaker',
    bn: 'ইয়ার স্পিকার',
    intro: (n) => `The ${n} is the earpiece speaker — the small speaker at the top that the caller's voice comes through.`,
    detail: () => [
      'Replace it when the voice on calls is low, crackling or missing while the loudspeaker still works.',
      'Earpieces of different models can look alike but differ in size and contacts, so confirm the exact model before a bulk order.',
    ],
  },
  flex: {
    label: 'Motherboard Flex Cable',
    category: 'Flex',
    bn: 'মাদারবোর্ড ফ্লেক্স ক্যাবল',
    intro: (n) => `The ${n} is the main flex cable that connects the motherboard to the sub board.`,
    detail: () => [
      'A torn or worn main flex can stop charging, touch, display or network from working even when both boards are fine.',
      'Handle it gently and seat the connectors fully before closing the phone.',
    ],
  },
  frame: {
    label: 'Middle Frame',
    category: 'Frame',
    bn: 'মিডল ফ্রেম',
    intro: (n) => `The ${n} is the middle frame (mid-frame / chassis) — the body part between the display and the back panel that holds the parts in place.`,
    detail: () => [
      'Replace it when the frame is bent or cracked, or when a new display no longer sits flat.',
      'Colours depend on current stock — mention the colour you need when you order.',
    ],
  },
  logicBoard: {
    label: 'Logic Board',
    category: 'Logic Board',
    bn: 'লজিক বোর্ড',
    intro: (n) => `The ${n} is a replacement logic board (sub-board).`,
    detail: () => [
      'Boards differ between versions of the same phone, so send us a photo of the old board on WhatsApp if you are not sure which one you need.',
      'Board-level work suits experienced technicians.',
    ],
  },
};

// Etel/supplier part names and our own category names -> PART_TYPES key.
const PART_KEY_BY_NAME = {
  'display': 'display',
  'display upper glass': 'upperGlass',
  'upper glass': 'upperGlass',
  'backshell': 'backGlass',
  'back glass': 'backGlass',
  'back camera': 'backCamera',
  'front camera': 'frontCamera',
  'camera glass': 'cameraGlass',
  'charging logic': 'chargingPort',
  'charging port': 'chargingPort',
  'sim tray': 'simTray',
  'loudspeaker': 'loudspeaker',
  'ear speaker': 'earSpeaker',
  'motherboard flex cable': 'flex',
  'body middle frame': 'frame',
  'middle frame': 'frame',
  'logic board': 'logicBoard',
};

export function partKeyFor(partName) {
  return PART_KEY_BY_NAME[String(partName || '').trim().toLowerCase()] || null;
}

// The full English description + the one Bangla line, as plain text with
// blank lines between paragraphs (the product page splits on those).
export function buildProductDescription({ name, partKey, modelLabel, models = [], grades = [], moq = 1 }) {
  const part = PART_TYPES[partKey];
  if (!part) throw new Error(`Unknown part type: ${partKey}`);
  const pieces = moq === 1 ? 'piece' : 'pieces';
  const paragraphs = [
    part.intro(name),
    part.detail(grades).join(' '),
    `We supply it at wholesale rates to repair shops, service centers and dealers across Bangladesh — orders from ${moq} ${pieces}, with better rates for bulk quantities. Pre-tested before dispatch and covered by a 7-day testing warranty. Delivery within 24–48 hours in Dhaka and by courier across Bangladesh. Ask on WhatsApp for today's price and stock.`,
  ];
  if (models.length > 1) paragraphs.push(`Fits: ${models.join(', ')}.`);
  paragraphs.push(`${modelLabel} এর ${part.bn} পাইকারি দামে — টেস্ট করা, ৭ দিনের ওয়ারেন্টি; দাম জানতে WhatsApp করুন।`);
  return paragraphs.join('\n\n');
}
