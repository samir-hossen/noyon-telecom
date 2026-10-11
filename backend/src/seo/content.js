// Text for the category, brand, brand + category and model pages — titles,
// meta descriptions, H1s, intros and FAQs — in English (owner's language
// rule: everything Google reads is English; Bangla only in the UI).
// One source for both the server-rendered pages (seo/pages.js) and the
// storefront, which reads it from GET /api/seo/page.

const SITE = 'Noyon Telecom';
const TITLE_MAX = 65;

// "{base} | Noyon Telecom", shortened step by step past ~65 characters.
// Page 2+ of a listing gets " — Page N", so 100 pages of one category don't
// share one title.
export function pageTitle(base, page = 1) {
  const sfx = page > 1 ? ` — Page ${page}` : '';
  const variants = [base, base.replace(/ in Bangladesh$/, ' in BD'), base.replace(/ in Bangladesh$/, '')];
  const candidates = [`${base}${sfx} | ${SITE}`, ...variants.map((v) => `${v}${sfx}`)];
  return candidates.find((c) => c.length <= TITLE_MAX) || candidates[candidates.length - 1];
}

// Meta descriptions: the first candidate that fits Google's ~160 characters;
// page 2+ starts with "Page N:".
const DESC_MAX = 160;
function fitDescription(candidates, page = 1) {
  const pre = page > 1 ? `Page ${page}: ` : '';
  const list = candidates.filter(Boolean).map((c) => `${pre}${c}`);
  return list.find((c) => c.length <= DESC_MAX) || list[list.length - 1];
}

