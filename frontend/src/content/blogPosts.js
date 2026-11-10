// Buying-guide content aimed at the site's actual audience — dealers, repair
// shop owners, and service centers deciding what to stock or how to spot bad
// stock — not general consumers. Written directly in Bangla (the language
// this audience actually searches in for this kind of practical guide)
// rather than piped through the UI's en/bn toggle, which is for short chrome
// strings, not long-form articles; doubling every paragraph into two
// languages would slow this down for little real benefit to the target
// reader. Each post targets a specific, realistic search query this
// business's customers type into Google, so this earns its own organic
// traffic instead of only ever ranking for the brand name itself.
//
// `content` is a list of blocks rendered by BlogPost.jsx: 'p' (paragraph),
// 'h2' (subheading), or 'ul' (bullet list, `items` array).
const blogPosts = [
  {
    slug: 'oled-vs-lcd-display-kena-guide',
    relatedCategories: ['OLED', 'LCD', 'Display'],
    relatedSlugs: ['original-vs-copy-battery-chenar-upay'],
    title: 'OLED নাকি LCD ডিসপ্লে — পাইকারি কেনার আগে যা জানা জরুরি',
    metaDescription: 'OLED ও LCD মোবাইল ডিসপ্লের মধ্যে পার্থক্য, কোনটা কোন ফোনের জন্য উপযুক্ত, আর পাইকারি অর্ডার করার আগে কোয়ালিটি যাচাইয়ের সহজ উপায়।',
    publishedDate: '2026-08-01',
    excerpt: 'OLED আর LCD ডিসপ্লের মূল পার্থক্য, দামের তফাত কেন হয়, আর কাস্টমারকে কীভাবে সঠিক পরামর্শ দেবেন — সবকিছু এক জায়গায়।',
    content: [
      { type: 'p', text: 'মোবাইল সার্ভিসিং দোকানে সবচেয়ে বেশি জিজ্ঞাসা করা প্রশ্নগুলোর একটা হলো — "অরিজিনাল ডিসপ্লে না কি কপি, কোনটা লাগাবো?" এই প্রশ্নের উত্তর ভালোভাবে দিতে হলে আগে OLED আর LCD-এর পার্থক্যটা স্পষ্ট থাকা দরকার, কারণ দুটোর দাম, স্থায়িত্ব আর কোয়ালিটি টেস্ট করার পদ্ধতি আলাদা।' },
      { type: 'h2', text: 'মূল পার্থক্য কোথায়' },
      { type: 'p', text: 'LCD ডিসপ্লেতে একটা আলাদা ব্যাকলাইট থাকে যেটা পুরো স্ক্রিন জুড়ে সমান আলো দেয়। OLED-এ প্রতিটা পিক্সেল নিজে থেকেই আলো তৈরি করে, তাই ব্ল্যাক কালার দেখানোর সময় সেই পিক্সেলগুলো সম্পূর্ণ বন্ধ হয়ে যায় — এই কারণেই OLED ডিসপ্লের কন্ট্রাস্ট আর কালো রঙ LCD-র তুলনায় অনেক গাঢ়।' },
      { type: 'ul', items: [
        'iPhone X এবং তার পরের বেশিরভাগ মডেল, আর হাই-এন্ড স্যামসাং ফোনে OLED ব্যবহার হয়',
        'কম দামি ও মিড-রেঞ্জ ফোনে (এবং iPhone-এর কিছু মডেলে) LCD ব্যবহার হয়',
        'OLED প্যানেল সাধারণত LCD-র চেয়ে ২-৩ গুণ বেশি দামি হয়',
      ] },
      { type: 'h2', text: 'পাইকারি কেনার আগে যা যাচাই করবেন' },
      { type: 'p', text: 'শুধু দাম কম দেখে অর্ডার করলে পরে কাস্টমার রিটার্ন বাড়ে। অর্ডার করার আগে সাপ্লায়ারের কাছে জিজ্ঞেস করুন প্যানেলটা "অরিজিনাল রিফার্বিশড" নাকি সম্পূর্ণ "কপি/কম্প্যাটিবল" — দুটোর দাম এবং টাচ রেসপন্স আলাদা হওয়াই স্বাভাবিক, কিন্তু কাস্টমারকে বিক্রির সময় এই পার্থক্যটা স্পষ্ট করে বলা উচিত যাতে পরে অভিযোগ না আসে। সম্ভব হলে প্রতিটা ব্যাচ থেকে ২-৩টা ইউনিট হাতে-কলমে টাচ সেনসিটিভিটি আর কালার একুরেসি টেস্ট করে নিন।' },
      { type: 'p', text: 'নয়ন টেলিকমে আমরা প্রতিটা ডিসপ্লে ক্যাটাগরি (OLED, LCD দুই-ই) আলাদাভাবে সাজিয়ে রাখি, যাতে আপনি ব্র্যান্ড ও মডেল অনুযায়ী সঠিক প্যানেল সহজে খুঁজে পান।' },
    ],
  },
  {
    slug: 'original-vs-copy-battery-chenar-upay',
    relatedCategories: ['Battery'],
    relatedSlugs: ['charging-port-noshto-hoyar-karon', 'paikari-mobile-parts-kenar-age-7-bishoy'],
    title: 'অরিজিনাল ও কপি মোবাইল ব্যাটারি চেনার ৫টি সহজ উপায়',
    metaDescription: 'মোবাইল ব্যাটারি কেনার সময় অরিজিনাল আর কপি ব্যাটারির মধ্যে পার্থক্য বোঝার ৫টি ব্যবহারিক টেকনিক, যা যেকোনো সার্ভিসিং দোকানে কাজে লাগবে।',
    publishedDate: '2026-08-10',
    excerpt: 'ওজন, চার্জিং সাইকেল, আর প্যাকেজিং দেখেই বেশিরভাগ সময় বোঝা যায় ব্যাটারিটা কেমন মানের — বিস্তারিত জানুন।',
    content: [
      { type: 'p', text: 'নকল বা নিম্নমানের ব্যাটারি বিক্রি করলে সেটা ফুলে যাওয়া বা দ্রুত চার্জ শেষ হওয়ার মতো সমস্যা তৈরি করে, আর কাস্টমার সেই দোকানেই আর ফিরে আসে না। তাই পাইকারি কেনার আগে নিজে যাচাই করে নেওয়াটা জরুরি।' },
      { type: 'h2', text: '১. ওজন ও ব্যালেন্স' },
      { type: 'p', text: 'একই মডেলের অরিজিনাল ব্যাটারির তুলনায় নিম্নমানের ব্যাটারি প্রায়ই হালকা হয় — ভেতরের সেলের কোয়ালিটি কম থাকার কারণে। দুটো ইউনিট হাতে নিয়ে তুলনা করলেই পার্থক্য বোঝা যায়।' },
      { type: 'h2', text: '২. mAh রেটিং বাস্তবসম্মত কিনা' },
      { type: 'p', text: 'প্যাকেজিং-এ লেখা mAh রেটিং যদি ঐ মডেলের অরিজিনাল স্পেসিফিকেশনের চেয়ে অস্বাভাবিক বেশি দেখায় (যেমন একই সাইজে দ্বিগুণ ক্যাপাসিটির দাবি), সেটা প্রায় সবসময়ই মিথ্যা তথ্য।' },
      { type: 'h2', text: '৩. চার্জিং সাইকেল টেস্ট' },
      { type: 'p', text: 'সম্ভব হলে অর্ডারের একটা স্যাম্পল ইউনিট পূর্ণ চার্জ-ডিসচার্জ করে দেখুন কতক্ষণ ব্যাকআপ থাকে। মানসম্মত ব্যাটারি হলে কমপক্ষে ৩০০-৪০০ চার্জ সাইকেল পর্যন্ত ক্যাপাসিটির বড় পতন হওয়ার কথা না।' },
      { type: 'h2', text: '৪. সেফটি সার্কিট (protection IC)' },
      { type: 'p', text: 'ভালো ব্যাটারিতে ওভারচার্জ ও শর্ট-সার্কিট প্রোটেকশন সার্কিট থাকে। এটা বাইরে থেকে দেখা না গেলেও, নিয়মিত যেসব সাপ্লায়ারের ব্যাটারিতে ফোলা/গরম হয়ে যাওয়ার অভিযোগ আসে না, তাদের থেকেই বারবার অর্ডার করা নিরাপদ।' },
      { type: 'h2', text: '৫. প্যাকেজিং ও হলোগ্রাম' },
      { type: 'p', text: 'অরিজিনাল ব্র্যান্ডের ব্যাটারিতে সাধারণত নির্দিষ্ট হলোগ্রাম, ব্যাচ নাম্বার আর প্রিন্ট কোয়ালিটি স্পষ্ট থাকে। ঝাপসা প্রিন্ট বা বানান ভুল থাকলে সেটা বিশ্বাসযোগ্য সাপ্লাই চেইনের লক্ষণ না।' },
    ],
  },
  {
    slug: 'charging-port-noshto-hoyar-karon',
    relatedCategories: ['Charging Logic', 'Flex'],
    relatedSlugs: ['original-vs-copy-battery-chenar-upay'],
    title: 'চার্জিং পোর্ট নষ্ট হওয়ার প্রধান কারণ ও সমাধান',
    metaDescription: 'মোবাইলের চার্জিং পোর্ট কেন নষ্ট হয়, কোন কোন লক্ষণ দেখে বোঝা যায় পোর্ট বদলানো দরকার, আর সার্ভিসিং-এর সময় কী কী খেয়াল রাখবেন।',
    publishedDate: '2026-08-18',
    excerpt: 'ধুলাবালি, ভুল চার্জার, আর বারবার হেঁচকা টানাটানি — চার্জিং পোর্ট নষ্ট হওয়ার সবচেয়ে কমন কারণগুলো এক নজরে।',
    content: [
      { type: 'p', text: 'চার্জিং পোর্ট মোবাইলের সবচেয়ে বেশি ব্যবহৃত আর সবচেয়ে বেশি সমস্যা হওয়া একটা অংশ। সার্ভিসিং দোকানে প্রতিদিনই কমবেশি এই সমস্যা নিয়ে কাস্টমার আসে।' },
      { type: 'h2', text: 'সবচেয়ে কমন কারণগুলো' },
      { type: 'ul', items: [
        'পোর্টের ভেতরে ধুলা, লিন্ট বা মরিচা জমে পিন-গুলোর সংযোগ বিঘ্নিত হওয়া',
        'কেবল না খুলে সরাসরি বাঁকিয়ে চার্জ দেওয়ার অভ্যাস, যাতে পিন বেঁকে যায়',
        'নিম্নমানের বা বেমানান চার্জার/কেবল ব্যবহার করে বারবার হাই-ভোল্টেজ স্পাইক লাগা',
        'পানি বা আর্দ্রতা ঢুকে পিনে জারা (corrosion) ধরা',
      ] },
      { type: 'h2', text: 'কীভাবে বুঝবেন পোর্ট বদলানো দরকার' },
      { type: 'p', text: 'নির্দিষ্ট অ্যাঙ্গেলে কেবল ধরে রাখলে তবেই চার্জ হওয়া, চার্জিং মাঝে মাঝে বন্ধ হয়ে যাওয়া, অথবা ডেটা ট্রান্সফার একেবারেই কাজ না করা — এই লক্ষণগুলো থাকলে সাধারণত পোর্ট ক্লিনিং দিয়ে সমাধান হয় না, ফ্লেক্স/পোর্ট রিপ্লেসমেন্ট লাগে।' },
      { type: 'h2', text: 'রিপ্লেসমেন্টের সময় যা খেয়াল রাখবেন' },
      { type: 'p', text: 'পোর্ট বদলানোর সময় একই মডেলের সঠিক ফ্লেক্স ক্যাবল ব্যবহার করা জরুরি — ভুল ভ্যারিয়েন্ট বসালে মাইক্রোফোন বা চার্জিং IC-তে নতুন সমস্যা তৈরি হতে পারে। বাল্ক অর্ডারের সময় মডেল নাম্বার আর ফ্লেক্স ভ্যারিয়েন্ট দুটোই নিশ্চিত করে অর্ডার করুন।' },
    ],
  },
  {
    slug: 'mobile-servicing-business-suru-korte-parts-stock',
    relatedCategories: ['Display', 'Battery', 'Repair Tools'],
    relatedSlugs: ['paikari-mobile-parts-kenar-age-7-bishoy'],
    title: 'মোবাইল সার্ভিসিং ব্যবসা শুরু করতে যেসব পার্টস স্টকে রাখা জরুরি',
    metaDescription: 'নতুন মোবাইল সার্ভিসিং সেন্টার বা দোকান শুরু করার সময় কোন কোন পার্টস প্রথমে স্টক করা উচিত — একটা প্র্যাকটিক্যাল চেকলিস্ট।',
    publishedDate: '2026-08-25',
    excerpt: 'সীমিত পুঁজিতে নতুন দোকান শুরু করলে কোন পার্টসগুলো আগে স্টক করবেন, আর কোনগুলো পরে যোগ করলেও চলে — একটা বাস্তবসম্মত পরিকল্পনা।',
    content: [
      { type: 'p', text: 'নতুন মোবাইল সার্ভিসিং দোকান শুরু করার সময় সবচেয়ে বড় চ্যালেঞ্জ হলো — সীমিত পুঁজিতে কোন পার্টসগুলো আগে স্টক করবেন। সব ব্র্যান্ডের সব পার্টস একসাথে রাখা সম্ভবও না, দরকারও না।' },
      { type: 'h2', text: 'প্রথমে যা রাখা উচিত' },
      { type: 'ul', items: [
        'সবচেয়ে বেশি বিক্রি হওয়া ব্র্যান্ডের (স্যামসাং, শাওমি, ভিভো/অপো) কমন মডেলের ডিসপ্লে',
        'দ্রুত ক্ষয় হয় এমন পার্টস — চার্জিং পোর্ট ফ্লেক্স, ব্যাটারি, ব্যাক গ্লাস',
        'ছোট কিন্তু ঘনঘন লাগে এমন আইটেম — সিম ট্রে, স্পিকার, ইয়ারপিস',
      ] },
      { type: 'h2', text: 'পরে ধীরে ধীরে যোগ করবেন' },
      { type: 'p', text: 'আইফোনের মতো তুলনামূলক দামি পার্টস, কম চলা মডেলের ফ্রেম/হাউজিং, আর স্পেশালাইজড রিপেয়ার টুলস — এগুলো প্রথম মাসগুলোয় কাস্টমার ডিমান্ড বুঝে ধীরে ধীরে যোগ করাই বুদ্ধিমানের কাজ। শুরুতেই বেশি ভ্যারাইটিতে পুঁজি আটকে রাখলে ক্যাশ ফ্লো সমস্যা হতে পারে।' },
      { type: 'h2', text: 'নির্ভরযোগ্য সাপ্লায়ার কেন গুরুত্বপূর্ণ' },
      { type: 'p', text: 'নতুন দোকানের জন্য সবচেয়ে বড় ভরসার জায়গা হওয়া উচিত এমন একজন পাইকারি সাপ্লায়ার, যার কাছ থেকে ছোট পরিমাণেও অর্ডার করা যায়, আর প্রয়োজনে দ্রুত রিঅর্ডার করা যায় — পুরো ইনভেন্টরি আগে থেকে বিশাল করে রাখার দরকার পড়ে না।' },
    ],
  },
  {
    slug: 'paikari-mobile-parts-kenar-age-7-bishoy',
    relatedCategories: [],
    relatedSlugs: ['mobile-servicing-business-suru-korte-parts-stock', 'oled-vs-lcd-display-kena-guide'],
    title: 'পাইকারি দামে মোবাইল পার্টস কেনার আগে ৭টি বিষয় যাচাই করুন',
    metaDescription: 'মোবাইল পার্টসের পাইকারি সাপ্লায়ার বাছাই করার সময় দাম ছাড়াও যে বিষয়গুলো যাচাই করা উচিত, তার একটা সম্পূর্ণ চেকলিস্ট।',
    publishedDate: '2026-09-02',
    excerpt: 'শুধু সবচেয়ে কম দাম দেখে সাপ্লায়ার বাছাই করলে পরে ক্ষতি হতে পারে — কী কী দেখে সিদ্ধান্ত নেবেন তার একটা চেকলিস্ট।',
    content: [
      { type: 'p', text: 'পাইকারি ব্যবসায় সবচেয়ে বড় ভুল হলো শুধু সবচেয়ে কম দাম দেখে সাপ্লায়ার বেছে নেওয়া। দীর্ঘমেয়াদে লাভজনক থাকতে হলে আরও কিছু বিষয় যাচাই করা দরকার।' },
      { type: 'ul', items: [
        'ওয়ারেন্টি বা রিপ্লেসমেন্ট পলিসি আছে কিনা — ডেড-অন-অ্যারাইভাল ইউনিট এলে কী হবে',
        'ডেলিভারি সময় কতটা নির্ভরযোগ্য — জরুরি অর্ডারে কত দ্রুত সাপ্লাই দিতে পারে',
        'পণ্যের ছবি ও বিবরণ বাস্তব পণ্যের সাথে মিলে কিনা',
        'নিয়মিত অর্ডারের জন্য দর কষাকষির সুযোগ আছে কিনা (bulk discount)',
        'ক্যাশ অন ডেলিভারি নাকি শুধু অগ্রিম পেমেন্ট — নতুন সম্পর্কে কোনটা নিরাপদ',
        'কাস্টমার সাপোর্ট কতটা দ্রুত সাড়া দেয় — সমস্যা হলে যোগাযোগ করা কতটা সহজ',
        'রিভিউ ও পুরনো কাস্টমারদের অভিজ্ঞতা কেমন',
      ] },
      { type: 'p', text: 'এই বিষয়গুলো একবার যাচাই করে একটা নির্ভরযোগ্য সাপ্লায়ারের সাথে সম্পর্ক তৈরি করে নিলে, প্রতিবার নতুন করে দরদাম আর ঝুঁকি নেওয়ার প্রয়োজন পড়ে না।' },
    ],
  },
  {
    slug: 'charging-logic-board-kenar-guide',
    relatedCategories: ['Charging Logic', 'Flex'],
    relatedSlugs: ['charging-port-noshto-hoyar-karon', 'paikari-mobile-parts-kenar-age-7-bishoy'],
    title: 'মোবাইল Charging Logic কেনার আগে মডেল ও ভ্যারিয়েন্ট মিলাবেন যেভাবে',
    metaDescription: 'মোবাইল Charging Logic board বা charging flex কেনার আগে model, network variant, connector ও microphone মিলিয়ে সঠিক পার্টস বাছাইয়ের গাইড।',
    publishedDate: '2026-11-10',
    excerpt: 'একই ফোনের 4G/5G বা regional variant-এ Charging Logic আলাদা হতে পারে—অর্ডারের আগে কী কী মিলিয়ে দেখবেন জানুন।',
    content: [
      { type: 'p', text: 'Charging Logic হলো ফোনের নিচের দিকের ছোট board বা flex assembly, যেখানে সাধারণত USB charging connector থাকে। অনেক মডেলে একই board-এ primary microphone, antenna contact বা vibration connector-ও থাকে। তাই দেখতে কাছাকাছি হলেও ভুল variant বসালে ফোন চার্জ নিতে পারে, কিন্তু microphone বা network ঠিকমতো কাজ নাও করতে পারে।' },
      { type: 'h2', text: 'শুধু ফোনের নাম মিললেই যথেষ্ট নয়' },
      { type: 'p', text: 'একই model name-এর 4G ও 5G version, India/Global version অথবা আলাদা production revision থাকতে পারে। Settings বা back label থেকে exact model code লিখে নিন। পুরোনো Charging Logic খুলে connector-এর অবস্থান, screw hole, flex shape এবং board-এর printed code নতুন পার্টসের ছবির সঙ্গে মিলিয়ে দেখুন।' },
      { type: 'h2', text: 'অর্ডারের আগে পাঁচটি বিষয় যাচাই করুন' },
      { type: 'ul', items: [
        'Brand, full model name এবং model code একই কিনা',
        '4G/5G বা regional version উল্লেখ আছে কিনা',
        'USB Type-C বা Micro-USB connector সঠিক কিনা',
        'Microphone ও antenna contact-এর অবস্থান পুরোনো board-এর মতো কিনা',
        'পার্টসটি tested কিনা এবং testing warranty কত দিনের',
      ] },
      { type: 'h2', text: 'পাইকারি অর্ডারে sample test কেন জরুরি' },
      { type: 'p', text: 'একই model-এর একাধিক unit নিলে পুরো batch install করার আগে একটি sample ফোনে charging speed, data connection, microphone এবং network signal পরীক্ষা করুন। Installation-এর সময় protective seal বা flex ক্ষতিগ্রস্ত হলে warranty claim কঠিন হতে পারে, তাই permanent fitting-এর আগে dry test করা নিরাপদ।' },
      { type: 'p', text: 'Noyon Telecom-এর Charging Logic category-তে product title-এর সঙ্গে compatible model দেওয়া থাকে। কোনো variant নিয়ে সন্দেহ হলে পুরোনো board-এর সামনে-পেছনের পরিষ্কার ছবি এবং model code পাঠিয়ে নিশ্চিত হয়ে অর্ডার করুন।' },
    ],
  },
  {
    slug: 'mobile-back-glass-model-color-guide',
    relatedCategories: ['Back Glass', 'Housing', 'Frame'],
    relatedSlugs: ['paikari-mobile-parts-kenar-age-7-bishoy', 'mobile-servicing-business-suru-korte-parts-stock'],
    title: 'মোবাইল Back Glass কেনার আগে Model, Color ও Camera Cutout যাচাই',
    metaDescription: 'মোবাইল Back Glass পাইকারি কেনার আগে exact model, color, camera cutout, logo ও adhesive quality মিলিয়ে ভুল পার্টস এড়ানোর গাইড।',
    publishedDate: '2026-11-09',
    excerpt: 'একই series-এর back glass দেখতে এক হলেও camera cutout ও frame size আলাদা হতে পারে—সঠিকভাবে মিলিয়ে অর্ডার করুন।',
    content: [
      { type: 'p', text: 'ভাঙা back glass বদলানো দেখতে সহজ কাজ হলেও ভুল model বা ভুল color অর্ডার হলে সেটি frame-এ ঠিকমতো বসে না। একই series-এর Pro, Plus, 4G ও 5G version-এর body size এবং camera cutout সামান্য আলাদা হতে পারে। এই ছোট পার্থক্যই installation-এর সময় বড় সমস্যা তৈরি করে।' },
      { type: 'h2', text: 'Exact model ও variant নিশ্চিত করুন' },
      { type: 'p', text: 'ফোনের Settings, box অথবা frame label থেকে model number দেখুন। শুধু “Redmi Note” বা “Galaxy A” বললে হবে না; সম্পূর্ণ model name, network version এবং release year লিখুন। পুরোনো glass-এর দৈর্ঘ্য-প্রস্থ, camera ring-এর সংখ্যা এবং flash cutout-এর অবস্থান product photo-এর সঙ্গে মিলিয়ে নিন।' },
      { type: 'h2', text: 'Color name একই হলেও shade আলাদা হতে পারে' },
      { type: 'p', text: 'Brand-এর marketing color যেমন Midnight Black বা Ocean Blue supplier-এর batch অনুযায়ী সামান্য হালকা-গাঢ় হতে পারে। Customer-এর পুরোনো frame ব্যবহার করলে দিনের আলোতে color মিলিয়ে দেখা ভালো। Logo, regulatory text বা camera lens pre-installed আছে কিনা—এগুলোও অর্ডারের আগে জেনে নিন।' },
      { type: 'h2', text: 'Installation quality ভালো রাখার নিয়ম' },
      { type: 'ul', items: [
        'পুরোনো adhesive সম্পূর্ণ পরিষ্কার করে frame সমান করুন',
        'Camera lens ও ভেতরের অংশ থেকে ধুলা সরান',
        'Fresh adhesive বা সঠিক precut tape ব্যবহার করুন',
        'Final pressure দেওয়ার আগে সব cutout ও edge alignment পরীক্ষা করুন',
      ] },
      { type: 'p', text: 'পাইকারি অর্ডারে একই model-এর বিভিন্ন color নিলে প্রতিটি color আলাদা করে label করুন। Noyon Telecom-এর Back Glass page থেকে brand ও model অনুযায়ী পার্টস খুঁজে নিতে পারবেন; সন্দেহ হলে ফোন ও পুরোনো back glass-এর ছবি পাঠিয়ে মিলিয়ে নিন।' },
    ],
  },
  {
    slug: 'loudspeaker-vs-ear-speaker-difference',
    relatedCategories: ['Speaker'],
    relatedSlugs: ['mobile-servicing-business-suru-korte-parts-stock', 'paikari-mobile-parts-kenar-age-7-bishoy'],
    title: 'Loudspeaker ও Ear Speaker-এর পার্থক্য এবং সঠিক পার্টস চেনার উপায়',
    metaDescription: 'মোবাইল Loudspeaker ও Ear Speaker কী কাজে লাগে, কোন সমস্যায় কোন পার্টস বদলাতে হয় এবং অর্ডারের আগে কীভাবে model মিলাবেন।',
    publishedDate: '2026-11-08',
    excerpt: 'Ringtone না শোনা আর call-এর সময় কানে শব্দ না আসা এক সমস্যা নয়—দুই ধরনের speaker-এর কাজ ও পরীক্ষা জানুন।',
    content: [
      { type: 'p', text: 'মোবাইলে সাধারণত অন্তত দুই ধরনের speaker থাকে। নিচের loudspeaker ringtone, notification, music এবং speakerphone-এর শব্দ দেয়। উপরের ear speaker বা earpiece call-এর সময় কানে ধরে কথা শোনার জন্য ব্যবহৃত হয়। তাই “speaker নষ্ট” বলার আগে কোন output কাজ করছে না সেটি আলাদা করে পরীক্ষা করা জরুরি।' },
      { type: 'h2', text: 'কোন লক্ষণে কোন speaker পরীক্ষা করবেন' },
      { type: 'ul', items: [
        'Ringtone, video বা speakerphone-এ শব্দ না এলে loudspeaker পরীক্ষা করুন',
        'Normal call-এ কানে শব্দ কম বা বন্ধ হলে ear speaker পরীক্ষা করুন',
        'শব্দ ফেটে গেলে বা ঝনঝন করলে speaker mesh ও module দুটোই দেখুন',
        'Bluetooth বা headphone-এ শব্দ ঠিক থাকলে software-এর পাশাপাশি internal speaker path পরীক্ষা করুন',
      ] },
      { type: 'h2', text: 'পার্টস বদলানোর আগে cleaning ও connection test' },
      { type: 'p', text: 'ধুলা জমে mesh বন্ধ হয়ে গেলে ভালো speaker-ও কম শোনাতে পারে। প্রথমে mesh পরিষ্কার করুন এবং contact spring বা flex connector ঠিকভাবে বসেছে কিনা দেখুন। Multimeter দিয়ে continuity check ও known-good module দিয়ে test করলে অপ্রয়োজনীয় replacement কমে।' },
      { type: 'h2', text: 'Model-specific part কেন জরুরি' },
      { type: 'p', text: 'দুইটি speaker দেখতে একই রকম হলেও housing shape, contact point এবং resistance আলাদা হতে পারে। Exact model এবং variant না মিলিয়ে জোর করে বসালে sound quality খারাপ হতে পারে বা contact নাও করতে পারে। পুরোনো module-এর ছবি, code এবং screw position মিলিয়ে অর্ডার করুন।' },
      { type: 'p', text: 'Noyon Telecom-এর Speaker category-তে Loudspeaker এবং Ear Speaker নাম আলাদাভাবে দেওয়া হয়, যাতে repair shop দ্রুত সঠিক part নির্বাচন করতে পারে। Bulk order-এর আগে একটি sample unit test করলে batch mismatch-এর ঝুঁকি কমে।' },
    ],
  },
];

export function getAllPosts() {
  return blogPosts;
}

export function getPostBySlug(slug) {
  return blogPosts.find((p) => p.slug === slug) || null;
}

// Used by ProductDetail to link back to a relevant guide (e.g. a Battery
// product page linking to the "spot a fake battery" post) — the reverse
// direction of the "related categories" links a post shows toward /shop,
// so the two content types reinforce each other instead of only ever
// linking one way.
export function getPostForCategory(category) {
  return blogPosts.find((p) => p.relatedCategories?.includes(category)) || null;
}

export default blogPosts;
