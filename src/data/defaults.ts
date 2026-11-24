import type {
  GalleryPhoto,
  KathaType,
  ShortClip,
  SiteConfig,
  UpcomingKatha,
} from '../types';

export const HERO_FALLBACK_IMAGE = '/src/assets/images/hero_didi_blessing_1795481683420.jpg';
export const ABOUT_FALLBACK_IMAGE = '/src/assets/images/about_vrindavan_dham_1795481683895.jpg';
export const KATHA_STAGE_IMAGE = '/src/assets/images/katha_stage_bhagwat_1795481684612.jpg';
export const GALLERY_AARTI_IMAGE = '/src/assets/images/gallery_bhajan_evening_1795481685882.jpg';
export const CHANNEL_BANNER_IMAGE = '/src/assets/images/youtube_channel_banner_1795481685356.jpg';

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  titleHindi: 'दीदी दिव्यांशी किशोरी जी',
  subtitleHindi: 'श्री वृन्दावन धाम की पावन कथा वाचिका',
  locationHindi: 'श्री वृन्दावन धाम',
  sinceYear: '2019',
  taglineHindi: 'सन् 2019 से निरंतर श्रीमद् भागवत, श्री राम कथा एवं भक्ति रस की अविरल धारा',
  aboutTitle: 'श्री वृन्दावन धाम से आध्यात्मिक यात्रा (2019 से निरंतर)',
  aboutDescription:
    'श्री वृन्दावन धाम की पावन रज में पली-बढ़ीं पूज्या दीदी दिव्यांशी किशोरी जी सन् 2019 से संपूर्ण भारत में सनातन धर्म, श्रीमद् भागवत कथा, श्री राम कथा और भक्ति संगीत का दिव्य प्रसार कर रही हैं। उनकी मधुर, भावपूर्ण वाणी और सरल व्याख्यान से युवा एवं परिवारजन सहज ही ठाकुर जी के श्रीचरणों से जुड़ जाते हैं।',
  heroImageUrl: HERO_FALLBACK_IMAGE,
  aboutImageUrl: ABOUT_FALLBACK_IMAGE,
  channelBannerUrl: CHANNEL_BANNER_IMAGE,
  logoImageUrl: HERO_FALLBACK_IMAGE,
  phoneDisplay: '+91 7905580153',
  whatsappNumber: '917905580153',
  youtubeChannelUrl: 'https://youtube.com/@dididivyanshiji4048?si=gKJ-YIUTgv3uUtbw',
  youtubeHandle: '@dididivyanshiji4048',
  youtubeSubscriberText: 'भक्ति रस एवं लाइव कथा परिवार',
  facebookPageUrl: 'https://www.facebook.com/DIDIDIVYANSHIJI/',
  instagramUrl: '',
  liveVideoUrl: 'https://youtube.com/@dididivyanshiji4048',
  liveVideoTitle: 'श्री वृन्दावन धाम से पावन श्रीमद् भागवत कथा एवं भजन प्रसारण',
  isLiveNow: false,
  suvicharText:
    'जहाँ प्रेम, करुणा और हरि-नाम का सुमिरन होता है, वहीं श्री वृन्दावन धाम स्वयं प्रकट हो जाता है।',
  suvicharAuthor: 'दीदी दिव्यांशी किशोरी जी',
  bookingNoticeText:
    'महत्वपूर्ण सूचना: सामान्य कथा बुकिंग कम से कम 3 महीने पहले की जाती है। किसी विशेष या अर्जेंट (Urgent) आयोजन के लिए कृपया सीधे +91 7905580153 पर संपर्क करें।',
  ashramAddress: 'श्री वृन्दावन धाम, मथुरा, उत्तर प्रदेश — 281121',
};

export const DEFAULT_KATHA_TYPES: Omit<KathaType, 'updatedAt'>[] = [
  {
    id: 'shrimad-bhagwat',
    title: 'श्रीमद् भागवत कथा',
    englishTitle: 'Shrimad Bhagwat Katha',
    durationBadge: '7 दिन',
    description: 'सप्तम दिवसीय पावन भागवत महापुराण ज्ञान यज्ञ, श्री कृष्ण लीला एवं भक्ति का दिव्य संगम।',
    imageUrl: KATHA_STAGE_IMAGE,
    order: 1,
  },
  {
    id: 'ram-katha',
    title: 'श्री राम कथा',
    englishTitle: 'Shri Ram Katha',
    durationBadge: '7 एवं 9 दिन',
    description: 'मर्यादा पुरुषोत्तम प्रभु श्री राम के आदर्श चरित्र, पारिवारिक संस्कार और मानस रस का वर्णन।',
    imageUrl: HERO_FALLBACK_IMAGE,
    order: 2,
  },
  {
    id: 'devi-bhagwat',
    title: 'श्री देवी भागवत',
    englishTitle: 'Shri Devi Bhagwat',
    durationBadge: '7 एवं 9 दिन',
    description: 'माँ आदिशक्ति जगदम्बा की पावन महिमा, शक्ति उपासना और नवरात्रि विशेष ज्ञान यज्ञ।',
    imageUrl: GALLERY_AARTI_IMAGE,
    order: 3,
  },
  {
    id: 'shiv-mahapuran',
    title: 'श्री शिव महापुराण',
    englishTitle: 'Shri Shiv Mahapuran',
    durationBadge: '7 एवं 9 दिन',
    description: 'देवाधिदेव महादेव की करुणा, द्वादश ज्योतिर्लिंग महात्म्य और रुद्राभिषेक भक्ति कथा।',
    imageUrl: ABOUT_FALLBACK_IMAGE,
    order: 4,
  },
  {
    id: 'hanuman-katha',
    title: 'श्री हनुमान कथा',
    englishTitle: 'Shri Hanuman Katha',
    durationBadge: '3, 5 एवं 7 दिन',
    description: 'संकटमोचन श्री बालाजी महाराज की भक्ति, सेवा और अखंड राम-नाम निष्ठ चरित्र का गायन।',
    imageUrl: KATHA_STAGE_IMAGE,
    order: 5,
  },
  {
    id: 'nani-bai-mayra',
    title: 'नानी बाई का मायरा',
    englishTitle: 'Nani Bai Ka Mayra',
    durationBadge: '3 दिन',
    description: 'भक्त नरसी मेहता के अटूट विश्वास और साँवरिया सेठ द्वारा भात भरने की भावविभोर कथा।',
    imageUrl: CHANNEL_BANNER_IMAGE,
    order: 6,
  },
];

