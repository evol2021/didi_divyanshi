import { useEffect, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Calendar, CheckCircle2, Info, MessageCircle, PhoneCall, Send } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type { BookingType, KathaType, SiteConfig } from '../types';

interface BookingSectionProps {
  siteConfig: SiteConfig;
  kathaTypes: KathaType[];
  selectedKathaTitle?: string;
}

const DURATION_OPTIONS = ['3 दिन', '5 दिन', '7 दिन', '9 दिन', 'कस्टम / अन्य (Custom Days)'];

export function BookingSection({
  siteConfig,
  kathaTypes,
  selectedKathaTitle,
}: BookingSectionProps) {
  const [yajmanName, setYajmanName] = useState('');
  const [phone, setPhone] = useState('');
  const [cityState, setCityState] = useState('');
  const [kathaType, setKathaType] = useState(
    selectedKathaTitle || kathaTypes[0]?.title || 'श्रीमद् भागवत कथा',
  );
  const [durationDays, setDurationDays] = useState('7 दिन');
  const [customDays, setCustomDays] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [bookingType, setBookingType] = useState<BookingType>('normal');
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [submittedRef, setSubmittedRef] = useState<{
    id: string;
    whatsappUrl: string;
    summary: string;
  } | null>(null);

  useEffect(() => {
    if (selectedKathaTitle) {
      setKathaType(selectedKathaTitle);
    }
  }, [selectedKathaTitle]);

  const isCustomDuration = durationDays.includes('Custom');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = yajmanName.trim();
    const cleanPhone = phone.trim();
    const cleanCity = cityState.trim();

    if (cleanName.length < 2) {
      setFormError('कृपया यजमान का सही नाम दर्ज करें।');
      return;
    }
    if (!/^[+0-9\s-]{8,20}$/.test(cleanPhone)) {
      setFormError('कृपया वैध मोबाइल / व्हाट्सएप नंबर दर्ज करें (जैसे +91 9876543210)।');
      return;
    }
    if (cleanCity.length < 2) {
      setFormError('कृपया कथा स्थल (शहर व राज्य) का नाम दर्ज करें।');
      return;
    }
    if (isCustomDuration && customDays.trim().length < 1) {
      setFormError('कृपया कस्टम दिनों की संख्या लिखें।');
      return;
    }

    const finalDuration = isCustomDuration ? `${customDays.trim()} दिन (कस्टम)` : durationDays;

    setSubmitting(true);
    try {
      const bookingPayload = {
        yajmanName: cleanName.slice(0, 120),
        phone: cleanPhone.slice(0, 20),
        cityState: cleanCity.slice(0, 200),
        kathaType: kathaType.slice(0, 120),
        durationDays: durationDays.slice(0, 40),
        customDays: (isCustomDuration ? customDays.trim() : '').slice(0, 40),
        preferredDate: preferredDate.trim().slice(0, 80),
        bookingType,
        message: message.trim().slice(0, 1000),
        status: 'pending' as const,
        adminNotes: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      let docId = 'WA-' + Date.now().toString().slice(-6);
      try {
        const docRef = await addDoc(collection(db, 'bookings'), bookingPayload);
        docId = docRef.id;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'bookings');
      }

      const bookingTypeLabel =
        bookingType === 'urgent' ? 'अर्जेंट बुकिंग (Urgent)' : 'सामान्य बुकिंग (3+ महीने बाद)';

      const waLines = [
        '🙏 *राधे-राधे! नया कथा बुकिंग अनुरोध*',
        `📌 *संदर्भ ID:* ${docId}`,
        `👤 *यजमान का नाम:* ${cleanName}`,
        `📞 *मोबाइल / WhatsApp:* ${cleanPhone}`,
        `📍 *शहर व कथा स्थल:* ${cleanCity}`,
        `📖 *कथा का प्रकार:* ${kathaType}`,
        `🗓️ *कथा अवधि:* ${finalDuration}`,
        `📅 *संभावित महीना / तारीख:* ${preferredDate.trim() || 'चर्चा अनुसार'}`,
        `⚡ *बुकिंग श्रेणी:* ${bookingTypeLabel}`,
        message.trim() ? `💬 *संदेश:* ${message.trim()}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const waNumber = siteConfig.whatsappNumber || '917905580153';
      const whatsappUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waLines)}`;

      setSubmittedRef({
        id: docId,
        whatsappUrl,
        summary: waLines,
      });

      setYajmanName('');
      setPhone('');
      setCityState('');
      setPreferredDate('');
      setCustomDays('');
      setMessage('');
    } catch (err) {
      setFormError(
        err instanceof Error
          ? 'बुकिंग सहेजने में समस्या आई। कृपया पुनः प्रयास करें या सीधे कॉल करें।'
          : 'अज्ञात त्रुटि हुई।',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="booking" className="py-16 md:py-24 bg-gradient-to-b from-[#FFFDF9] to-[#FFF6EA]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs font-semibold tracking-wider text-[#C85A00] mb-2">
            पावन कथा आयोजन हेतु निवेदन
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-[#7A1212] mb-3">
            कथा बुकिंग फॉर्म
          </h2>
          <p className="text-sm md:text-base text-[#5C4033]">
            अपने नगर, मंदिर अथवा निवास स्थान पर पावन कथा आयोजन हेतु विवरण भरें।
          </p>
        </div>

        {/* Prominent Notice Box (Hairline border, no thick left border) */}
        <div className="mb-8 rounded-2xl border border-amber-300 bg-gradient-to-r from-[#FFF5E4] via-[#FFF9F0] to-[#FFF2DB] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/15 text-[#D95300] flex items-center justify-center shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="flex-1 text-sm text-[#4A2511] leading-relaxed">
            {siteConfig.bookingNoticeText}
          </div>
          <a
            href={`tel:${siteConfig.phoneDisplay.replace(/\s+/g, '')}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-amber-300 text-[#7A1212] text-xs font-semibold hover:bg-amber-50 transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            <PhoneCall className="w-4 h-4 text-[#FF6B00]" />
            <span>{siteConfig.phoneDisplay}</span>
          </a>
        </div>

        <div className="bg-white rounded-3xl border border-amber-200/90 shadow-[0_12px_40px_-15px_rgba(180,83,9,0.12)] p-6 sm:p-10">
          {submittedRef ? (
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-[#7A1212]">
                  राधे-राधे! आपका बुकिंग अनुरोध सुरक्षित हो गया है
                </h3>
                <p className="text-sm text-[#5C4033]">
                  संदर्भ संख्या: <span className="font-mono-tabular font-semibold text-[#7A1212]">{submittedRef.id}</span>
                </p>
                <p className="text-sm text-[#5C4033] max-w-lg mx-auto">
                  शीघ्र संपर्क के लिए नीचे दिए गए बटन से यही विवरण सीधे हमारे आधिकारिक WhatsApp नंबर पर भेजें।
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <a
                  href={submittedRef.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#16A34A] to-[#15803D] text-white font-semibold text-sm shadow-md shadow-emerald-600/20 hover:brightness-105 active:scale-[0.98] transition-all"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>WhatsApp पर संदेश भेजें</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSubmittedRef(null)}
                  className="px-6 py-3.5 rounded-2xl border border-amber-300 bg-[#FFFDF9] text-[#7A1212] font-semibold text-sm hover:bg-amber-50 transition-colors cursor-pointer"
                >
                  नया अनुरोध भरें
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {formError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-[#4A2511] mb-1.5">
                    यजमान का नाम <span className="text-[#FF6B00]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={yajmanName}
                    onChange={(e) => setYajmanName(e.target.value)}
                    placeholder="जैसे: श्री रमेश चंद्र शर्मा"
                    className="w-full px-4 py-3 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm text-[#2B1810] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#4A2511] mb-1.5">
                    मोबाइल / व्हाट्सएप नंबर <span className="text-[#FF6B00]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={20}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm text-[#2B1810] font-mono-tabular focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#4A2511] mb-1.5">
                    शहर व राज्य / कथा स्थल <span className="text-[#FF6B00]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={cityState}
                    onChange={(e) => setCityState(e.target.value)}
                    placeholder="जैसे: आगरा, उत्तर प्रदेश"
                    className="w-full px-4 py-3 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm text-[#2B1810] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#4A2511] mb-1.5">
                    कथा का प्रकार
                  </label>
                  <select
                    value={kathaType}
                    onChange={(e) => setKathaType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm text-[#2B1810] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
                  >
                    {kathaTypes.map((kt) => (
                      <option key={kt.id} value={kt.title}>
                        {kt.title} ({kt.durationBadge})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#4A2511] mb-1.5">
                    कथा अवधि (दिनों की संख्या)
                  </label>
                  <select
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm text-[#2B1810] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
                  >
                    {DURATION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {isCustomDuration ? (
                  <div>
                    <label className="block text-sm font-semibold text-[#4A2511] mb-1.5">
                      कस्टम दिनों की संख्या लिखें <span className="text-[#FF6B00]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={40}
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      placeholder="जैसे: 11 दिन या 1 दिन भजन संध्या"
                      className="w-full px-4 py-3 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm text-[#2B1810] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-[#4A2511] mb-1.5">
                      संभावित महीना / तारीख
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-[#C85A00] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        maxLength={80}
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        placeholder="जैसे: मार्च 2027 (प्रथम सप्ताह)"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm text-[#2B1810] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
                      />
                    </div>
                  </div>
                )}

                {isCustomDuration && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-[#4A2511] mb-1.5">
                      संभावित महीना / तारीख
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-[#C85A00] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        maxLength={80}
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        placeholder="जैसे: मार्च 2027 (प्रथम सप्ताह)"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm text-[#2B1810] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#4A2511] mb-2">
                  बुकिंग का प्रकार
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBookingType('normal')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      bookingType === 'normal'
                        ? 'border-[#FF6B00] bg-[#FFF5E8] text-[#7A1212] ring-2 ring-[#FF6B00]/20'
                        : 'border-amber-200 bg-[#FFFDF9] text-[#5C4033] hover:bg-amber-50/50'
                    }`}
                  >
                    <div className="font-semibold text-sm">सामान्य बुकिंग (3+ महीने बाद)</div>
                    <div className="text-xs opacity-80 mt-0.5">नियमित कथा कार्यक्रम आयोजन हेतु</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingType('urgent')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      bookingType === 'urgent'
                        ? 'border-[#7A1212] bg-[#FFF1F0] text-[#7A1212] ring-2 ring-[#7A1212]/15'
                        : 'border-amber-200 bg-[#FFFDF9] text-[#5C4033] hover:bg-amber-50/50'
                    }`}
                  >
                    <div className="font-semibold text-sm">अर्जेंट बुकिंग (Urgent)</div>
                    <div className="text-xs opacity-80 mt-0.5">शीघ्र या विशेष तिथि पर आयोजन हेतु</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#4A2511] mb-1.5">
                  अन्य संदेश या विशेष निवेदन
                </label>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="आयोजन समिति, पंडाल व्यवस्था या अन्य कोई जानकारी लिखें..."
                  className="w-full px-4 py-3 rounded-xl border border-amber-200 bg-[#FFFDF9] text-sm text-[#2B1810] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-[#7D5A48]">
                  सबमिट करते ही आपका अनुरोध सुरक्षित डेटाबेस में दर्ज हो जाएगा और WhatsApp लिंक प्राप्त होगा।
                </p>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#FF6B00] via-[#F97316] to-[#EAB308] text-white font-bold text-sm shadow-[0_10px_25px_-6px_rgba(255,107,0,0.45)] hover:shadow-[0_14px_30px_-6px_rgba(255,107,0,0.55)] hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'अनुरोध भेजा जा रहा है...' : 'बुकिंग अनुरोध भेजें'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