// Category intros (one per category, keyed by the lower-case name).
export const CATEGORY_INTRO = {
  display: "Noyon Telecom imports and stocks mobile phone display assemblies at wholesale prices for repair shops, service centers, and dealers across Bangladesh. Our display range covers OLED, LCD, and Incell panels for popular Samsung, Vivo, Oppo, Xiaomi, and other brand models — each listing names the exact compatible model (and the quality grades where we have them) so you order the right part the first time. OLED panels generally offer better color and battery efficiency, while LCD and Incell options give a lower-cost alternative for budget repairs; our team can help you choose based on your customer's needs and budget over WhatsApp. Every display is pre-tested before dispatch and carries a 7-day testing warranty, so you can confirm functionality before permanent installation. We deliver inside Dhaka within 24-48 hours and nationwide via courier, with bulk pricing available for repair shops ordering multiple units.",
  "upper glass": "A display upper glass is the front glass layer that sits over the panel. When only the glass is cracked and the screen underneath still works, replacing just this glass (with a separator or laminating machine and OCA glue) costs far less than a full display. Noyon Telecom supplies upper glass for a wide range of Samsung, Vivo, Oppo, Xiaomi, iPhone and other models at wholesale rates, each listed with its exact compatible model so you order the right size and shape. This part suits workshops that already do glass-only screen refurbishing. Every piece is checked before dispatch and covered by our 7-day testing warranty, with fast delivery inside Dhaka and courier delivery across Bangladesh.",
  "charging port": "Charging port failures are among the most frequent repair jobs mobile technicians handle, usually caused by dust buildup, physical wear, or liquid damage. Noyon Telecom stocks wholesale charging port flex cables and sub-boards compatible with a wide range of Samsung, Vivo, Oppo, Xiaomi, and other smartphone models, each listed with its exact compatible models so you can match the right part quickly. A charging port replacement is typically a straightforward repair, but using the correct flex cable variant for the exact model is essential to avoid a poor charging connection. Every charging port we sell is pre-tested before dispatch and comes with a 7-day testing warranty. We deliver across Bangladesh with fast turnaround inside Dhaka, and offer wholesale pricing for repair shops ordering in bulk.",
  "back glass": "Back glass panels are a common casualty of drops, and replacing a cracked one is one of the more visually impactful repairs a shop can offer. Noyon Telecom imports back glass and body housing parts at wholesale prices for a wide range of smartphone models, with each listing specifying the exact compatible model so you avoid a color or fit mismatch. We also stock camera lens glass and full housing kits for models where the back glass and frame are sold together. All parts are quality-checked before dispatch and backed by our 7-day testing warranty for manufacturing defects. Wholesale pricing applies for bulk orders, and we deliver nationwide across Bangladesh with fast delivery inside Dhaka — ideal for repair shops that need to keep back glass stock on hand for popular models.",
  oled: "OLED (Organic Light-Emitting Diode) displays offer richer colors, true blacks, and better power efficiency compared to traditional LCD panels, making them the preferred replacement option for flagship and mid-range smartphones. Noyon Telecom stocks wholesale OLED display assemblies, pre-tested before dispatch, for a range of Samsung, Vivo, Oppo, Xiaomi, and other brand models. Each product listing specifies the exact compatible models, since OLED panels are model-specific and not interchangeable across devices. We recommend confirming your exact model via WhatsApp before ordering in bulk to avoid a mismatch. Every OLED display we sell carries a 7-day testing warranty, and we offer wholesale pricing for repair shops and dealers ordering multiple units, with delivery across Bangladesh.",
  lcd: "LCD (Liquid Crystal Display) panels remain a reliable, cost-effective replacement option for many smartphone models, especially for budget and mid-range devices. Noyon Telecom stocks wholesale LCD display assemblies imported and tested for quality before they reach our warehouse, covering a wide range of Samsung, Vivo, Oppo, Xiaomi, and other brand models. LCD panels are generally more affordable than OLED alternatives, making them a popular choice for repair shops serving price-sensitive customers, while still offering solid display quality for everyday use. Each listing states the exact compatible models — confirm your device's exact model via WhatsApp before a bulk order. Every LCD panel carries our 7-day testing warranty, with wholesale pricing and nationwide delivery across Bangladesh.",
  touch: "A touch screen digitizer registers finger input on a smartphone's display and is a separate component from the display panel itself in many repair scenarios, particularly for combo assemblies where the two are fused. Noyon Telecom stocks wholesale touch screen digitizers compatible with a range of Samsung, Vivo, Oppo, Xiaomi, and other smartphone models, with each listing specifying compatible models to help you order the correct part. A malfunctioning touch response, unresponsive areas, or ghost touches are the typical symptoms that call for a digitizer replacement. All touch screen parts are quality-checked before dispatch and covered by our 7-day testing warranty. We offer wholesale pricing for repair shops and dealers, with fast delivery inside Dhaka and nationwide courier service across Bangladesh.",
  housing: "Housing and body replacement parts let a repair shop restore a smartphone's outer frame and structure after drop damage or heavy wear. Noyon Telecom stocks wholesale housing parts for a range of smartphone models, with each listing specifying exact compatible models and finish/color options where applicable. A full housing replacement is often paired with a back glass or middle frame swap depending on the extent of the damage — our team can advise on the right combination for a given repair job over WhatsApp. All housing parts are quality-checked before dispatch and backed by our 7-day testing warranty for manufacturing defects. We offer wholesale pricing for bulk orders and deliver nationwide across Bangladesh, with fast turnaround inside Dhaka.",
  frame: "The middle frame (chassis) is the structural backbone of a smartphone, holding the display and other internal components in place. Noyon Telecom stocks wholesale middle frame replacement parts for a range of smartphone models, each listing specifying exact compatible models to ensure a correct fit. A bent or cracked frame from a drop can affect how well other components seat, making a frame replacement necessary for a proper repair rather than a cosmetic one. All frame parts are quality-checked before dispatch and covered by our 7-day testing warranty. We offer wholesale pricing for repair shops and dealers ordering in bulk, with delivery available across Bangladesh and fast turnaround inside Dhaka.",
  camera: "Camera module failures — blurry photos, a black screen in the camera app, or a cracked lens — are common repair requests, and Noyon Telecom stocks wholesale front and rear camera modules for a range of Samsung, Vivo, Oppo, Xiaomi, and other smartphone models. Each listing specifies the exact compatible models and camera position (front/rear, main/ultra-wide/macro where applicable), so you can order the precise part your repair needs. Camera modules are pre-tested before dispatch to confirm they function correctly, and every purchase carries our 7-day testing warranty. We offer wholesale pricing for repair shops and technicians ordering multiple units, with fast delivery inside Dhaka and nationwide courier service across Bangladesh.",
  speaker: "Loudspeaker and ringer issues — no sound, distorted audio, or a rattling noise — are a common and usually quick repair. Noyon Telecom stocks wholesale speaker replacement parts for a range of smartphone models, with each listing specifying exact compatible models. Speaker modules are quality-checked before dispatch to confirm sound output before they reach you, and every purchase carries our 7-day testing warranty. We supply repair shops and technicians across Bangladesh with wholesale pricing on bulk orders, and offer fast delivery inside Dhaka along with nationwide courier service for shops outside the capital.",
  microphone: "Microphone problems — the other party can't hear you clearly during calls, or voice recordings sound muffled — usually point to a faulty mic component rather than a software issue. Noyon Telecom stocks wholesale microphone replacement parts for a range of smartphone models, with each listing specifying exact compatible models. All microphone parts are quality-checked before dispatch and backed by our 7-day testing warranty. We serve repair shops, technicians, and service centers across Bangladesh with wholesale pricing and reliable delivery, including fast turnaround inside Dhaka.",
  flex: "Flex cables and ribbon connectors link various components inside a smartphone — buttons, sensors, cameras, and more — and a damaged or worn flex cable can cause a range of intermittent issues. Noyon Telecom stocks wholesale flex cables for a range of smartphone models and functions, with each listing specifying the exact compatible model and function to help you identify the correct part for your repair. All flex cables are quality-checked before dispatch and carry our 7-day testing warranty. We offer wholesale pricing for repair shops and technicians across Bangladesh, with fast delivery inside Dhaka and nationwide courier service.",
  "logic board": "Logic board and small board repairs are more advanced work, often required when a device won't power on, has charging IC failure, or shows other deeper hardware faults. Noyon Telecom stocks wholesale logic board and small board replacement parts for a range of smartphone models, with each listing specifying exact compatible models. These parts are best suited for experienced technicians comfortable with board-level repair. All logic boards are quality-checked before dispatch and carry our 7-day testing warranty. We supply repair shops and service centers across Bangladesh with wholesale pricing and reliable nationwide delivery.",
  motherboard: "A motherboard (mainboard) replacement is typically needed when a smartphone has suffered severe liquid damage, a major short circuit, or other faults beyond component-level repair. Noyon Telecom stocks wholesale motherboard replacement parts for a range of smartphone models, with each listing specifying exact compatible models. This is advanced repair work best handled by experienced technicians. All motherboards are quality-checked before dispatch and carry our 7-day testing warranty. We supply repair shops and service centers across Bangladesh with wholesale pricing and reliable nationwide delivery.",
  ic: "Power ICs, charging ICs, and other repair chips are used by technicians to fix specific hardware faults at the component level — a charging IC failure, for instance, can cause a device to not charge even with a working charging port and cable. Noyon Telecom stocks wholesale IC chips for smartphone repair, with each listing specifying the exact chip type and compatible models. This is specialized repair work best suited to experienced technicians with micro-soldering equipment. All ICs are quality-checked before dispatch and carry our 7-day testing warranty. We supply repair shops and technicians across Bangladesh with wholesale pricing and reliable delivery.",
  cpu: "CPU (processor) replacement is advanced, specialized repair work typically undertaken when a device has suffered a processor-level fault, and requires micro-soldering expertise. Noyon Telecom stocks wholesale CPU replacement chips for smartphone repair, with each listing specifying the exact chip and compatible models. All CPU chips are quality-checked before dispatch and carry our 7-day testing warranty. We supply experienced technicians and service centers across Bangladesh with wholesale pricing and reliable nationwide delivery.",
  buttons: "Power, volume, and home button failures are common wear-and-tear issues, especially on older or heavily-used devices. Noyon Telecom stocks wholesale button and switch replacement parts for a range of smartphone models, with each listing specifying exact compatible models. All button parts are quality-checked before dispatch and carry our 7-day testing warranty. We supply repair shops and technicians across Bangladesh with wholesale pricing on bulk orders, with fast delivery inside Dhaka and nationwide courier service.",
  "sim tray": "A SIM card tray can get lost, bent, or its ejector mechanism can fail over time, and Noyon Telecom stocks wholesale SIM tray replacement parts for a range of smartphone models, colors, and single/dual-SIM variants. Each listing specifies exact compatible models and tray type to help you order the correct part. All SIM trays are quality-checked before dispatch and carry our 7-day testing warranty. We supply repair shops and dealers across Bangladesh with wholesale pricing and reliable delivery, including fast turnaround inside Dhaka.",
  fingerprint: "Fingerprint sensor issues — slow recognition, failure to register a fingerprint, or a sensor that stops working entirely — are a common repair request on devices with a physical or in-display fingerprint sensor. Noyon Telecom stocks wholesale fingerprint sensor replacement parts for a range of smartphone models, with each listing specifying exact compatible models. All fingerprint sensors are quality-checked before dispatch and carry our 7-day testing warranty. We supply repair shops and technicians across Bangladesh with wholesale pricing and reliable delivery.",
  "face id": "Face ID / dot projector module failures affect facial recognition unlock on supported devices, and are a more specialized repair than most touch/display work. Noyon Telecom stocks wholesale Face ID module replacement parts for supported smartphone models, with each listing specifying exact compatible models. This repair typically requires careful handling of calibration data — our team can advise over WhatsApp. All modules are quality-checked before dispatch and carry our 7-day testing warranty. We supply experienced repair shops and technicians across Bangladesh with wholesale pricing and reliable delivery.",
  "repair tools": "Beyond replacement parts, Noyon Telecom also stocks wholesale mobile phone repair tools and equipment for technicians and repair shops across Bangladesh — the everyday essentials that keep a repair bench running smoothly. Each listing specifies the tool type and any relevant specifications. All tools are quality-checked before dispatch, and we offer wholesale pricing for shops equipping a new bench or restocking consumables, with reliable delivery nationwide.",
  accessories: "Alongside spare parts, Noyon Telecom stocks wholesale mobile phone accessories for dealers and shops across Bangladesh, at competitive rates suited to resale. Each listing specifies the exact product and compatible models where relevant. We offer wholesale pricing for bulk orders and reliable delivery nationwide, with fast turnaround inside Dhaka — a convenient one-stop order alongside your spare parts purchase.",
};

