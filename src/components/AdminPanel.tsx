import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Database,
  Image as ImageIcon,
  Link2,
  LogIn,
  LogOut,
  MessageCircle,
  Phone,
  Plus,
  Quote,
  Save,
  ShieldCheck,
  Trash2,
  Video,
} from 'lucide-react';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  DEFAULT_GALLERY,
  DEFAULT_KATHA_TYPES,
  DEFAULT_SHORTS,
  DEFAULT_SITE_CONFIG,
  DEFAULT_UPCOMING_KATHAS,
} from '../data/defaults';
import type {
  BookingStatus,
  GalleryPhoto,
  KathaBooking,
  KathaStatus,
  KathaType,
  ShortCategory,
  ShortClip,
  SiteConfig,
  UpcomingKatha,
} from '../types';
import { ImageUploadField } from './ImageUploadField';
import { SafeImage } from './SafeImage';

interface AdminPanelProps {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  siteConfig: SiteConfig;
  kathas: UpcomingKatha[];
  kathaTypes: KathaType[];
  shorts: ShortClip[];
  gallery: GalleryPhoto[];
  onBackToSite: () => void;
}

type AdminTab = 'bookings' | 'kathas' | 'media_links' | 'content' | 'shorts_gallery';

const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'लंबित (Pending)',
  confirmed: 'पुष्ट (Confirmed)',
  completed: 'सम्पन्न (Completed)',
  cancelled: 'रद्द (Cancelled)',
};

const KATHA_STATUS_LABELS: Record<KathaStatus, string> = {
  upcoming: 'आगामी (Upcoming)',
  live: 'लाइव जारी (Live)',
  completed: 'सम्पन्न (Completed)',
};