export const DEFAULT_UPCOMING_KATHAS: Omit<UpcomingKatha, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'katha-vrindavan-dec',
    kathaName: 'श्रीमद् भागवत कथा ज्ञान यज्ञ',
    dateRange: '12 दिसम्बर – 18 दिसम्बर 2026',
    startDate: '2026-12-12',
    timing: 'दोपहर 3:00 बजे से शाम 6:30 बजे तक',
    cityState: 'वृन्दावन धाम, उत्तर प्रदेश',
    venue: 'श्री राधा वल्लभ परिक्रमा मार्ग, वृन्दावन',
    organizer: 'श्री ब्रज भक्ति सेवा समिति',
    status: 'upcoming',
    posterUrl: KATHA_STAGE_IMAGE,
  },
  {
    id: 'katha-lucknow-jan',
    kathaName: 'श्री राम कथा महोत्सव',
    dateRange: '08 जनवरी – 16 जनवरी 2027',
    startDate: '2027-01-08',
    timing: 'दोपहर 2:30 बजे से शाम 6:00 बजे तक',
    cityState: 'लखनऊ, उत्तर प्रदेश',
    venue: 'गोमती नगर विस्तार कथा पांडाल, लखनऊ',
    organizer: 'श्री जानकी कल्याण ट्रस्ट',
    status: 'upcoming',
    posterUrl: HERO_FALLBACK_IMAGE,
  },
  {
    id: 'katha-kanpur-feb',
    kathaName: 'नानी बाई का मायरा एवं भजन संध्या',
    dateRange: '05 फ़रवरी – 07 फ़रवरी 2027',
    startDate: '2027-02-05',
    timing: 'दोपहर 3:30 बजे से शाम 7:00 बजे तक',
    cityState: 'कानपुर, उत्तर प्रदेश',
    venue: 'स्वदेशी नगर मंदिर प्रांगण, कानपुर',
    organizer: 'श्री श्याम सखा मंडल, कानपुर',
    status: 'upcoming',
    posterUrl: GALLERY_AARTI_IMAGE,
  },
];

export const DEFAULT_SHORTS: Omit<ShortClip, 'createdAt'>[] = [
  {
    id: 'short-1',
    title: 'मेरो वृन्दावन धाम — मधुर भजन प्रसंग',
    youtubeUrl: 'https://youtube.com/@dididivyanshiji4048',
    thumbnailUrl: HERO_FALLBACK_IMAGE,
    category: 'भजन',
    order: 1,
  },
  {
    id: 'short-2',
    title: 'श्री कृष्ण बाल लीला — भक्ति भाव प्रसंग',
    youtubeUrl: 'https://youtube.com/@dididivyanshiji4048',
    thumbnailUrl: KATHA_STAGE_IMAGE,
    category: 'प्रसंग',
    order: 2,
  },
  {
    id: 'short-3',
    title: 'संध्या आरती एवं ठाकुर जी श्रृंगार दर्शन',
    youtubeUrl: 'https://youtube.com/@dididivyanshiji4048',
    thumbnailUrl: GALLERY_AARTI_IMAGE,
    category: 'आरती',
    order: 3,
  },
  {
    id: 'short-4',
    title: 'नानी बाई का मायरा — भावपूर्ण कथा अंश',
    youtubeUrl: 'https://youtube.com/@dididivyanshiji4048',
    thumbnailUrl: ABOUT_FALLBACK_IMAGE,
    category: 'कथा अंश',
    order: 4,
  },
];

export const DEFAULT_GALLERY: Omit<GalleryPhoto, 'createdAt'>[] = [
  {
    id: 'gal-1',
    title: 'व्यास पीठ से पावन आशीर्वाद',
    location: 'श्री वृन्दावन धाम',
    imageUrl: HERO_FALLBACK_IMAGE,
    order: 1,
  },
  {
    id: 'gal-2',
    title: 'श्रीमद् भागवत कथा भव्य पांडाल',
    location: 'मथुरा - वृन्दावन',
    imageUrl: KATHA_STAGE_IMAGE,
    order: 2,
  },
  {
    id: 'gal-3',
    title: 'पावन संध्या आरती एवं भक्त मंडली',
    location: 'वृन्दावन धाम मंदिर प्रांगण',
    imageUrl: GALLERY_AARTI_IMAGE,
    order: 3,
  },
  {
    id: 'gal-4',
    title: 'यमुना घाट प्रभात दर्शन',
    location: 'श्री वृन्दावन धाम',
    imageUrl: ABOUT_FALLBACK_IMAGE,
    order: 4,
  },
];