// Category <title>/H1/meta.
export const CATEGORY_SEO = {
  display: {"title": "Mobile Display Wholesale in Bangladesh", "h1": "Mobile Display Wholesale in Bangladesh", "desc": "Wholesale smartphone displays in Bangladesh — IPS/LCD, OLED and original grades. Pre-tested, 7-day testing warranty, from Gulistan, Dhaka."},
  "upper glass": {"title": "Display Upper Glass Wholesale in Bangladesh", "h1": "Display Upper Glass Wholesale in Bangladesh", "desc": "Wholesale front (upper) glass for screen refurbishing — replace only the cracked glass when the display still works. For repair shops in Bangladesh."},
  "charging port": {"title": "Mobile Charging Port & Flex Ribbon Wholesale BD", "h1": "Mobile Charging Port Wholesale in Bangladesh", "desc": "Wholesale supplier of smartphone charging ports, sub-boards, and flex ribbons across Bangladesh."},
  "back glass": {"title": "Mobile Back Glass & Housing Wholesale Bangladesh", "h1": "Mobile Back Glass & Housing Wholesale BD", "desc": "Imported smartphone back glass, camera glass, and body housing replacement parts at wholesale rates."},
  oled: {"title": "OLED Display Wholesale in Bangladesh", "h1": "OLED Display Wholesale in Bangladesh", "desc": "Wholesale OLED smartphone displays, pre-tested before dispatch, for repair shops and dealers across Bangladesh."},
  lcd: {"title": "LCD Display Wholesale in Bangladesh", "h1": "LCD Display Wholesale in Bangladesh", "desc": "Wholesale LCD smartphone displays at competitive rates, imported and tested for repair shops in Dhaka and nationwide."},
  touch: {"title": "Mobile Touch Screen Digitizer Wholesale BD", "h1": "Mobile Touch Screen Wholesale in Bangladesh", "desc": "Wholesale touch screen digitizers for smartphones, compatible with major brands, at dealer pricing in Bangladesh."},
  housing: {"title": "Mobile Housing & Body Wholesale in Bangladesh", "h1": "Mobile Housing Wholesale in Bangladesh", "desc": "Wholesale smartphone housing and body replacement parts for repair shops and dealers in Bangladesh."},
  frame: {"title": "Mobile Middle Frame Wholesale in Bangladesh", "h1": "Mobile Frame Wholesale in Bangladesh", "desc": "Wholesale middle frame and chassis replacement parts for smartphones, at dealer rates in Bangladesh."},
  camera: {"title": "Mobile Camera Module Wholesale in Bangladesh", "h1": "Mobile Camera Module Wholesale in Bangladesh", "desc": "Wholesale front and rear camera module replacements for smartphones, for repair shops and technicians in Bangladesh."},
  speaker: {"title": "Mobile Speaker & Ringer Wholesale in Bangladesh", "h1": "Mobile Speaker Wholesale in Bangladesh", "desc": "Wholesale loudspeaker and ringer replacement parts for smartphones, at competitive dealer rates in Bangladesh."},
  microphone: {"title": "Mobile Microphone Wholesale in Bangladesh", "h1": "Mobile Microphone Wholesale in Bangladesh", "desc": "Wholesale microphone replacement parts for smartphones, for repair shops and service centers in Bangladesh."},
  flex: {"title": "Mobile Flex Cable Wholesale in Bangladesh", "h1": "Mobile Flex Cable Wholesale in Bangladesh", "desc": "Wholesale flex cables and ribbon connectors for smartphones, at dealer pricing for repair shops in Bangladesh."},
  "logic board": {"title": "Mobile Logic Board Wholesale in Bangladesh", "h1": "Mobile Logic Board Wholesale in Bangladesh", "desc": "Wholesale logic board and small board replacement parts for smartphones, for technicians and repair shops in Bangladesh."},
  motherboard: {"title": "Mobile Motherboard Wholesale in Bangladesh", "h1": "Mobile Motherboard Wholesale in Bangladesh", "desc": "Wholesale motherboard and mainboard replacement parts for smartphones, for repair shops and dealers in Bangladesh."},
  ic: {"title": "Mobile IC Chip Wholesale in Bangladesh", "h1": "Mobile IC Wholesale in Bangladesh", "desc": "Wholesale power IC, charging IC, and other smartphone repair chips, for technicians and repair shops in Bangladesh."},
  cpu: {"title": "Mobile CPU Wholesale in Bangladesh", "h1": "Mobile CPU Wholesale in Bangladesh", "desc": "Wholesale CPU/processor replacement chips for smartphone repair, for technicians and service centers in Bangladesh."},
  buttons: {"title": "Mobile Buttons & Switches Wholesale BD", "h1": "Mobile Buttons Wholesale in Bangladesh", "desc": "Wholesale power, volume, and home button replacement parts for smartphones, at dealer rates in Bangladesh."},
  "sim tray": {"title": "Mobile SIM Tray Wholesale in Bangladesh", "h1": "Mobile SIM Tray Wholesale in Bangladesh", "desc": "Wholesale SIM card tray replacement parts for smartphones, for repair shops and dealers in Bangladesh."},
  fingerprint: {"title": "Mobile Fingerprint Sensor Wholesale BD", "h1": "Mobile Fingerprint Sensor Wholesale in Bangladesh", "desc": "Wholesale fingerprint sensor replacement parts for smartphones, for repair shops and technicians in Bangladesh."},
  "face id": {"title": "Mobile Face ID Module Wholesale in Bangladesh", "h1": "Mobile Face ID Module Wholesale in Bangladesh", "desc": "Wholesale Face ID / dot projector module replacement parts for smartphones, for repair shops in Bangladesh."},
  "repair tools": {"title": "Mobile Repair Tools Wholesale in Bangladesh", "h1": "Mobile Repair Tools Wholesale in Bangladesh", "desc": "Wholesale mobile phone repair tools and equipment for technicians and repair shops in Bangladesh."},
  accessories: {"title": "Mobile Accessories Wholesale in Bangladesh", "h1": "Mobile Accessories Wholesale in Bangladesh", "desc": "Wholesale mobile phone accessories for dealers and shops across Bangladesh, at competitive rates."},
};