export function AdminPanel({
  user,
  authReady,
  isAdmin,
  siteConfig,
  kathas,
  kathaTypes,
  shorts,
  gallery,
  onBackToSite,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('bookings');
  const [bookings, setBookings] = useState<KathaBooking[]>([]);
  const [bookingFilter, setBookingFilter] = useState<'all' | BookingStatus>('all');
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Local editable draft of siteConfig
  const [draftConfig, setDraftConfig] = useState<SiteConfig>(siteConfig);
  const [savingConfig, setSavingConfig] = useState(false);

  // Upcoming Katha form
  const [editingKathaId, setEditingKathaId] = useState<string | null>(null);
  const [kathaForm, setKathaForm] = useState({
    kathaName: '',
    dateRange: '',
    startDate: '2026-12-20',
    timing: 'दोपहर 3:00 बजे से शाम 6:30 बजे तक',
    cityState: '',
    venue: '',
    organizer: '',
    status: 'upcoming' as KathaStatus,
    posterUrl: '',
  });

  // Short form
  const [shortForm, setShortForm] = useState({
    title: '',
    youtubeUrl: '',
    thumbnailUrl: '',
    category: 'भजन' as ShortCategory,
  });

  // Gallery form
  const [galleryForm, setGalleryForm] = useState({
    title: '',
    location: 'श्री वृन्दावन धाम',
    imageUrl: '',
  });

  // Katha Type edit draft
  const [editingType, setEditingType] = useState<KathaType | null>(null);

  // Booking note drafts
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setDraftConfig(siteConfig);
  }, [siteConfig]);

  const showToast = (type: 'ok' | 'err', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch bookings ONLY when auth is ready & user is admin
  useEffect(() => {
    if (!authReady || !user || !isAdmin) {
      setBookings([]);
      return;
    }

    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list: KathaBooking[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<KathaBooking, 'id'>),
        }));
        setBookings(list);
        const notesMap: Record<string, string> = {};
        for (const b of list) {
          notesMap[b.id] = b.adminNotes || '';
        }
        setNoteDrafts(notesMap);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'bookings');
      },
    );

    return () => unsubscribe();
  }, [authReady, user, isAdmin]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : 'लॉगिन में त्रुटि हुई।');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const buildSiteConfigPayload = (cfg: SiteConfig) => ({
    titleHindi: (cfg.titleHindi || DEFAULT_SITE_CONFIG.titleHindi).slice(0, 120),
    subtitleHindi: (cfg.subtitleHindi || '').slice(0, 160),
    locationHindi: (cfg.locationHindi || '').slice(0, 120),
    sinceYear: (cfg.sinceYear || '2019').slice(0, 20),
    taglineHindi: (cfg.taglineHindi || '').slice(0, 240),
    aboutTitle: (cfg.aboutTitle || '').slice(0, 160),
    aboutDescription: (cfg.aboutDescription || '').slice(0, 2000),
    heroImageUrl: (cfg.heroImageUrl || '').slice(0, 1000),
    aboutImageUrl: (cfg.aboutImageUrl || '').slice(0, 1000),
    channelBannerUrl: (cfg.channelBannerUrl || '').slice(0, 1000),
    logoImageUrl: (cfg.logoImageUrl || '').slice(0, 1000),
    phoneDisplay: (cfg.phoneDisplay || '+91 7905580153').slice(0, 30),
    whatsappNumber: (() => {
      const cleaned = (cfg.whatsappNumber || '').replace(/[^0-9]/g, '').slice(0, 15);
      return cleaned.length >= 10 ? cleaned : '917905580153';
    })(),
    youtubeChannelUrl: (cfg.youtubeChannelUrl || '').slice(0, 500),
    youtubeHandle: (cfg.youtubeHandle || '').slice(0, 80),
    youtubeSubscriberText: (cfg.youtubeSubscriberText || '').slice(0, 60),
    facebookPageUrl: (cfg.facebookPageUrl || '').slice(0, 500),
    instagramUrl: (cfg.instagramUrl || '').slice(0, 500),
    liveVideoUrl: (cfg.liveVideoUrl || '').slice(0, 500),
    liveVideoTitle: (cfg.liveVideoTitle || '').slice(0, 200),
    isLiveNow: Boolean(cfg.isLiveNow),
    suvicharText: (cfg.suvicharText || '').slice(0, 600),
    suvicharAuthor: (cfg.suvicharAuthor || '').slice(0, 100),
    bookingNoticeText: (cfg.bookingNoticeText || '').slice(0, 600),
    ashramAddress: (cfg.ashramAddress || '').slice(0, 300),
    updatedAt: serverTimestamp(),
  });

  const saveSiteConfig = async (overrideCfg?: SiteConfig) => {
    const targetCfg = overrideCfg || draftConfig;
    setSavingConfig(true);
    try {
      await setDoc(doc(db, 'site_config', 'main'), buildSiteConfigPayload(targetCfg));
      showToast('ok', 'सभी सेटिंग्स व लिंक्स सफलतापूर्वक सहेजे गए!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'site_config/main');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAutoSaveImageField = async (
    field: 'heroImageUrl' | 'aboutImageUrl' | 'channelBannerUrl' | 'logoImageUrl',
    newUrl: string,
  ) => {
    const nextConfig = { ...draftConfig, [field]: newUrl };
    setDraftConfig(nextConfig);
    await saveSiteConfig(nextConfig);
  };

  const seedInitialFirestoreData = async () => {
    setSeeding(true);
    try {
      await setDoc(doc(db, 'site_config', 'main'), buildSiteConfigPayload(draftConfig));

      for (const kt of DEFAULT_KATHA_TYPES) {
        await setDoc(doc(db, 'katha_types', kt.id), {
          title: kt.title,
          englishTitle: kt.englishTitle,
          durationBadge: kt.durationBadge,
          description: kt.description,
          imageUrl: kt.imageUrl,
          order: kt.order,
          updatedAt: serverTimestamp(),
        });
      }

      for (const k of DEFAULT_UPCOMING_KATHAS) {
        await setDoc(doc(db, 'kathas', k.id), {
          kathaName: k.kathaName,
          dateRange: k.dateRange,
          startDate: k.startDate,
          timing: k.timing,
          cityState: k.cityState,
          venue: k.venue,
          organizer: k.organizer,
          status: k.status,
          posterUrl: k.posterUrl,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const s of DEFAULT_SHORTS) {
        await setDoc(doc(db, 'shorts', s.id), {
          title: s.title,
          youtubeUrl: s.youtubeUrl,
          thumbnailUrl: s.thumbnailUrl,
          category: s.category,
          order: s.order,
          createdAt: serverTimestamp(),
        });
      }

      for (const g of DEFAULT_GALLERY) {
        await setDoc(doc(db, 'gallery', g.id), {
          title: g.title,
          location: g.location,
          imageUrl: g.imageUrl,
          order: g.order,
          createdAt: serverTimestamp(),
        });
      }

      showToast('ok', 'संपूर्ण डिफ़ॉल्ट डेटा Firestore में सहेजा गया!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'seed_all');
    } finally {
      setSeeding(false);
    }
  };

  const handleSaveKatha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kathaForm.kathaName.trim() || !kathaForm.dateRange.trim() || !kathaForm.cityState.trim()) {
      showToast('err', 'कृपया कथा का नाम, दिनांक और स्थान भरें।');
      return;
    }

    try {
      if (editingKathaId) {
        const existingItem = kathas.find((k) => k.id === editingKathaId);
        await setDoc(doc(db, 'kathas', editingKathaId), {
          kathaName: kathaForm.kathaName.trim().slice(0, 140),
          dateRange: kathaForm.dateRange.trim().slice(0, 100),
          startDate: kathaForm.startDate || '2026-12-01',
          timing: kathaForm.timing.trim().slice(0, 100),
          cityState: kathaForm.cityState.trim().slice(0, 140),
          venue: kathaForm.venue.trim().slice(0, 200),
          organizer: kathaForm.organizer.trim().slice(0, 140),
          status: kathaForm.status,
          posterUrl: kathaForm.posterUrl.trim().slice(0, 1000),
          createdAt: existingItem?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast('ok', 'आगामी कथा अपडेट की गई!');
      } else {
        await addDoc(collection(db, 'kathas'), {
          kathaName: kathaForm.kathaName.trim().slice(0, 140),
          dateRange: kathaForm.dateRange.trim().slice(0, 100),
          startDate: kathaForm.startDate || '2026-12-01',
          timing: kathaForm.timing.trim().slice(0, 100),
          cityState: kathaForm.cityState.trim().slice(0, 140),
          venue: kathaForm.venue.trim().slice(0, 200),
          organizer: kathaForm.organizer.trim().slice(0, 140),
          status: kathaForm.status,
          posterUrl: kathaForm.posterUrl.trim().slice(0, 1000),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast('ok', 'नई आगामी कथा जोड़ी गई!');
      }

      setEditingKathaId(null);
      setKathaForm({
        kathaName: '',
        dateRange: '',
        startDate: '2026-12-20',
        timing: 'दोपहर 3:00 बजे से शाम 6:30 बजे तक',
        cityState: '',
        venue: '',
        organizer: '',
        status: 'upcoming',
        posterUrl: '',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'kathas');
    }
  };

  const handleDeleteKatha = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'kathas', id));
      showToast('ok', 'कथा प्रविष्टि हटाई गई।');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `kathas/${id}`);
    }
  };

  const handleUpdateBooking = async (bookingId: string, status: BookingStatus) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status,
        adminNotes: (noteDrafts[bookingId] || '').slice(0, 500),
        updatedAt: serverTimestamp(),
      });
      showToast('ok', 'बुकिंग स्थिति अपडेट की गई!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${bookingId}`);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      await deleteDoc(doc(db, 'bookings', bookingId));
      showToast('ok', 'बुकिंग हटाई गई।');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `bookings/${bookingId}`);
    }
  };

  const handleSaveKathaType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType) return;
    try {
      await setDoc(doc(db, 'katha_types', editingType.id), {
        title: editingType.title.trim().slice(0, 120),
        englishTitle: editingType.englishTitle.trim().slice(0, 120),
        durationBadge: editingType.durationBadge.trim().slice(0, 60),
        description: editingType.description.trim().slice(0, 500),
        imageUrl: editingType.imageUrl.trim().slice(0, 1000),
        order: Number(editingType.order) || 1,
        updatedAt: serverTimestamp(),
      });
      setEditingType(null);
      showToast('ok', 'कथा प्रकार अपडेट किया गया!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `katha_types/${editingType.id}`);
    }
  };

  const handleAddShort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortForm.title.trim() || !shortForm.youtubeUrl.trim()) {
      showToast('err', 'कृपया शीर्षक और YouTube लिंक दर्ज करें।');
      return;
    }
    try {
      await addDoc(collection(db, 'shorts'), {
        title: shortForm.title.trim().slice(0, 160),
        youtubeUrl: shortForm.youtubeUrl.trim().slice(0, 500),
        thumbnailUrl: shortForm.thumbnailUrl.trim().slice(0, 1000),
        category: shortForm.category,
        order: shorts.length + 1,
        createdAt: serverTimestamp(),
      });
      setShortForm({ title: '', youtubeUrl: '', thumbnailUrl: '', category: 'भजन' });
      showToast('ok', 'नया शॉर्ट / भजन वीडियो जोड़ा गया!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'shorts');
    }
  };

  const handleDeleteShort = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'shorts', id));
      showToast('ok', 'शॉर्ट वीडियो हटाया गया।');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `shorts/${id}`);
    }
  };

  const handleAddGallery = async (urlOverride?: string) => {
    const finalUrl = (urlOverride || galleryForm.imageUrl).trim();
    if (!finalUrl) {
      showToast('err', 'कृपया फ़ोटो अपलोड करें या URL डालें।');
      return;
    }
    const finalTitle = galleryForm.title.trim() || 'पावन कथा स्मृति';
    try {
      await addDoc(collection(db, 'gallery'), {
        title: finalTitle.slice(0, 160),
        location: (galleryForm.location.trim() || 'श्री वृन्दावन धाम').slice(0, 140),
        imageUrl: finalUrl.slice(0, 1000),
        order: gallery.length + 1,
        createdAt: serverTimestamp(),
      });
      setGalleryForm({ title: '', location: 'श्री वृन्दावन धाम', imageUrl: '' });
      showToast('ok', 'फ़ोटो गैलरी में ऑटो-सेव हो गई!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'gallery');
    }
  };

  const handleDeleteGallery = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'gallery', id));
      showToast('ok', 'गैलरी फ़ोटो हटाई गई।');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `gallery/${id}`);
    }
  };

  const filteredBookings =
    bookingFilter === 'all' ? bookings : bookings.filter((b) => b.status === bookingFilter);

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#2B1810]">
      {/* Top Light Admin Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToSite}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-200 bg-[#FFF8EE] text-[#7A1212] text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>वेबसाइट पर वापस जाएं</span>
            </button>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold text-[#7A1212]">
                प्रबंधन पोर्टल (Admin Panel)
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="hidden md:inline text-xs text-[#5C4033] font-medium">
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>लॉगआउट</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#F59E0B] text-white text-xs font-semibold shadow-sm hover:brightness-105 cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-4 h-4" />
                <span>Google से लॉगिन करें</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm">
          <div
            className={`px-5 py-3.5 rounded-2xl shadow-lg border text-sm font-semibold flex items-center gap-2 ${
              toast.type === 'ok'
                ? 'bg-white border-emerald-300 text-emerald-800'
                : 'bg-white border-red-300 text-red-700'
            }`}
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {!authReady ? (
          <div className="bg-white border border-amber-200 rounded-3xl p-12 text-center text-sm text-[#5C4033]">
            प्रमाणीकरण जाँचा जा रहा है...
          </div>
        ) : !user ? (
          <div className="max-w-lg mx-auto bg-white border border-amber-200 rounded-3xl p-8 sm:p-10 text-center shadow-sm space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FFF3DF] to-[#FDE6BD] border border-amber-300 text-[#D95300] flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-[#7A1212]">एडमिन पैनल लॉगिन</h2>
            <p className="text-sm text-[#5C4033] leading-relaxed">
              सभी फ़ोटो अपलोड करने, वेबसाइट के लिंक्स बदलने, सुविचार अपडेट करने, आगामी कथाएं जोड़ने और कथा बुकिंग्स देखने के लिए अधिकृत Google खाते से लॉगिन करें।
            </p>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#F59E0B] text-white font-bold text-sm shadow-md shadow-orange-500/20 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Google अकाउंट से प्रवेश करें</span>
            </button>
          </div>
        ) : !isAdmin ? (
          <div className="max-w-lg mx-auto bg-white border border-red-200 rounded-3xl p-8 text-center space-y-4">
            <h2 className="text-xl font-bold text-red-700">अधिकृत प्रवेश नहीं</h2>
            <p className="text-sm text-[#5C4033]">
              आप अभी <span className="font-semibold">{user.email}</span> से लॉगिन हैं। बदलाव करने के लिए अधिकृत एडमिन खाता ({BOOTSTRAPPED_ADMIN_EMAIL}) आवश्यक है।
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="px-5 py-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200 cursor-pointer"
            >
              अन्य खाते से लॉगिन करें
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick Action Bar + Seed Button */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-amber-200 rounded-2xl p-4">
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { id: 'bookings', label: `बुकिंग्स (${bookings.length})`, icon: MessageCircle },
                    { id: 'media_links', label: 'फ़ोटो व सभी लिंक्स', icon: Link2 },
                    { id: 'kathas', label: `आगामी कथाएं (${kathas.length})`, icon: CalendarDays },
                    { id: 'content', label: 'सुविचार, परिचय व कथा प्रकार', icon: Quote },
                    { id: 'shorts_gallery', label: 'शॉर्ट्स व गैलरी', icon: ImageIcon },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-gradient-to-r from-[#FF6B00] to-[#F59E0B] text-white shadow-sm'
                          : 'bg-[#FFF9F0] text-[#5C4033] border border-amber-200/70 hover:bg-amber-50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={seeding}
                onClick={seedInitialFirestoreData}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-amber-300 bg-[#FFF5E4] text-[#7A1212] text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Database className="w-3.5 h-3.5 text-[#D95300]" />
                <span>{seeding ? 'सहेजा जा रहा है...' : 'डिफ़ॉल्ट डेटा Firestore में सिंक करें'}</span>
              </button>
            </div>

            {/* TAB 1: BOOKINGS */}
            {activeTab === 'bookings' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-[#7A1212]">प्राप्त कथा बुकिंग अनुरोध</h2>
                  <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl border border-amber-200">
                    {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map(
                      (st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setBookingFilter(st)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                            bookingFilter === st
                              ? 'bg-[#FF6B00] text-white'
                              : 'text-[#5C4033] hover:bg-amber-50'
                          }`}
                        >
                          {st === 'all' ? 'सभी' : BOOKING_STATUS_LABELS[st].split(' ')[0]}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                {filteredBookings.length === 0 ? (
                  <div className="bg-white border border-amber-200 rounded-2xl p-10 text-center text-sm text-[#7D5A48]">
                    अभी इस श्रेणी में कोई बुकिंग अनुरोध नहीं है।
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredBookings.map((b) => (
                      <div
                        key={b.id}
                        className="bg-white border border-amber-200 rounded-2xl p-5 space-y-4 shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-mono-tabular text-[#9A5B25]">
                              ID: {b.id} · {b.bookingType === 'urgent' ? 'अर्जेंट बुकिंग' : 'सामान्य बुकिंग'}
                            </div>
                            <h3 className="text-lg font-bold text-[#7A1212] mt-0.5">
                              {b.yajmanName}
                            </h3>
                            <p className="text-xs text-[#5C4033] mt-0.5">{b.cityState}</p>
                          </div>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#FFF4E3] text-[#9A3412] border border-amber-200">
                            {BOOKING_STATUS_LABELS[b.status]}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-[#FFFDF8] border border-amber-100 rounded-xl p-3">
                          <div>
                            <span className="text-[#7D5A48]">कथा:</span>{' '}
                            <span className="font-semibold">{b.kathaType}</span>
                          </div>
                          <div>
                            <span className="text-[#7D5A48]">अवधि:</span>{' '}
                            <span className="font-semibold">
                              {b.customDays ? `${b.customDays} (कस्टम)` : b.durationDays}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#7D5A48]">संपर्क:</span>{' '}
                            <span className="font-mono-tabular font-semibold">{b.phone}</span>
                          </div>
                          <div>
                            <span className="text-[#7D5A48]">संभावित तिथि:</span>{' '}
                            <span className="font-semibold">{b.preferredDate || 'तय नहीं'}</span>
                          </div>
                        </div>

                        {b.message && (
                          <p className="text-xs text-[#4A2511] bg-[#FFF9F0] p-3 rounded-xl border border-amber-100">
                            संदेश: {b.message}
                          </p>
                        )}

                        <div className="space-y-2">
                          <input
                            type="text"
                            value={noteDrafts[b.id] ?? ''}
                            onChange={(e) =>
                              setNoteDrafts((prev) => ({ ...prev, [b.id]: e.target.value }))
                            }
                            placeholder="एडमिन नोट्स लिखें (जैसे: बात हो गई, तिथि पक्की)..."
                            className="w-full px-3 py-2 text-xs rounded-xl border border-amber-200 bg-[#FFFDF9]"
                          />
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {(['pending', 'confirmed', 'completed', 'cancelled'] as const).map(
                                (st) => (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleUpdateBooking(b.id, st)}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border ${
                                      b.status === st
                                        ? 'bg-[#FF6B00] text-white border-[#FF6B00]'
                                        : 'bg-white text-[#5C4033] border-amber-200 hover:bg-amber-50'
                                    }`}
                                  >
                                    {BOOKING_STATUS_LABELS[st].split(' ')[0]}
                                  </button>
                                ),
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <a
                                href={`tel:${b.phone.replace(/\s+/g, '')}`}
                                className="p-2 rounded-lg border border-amber-200 text-[#7A1212] hover:bg-amber-50"
                                title="कॉल करें"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                              <a
                                href={`https://wa.me/${b.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                title="WhatsApp करें"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDeleteBooking(b.id)}
                                className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                                title="हटाएं"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PHOTOS & ALL LINKS */}
            {activeTab === 'media_links' && (
              <div className="space-y-6">
                <div className="bg-white border border-amber-200 rounded-3xl p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 pb-4">
                    <div>
                      <h2 className="text-xl font-bold text-[#7A1212]">
                        सभी फ़ोटो डायरेक्ट अपलोड (लिंक अपने-आप बनकर सेव होगा)
                      </h2>
                      <p className="text-xs text-[#7D5A48] mt-0.5">
                        फ़ोटो चुनते ही सर्वर पर अपलोड होकर लिंक तैयार होगा और वेबसाइट पर तुरंत अपडेट हो जाएगा।
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={savingConfig}
                      onClick={() => saveSiteConfig()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#F59E0B] text-white text-xs font-bold shadow-sm hover:brightness-105 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingConfig ? 'सहेजा जा रहा है...' : 'सभी बदलाव सहेजें'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ImageUploadField
                      label="1. मुख्य हीरो बैनर फ़ोटो (Didi Ji Portrait)"
                      value={draftConfig.heroImageUrl}
                      onChange={(url) => setDraftConfig((prev) => ({ ...prev, heroImageUrl: url }))}
                      onAutoSave={(url) => handleAutoSaveImageField('heroImageUrl', url)}
                      helperText="मुख्य स्क्रीन पर दाहिनी ओर दिखने वाली पावन फ़ोटो।"
                    />
                    <ImageUploadField
                      label="2. परिचय सेक्शन फ़ोटो (About / Vrindavan Dham)"
                      value={draftConfig.aboutImageUrl}
                      onChange={(url) => setDraftConfig((prev) => ({ ...prev, aboutImageUrl: url }))}
                      onAutoSave={(url) => handleAutoSaveImageField('aboutImageUrl', url)}
                      helperText="परिचय अनुभाग में दिखने वाली फ़ोटो।"
                    />
                    <ImageUploadField
                      label="3. YouTube चैनल बैनर फ़ोटो"
                      value={draftConfig.channelBannerUrl}
                      onChange={(url) =>
                        setDraftConfig((prev) => ({ ...prev, channelBannerUrl: url }))
                      }
                      onAutoSave={(url) => handleAutoSaveImageField('channelBannerUrl', url)}
                      helperText="YouTube चैनल कार्ड के बैकग्राउंड में दिखने वाला बैनर।"
                    />
                    <ImageUploadField
                      label="4. पोर्टल लोगो / आइकन फ़ोटो"
                      value={draftConfig.logoImageUrl}
                      onChange={(url) => setDraftConfig((prev) => ({ ...prev, logoImageUrl: url }))}
                      onAutoSave={(url) => handleAutoSaveImageField('logoImageUrl', url)}
                      helperText="चैनल प्रोफ़ाइल एवं पहचान हेतु फ़ोटो।"
                    />
                  </div>
                </div>

                {/* All Links & Live Video */}
                <div className="bg-white border border-amber-200 rounded-3xl p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 pb-4">
                    <h2 className="text-xl font-bold text-[#7A1212]">
                      संपर्क, सोशल मीडिया एवं लाइव कथा वीडियो लिंक्स
                    </h2>
                    <button
                      type="button"
                      disabled={savingConfig}
                      onClick={() => saveSiteConfig()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#F59E0B] text-white text-xs font-bold shadow-sm hover:brightness-105 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>लिंक्स सहेजें</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#5C1A12] mb-1">
                        प्रदर्शित मोबाइल नंबर (Call Display)
                      </label>
                      <input
                        type="text"
                        value={draftConfig.phoneDisplay}
                        onChange={(e) =>
                          setDraftConfig((p) => ({ ...p, phoneDisplay: e.target.value }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5C1A12] mb-1">
                        WhatsApp नंबर (केवल अंक, देश कोड सहित जैसे 917905580153)
                      </label>
                      <input
                        type="text"
                        value={draftConfig.whatsappNumber}
                        onChange={(e) =>
                          setDraftConfig((p) => ({ ...p, whatsappNumber: e.target.value }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5C1A12] mb-1">
                        YouTube चैनल लिंक
                      </label>
                      <input
                        type="text"
                        value={draftConfig.youtubeChannelUrl}
                        onChange={(e) =>
                          setDraftConfig((p) => ({ ...p, youtubeChannelUrl: e.target.value }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5C1A12] mb-1">
                        YouTube हैंडल व सब्सक्राइबर टेक्स्ट
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={draftConfig.youtubeHandle}
                          onChange={(e) =>
                            setDraftConfig((p) => ({ ...p, youtubeHandle: e.target.value }))
                          }
                          placeholder="@dididivyanshiji4048"
                          className="w-full px-3 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                        />
                        <input
                          type="text"
                          value={draftConfig.youtubeSubscriberText}
                          onChange={(e) =>
                            setDraftConfig((p) => ({ ...p, youtubeSubscriberText: e.target.value }))
                          }
                          placeholder="50K+ भक्त परिवार"
                          className="w-full px-3 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5C1A12] mb-1">
                        Facebook पेज लिंक
                      </label>
                      <input
                        type="text"
                        value={draftConfig.facebookPageUrl}
                        onChange={(e) =>
                          setDraftConfig((p) => ({ ...p, facebookPageUrl: e.target.value }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5C1A12] mb-1">
                        Instagram लिंक (वैकल्पिक)
                      </label>
                      <input
                        type="text"
                        value={draftConfig.instagramUrl}
                        onChange={(e) =>
                          setDraftConfig((p) => ({ ...p, instagramUrl: e.target.value }))
                        }
                        placeholder="https://instagram.com/..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5C1A12] mb-1">
                        लाइव / नवीनतम YouTube कथा वीडियो लिंक
                      </label>
                      <input
                        type="text"
                        value={draftConfig.liveVideoUrl}
                        onChange={(e) =>
                          setDraftConfig((p) => ({ ...p, liveVideoUrl: e.target.value }))
                        }
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5C1A12] mb-1">
                        लाइव वीडियो शीर्षक एवं लाइव स्टेटस
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={draftConfig.liveVideoTitle}
                          onChange={(e) =>
                            setDraftConfig((p) => ({ ...p, liveVideoTitle: e.target.value }))
                          }
                          className="flex-1 px-3.5 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setDraftConfig((p) => ({ ...p, isLiveNow: !p.isLiveNow }))
                          }
                          className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border cursor-pointer whitespace-nowrap ${
                            draftConfig.isLiveNow
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-[#FFF9F0] text-[#5C4033] border-amber-200'
                          }`}
                        >
                          {draftConfig.isLiveNow ? 'LIVE चालू है' : 'LIVE बंद'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: UPCOMING KATHAS */}
            {activeTab === 'kathas' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form
                  onSubmit={handleSaveKatha}
                  className="lg:col-span-5 bg-white border border-amber-200 rounded-3xl p-6 space-y-4 h-fit"
                >
                  <h2 className="text-lg font-bold text-[#7A1212]">
                    {editingKathaId ? 'आगामी कथा संपादित करें' : 'नई आगामी कथा जोड़ें'}
                  </h2>

                  <div className="space-y-3">
                    <input
                      type="text"
                      required
                      placeholder="कथा का नाम (जैसे: श्रीमद् भागवत कथा)"
                      value={kathaForm.kathaName}
                      onChange={(e) => setKathaForm((p) => ({ ...p, kathaName: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="दिनांक (12 – 18 दिसम्बर 2026)"
                        value={kathaForm.dateRange}
                        onChange={(e) => setKathaForm((p) => ({ ...p, dateRange: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                      />
                      <input
                        type="date"
                        required
                        value={kathaForm.startDate}
                        onChange={(e) => setKathaForm((p) => ({ ...p, startDate: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm font-mono-tabular"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="समय (दोपहर 3:00 बजे से शाम 6:30 बजे तक)"
                      value={kathaForm.timing}
                      onChange={(e) => setKathaForm((p) => ({ ...p, timing: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                    />
                    <input
                      type="text"
                      required
                      placeholder="शहर व राज्य (जैसे: लखनऊ, उत्तर प्रदेश)"
                      value={kathaForm.cityState}
                      onChange={(e) => setKathaForm((p) => ({ ...p, cityState: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                    />
                    <input
                      type="text"
                      placeholder="कथा स्थल (पंडाल / मंदिर पता)"
                      value={kathaForm.venue}
                      onChange={(e) => setKathaForm((p) => ({ ...p, venue: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                    />
                    <input
                      type="text"
                      placeholder="आयोजक का नाम"
                      value={kathaForm.organizer}
                      onChange={(e) => setKathaForm((p) => ({ ...p, organizer: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                    />
                    <select
                      value={kathaForm.status}
                      onChange={(e) =>
                        setKathaForm((p) => ({ ...p, status: e.target.value as KathaStatus }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                    >
                      <option value="upcoming">आगामी (Upcoming)</option>
                      <option value="live">प्रसारण जारी (Live)</option>
                      <option value="completed">सम्पन्न (Completed)</option>
                    </select>

                    <ImageUploadField
                      label="कथा पोस्टर फ़ोटो (वैकल्पिक)"
                      value={kathaForm.posterUrl}
                      onChange={(url) => setKathaForm((p) => ({ ...p, posterUrl: url }))}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#F59E0B] text-white text-sm font-bold shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{editingKathaId ? 'अपडेट सहेजें' : 'कथा जोड़ें'}</span>
                    </button>
                    {editingKathaId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingKathaId(null);
                          setKathaForm({
                            kathaName: '',
                            dateRange: '',
                            startDate: '2026-12-20',
                            timing: 'दोपहर 3:00 बजे से शाम 6:30 बजे तक',
                            cityState: '',
                            venue: '',
                            organizer: '',
                            status: 'upcoming',
                            posterUrl: '',
                          });
                        }}
                        className="px-4 py-3 rounded-xl border border-amber-200 text-xs font-semibold cursor-pointer"
                      >
                        रद्द करें
                      </button>
                    )}
                  </div>
                </form>

                <div className="lg:col-span-7 space-y-3">
                  <h2 className="text-lg font-bold text-[#7A1212]">वर्तमान आगामी कथा सूची</h2>
                  {kathas.map((k) => (
                    <div
                      key={k.id}
                      className="bg-white border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5">
                        {k.posterUrl && (
                          <SafeImage
                            src={k.posterUrl}
                            alt={k.kathaName}
                            className="w-16 h-16 rounded-xl object-cover border border-amber-200 shrink-0"
                          />
                        )}
                        <div>
                          <div className="text-xs font-semibold text-[#C85A00]">
                            {k.dateRange} · {KATHA_STATUS_LABELS[k.status]}
                          </div>
                          <h3 className="font-bold text-[#7A1212]">{k.kathaName}</h3>
                          <p className="text-xs text-[#5C4033]">
                            {k.cityState} · आयोजक: {k.organizer}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingKathaId(k.id);
                            setKathaForm({
                              kathaName: k.kathaName,
                              dateRange: k.dateRange,
                              startDate: k.startDate,
                              timing: k.timing,
                              cityState: k.cityState,
                              venue: k.venue,
                              organizer: k.organizer,
                              status: k.status,
                              posterUrl: k.posterUrl || '',
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg border border-amber-200 bg-[#FFF9F0] text-xs font-semibold text-[#7A1212] cursor-pointer"
                        >
                          संपादित करें
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteKatha(k.id)}
                          className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: SUVICHAR, ABOUT & KATHA TYPES */}
            {activeTab === 'content' && (
              <div className="space-y-6">
                <div className="bg-white border border-amber-200 rounded-3xl p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 pb-4">
                    <h2 className="text-xl font-bold text-[#7A1212]">
                      आज का सुविचार, परिचय एवं बुकिंग सूचना
                    </h2>
                    <button
                      type="button"
                      disabled={savingConfig}
                      onClick={() => saveSiteConfig()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#F59E0B] text-white text-xs font-bold shadow-sm cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>सभी विवरण सहेजें</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#5C1A12] mb-1">
                        शीर्षक (नाम)
                      </label>
                      <input
                        type="text"
                        value={draftConfig.titleHindi}
                        onChange={(e) =>
                          setDraftConfig((p) => ({ ...p, titleHindi: e.target.value }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5C1A12] mb-1">
                        धाम / उप-शीर्षक
                      </label>
                      <input
                        type="text"
                        value={draftConfig.subtitleHindi}
                        onChange={(e) =>
                          setDraftConfig((p) => ({ ...p, subtitleHindi: e.target.value }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-[#5C1A12] mb-1">
                        आज का सुविचार / वाणी
                      </label>
                      <textarea
                        rows={2}
                        value={draftConfig.suvicharText}
                        onChange={(e) =>
                          setDraftConfig((p) => ({ ...p, suvicharText: e.target.value }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-[#5C1A12] mb-1">
                        परिचय (About Didi Ji — 2019 से यात्रा)
                      </label>
                      <textarea
                        rows={4}
                        value={draftConfig.aboutDescription}
                        onChange={(e) =>
                          setDraftConfig((p) => ({ ...p, aboutDescription: e.target.value }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-[#5C1A12] mb-1">
                        बुकिंग सूचना संदेश (3 महीने नियम)
                      </label>
                      <textarea
                        rows={2}
                        value={draftConfig.bookingNoticeText}
                        onChange={(e) =>
                          setDraftConfig((p) => ({ ...p, bookingNoticeText: e.target.value }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-[#5C1A12] mb-1">
                        आश्रम / वृन्दावन धाम पता
                      </label>
                      <input
                        type="text"
                        value={draftConfig.ashramAddress}
                        onChange={(e) =>
                          setDraftConfig((p) => ({ ...p, ashramAddress: e.target.value }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Edit 6 Katha Types */}
                <div className="bg-white border border-amber-200 rounded-3xl p-6 space-y-4">
                  <h2 className="text-xl font-bold text-[#7A1212]">6 प्रमुख कथा प्रकार संपादित करें</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {kathaTypes.map((kt) => (
                      <div
                        key={kt.id}
                        className="border border-amber-200 rounded-2xl p-4 bg-[#FFFDF9] flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="text-xs font-semibold text-[#C85A00]">{kt.durationBadge}</div>
                          <h3 className="font-bold text-[#7A1212]">{kt.title}</h3>
                          <p className="text-xs text-[#5C4033] mt-1 line-clamp-2">{kt.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingType(kt)}
                          className="w-full py-2 rounded-xl border border-amber-300 bg-white text-xs font-semibold text-[#7A1212] hover:bg-amber-50 cursor-pointer"
                        >
                          संपादित करें
                        </button>
                      </div>
                    ))}
                  </div>

                  {editingType && (
                    <form
                      onSubmit={handleSaveKathaType}
                      className="mt-4 p-5 rounded-2xl border border-[#FF6B00] bg-[#FFF8EE] space-y-3"
                    >
                      <h3 className="font-bold text-[#7A1212]">संपादन: {editingType.title}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={editingType.title}
                          onChange={(e) =>
                            setEditingType((p) => (p ? { ...p, title: e.target.value } : null))
                          }
                          placeholder="कथा नाम"
                          className="px-3.5 py-2 rounded-xl border border-amber-200 bg-white text-sm"
                        />
                        <input
                          type="text"
                          value={editingType.durationBadge}
                          onChange={(e) =>
                            setEditingType((p) =>
                              p ? { ...p, durationBadge: e.target.value } : null,
                            )
                          }
                          placeholder="अवधि (जैसे: 7 एवं 9 दिन)"
                          className="px-3.5 py-2 rounded-xl border border-amber-200 bg-white text-sm"
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={editingType.description}
                        onChange={(e) =>
                          setEditingType((p) => (p ? { ...p, description: e.target.value } : null))
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-amber-200 bg-white text-sm"
                      />
                      <ImageUploadField
                        label="कथा कार्ड फ़ोटो"
                        value={editingType.imageUrl}
                        onChange={(url) =>
                          setEditingType((p) => (p ? { ...p, imageUrl: url } : null))
                        }
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-xl bg-[#FF6B00] text-white text-xs font-bold cursor-pointer"
                        >
                          कथा प्रकार सहेजें
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingType(null)}
                          className="px-4 py-2.5 rounded-xl border border-amber-200 bg-white text-xs font-semibold cursor-pointer"
                        >
                          बंद करें
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: SHORTS & GALLERY */}
            {activeTab === 'shorts_gallery' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* YouTube Shorts Manager */}
                <div className="bg-white border border-amber-200 rounded-3xl p-6 space-y-5">
                  <h2 className="text-lg font-bold text-[#7A1212] flex items-center gap-2">
                    <Video className="w-5 h-5 text-[#FF6B00]" />
                    <span>भजन व शॉर्ट्स वीडियो जोड़ें</span>
                  </h2>
                  <form onSubmit={handleAddShort} className="space-y-3">
                    <input
                      type="text"
                      required
                      placeholder="वीडियो / भजन शीर्षक"
                      value={shortForm.title}
                      onChange={(e) => setShortForm((p) => ({ ...p, title: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="YouTube / Shorts लिंक"
                        value={shortForm.youtubeUrl}
                        onChange={(e) =>
                          setShortForm((p) => ({ ...p, youtubeUrl: e.target.value }))
                        }
                        className="w-full px-3 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                      />
                      <select
                        value={shortForm.category}
                        onChange={(e) =>
                          setShortForm((p) => ({
                            ...p,
                            category: e.target.value as ShortCategory,
                          }))
                        }
                        className="w-full px-3 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                      >
                        <option value="भजन">भजन</option>
                        <option value="प्रसंग">प्रसंग</option>
                        <option value="आरती">आरती</option>
                        <option value="कथा अंश">कथा अंश</option>
                      </select>
                    </div>
                    <ImageUploadField
                      label="कस्टम थंबनेल फ़ोटो (वैकल्पिक)"
                      value={shortForm.thumbnailUrl}
                      onChange={(url) => setShortForm((p) => ({ ...p, thumbnailUrl: url }))}
                    />
                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#F59E0B] text-white text-xs font-bold shadow-sm cursor-pointer"
                    >
                      शॉर्ट वीडियो जोड़ें
                    </button>
                  </form>

                  <div className="space-y-2 pt-2">
                    {shorts.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-amber-100 bg-[#FFFDF8]"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#C85A00]">{s.category}</div>
                          <div className="text-sm font-bold text-[#2B1810] truncate">{s.title}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteShort(s.id)}
                          className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Photo Gallery Manager with Instant Auto-Save Direct Upload */}
                <div className="bg-white border border-amber-200 rounded-3xl p-6 space-y-5">
                  <h2 className="text-lg font-bold text-[#7A1212] flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[#FF6B00]" />
                    <span>फ़ोटो गैलरी (डायरेक्ट अपलोड व ऑटो-सेव)</span>
                  </h2>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="फ़ोटो शीर्षक (जैसे: व्यास पीठ दर्शन)"
                        value={galleryForm.title}
                        onChange={(e) => setGalleryForm((p) => ({ ...p, title: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                      />
                      <input
                        type="text"
                        placeholder="स्थान (जैसे: वृन्दावन धाम)"
                        value={galleryForm.location}
                        onChange={(e) =>
                          setGalleryForm((p) => ({ ...p, location: e.target.value }))
                        }
                        className="w-full px-3 py-2.5 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm"
                      />
                    </div>
                    <ImageUploadField
                      label="गैलरी फ़ोटो अपलोड (अपलोड होते ही गैलरी में जुड़ जाएगी)"
                      value={galleryForm.imageUrl}
                      onChange={(url) => setGalleryForm((p) => ({ ...p, imageUrl: url }))}
                      onAutoSave={(url) => handleAddGallery(url)}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddGallery()}
                      className="w-full py-2.5 rounded-xl border border-amber-300 bg-[#FFF8EE] text-[#7A1212] text-xs font-bold hover:bg-amber-100 cursor-pointer"
                    >
                      लिंक से गैलरी में जोड़ें
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {gallery.map((g) => (
                      <div
                        key={g.id}
                        className="rounded-xl border border-amber-200 overflow-hidden bg-[#FFFDF8]"
                      >
                        <SafeImage
                          src={g.imageUrl}
                          alt={g.title}
                          className="w-full h-28 object-cover"
                        />
                        <div className="p-2.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#7A1212] truncate">
                              {g.title}
                            </div>
                            <div className="text-[11px] text-[#7D5A48] truncate">{g.location}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteGallery(g.id)}
                            className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
