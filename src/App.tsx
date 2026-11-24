import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  ArrowRight,
  Calendar,
  Clock,
  ExternalLink,
  Facebook,
  Instagram,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Play,
  Quote,
  Radio,
  Sparkles,
  Users,
  X,
  Youtube,
} from 'lucide-react';
import { AdminPanel } from './components/AdminPanel';
import { BookingSection } from './components/BookingSection';
import { SafeImage } from './components/SafeImage';
import {
  DEFAULT_GALLERY,
  DEFAULT_KATHA_TYPES,
  DEFAULT_SHORTS,
  DEFAULT_SITE_CONFIG,
  DEFAULT_UPCOMING_KATHAS,
} from './data/defaults';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
} from './firebase';
import type {
  GalleryPhoto,
  KathaStatus,
  KathaType,
  ShortClip,
  SiteConfig,
  UpcomingKatha,
} from './types';
import { getRealtimeISTAndHindiCalendar } from './utils/hindiCalendar';
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl } from './utils/youtube';

const STATUS_DISPLAY: Record<KathaStatus, string> = {
  upcoming: 'आगामी',
  live: 'प्रसारण जारी',
  completed: 'सम्पन्न',
};

export default function App() {
  const [viewMode, setViewMode] = useState<'public' | 'admin'>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#admin') {
      return 'admin';
    }
    return 'public';
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedKathaForBooking, setSelectedKathaForBooking] = useState<string>('');
  const [kathaFilter, setKathaFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [activeShortModal, setActiveShortModal] = useState<ShortClip | null>(null);
  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState<GalleryPhoto | null>(null);

  // Real-time IST & Hindi Calendar state
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const istHindi = useMemo(() => getRealtimeISTAndHindiCalendar(now), [now]);

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdminDoc, setIsAdminDoc] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Check admins/{uid} if user signed in with another email
  useEffect(() => {
    if (!authReady || !user) {
      setIsAdminDoc(false);
      return;
    }
    if (user.emailVerified && user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
      setIsAdminDoc(true);
      return;
    }
    const unsub = onSnapshot(
      doc(db, 'admins', user.uid),
      (snap) => setIsAdminDoc(snap.exists()),
      () => setIsAdminDoc(false),
    );
    return () => unsub();
  }, [authReady, user]);

  const isAdmin = Boolean(
    user &&
      user.emailVerified &&
      (user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase() || isAdminDoc),
  );

  // Public Real-time Firestore Data (with graceful defaults)
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [kathas, setKathas] = useState<UpcomingKatha[]>(DEFAULT_UPCOMING_KATHAS);
  const [kathaTypes, setKathaTypes] = useState<KathaType[]>(DEFAULT_KATHA_TYPES);
  const [shorts, setShorts] = useState<ShortClip[]>(DEFAULT_SHORTS);
  const [gallery, setGallery] = useState<GalleryPhoto[]>(DEFAULT_GALLERY);

  useEffect(() => {
    const unsubConfig = onSnapshot(
      doc(db, 'site_config', 'main'),
      (snap) => {
        if (snap.exists()) {
          setSiteConfig({ ...DEFAULT_SITE_CONFIG, ...(snap.data() as Partial<SiteConfig>) });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'site_config/main'),
    );

    const unsubKathas = onSnapshot(
      query(collection(db, 'kathas'), orderBy('startDate', 'asc')),
      (snap) => {
        if (!snap.empty) {
          setKathas(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UpcomingKatha, 'id'>) })),
          );
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'kathas'),
    );

    const unsubTypes = onSnapshot(
      query(collection(db, 'katha_types'), orderBy('order', 'asc')),
      (snap) => {
        if (!snap.empty) {
          setKathaTypes(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<KathaType, 'id'>) })),
          );
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'katha_types'),
    );

    const unsubShorts = onSnapshot(
      query(collection(db, 'shorts'), orderBy('order', 'asc')),
      (snap) => {
        if (!snap.empty) {
          setShorts(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ShortClip, 'id'>) })),
          );
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'shorts'),
    );

    const unsubGallery = onSnapshot(
      query(collection(db, 'gallery'), orderBy('order', 'asc')),
      (snap) => {
        if (!snap.empty) {
          setGallery(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GalleryPhoto, 'id'>) })),
          );
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'gallery'),
    );

    return () => {
      unsubConfig();
      unsubKathas();
      unsubTypes();
      unsubShorts();
      unsubGallery();
    };
  }, []);

  const openAdmin = () => {
    setViewMode('admin');
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openPublic = () => {
    setViewMode('public');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookSpecificKatha = (title: string) => {
    setSelectedKathaForBooking(title);
    const el = document.getElementById('booking');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const liveEmbedUrl = getYouTubeEmbedUrl(siteConfig.liveVideoUrl);

  const filteredKathas =
    kathaFilter === 'all'
      ? kathas
      : kathaFilter === 'upcoming'
        ? kathas.filter((k) => k.status === 'upcoming' || k.status === 'live')
        : kathas.filter((k) => k.status === 'completed');

  if (viewMode === 'admin') {
    return (
      <AdminPanel
        user={user}
        authReady={authReady}
        isAdmin={isAdmin}
        siteConfig={siteConfig}
        kathas={kathas}
        kathaTypes={kathaTypes}
        shorts={shorts}
        gallery={gallery}
        onBackToSite={openPublic}
      />
    );
  }

  const cleanPhoneHref = `tel:${siteConfig.phoneDisplay.replace(/\s+/g, '')}`;
  const cleanWaHref = `https://wa.me/${siteConfig.whatsappNumber || '917905580153'}?text=${encodeURIComponent(
    'राधे-राधे! मुझे कथा आयोजन के संबंध में जानकारी चाहिए।',
  )}`;

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#2B1810]">
      {/* TOP BAR CONTRACT: 1-row, 3 zones (Brand — 5 Nav Links — 1 Primary Action) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Title */}
          <a
            href="#top"
            className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#7A1212] whitespace-nowrap shrink-0"
          >
            {siteConfig.titleHindi}
          </a>

          {/* Zone 2: 5 concise single-line text nav links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#5C4033]">
            <a
              href="#about"
              className="hover:text-[#FF6B00] transition-colors whitespace-nowrap shrink-0"
            >
              परिचय
            </a>
            <a
              href="#kathas"
              className="hover:text-[#FF6B00] transition-colors whitespace-nowrap shrink-0"
            >
              कथा प्रकार
            </a>
            <a
              href="#upcoming"
              className="hover:text-[#FF6B00] transition-colors whitespace-nowrap shrink-0"
            >
              आगामी कथाएं
            </a>
            <a
              href="#media"
              className="hover:text-[#FF6B00] transition-colors whitespace-nowrap shrink-0"
            >
              लाइव व शॉर्ट्स
            </a>
            <button
              type="button"
              onClick={openAdmin}
              className="hover:text-[#FF6B00] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              एडमिन
            </button>
          </nav>

          {/* Zone 3: 1 Primary Trendy CTA + Mobile Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#booking"
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#F59E0B] text-white text-xs font-bold shadow-[0_6px_18px_-4px_rgba(255,107,0,0.45)] hover:brightness-105 active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
            >
              <span>कथा बुकिंग</span>
            </a>

            <button
              type="button"
              aria-label="मेनू खोलें"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden p-2 rounded-xl border border-amber-200 bg-[#FFF9F0] text-[#7A1212] cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-amber-100 bg-white px-4 py-4 space-y-2">
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-[#4A2511] hover:bg-amber-50"
            >
              परिचय
            </a>
            <a
              href="#kathas"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-[#4A2511] hover:bg-amber-50"
            >
              कथा प्रकार
            </a>
            <a
              href="#upcoming"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-[#4A2511] hover:bg-amber-50"
            >
              आगामी कथाएं
            </a>
            <a
              href="#media"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-[#4A2511] hover:bg-amber-50"
            >
              लाइव व शॉर्ट्स
            </a>
            <button
              type="button"
              onClick={openAdmin}
              className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-[#7A1212] bg-[#FFF6EA] hover:bg-amber-100 cursor-pointer"
            >
              एडमिन पैनल (Admin Panel)
            </button>
            <a
              href="#booking"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-center px-4 py-3 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#F59E0B] text-white text-sm font-bold"
            >
              कथा बुकिंग करें
            </a>
          </div>
        )}
      </header>

      {/* REAL-TIME IST & HINDI CALENDAR PANCHANG STRIP (Non-sticky, luminous light) */}
      <div id="top" className="bg-gradient-to-r from-[#FFF5E4] via-[#FFF9F0] to-[#FFF5E4] border-b border-amber-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 text-xs text-[#6B3410]">
          <div className="flex flex-wrap items-center gap-2 font-medium">
            <Clock className="w-3.5 h-3.5 text-[#FF6B00]" />
            <span className="font-mono-tabular font-semibold text-[#7A1212]">
              {istHindi.istTime} IST
            </span>
            <span aria-hidden="true">·</span>
            <span>{istHindi.istDateHindi}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-medium">
            <Calendar className="w-3.5 h-3.5 text-[#D97706]" />
            <span>{istHindi.panchangSummary}</span>
          </div>
        </div>
      </div>

      {/* HERO SECTION (Luminous Light, Saffron & Gold Devotional) */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#FFFDF9] via-[#FFF7EB] to-[#FFEFD6] py-12 md:py-20 border-b border-amber-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            {/* Left Content */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
              <div className="text-sm font-semibold text-[#C85A00] flex items-center gap-2">
                <span>{siteConfig.locationHindi}</span>
                <span aria-hidden="true">·</span>
                <span>सन् {siteConfig.sinceYear} से निरंतर कथा वाचन</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-[#7A1212] leading-[1.18] tracking-tight">
                {siteConfig.subtitleHindi}
              </h1>

              <p className="text-base sm:text-lg text-[#4A2511] leading-relaxed max-w-2xl">
                {siteConfig.taglineHindi}
              </p>

              {/* Aaj Ka Suvichar Box (Clean hairline border, white surface) */}
              <div className="rounded-2xl bg-white/95 border border-amber-200 p-5 shadow-[0_8px_24px_-10px_rgba(180,83,9,0.12)]">
                <div className="flex items-start gap-3">
                  <Quote className="w-5 h-5 text-[#FF6B00] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-[#C85A00]">
                      आज का पावन सुविचार
                    </div>
                    <p className="text-sm sm:text-base font-medium text-[#2B1810] leading-relaxed">
                      “{siteConfig.suvicharText}”
                    </p>
                    <div className="text-xs text-[#7D5A48] font-medium">
                      — {siteConfig.suvicharAuthor}
                    </div>
                  </div>
                </div>
              </div>

              {/* Trendy Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a
                  href="#booking"
                  className="inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-gradient-to-r from-[#FF6B00] via-[#F97316] to-[#EAB308] text-white font-bold text-sm shadow-[0_12px_28px_-6px_rgba(255,107,0,0.45)] hover:shadow-[0_16px_32px_-6px_rgba(255,107,0,0.55)] hover:-translate-y-0.5 active:scale-[0.98] transition-all whitespace-nowrap"
                >
                  <span>कथा बुकिंग करें</span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                <a
                  href="#media"
                  className="inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-white border border-amber-300 text-[#7A1212] font-bold text-sm shadow-xs hover:bg-[#FFF8EE] hover:border-[#FF6B00] hover:-translate-y-0.5 active:scale-[0.98] transition-all whitespace-nowrap"
                >
                  <Play className="w-4 h-4 text-[#FF6B00] fill-[#FF6B00]" />
                  <span>लाइव कथा देखें</span>
                </a>

                <a
                  href={cleanPhoneHref}
                  className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-[#7A1212] hover:text-[#FF6B00] transition-colors whitespace-nowrap"
                >
                  <Phone className="w-4 h-4 text-[#FF6B00]" />
                  <span className="font-mono-tabular">{siteConfig.phoneDisplay}</span>
                </a>
              </div>
            </div>

            {/* Right Portrait */}
            <div className="lg:col-span-5">
              <div className="h-full min-h-[340px] lg:min-h-[460px] rounded-3xl overflow-hidden border-2 border-amber-200/90 bg-white shadow-[0_20px_50px_-15px_rgba(180,83,9,0.2)]">
                <SafeImage
                  src={siteConfig.heroImageUrl}
                  alt={siteConfig.titleHindi}
                  fallbackTitle={siteConfig.titleHindi}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PARICHAY / ABOUT SECTION */}
      <section id="about" className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
            <div className="lg:col-span-5">
              <div className="h-full min-h-[300px] rounded-3xl overflow-hidden border border-amber-200 shadow-sm">
                <SafeImage
                  src={siteConfig.aboutImageUrl}
                  alt="श्री वृन्दावन धाम"
                  fallbackTitle="श्री वृन्दावन धाम"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#C85A00] mb-2">
                  पावन परिचय एवं आध्यात्मिक यात्रा
                </p>
                <h2 className="text-3xl md:text-4xl font-bold text-[#7A1212] leading-snug">
                  {siteConfig.aboutTitle}
                </h2>
              </div>

              <p className="text-base text-[#4A2511] leading-relaxed">
                {siteConfig.aboutDescription}
              </p>

              {/* Clean unboxed metrics row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-amber-100">
                <div>
                  <div className="text-2xl font-bold text-[#FF6B00] font-mono-tabular">
                    {siteConfig.sinceYear} से
                  </div>
                  <div className="text-xs font-semibold text-[#5C4033] mt-1">
                    निरंतर पावन कथा वाचन
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#7A1212] font-mono-tabular">
                    {kathaTypes.length} प्रमुख प्रकल्प
                  </div>
                  <div className="text-xs font-semibold text-[#5C4033] mt-1">
                    भागवत, राम कथा व शिव पुराण
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#C88A00]">
                    वृन्दावन धाम
                  </div>
                  <div className="text-xs font-semibold text-[#5C4033] mt-1">
                    संपूर्ण भारत में भक्ति प्रसार
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KATHA CATEGORIES (6 CARDS + CUSTOM DAYS NOTE) */}
      <section
        id="kathas"
        className="py-16 md:py-24 bg-gradient-to-b from-[#FFFDF9] to-[#FFF6EA] border-y border-amber-100"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-semibold tracking-wider text-[#C85A00] mb-2">
              पावन कथा प्रकल्प
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#7A1212] mb-3">
              कथा प्रकार एवं अवधि
            </h2>
            <p className="text-sm sm:text-base text-[#5C4033]">
              श्री वृन्दावन धाम की परंपरा के अनुसार सभी प्रमुख पुराणों एवं भक्ति कथाओं का संगीतमय आयोजन।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kathaTypes.map((kt) => (
              <div
                key={kt.id}
                className="group bg-white rounded-3xl border border-amber-200/80 overflow-hidden shadow-xs hover:shadow-[0_16px_35px_-12px_rgba(180,83,9,0.18)] hover:border-[#FF7722]/60 transition-all flex flex-col"
              >
                <div className="aspect-[16/10] overflow-hidden bg-[#FFF5E4]">
                  <SafeImage
                    src={kt.imageUrl}
                    alt={kt.title}
                    fallbackTitle={kt.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-[#C85A00] mb-1">
                      अवधि · {kt.durationBadge}
                    </div>
                    <h3 className="text-xl font-bold text-[#7A1212] mb-2">{kt.title}</h3>
                    <p className="text-sm text-[#5C4033] leading-relaxed">{kt.description}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBookSpecificKatha(kt.title)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#FFF6EA] border border-amber-200 text-[#7A1212] text-xs font-bold hover:bg-gradient-to-r hover:from-[#FF6B00] hover:to-[#F59E0B] hover:text-white hover:border-transparent transition-all cursor-pointer"
                  >
                    <span>यह कथा बुक करें</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Highlighted Custom Days Note */}
          <div className="mt-10 rounded-2xl bg-white border border-amber-300 p-5 text-center max-w-3xl mx-auto shadow-xs">
            <p className="text-sm sm:text-base font-semibold text-[#7A1212]">
              नोट: यजमान की इच्छानुसार कथा के दिनों की संख्या (Custom Days) बढ़ाई या घटाई जा सकती है।
            </p>
          </div>
        </div>
      </section>

      {/* YOUTUBE LIVE, CHANNEL SHOWCASE & SHORTS */}
      <section id="media" className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-14">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-semibold tracking-wider text-[#C85A00] mb-2">
              डिजिटल सत्संग व भजन संग्रह
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#7A1212] mb-3">
              लाइव प्रसारण, YouTube चैनल एवं भजन शॉर्ट्स
            </h2>
          </div>

          {/* Channel Showcase Card */}
          <div className="rounded-3xl border border-amber-200 overflow-hidden bg-gradient-to-r from-[#FFFDF9] via-[#FFF6EA] to-[#FFFDF9] shadow-sm">
            <div className="h-36 sm:h-48 w-full overflow-hidden">
              <SafeImage
                src={siteConfig.channelBannerUrl}
                alt="YouTube Channel Banner"
                fallbackTitle={siteConfig.youtubeHandle}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-amber-300 bg-white shrink-0 shadow-sm">
                  <SafeImage
                    src={siteConfig.logoImageUrl}
                    alt={siteConfig.titleHindi}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#7A1212]">
                    {siteConfig.titleHindi}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#5C4033] mt-1">
                    <span className="font-mono font-semibold text-[#C85A00]">
                      {siteConfig.youtubeHandle}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#FF6B00]" />
                      {siteConfig.youtubeSubscriberText}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={siteConfig.youtubeChannelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#DC2626] text-white text-xs sm:text-sm font-bold shadow-md shadow-red-600/20 hover:bg-[#B91C1C] active:scale-[0.98] transition-all whitespace-nowrap"
                >
                  <Youtube className="w-4 h-4" />
                  <span>YouTube पर Subscribe करें</span>
                </a>
                <a
                  href={siteConfig.facebookPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#1877F2] text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 hover:bg-[#1565D8] active:scale-[0.98] transition-all whitespace-nowrap"
                >
                  <Facebook className="w-4 h-4" />
                  <span>Facebook पेज</span>
                </a>
                {siteConfig.instagramUrl && (
                  <a
                    href={siteConfig.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-[#F97316] to-[#EC4899] text-white text-xs sm:text-sm font-bold shadow-sm hover:brightness-105 whitespace-nowrap"
                  >
                    <Instagram className="w-4 h-4" />
                    <span>Instagram</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Live Katha 16:9 Player */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Radio className="w-5 h-5 text-[#FF6B00]" />
                <h3 className="text-xl sm:text-2xl font-bold text-[#7A1212]">
                  प्रसारण / लाइव कथा
                </h3>
                {siteConfig.isLiveNow && (
                  <span className="text-xs font-bold text-red-600">· LIVE प्रसारण जारी</span>
                )}
              </div>
              <span className="text-xs sm:text-sm font-medium text-[#5C4033]">
                {siteConfig.liveVideoTitle}
              </span>
            </div>

            <div className="aspect-video w-full rounded-3xl overflow-hidden border border-amber-200 bg-[#FFF8EE] shadow-sm">
              {liveEmbedUrl ? (
                <iframe
                  src={liveEmbedUrl}
                  title={siteConfig.liveVideoTitle}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="relative w-full h-full">
                  <SafeImage
                    src={siteConfig.channelBannerUrl}
                    alt={siteConfig.liveVideoTitle}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent flex flex-col items-center justify-center p-6 text-center text-white">
                    <Sparkles className="w-10 h-10 text-amber-300 mb-3" />
                    <h4 className="text-xl sm:text-2xl font-bold max-w-xl mb-2">
                      {siteConfig.liveVideoTitle}
                    </h4>
                    <p className="text-xs sm:text-sm text-amber-100 mb-5 max-w-md">
                      दीदी दिव्यांशी किशोरी जी की पावन कथाएं एवं लाइव भजन देखने के लिए आधिकारिक YouTube चैनल पर जुड़ें।
                    </p>
                    <a
                      href={siteConfig.liveVideoUrl || siteConfig.youtubeChannelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#DC2626] text-white text-sm font-bold shadow-lg hover:bg-[#B91C1C] transition-all"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>YouTube पर लाइव कथा देखें</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* YouTube Shorts & Bhajan Horizontal Slider */}
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#7A1212]">
                  भजन एवं पावन कथा शॉर्ट्स (Shorts)
                </h3>
                <p className="text-xs sm:text-sm text-[#5C4033]">
                  छोटे-छोटे भावपूर्ण प्रसंग और मधुर भजन देखने के लिए वीडियो चुनें।
                </p>
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
              {shorts.map((s) => {
                const thumb = s.thumbnailUrl || getYouTubeThumbnailUrl(s.youtubeUrl) || siteConfig.heroImageUrl;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveShortModal(s)}
                    className="group snap-start shrink-0 w-52 sm:w-56 aspect-[9/16] rounded-3xl overflow-hidden relative border border-amber-200 bg-[#FFF5E4] text-left cursor-pointer shadow-xs hover:shadow-md transition-all"
                  >
                    <SafeImage
                      src={thumb}
                      alt={s.title}
                      fallbackTitle={s.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-4 flex flex-col justify-between">
                      <div className="self-end w-10 h-10 rounded-full bg-white/90 text-[#FF6B00] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 fill-[#FF6B00] ml-0.5" />
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-amber-300 mb-1">
                          {s.category}
                        </div>
                        <div className="text-sm font-bold text-white leading-snug line-clamp-2">
                          {s.title}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo Gallery */}
          <div className="space-y-5 pt-4 border-t border-amber-100">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#7A1212]">
                पावन कथा स्मृतियाँ (फ़ोटो गैलरी)
              </h3>
              <p className="text-xs sm:text-sm text-[#5C4033]">
                विगत कथाओं एवं संध्या आरती के दिव्य दर्शन।
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {gallery.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setActiveLightboxPhoto(g)}
                  className="group text-left rounded-2xl overflow-hidden border border-amber-200 bg-[#FFFDF9] hover:border-[#FF6B00] transition-all cursor-pointer shadow-xs"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <SafeImage
                      src={g.imageUrl}
                      alt={g.title}
                      fallbackTitle={g.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3.5">
                    <div className="text-sm font-bold text-[#7A1212] line-clamp-1">{g.title}</div>
                    <div className="text-xs text-[#7D5A48] mt-0.5">{g.location}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* UPCOMING KATHAS SCHEDULE */}
      <section
        id="upcoming"
        className="py-16 md:py-24 bg-gradient-to-b from-[#FFF8EE] to-[#FFFDF9] border-t border-amber-100"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#C85A00] mb-2">
                कथा कैलेंडर एवं कार्यक्रम
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-[#7A1212]">
                आगामी पावन कथाएं
              </h2>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-amber-200 self-start">
              {(
                [
                  { id: 'all', label: 'सभी कार्यक्रम' },
                  { id: 'upcoming', label: 'आगामी' },
                  { id: 'completed', label: 'सम्पन्न' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setKathaFilter(f.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                    kathaFilter === f.id
                      ? 'bg-[#FF6B00] text-white'
                      : 'text-[#5C4033] hover:bg-amber-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredKathas.map((k) => (
              <div
                key={k.id}
                className="bg-white rounded-3xl border border-amber-200 overflow-hidden shadow-xs flex flex-col justify-between"
              >
                {k.posterUrl && (
                  <div className="aspect-[16/9] overflow-hidden bg-[#FFF5E4]">
                    <SafeImage
                      src={k.posterUrl}
                      alt={k.kathaName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6 space-y-3 flex-1">
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#C85A00]">
                    <span>{k.dateRange}</span>
                    <span>· {STATUS_DISPLAY[k.status]}</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#7A1212]">{k.kathaName}</h3>
                  <div className="space-y-1.5 text-sm text-[#5C4033] pt-1">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-[#FF6B00] shrink-0 mt-0.5" />
                      <span>
                        {k.cityState}
                        {k.venue ? ` (${k.venue})` : ''}
                      </span>
                    </div>
                    {k.timing && (
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                        <span>{k.timing}</span>
                      </div>
                    )}
                    {k.organizer && (
                      <div className="text-xs text-[#7D5A48] pt-1">
                        आयोजक: <span className="font-semibold text-[#4A2511]">{k.organizer}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTERACTIVE BOOKING FORM */}
      <BookingSection
        siteConfig={siteConfig}
        kathaTypes={kathaTypes}
        selectedKathaTitle={selectedKathaForBooking}
      />

      {/* QUIET DEVOTIONAL FOOTER */}
      <footer className="bg-white border-t border-amber-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div className="space-y-2">
            <h3 className="font-display text-xl font-bold text-[#7A1212]">
              {siteConfig.titleHindi}
            </h3>
            <p className="text-sm text-[#5C4033]">{siteConfig.ashramAddress}</p>
            <p className="text-xs text-[#7D5A48]">
              संपर्क सूत्र:{' '}
              <a href={cleanPhoneHref} className="font-mono-tabular font-semibold text-[#7A1212]">
                {siteConfig.phoneDisplay}
              </a>
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-[#5C4033]">
            <a href="#about" className="hover:text-[#FF6B00]">
              परिचय
            </a>
            <a href="#kathas" className="hover:text-[#FF6B00]">
              कथा प्रकार
            </a>
            <a href="#upcoming" className="hover:text-[#FF6B00]">
              आगामी कथाएं
            </a>
            <a href="#media" className="hover:text-[#FF6B00]">
              लाइव व शॉर्ट्स
            </a>
            <a href="#booking" className="hover:text-[#FF6B00]">
              कथा बुकिंग
            </a>
            <button
              type="button"
              onClick={openAdmin}
              className="text-[#7A1212] font-semibold hover:text-[#FF6B00] cursor-pointer"
            >
              एडमिन पैनल (Admin Login)
            </button>
          </div>

          <div className="flex flex-wrap md:justify-end gap-3">
            <a
              href={siteConfig.youtubeChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100"
            >
              <Youtube className="w-4 h-4" />
              <span>YouTube</span>
            </a>
            <a
              href={siteConfig.facebookPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100"
            >
              <Facebook className="w-4 h-4" />
              <span>Facebook</span>
            </a>
          </div>
        </div>
      </footer>

      {/* COMPACT FLOATING WHATSAPP & CALL BUTTONS */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2.5">
        <a
          href={cleanWaHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp चैट करें"
          className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-[#16A34A] text-white text-xs font-bold shadow-lg shadow-emerald-600/25 hover:brightness-105 active:scale-95 transition-all"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
        <a
          href={cleanPhoneHref}
          aria-label="सीधे कॉल करें"
          className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-[#FF6B00] to-[#F59E0B] text-white text-xs font-bold shadow-lg shadow-orange-500/25 hover:brightness-105 active:scale-95 transition-all"
        >
          <Phone className="w-4 h-4" />
          <span className="hidden sm:inline">कॉल करें</span>
        </a>
      </div>

      {/* SHORT VIDEO MODAL */}
      {activeShortModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveShortModal(null)}
        >
          <div
            className="bg-white rounded-3xl border border-amber-200 max-w-md w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-amber-100 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[#C85A00]">
                  {activeShortModal.category}
                </div>
                <h4 className="font-bold text-[#7A1212] text-sm">{activeShortModal.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveShortModal(null)}
                className="p-2 rounded-xl hover:bg-amber-50 text-[#7A1212] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-[9/16] max-h-[65vh] w-full bg-[#FFF8EE]">
              {getYouTubeEmbedUrl(activeShortModal.youtubeUrl) ? (
                <iframe
                  src={getYouTubeEmbedUrl(activeShortModal.youtubeUrl) || ''}
                  title={activeShortModal.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <SafeImage
                    src={activeShortModal.thumbnailUrl || siteConfig.heroImageUrl}
                    alt={activeShortModal.title}
                    className="w-40 h-56 rounded-2xl object-cover border border-amber-200"
                  />
                  <a
                    href={activeShortModal.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#DC2626] text-white text-xs font-bold"
                  >
                    <Youtube className="w-4 h-4" />
                    <span>YouTube पर देखें</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GALLERY LIGHTBOX MODAL */}
      {activeLightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveLightboxPhoto(null)}
        >
          <div
            className="bg-white rounded-3xl border border-amber-200 max-w-3xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-amber-100 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-[#7A1212]">{activeLightboxPhoto.title}</h4>
                <p className="text-xs text-[#7D5A48]">{activeLightboxPhoto.location}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveLightboxPhoto(null)}
                className="p-2 rounded-xl hover:bg-amber-50 text-[#7A1212] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-hidden bg-[#FFFDF9]">
              <SafeImage
                src={activeLightboxPhoto.imageUrl}
                alt={activeLightboxPhoto.title}
                className="w-full max-h-[75vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
