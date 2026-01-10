import { z } from 'zod';

export type FunnelStage = 'top' | 'bottom';

export type FacebookTopEventType =
  | 'ad.view'
  | 'page.like'
  | 'comment'
  | 'video.view';
export type FacebookBottomEventType =
  | 'ad.click'
  | 'form.submission'
  | 'checkout.complete';
export type FacebookEventType = FacebookTopEventType | FacebookBottomEventType;

export interface FacebookUserLocation {
  country: string;
  city: string;
}

export interface FacebookUser {
  userId: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'non-binary';
  location: FacebookUserLocation;
}

export interface FacebookEngagementTop {
  actionTime: string;
  referrer: 'newsfeed' | 'marketplace' | 'groups';
  videoId: string | null;
}

export interface FacebookEngagementBottom {
  adId: string;
  campaignId: string;
  clickPosition: 'top_left' | 'bottom_right' | 'center';
  device: 'mobile' | 'desktop';
  browser: 'Chrome' | 'Firefox' | 'Safari';
  purchaseAmount: string | null;
}

export type FacebookEngagement = FacebookEngagementTop | FacebookEngagementBottom;

export interface FacebookEvent {
  eventId: string;
  timestamp: string;
  source: 'facebook';
  funnelStage: FunnelStage;
  eventType: FacebookEventType;
  data: {
    user: FacebookUser;
    engagement: FacebookEngagement;
  };
}

export type TiktokTopEventType = 'video.view' | 'like' | 'share' | 'comment';
export type TiktokBottomEventType = 'profile.visit' | 'purchase' | 'follow';
export type TiktokEventType = TiktokTopEventType | TiktokBottomEventType;

export interface TiktokUser {
  userId: string;
  username: string;
  followers: number;
}

export interface TiktokEngagementTop {
  watchTime: number;
  percentageWatched: number;
  device: 'Android' | 'iOS' | 'Desktop';
  country: string;
  videoId: string;
}

export interface TiktokEngagementBottom {
  actionTime: string;
  profileId: string | null;
  purchasedItem: string | null;
  purchaseAmount: string | null;
}

export type TiktokEngagement = TiktokEngagementTop | TiktokEngagementBottom;

export interface TiktokEvent {
  eventId: string;
  timestamp: string;
  source: 'tiktok';
  funnelStage: FunnelStage;
  eventType: TiktokEventType;
  data: {
    user: TiktokUser;
    engagement: TiktokEngagement;
  };
}

export type Event = FacebookEvent | TiktokEvent;

export const facebookTopEventTypeSchema = z.enum([
  'ad.view',
  'page.like',
  'comment',
  'video.view',
]);
export const facebookBottomEventTypeSchema = z.enum([
  'ad.click',
  'form.submission',
  'checkout.complete',
]);
export const facebookUserSchema = z.object({
  userId: z.string(),
  name: z.string(),
  age: z.number(),
  gender: z.enum(['male', 'female', 'non-binary']),
  location: z.object({
    country: z.string(),
    city: z.string(),
  }),
});
export const facebookEngagementTopSchema = z.object({
  actionTime: z.string(),
  referrer: z.enum(['newsfeed', 'marketplace', 'groups']),
  videoId: z.string().nullable(),
});
export const facebookEngagementBottomSchema = z.object({
  adId: z.string(),
  campaignId: z.string(),
  clickPosition: z.enum(['top_left', 'bottom_right', 'center']),
  device: z.enum(['mobile', 'desktop']),
  browser: z.enum(['Chrome', 'Firefox', 'Safari']),
  purchaseAmount: z.string().nullable(),
});

export const tiktokTopEventTypeSchema = z.enum([
  'video.view',
  'like',
  'share',
  'comment',
]);
export const tiktokBottomEventTypeSchema = z.enum([
  'profile.visit',
  'purchase',
  'follow',
]);
export const tiktokUserSchema = z.object({
  userId: z.string(),
  username: z.string(),
  followers: z.number(),
});
export const tiktokEngagementTopSchema = z.object({
  watchTime: z.number(),
  percentageWatched: z.number(),
  device: z.enum(['Android', 'iOS', 'Desktop']),
  country: z.string(),
  videoId: z.string(),
});
export const tiktokEngagementBottomSchema = z.object({
  actionTime: z.string(),
  profileId: z.string().nullable(),
  purchasedItem: z.string().nullable(),
  purchaseAmount: z.string().nullable(),
});

const baseEventSchema = {
  eventId: z.string(),
  timestamp: z.string(),
};

const facebookTopEventSchema = z.object({
  ...baseEventSchema,
  source: z.literal('facebook'),
  funnelStage: z.literal('top'),
  eventType: facebookTopEventTypeSchema,
  data: z.object({
    user: facebookUserSchema,
    engagement: facebookEngagementTopSchema,
  }),
});

const facebookBottomEventSchema = z.object({
  ...baseEventSchema,
  source: z.literal('facebook'),
  funnelStage: z.literal('bottom'),
  eventType: facebookBottomEventTypeSchema,
  data: z.object({
    user: facebookUserSchema,
    engagement: facebookEngagementBottomSchema,
  }),
});

const tiktokTopEventSchema = z.object({
  ...baseEventSchema,
  source: z.literal('tiktok'),
  funnelStage: z.literal('top'),
  eventType: tiktokTopEventTypeSchema,
  data: z.object({
    user: tiktokUserSchema,
    engagement: tiktokEngagementTopSchema,
  }),
});

const tiktokBottomEventSchema = z.object({
  ...baseEventSchema,
  source: z.literal('tiktok'),
  funnelStage: z.literal('bottom'),
  eventType: tiktokBottomEventTypeSchema,
  data: z.object({
    user: tiktokUserSchema,
    engagement: tiktokEngagementBottomSchema,
  }),
});

export const eventSchema: z.ZodType<Event> = z.union([
  facebookTopEventSchema,
  facebookBottomEventSchema,
  tiktokTopEventSchema,
  tiktokBottomEventSchema,
]) as z.ZodType<Event>;