// How a category reads inside a sentence ("cheap displays", "SIM trays").
const PLURAL = {
  display: 'displays', 'upper glass': 'display upper glass', 'back glass': 'back glass', camera: 'cameras',
  'charging port': 'charging ports', 'sim tray': 'SIM trays', speaker: 'speakers', flex: 'flex cables',
  frame: 'middle frames', 'logic board': 'logic boards', oled: 'OLED displays', lcd: 'LCD displays',
  touch: 'touch screens', housing: 'housings', microphone: 'microphones', motherboard: 'motherboards',
  ic: 'ICs', cpu: 'CPUs', buttons: 'buttons', fingerprint: 'fingerprint sensors', 'face id': 'Face ID modules',
  'repair tools': 'repair tools', accessories: 'accessories',
};

// One practical line per part type for the brand + category pages.
const CATEGORY_TIP = {
  display: 'Displays come in different grades — budget LCD/Incell, high copy and original/OEM — so tell us which grade your customer needs.',
  'upper glass': 'Upper glass is for glass-only screen repairs and needs a separator or laminating machine and OCA glue.',
  'back glass': 'Colours depend on stock, so mention the colour you need when you order.',
  camera: 'Rear, front and lens-glass parts are listed separately, so check which one your repair needs.',
  'charging port': 'On many models the charging board also carries the main microphone.',
  'sim tray': 'Colours depend on stock, so mention the colour you need when you order.',
  speaker: 'Loudspeakers and earpieces are listed separately — check which one has stopped working.',
  flex: 'Handle flex cables gently and seat the connectors fully before closing the phone.',
  frame: 'A bent frame stops a new display from sitting flat, so replace it together with the screen when needed.',
  'logic board': 'Boards differ between versions of the same phone — send a photo of the old board if you are not sure.',
};

