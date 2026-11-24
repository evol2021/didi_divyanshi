import { useRef, useState } from 'react';
import { Check, Copy, Link2, Loader2, Upload } from 'lucide-react';
import { auth } from '../firebase';
import { SafeImage } from './SafeImage';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (newUrl: string) => void;
  onAutoSave?: (newUrl: string) => Promise<void>;
  helperText?: string;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('फ़ाइल पढ़ने में समस्या आई।'));
    reader.readAsDataURL(file);
  });
}

export function ImageUploadField({
  label,
  value,
  onChange,
  onAutoSave,
  helperText,
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setStatusMsg('');

    if (!file.type.startsWith('image/')) {
      setErrorMsg('कृपया केवल JPG, PNG या WEBP इमेज चुनें।');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('फ़ोटो का आकार 8MB से कम होना चाहिए।');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setErrorMsg('अपलोड करने के लिए एडमिन लॉगिन आवश्यक है।');
      return;
    }

    setUploading(true);
    try {
      const idToken = await user.getIdToken();
      const dataUrl = await readFileAsDataUrl(file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          dataUrl,
          filename: file.name,
        }),
      });

      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || 'फ़ोटो अपलोड असफल रहा।');
      }

      const generatedUrl = payload.url;
      onChange(generatedUrl);

      if (onAutoSave) {
        await onAutoSave(generatedUrl);
        setStatusMsg('फ़ोटो अपलोड हुई और लिंक ऑटो-सेव हो गया!');
      } else {
        setStatusMsg('फ़ोटो अपलोड होकर लिंक तैयार है!');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'अपलोड में त्रुटि हुई।');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCopy = async () => {
    if (!value) return;
    try {
      const fullLink = value.startsWith('/') ? `${window.location.origin}${value}` : value;
      await navigator.clipboard.writeText(fullLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200/80 bg-[#FFFDF8] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-semibold text-[#5C1A12]">{label}</label>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#F59E0B] text-white text-xs font-semibold shadow-sm hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer whitespace-nowrap"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>अपलोड हो रहा है...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>फ़ोटो अपलोड करें (Auto Link)</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="w-24 h-20 rounded-xl overflow-hidden border border-amber-200 bg-white shrink-0">
          <SafeImage src={value} alt={label} className="w-full h-full object-cover" />
        </div>

        <div className="flex-1 w-full space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Link2 className="w-4 h-4 text-amber-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="https://... या ऊपर से डायरेक्ट अपलोड करें"
                className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-white border border-amber-200 rounded-xl text-[#2B1810] focus:outline-none focus:ring-2 focus:ring-[#FF7722]/30 focus:border-[#FF7722]"
              />
            </div>
            {value && (
              <button
                type="button"
                onClick={handleCopy}
                title="लिंक कॉपी करें"
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs font-medium text-[#7A1212] hover:bg-amber-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'कॉपी हुआ' : 'कॉपी'}</span>
              </button>
            )}
          </div>

          {helperText && <p className="text-xs text-[#7D5A48]">{helperText}</p>}
          {statusMsg && (
            <p className="text-xs font-medium text-emerald-700 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>{statusMsg}</span>
            </p>
          )}
          {errorMsg && <p className="text-xs font-medium text-red-600">{errorMsg}</p>}
        </div>
      </div>
    </div>
  );
}
