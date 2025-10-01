import { z } from "zod";

export const serverSchema = z.object({
  name: z.string(),
  url: z.string().url(),
});

export const episodeSchema = z.object({
  number: z.number(),
  title: z.string(),
  servers: z.array(serverSchema),
});

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  createdAt: z.date(),
});

export const insertUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().optional(),
  avatarUrl: z.string().nullable().optional(),
});

export const mediaSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  descriptionAr: z.string().nullable().optional(),
  poster: z.string(),
  backdrop: z.string().nullable().optional(),
  type: z.string(),
  genre: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  year: z.string(),
  rating: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  watchUrl: z.string().nullable().optional(),
  servers: z.array(serverSchema).nullable().optional(),
  episodes: z.array(z.any()).nullable().optional(),
  episodeCount: z.number().nullable().optional(),
  seasons: z.number().nullable().optional(),
  trailerUrl: z.string().nullable().optional(),
  isNew: z.boolean().optional().default(false),
  isTrending: z.boolean().optional().default(false),
  isPopular: z.boolean().optional().default(false),
  isFeatured: z.boolean().optional().default(false),
  createdAt: z.date(),
});

export const insertMediaSchema = z.object({
  title: z.string(),
  description: z.string().nullable().optional(),
  descriptionAr: z.string().nullable().optional(),
  poster: z.string(),
  backdrop: z.string().nullable().optional(),
  type: z.string(),
  genre: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  year: z.string(),
  rating: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  watchUrl: z.string().nullable().optional(),
  servers: z.array(serverSchema).nullable().optional(),
  episodes: z.array(z.any()).nullable().optional(),
  episodeCount: z.number().nullable().optional(),
  seasons: z.number().nullable().optional(),
  trailerUrl: z.string().nullable().optional(),
  isNew: z.boolean().optional().default(false),
  isTrending: z.boolean().optional().default(false),
  isPopular: z.boolean().optional().default(false),
  isFeatured: z.boolean().optional().default(false),
});

export const watchHistorySchema = z.object({
  id: z.string(),
  userId: z.string(),
  mediaId: z.string(),
  progress: z.number().default(0),
  currentEpisode: z.number().default(1),
  currentSeason: z.number().default(1),
  watchedAt: z.date(),
});

export const insertWatchHistorySchema = z.object({
  userId: z.string(),
  mediaId: z.string(),
  progress: z.number().optional().default(0),
  currentEpisode: z.number().optional().default(1),
  currentSeason: z.number().optional().default(1),
});

export const favoriteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  mediaId: z.string(),
  addedAt: z.date(),
});

export const insertFavoriteSchema = z.object({
  userId: z.string(),
  mediaId: z.string(),
});

export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  message: z.string(),
  type: z.string(),
  isRead: z.boolean().default(false),
  mediaId: z.string().nullable().optional(),
  createdAt: z.date(),
});

export const insertNotificationSchema = z.object({
  userId: z.string(),
  title: z.string(),
  message: z.string(),
  type: z.string(),
  isRead: z.boolean().optional().default(false),
  mediaId: z.string().nullable().optional(),
});

export const externalMediaSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  title: z.string(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  poster: z.string(),
  backdrop: z.string().optional(),
  type: z.string(),
  genre: z.string().optional(),
  category: z.string().optional(),
  year: z.union([z.string(), z.number()]).transform(String),
  rating: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  watchUrl: z.string().optional().nullable(),
  servers: z.array(serverSchema).optional().nullable(),
  episodes: z.array(z.any()).optional().nullable(),
  episodeCount: z.number().optional(),
  seasons: z.number().optional(),
  trailerUrl: z.string().optional().nullable(),
  isNew: z.boolean().optional().default(false),
  isTrending: z.boolean().optional().default(false),
  isPopular: z.boolean().optional().default(false),
  isFeatured: z.boolean().optional().default(false),
});

export function transformExternalMedia(externalMedia: any): InsertMedia {
  const validated = externalMediaSchema.parse(externalMedia);
  
  return {
    title: validated.title,
    description: validated.description || null,
    descriptionAr: validated.descriptionAr || validated.description || null,
    poster: validated.poster,
    backdrop: validated.backdrop || null,
    type: validated.type,
    genre: validated.genre || null,
    category: validated.category || null,
    year: validated.year,
    rating: validated.rating || null,
    duration: validated.duration || null,
    watchUrl: validated.watchUrl === "" ? null : validated.watchUrl || null,
    servers: validated.servers || null,
    episodes: validated.episodes || null,
    episodeCount: validated.episodeCount || null,
    seasons: validated.seasons || null,
    trailerUrl: validated.trailerUrl === "" ? null : validated.trailerUrl || null,
    isNew: validated.isNew,
    isTrending: validated.isTrending,
    isPopular: validated.isPopular,
    isFeatured: validated.isFeatured,
  };
}

export type Server = z.infer<typeof serverSchema>;
export type Episode = z.infer<typeof episodeSchema>;
export type ExternalMedia = z.infer<typeof externalMediaSchema>;

export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Media = z.infer<typeof mediaSchema>;
export type InsertMedia = z.infer<typeof insertMediaSchema>;

export type WatchHistory = z.infer<typeof watchHistorySchema>;
export type InsertWatchHistory = z.infer<typeof insertWatchHistorySchema>;

export type Favorite = z.infer<typeof favoriteSchema>;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;

export type Notification = z.infer<typeof notificationSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