function key(category) {
  return String(category || '').toLowerCase();
}

export function pluralCategory(category) {
  return PLURAL[key(category)] || key(category);
}

// Lower-case part names inside a sentence, keeping acronyms ("SIM tray").
function inSentence(part) {
  return String(part).toLowerCase().replace(/\bsim\b/g, 'SIM');
}

function listText(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

// ---------- category pages ----------
export function categoryHead(category, page = 1) {
  const seo = CATEGORY_SEO[key(category)];
  const base = seo ? seo.title : `${category} Wholesale in Bangladesh`;
  return {
    title: pageTitle(base, page),
    description: fitDescription([
      seo?.desc,
      `Wholesale ${pluralCategory(category)} for repair shops and dealers in Bangladesh. Pre-tested, 7-day testing warranty, fast delivery across Bangladesh.`,
      `Wholesale ${pluralCategory(category)} in Bangladesh. Pre-tested, 7-day testing warranty.`,
    ], page),
    h1: seo ? seo.h1 : base,
  };
}

export function categoryIntro(category) {
  return CATEGORY_INTRO[key(category)] || `Noyon Telecom supplies ${pluralCategory(category)} at wholesale rates to repair shops, service centers and dealers across Bangladesh. Every listing names the exact phone model it fits. Parts are pre-tested before dispatch, carry a 7-day testing warranty and are delivered within 24–48 hours inside Dhaka and by courier across Bangladesh.`;
}

export function categoryFaq(category, brands = []) {
  const parts = pluralCategory(category);
  return [
    {
      q: `Which phone models do you have ${parts} for?`,
      a: `${brands.length ? `We list ${parts} for ${listText(brands.slice(0, 8))}${brands.length > 8 ? ' and more brands' : ''}. ` : ''}Each product page names the exact model it fits. If you can't find your model, message us on WhatsApp with the model number.`,
    },
    {
      q: `What is the wholesale price of ${parts}?`,
      a: 'Prices depend on the model and quality grade and change with stock. Where a price is not shown, message us on WhatsApp with the model and quantity and we will reply with today\'s wholesale price.',
    },
    {
      q: 'What is the minimum order quantity (MOQ)?',
      a: 'Most parts start from 1 piece — the MOQ is shown on every product page — and bulk orders get better rates.',
    },
    {
      q: 'Do these parts come with a warranty?',
      a: 'Yes. Every part is pre-tested before dispatch and has a 7-day testing warranty from delivery — please test it before final fitting.',
    },
    {
      q: 'Do you deliver outside Dhaka?',
      a: 'Yes. We deliver within 24–48 hours inside Dhaka and by courier to every district of Bangladesh, usually in 2–4 days.',
    },
  ];
}

// ---------- brand pages ----------
export function brandHead(brand, categories = [], page = 1) {
  const top = categories.slice(0, 4).map((c) => pluralCategory(c.name));
  return {
    title: pageTitle(`${brand} Mobile Parts Wholesale Price in Bangladesh`, page),
    description: fitDescription([
      top.length ? `Wholesale ${brand} spare parts in Bangladesh — ${listText(top)}. Pre-tested, 7-day testing warranty, fast delivery.` : null,
      top.length > 2 ? `Wholesale ${brand} spare parts in Bangladesh — ${listText(top.slice(0, 2))} and more. Pre-tested, 7-day warranty.` : null,
      `Wholesale ${brand} spare parts for repair shops and dealers in Bangladesh. Pre-tested, 7-day testing warranty, fast delivery.`,
    ], page),
    h1: `${brand} Mobile Parts Wholesale in Bangladesh`,
  };
}

export function brandIntro(brand, categories = [], modelCount = 0) {
  const range = categories.slice(0, 6).map((c) => `${pluralCategory(c.name)} (${c.count})`);
  return [
    `Noyon Telecom supplies ${brand} spare parts at wholesale rates to mobile repair shops, service centers and dealers across Bangladesh.`,
    range.length ? `Our ${brand} range covers ${modelCount ? `${modelCount} phone models, with ` : ''}${listText(range)}.` : '',
    'Every listing names the exact model it fits, so you can order the right part the first time.',
    'Parts are pre-tested before dispatch and carry a 7-day testing warranty, with delivery within 24–48 hours inside Dhaka and by courier to every district.',
    'Prices change with stock and quality grade — message us on WhatsApp for today\'s wholesale price, or send your list for a bulk quotation.',
  ].filter(Boolean).join(' ');
}

export function brandFaq(brand, categories = []) {
  const top = categories.slice(0, 5).map((c) => pluralCategory(c.name));
  return [
    {
      q: `Which ${brand} parts do you sell?`,
      a: top.length ? `Mainly ${listText(top)} for ${brand} phones. Use the category links on this page to see every part.` : `Use the category links on this page to see every ${brand} part we list.`,
    },
    {
      q: `How do I find the right part for my ${brand} phone?`,
      a: 'Check the exact model on the phone (Settings → About phone), then open that model\'s page — it lists every part we have for it. Ask on WhatsApp if you are not sure.',
    },
    {
      q: `What is the wholesale price of ${brand} parts?`,
      a: 'It depends on the model and quality grade. Where a price is not shown, message us on WhatsApp with the model and quantity for today\'s wholesale price.',
    },
    {
      q: 'Is there a warranty, and do you deliver outside Dhaka?',
      a: 'Every part has a 7-day testing warranty. We deliver within 24–48 hours inside Dhaka and by courier to every district of Bangladesh.',
    },
  ];
}

// ---------- brand + category pages ----------
export function brandCategoryHead(brand, category, count = 0, page = 1) {
  const parts = pluralCategory(category);
  return {
    title: pageTitle(`${brand} ${category} Wholesale Price in Bangladesh`, page),
    description: fitDescription([
      `Wholesale ${brand} ${parts}${count ? ` for ${count} models` : ''} in Bangladesh, for repair shops and dealers. Pre-tested, 7-day testing warranty.`,
      `Wholesale ${brand} ${parts} in Bangladesh. Pre-tested, 7-day testing warranty, fast delivery.`,
    ], page),
    h1: `${brand} ${category} Wholesale in Bangladesh`,
  };
}

export function brandCategoryIntro(brand, category, count = 0, sampleModels = []) {
  const parts = pluralCategory(category);
  return [
    `Noyon Telecom lists ${count ? `${count} ` : ''}${brand} ${parts} at wholesale rates${sampleModels.length ? `, including ${listText(sampleModels.slice(0, 4))}` : ''}.`,
    'Each product page names the exact model it fits.',
    CATEGORY_TIP[key(category)] || '',
    'Every part is pre-tested before dispatch and has a 7-day testing warranty; we deliver within 24–48 hours inside Dhaka and by courier across Bangladesh.',
    'Ask on WhatsApp for today\'s price.',
  ].filter(Boolean).join(' ');
}

// ---------- model hub pages (/model/<slug>) ----------
export function modelHead(model, parts = []) {
  return {
    title: pageTitle(`${model} Parts Wholesale Price in Bangladesh`),
    description: fitDescription([
      parts.length ? `All ${model} spare parts at wholesale — ${listText(parts.slice(0, 5).map(inSentence))}. Pre-tested, 7-day testing warranty, Bangladesh.` : null,
      parts.length > 3 ? `All ${model} spare parts at wholesale — ${listText(parts.slice(0, 3).map(inSentence))} and more. Pre-tested, 7-day warranty.` : null,
      `All ${model} spare parts at wholesale in Bangladesh. Pre-tested, 7-day testing warranty, fast delivery.`,
    ]),
    h1: `${model} Parts — Wholesale Price in Bangladesh`,
  };
}

export function modelIntro(model, parts = []) {
  return [
    `Here is every ${model} spare part we supply at wholesale${parts.length ? `: ${listText(parts.map(inSentence))}` : ''}.`,
    'Noyon Telecom serves repair shops, service centers and dealers across Bangladesh, and orders start from one piece.',
    'Each part is pre-tested before dispatch and covered by a 7-day testing warranty.',
    `Before ordering, confirm the exact model on the phone (Settings → About phone) — versions of the ${model} with a different model code can need different parts.`,
    'Message us on WhatsApp with your list for one combined quotation; we deliver within 24–48 hours inside Dhaka and by courier anywhere in Bangladesh.',
  ].join(' ');
}

export function modelFaq(model, parts = []) {
  return [
    {
      q: `Which ${model} parts do you sell?`,
      a: parts.length ? `${listText(parts)}. Each one has its own page with the details.` : 'See the list on this page — each part has its own page with the details.',
    },
    {
      q: `How do I know a part fits my ${model}?`,
      a: 'Check the model name and model number in Settings → About phone and compare it with the product page. If in doubt, send us a photo of the old part on WhatsApp.',
    },
    {
      q: `What is the wholesale price of ${model} parts?`,
      a: 'It depends on the part and quality grade. Where a price is not shown, message us on WhatsApp for today\'s wholesale price.',
    },
    {
      q: 'Is there a warranty, and do you deliver outside Dhaka?',
      a: 'Every part has a 7-day testing warranty. We deliver within 24–48 hours inside Dhaka and by courier to every district of Bangladesh.',
    },
  ];
}
