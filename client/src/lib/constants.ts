export const MEDIA_TYPES = {
  MOVIE: 'movie',
  SERIES: 'series',
  ANIME: 'anime',
  ANIME_MOVIE: 'anime_movie',
  FOREIGN_SERIES: 'foreign_series',
  ASIAN_SERIES: 'asian_series',
} as const;

export const NOTIFICATION_TYPES = {
  NEW_EPISODE: 'new_episode',
  NEW_MOVIE: 'new_movie',
  REMINDER: 'reminder',
} as const;

export type CategoryOption = {
  key: string;
  label: string;
};

export const CATEGORY_SETS = {
  anime: [
    { key: 'anime-action', label: 'أكشن' },
    { key: 'anime-adventure', label: 'مغامرات' },
    { key: 'anime-comedy', label: 'كوميديا' },
    { key: 'anime-drama', label: 'دراما' },
    { key: 'anime-fantasy', label: 'فانتازيا' },
    { key: 'anime-horror', label: 'رعب' },
    { key: 'anime-mystery', label: 'غموض' },
    { key: 'anime-psychological', label: 'نفسي' },
    { key: 'anime-romance', label: 'رومانسي' },
    { key: 'anime-sci-fi', label: 'خيال علمي' },
    { key: 'anime-slice-of-life', label: 'شريحة من الحياة' },
    { key: 'anime-sports', label: 'رياضة' },
    { key: 'anime-supernatural', label: 'خارق للطبيعة' },
    { key: 'anime-thriller', label: 'إثارة' },
    { key: 'anime-historical', label: 'تاريخي' },
    { key: 'anime-mecha', label: 'ميكا' },
    { key: 'anime-martial-arts', label: 'فنون قتالية' },
    { key: 'anime-superpower', label: 'قوى خارقة' },
    { key: 'anime-isekai', label: 'إيسيكاي' }
  ] as CategoryOption[],
  foreign: [
    { key: 'foreign-action', label: 'أكشن' },
    { key: 'foreign-adventure', label: 'مغامرات' },
    { key: 'foreign-comedy', label: 'كوميديا' },
    { key: 'foreign-drama', label: 'دراما' },
    { key: 'foreign-fantasy', label: 'فانتازيا' },
    { key: 'foreign-horror', label: 'رعب' },
    { key: 'foreign-mystery', label: 'غموض' },
    { key: 'foreign-psychological', label: 'نفسي' },
    { key: 'foreign-romance', label: 'رومانسي' },
    { key: 'foreign-sci-fi', label: 'خيال علمي' },
    { key: 'foreign-slice-of-life', label: 'شريحة من الحياة' },
    { key: 'foreign-sports', label: 'رياضة' },
    { key: 'foreign-supernatural', label: 'خارق للطبيعة' },
    { key: 'foreign-thriller', label: 'إثارة' },
    { key: 'foreign-historical', label: 'تاريخي' },
    { key: 'foreign-crime', label: 'جريمة' },
    { key: 'foreign-documentary', label: 'وثائقي' },
    { key: 'foreign-war', label: 'حرب' },
    { key: 'foreign-politics', label: 'سياسة' }
  ] as CategoryOption[]
} as const;

export const TYPE_TO_CATEGORY_SET = {
  [MEDIA_TYPES.ANIME]: 'anime',
  [MEDIA_TYPES.ANIME_MOVIE]: 'anime', 
  [MEDIA_TYPES.MOVIE]: 'foreign',
  [MEDIA_TYPES.SERIES]: 'foreign',
  [MEDIA_TYPES.FOREIGN_SERIES]: 'foreign',
  [MEDIA_TYPES.ASIAN_SERIES]: 'foreign'
} as const;

export function getCategoriesForType(mediaType: string): CategoryOption[] {
  const categorySetKey = TYPE_TO_CATEGORY_SET[mediaType as keyof typeof TYPE_TO_CATEGORY_SET];
  return categorySetKey ? CATEGORY_SETS[categorySetKey] : [];
}

export const YEARS = Array.from(
  { length: 20 }, 
  (_, i) => new Date().getFullYear() - i
);

export const DEFAULT_POSTER = "https://images.unsplash.com/photo-1489599184444-c4b8c44b2b6a?w=300&h=450&fit=crop";
export const DEFAULT_BACKDROP = "https://images.unsplash.com/photo-1489599184444-c4b8c44b2b6a?w=1920&h=1080&fit=crop";
