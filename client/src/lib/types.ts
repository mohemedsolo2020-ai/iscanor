export type MediaType = 'movie' | 'series' | 'anime' | 'anime_movie' | 'korean_series' | 'foreign_series' | 'asian_series' | 'documentary';

export interface MediaFilters {
  type?: MediaType;
  year?: number;
  category?: string;
  search?: string;
}

export interface WatchProgress {
  mediaId: string;
  progress: number;
  currentEpisode?: number;
  currentSeason?: number;
  totalEpisodes?: number;
  totalSeasons?: number;
}

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'new_episode' | 'new_movie' | 'reminder';
  isRead: boolean;
  mediaId?: string;
  createdAt: Date;
}

export interface ProfileData {
  id: string;
  name: string;
  email: string;
  age?: number;
  avatarUrl?: string;
}
