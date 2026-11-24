export interface HindiDateTimeInfo {
  istTime: string;
  istDateHindi: string;
  hindiVaar: string;
  vikramSamvat: number;
  hindiMaas: string;
  paksha: string;
  tithi: string;
  panchangSummary: string;
}

const HINDI_MONTHS = [
  'जनवरी',
  'फ़रवरी',
  'मार्च',
  'अप्रैल',
  'मई',
  'जून',
  'जुलाई',
  'अगस्त',
  'सितम्बर',
  'अक्टूबर',
  'नवम्बर',
  'दिसम्बर',
];

const HINDI_VAAR: Record<string, string> = {
  Sunday: 'रविवार',
  Monday: 'सोमवार',
  Tuesday: 'मंगलवार',
  Wednesday: 'बुधवार',
  Thursday: 'गुरुवार',
  Friday: 'शुक्रवार',
  Saturday: 'शनिवार',
};

const TITHI_NAMES = [
  'प्रतिपदा',
  'द्वितीया',
  'तृतीया',
  'चतुर्थी',
  'पंचमी',
  'षष्ठी',
  'सप्तमी',
  'अष्टमी',
  'नवमी',
  'दशमी',
  'एकादशी',
  'द्वादशी',
  'त्रयोदशी',
  'चतुर्दशी',
  'पूर्णिमा',
  'प्रतिपदा',
  'द्वितीया',
  'तृतीया',
  'चतुर्थी',
  'पंचमी',
  'षष्ठी',
  'सप्तमी',
  'अष्टमी',
  'नवमी',
  'दशमी',
  'एकादशी',
  'द्वादशी',
  'त्रयोदशी',
  'चतुर्दशी',
  'अमावस्या',
];

// Purnimanta lunar month names (Vrindavan / North India tradition)
const HINDU_MAAS_NAMES = [
  'चैत्र',
  'वैशाख',
  'ज्येष्ठ',
  'आषाढ़',
  'श्रावण',
  'भाद्रपद',
  'आश्विन',
  'कार्तिक',
  'मार्गशीर्ष',
  'पौष',
  'माघ',
  'फाल्गुन',
];

function normalizeDeg(deg: number): number {
  const res = deg % 360;
  return res < 0 ? res + 360 : res;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function getJulianDay(utcDate: Date): number {
  const y = utcDate.getUTCFullYear();
  const m = utcDate.getUTCMonth() + 1;
  const d =
    utcDate.getUTCDate() +
    (utcDate.getUTCHours() +
      utcDate.getUTCMinutes() / 60 +
      utcDate.getUTCSeconds() / 3600) /
      24;

  let year = y;
  let month = m;
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + d + B - 1524.5;
}

function getSunLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const L0 = normalizeDeg(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = normalizeDeg(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(toRad(M)) +
    (0.019993 - 0.000101 * T) * Math.sin(toRad(2 * M)) +
    0.000289 * Math.sin(toRad(3 * M));
  return normalizeDeg(L0 + C);
}

function getMoonLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const Lp = normalizeDeg(218.3164477 + 481267.88123421 * T);
  const D = normalizeDeg(297.8501921 + 445267.1114034 * T);
  const M = normalizeDeg(357.5291092 + 35999.0502909 * T);
  const Mp = normalizeDeg(134.9633964 + 477198.8675055 * T);
  const F = normalizeDeg(93.272095 + 483202.0175233 * T);

  const lon =
    Lp +
    6.289 * Math.sin(toRad(Mp)) +
    1.274 * Math.sin(toRad(2 * D - Mp)) +
    0.658 * Math.sin(toRad(2 * D)) +
    0.214 * Math.sin(toRad(2 * Mp)) -
    0.186 * Math.sin(toRad(M)) -
    0.114 * Math.sin(toRad(2 * F));

  return normalizeDeg(lon);
}

export function getRealtimeISTAndHindiCalendar(now: Date = new Date()): HindiDateTimeInfo {
  const istTimeFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const istPartsFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  const parts = istPartsFormatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const gYear = Number(partMap.year);
  const gMonth = Number(partMap.month);
  const gDay = Number(partMap.day);
  const weekdayEn = partMap.weekday || 'Monday';

  const istTime = istTimeFormatter.format(now).toUpperCase();
  const hindiVaar = HINDI_VAAR[weekdayEn] || 'सोमवार';
  const istDateHindi = `${gDay} ${HINDI_MONTHS[gMonth - 1]} ${gYear}`;

  // Calculate Sunrise-approx IST time (6:00 AM IST = 00:30 UTC) for Tithi of the day
  const sunriseUtc = new Date(Date.UTC(gYear, gMonth - 1, gDay, 0, 30, 0));
  const jd = getJulianDay(sunriseUtc);
  const sunLon = getSunLongitude(jd);
  const moonLon = getMoonLongitude(jd);

  // Lahiri Ayanamsa approx (~24.2 deg in 2026) for Nirayana solar rashi
  const ayanamsa = 23.85 + ((gYear - 2000) * 50.29) / 3600;
  const nirayanaSun = normalizeDeg(sunLon - ayanamsa);
  const elongation = normalizeDeg(moonLon - sunLon);

  const tithiIndex = Math.min(29, Math.floor(elongation / 12));
  const paksha = tithiIndex < 15 ? 'शुक्ल पक्ष' : 'कृष्ण पक्ष';
  const tithi = TITHI_NAMES[tithiIndex];

  // Determine Amanta solar sign (0=Mesha/Chaitra..11=Meena/Phalguna)
  // Sun in Meena (330-360) precedes Chaitra Amanta / Vaishakha Purnimanta
  const sunSignIndex = Math.floor(nirayanaSun / 30); // 0 = Mesha (Apr-May -> Vaishakha)
  // In Amanta: Sun in Meena (11) -> Chaitra (0); Sun in Mesha (0) -> Vaishakha (1);
  // Sun in Vrishchika (7, late Nov) -> Margashirsha (8)
  const amantaIndex = (sunSignIndex + 1) % 12;
  // In Purnimanta (Vrindavan/North India), Krishna Paksha belongs to the NEXT month name
  const maasIndex = tithiIndex >= 15 ? (amantaIndex + 1) % 12 : amantaIndex;
  const hindiMaas = HINDU_MAAS_NAMES[maasIndex];

  // Vikram Samvat rolls over at Chaitra Shukla Pratipada (roughly late March/April)
  let vikramSamvat = gYear + 57;
  if (gMonth < 3 || (gMonth === 3 && maasIndex === 11)) {
    vikramSamvat = gYear + 56;
  }

  const panchangSummary = `विक्रम संवत् ${vikramSamvat} · ${hindiMaas} ${paksha}, ${tithi} · ${hindiVaar}`;

  return {
    istTime,
    istDateHindi,
    hindiVaar,
    vikramSamvat,
    hindiMaas,
    paksha,
    tithi,
    panchangSummary,
  };
}
