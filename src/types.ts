export interface SiteConfig {
  titleHindi: string;
  subtitleHindi: string;
  locationHindi: string;
  sinceYear: string;
  taglineHindi: string;
  aboutTitle: string;
  aboutDescription: string;
  heroImageUrl: string;
  aboutImageUrl: string;
  channelBannerUrl: string;
  logoImageUrl: string;
  phoneDisplay: string;
  whatsappNumber: string;
  youtubeChannelUrl: string;
  youtubeHandle: string;
  youtubeSubscriberText: string;
  facebookPageUrl: string;
  instagramUrl: string;
  liveVideoUrl: string;
  liveVideoTitle: string;
  isLiveNow: boolean;
  suvicharText: string;
  suvicharAuthor: string;
  bookingNoticeText: string;
  ashramAddress: string;
  updatedAt?: unknown;
}

export type KathaStatus = 'upcoming' | 'live' | 'completed';

export interface UpcomingKatha {
  id: string;
  kathaName: string;
  dateRange: string;
  startDate: string;
  timing: string;
  cityState: string;
  venue: string;
  organizer: string;
  status: KathaStatus;
  posterUrl: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface KathaType {
  id: string;
  title: string;
  englishTitle: string;
  durationBadge: string;
  description: string;
  imageUrl: string;
  order: number;
  updatedAt?: unknown;
}

export type ShortCategory = 'भजन' | 'प्रसंग' | 'आरती' | 'कथा अंश';

export interface ShortClip {
  id: string;
  title: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  category: ShortCategory;
  order: number;
  createdAt?: unknown;
}

export interface GalleryPhoto {
  id: string;
  title: string;
  location: string;
  imageUrl: string;
  order: number;
  createdAt?: unknown;
}

export type BookingType = 'normal' | 'urgent';
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface KathaBooking {
  id: string;
  yajmanName: string;
  phone: string;
  cityState: string;
  kathaType: string;
  durationDays: string;
  customDays: string;
  preferredDate: string;
  bookingType: BookingType;
  message: string;
  status: BookingStatus;
  adminNotes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}
