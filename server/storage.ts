import {
  type User,
  type InsertUser,
  type Media,
  type InsertMedia,
  type WatchHistory,
  type InsertWatchHistory,
  type Favorite,
  type InsertFavorite,
  type Notification,
  type InsertNotification,
  type Episode,
  transformExternalMedia,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(
    id: string,
    updates: Partial<InsertUser>,
  ): Promise<User | undefined>;

  // Media - Legacy methods (maintained for backward compatibility)
  getAllMedia(filters?: {
    type?: string;
    year?: number;
    category?: string;
  }): Promise<Media[]>;
  getMediaById(id: string): Promise<Media | undefined>;
  getTrendingMedia(): Promise<Media[]>;
  getNewReleases(): Promise<Media[]>;
  searchMedia(query: string, limit?: number): Promise<Media[]>;
  createMedia(media: InsertMedia): Promise<Media>;
  getEpisodeById(
    seriesId: string,
    episodeNumber: number,
  ): Promise<{ episode: Episode; series: Media } | null>;
  getRecommendations(mediaId: string): Promise<Media[]>;

  // Movies - Separate storage methods
  getAllMovies(filters?: {
    year?: number;
    category?: string;
  }): Promise<Media[]>;
  getMovieById(id: string): Promise<Media | undefined>;
  getTrendingMovies(): Promise<Media[]>;
  getNewMovies(): Promise<Media[]>;
  searchMovies(query: string, limit?: number): Promise<Media[]>;

  // Series - Separate storage methods  
  getAllSeries(filters?: {
    year?: number;
    category?: string;
    seriesType?: string; // anime, korean_series, etc.
  }): Promise<Media[]>;
  getSeriesById(id: string): Promise<Media | undefined>;
  getTrendingSeries(): Promise<Media[]>;
  getNewSeries(): Promise<Media[]>;
  searchSeries(query: string, limit?: number): Promise<Media[]>;

  // Other Media - Separate storage methods
  getAllOtherMedia(filters?: {
    type?: string;
    year?: number;
    category?: string;
  }): Promise<Media[]>;
  getTrendingOtherMedia(): Promise<Media[]>;
  getNewOtherMedia(): Promise<Media[]>;
  searchOtherMedia(query: string, limit?: number): Promise<Media[]>;

  // Watch History
  getWatchHistory(userId: string): Promise<(WatchHistory & { media: Media })[]>;
  getWatchHistoryByMedia(
    userId: string,
    mediaId: string,
  ): Promise<WatchHistory | undefined>;
  updateWatchHistory(history: InsertWatchHistory): Promise<WatchHistory>;
  getContinueWatching(
    userId: string,
  ): Promise<(WatchHistory & { media: Media })[]>;

  // Favorites
  getFavorites(userId: string): Promise<(Favorite & { media: Media })[]>;
  addToFavorites(favorite: InsertFavorite): Promise<Favorite>;
  removeFromFavorites(userId: string, mediaId: string): Promise<boolean>;
  isFavorite(userId: string, mediaId: string): Promise<boolean>;

  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<boolean>;
  getUnreadNotificationCount(userId: string): Promise<number>;

  // JSON Import/Export
  importMediaFromJSON(
    jsonData: any[],
  ): Promise<{ success: number; failed: number; errors: string[] }>;
  exportAllMediaToJSON(): Promise<any[]>;
  bulkCreateMedia(mediaList: InsertMedia[]): Promise<Media[]>;

  // Years
  getYearsWithCounts(type?: string): Promise<{ year: string; count: number }[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  // Separated media storage by type
  private movies: Map<string, Media> = new Map();
  private series: Map<string, Media> = new Map();
  private anime: Map<string, Media> = new Map();
  private otherMedia: Map<string, Media> = new Map();
  // Legacy media map (for backward compatibility - combines all types)
  private media: Map<string, Media> = new Map();
  private watchHistory: Map<string, WatchHistory> = new Map();
  private favorites: Map<string, Favorite> = new Map();
  private notifications: Map<string, Notification> = new Map();

  // Detect if running in serverless environment (Netlify Functions)
  private readonly isServerless = !!(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);

  // File paths for separated data storage
  private readonly dataDir = (() => {
    // Try multiple possible data directories
    const possibleDirs = [
      // Local development paths
      join(process.cwd(), 'server', 'data'),
      join('.', 'server', 'data'),
      // Netlify Functions paths - data is copied relative to the function
      join(process.cwd(), 'server', 'data'),
      '/var/task/server/data', // Lambda/Netlify absolute path
    ];
    
    // Add ES module path if available (for local development)
    if (typeof import.meta.dirname !== 'undefined') {
      possibleDirs.push(join(import.meta.dirname, '..', 'server', 'data'));
    }
    
    // Log environment info for debugging
    console.log(`🔍 Running in ${this.isServerless ? 'SERVERLESS' : 'LOCAL'} mode`);
    console.log(`📂 Current directory: ${process.cwd()}`);
    
    // Return the first directory that exists
    for (const dir of possibleDirs) {
      if (existsSync(dir)) {
        console.log(`✅ Using data directory: ${dir}`);
        // List files in directory for debugging (in development only)
        if (!this.isServerless) {
          try {
            const { readdirSync } = require('fs');
            const files = readdirSync(dir);
            console.log(`📄 Found ${files.length} files in data directory`);
          } catch (e) {
            // Silently skip listing in case of errors
          }
        }
        return dir;
      }
    }
    
    // Fallback to first path with warning
    console.warn(`⚠️  Warning: Data directory not found, using fallback: ${possibleDirs[0]}`);
    console.warn(`⚠️  Searched paths:`, possibleDirs);
    return possibleDirs[0];
  })();
  private readonly moviesFilePath = join(this.dataDir, 'movies.json');
  private readonly seriesFilePath = join(this.dataDir, 'series.json');
  private readonly animeFilePath = join(this.dataDir, 'anime.json');
  private readonly asianFilePath = join(this.dataDir, 'asian.json');
  private readonly otherMediaFilePath = join(this.dataDir, 'other-media.json');

  constructor() {
    if (this.isServerless) {
      console.log('🚀 تشغيل في بيئة Netlify Serverless - البيانات للقراءة فقط');
    }
    this.loadDataFromFiles();
  }

  // Helper method to fix common JSON errors
  private fixJSONString(jsonStr: string): string {
    try {
      // Remove trailing commas before closing brackets
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
      
      // Remove extra brackets and commas at the beginning
      jsonStr = jsonStr.replace(/^[},\s]+/, '');
      
      // Ensure the JSON starts with [
      if (!jsonStr.trim().startsWith('[')) {
        jsonStr = '[' + jsonStr;
      }
      
      // Ensure the JSON ends with ]
      if (!jsonStr.trim().endsWith(']')) {
        jsonStr = jsonStr + ']';
      }
      
      return jsonStr;
    } catch (error) {
      return jsonStr;
    }
  }

  // Helper method to extract objects from malformed JSON
  private extractObjects(content: string): any[] {
    const items: any[] = [];
    
    // Split by pattern that separates objects
    // Look for },\n followed by optional whitespace and {
    const objectStrings = content.split(/}\s*,?\s*\n\s*(?={)/);
    
    for (let i = 0; i < objectStrings.length; i++) {
      let objStr = objectStrings[i].trim();
      
      // Skip empty strings
      if (!objStr) continue;
      
      // Remove leading commas, brackets
      objStr = objStr.replace(/^[,\[\s]+/, '');
      
      // Ensure it starts with {
      if (!objStr.startsWith('{')) {
        objStr = '{' + objStr;
      }
      
      // Ensure it ends with }
      if (!objStr.endsWith('}')) {
        objStr = objStr + '}';
      }
      
      try {
        const obj = JSON.parse(objStr);
        if (obj && (obj.id || obj.title)) {
          items.push(obj);
        }
      } catch (e) {
        // Try to fix common JSON errors
        try {
          let fixed = objStr;
          // Remove trailing commas
          fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
          // Fix unquoted keys
          fixed = fixed.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
          
          const obj = JSON.parse(fixed);
          if (obj && (obj.id || obj.title)) {
            items.push(obj);
          }
        } catch (e2) {
          // Skip this object silently
        }
      }
    }
    
    return items;
  }

  // Helper method to safely parse JSON with error recovery
  private safeParseJSON(filePath: string): any[] {
    try {
      let content = readFileSync(filePath, 'utf-8');
      
      // Try parsing as-is first
      try {
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : [];
      } catch (firstError) {
        console.warn(`محاولة إصلاح JSON في ${filePath}...`);
        
        // Try fixing common JSON errors
        content = this.fixJSONString(content);
        
        try {
          const parsed = JSON.parse(content);
          return Array.isArray(parsed) ? parsed : [];
        } catch (secondError) {
          console.warn(`فشل في تحليل الملف بالكامل، محاولة تحليل العناصر بشكل فردي...`);
          
          // Use advanced object extraction
          return this.extractObjects(content);
        }
      }
    } catch (error) {
      console.error(`خطأ في قراءة الملف ${filePath}:`, error);
      return [];
    }
  }

  // Helper method to generate ID from title
  private generateIdFromTitle(title: string): string {
    // Convert title to a safe ID format
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')     // Replace spaces with dashes
      .trim();
  }

  // Helper method to safely create media object
  private createMediaObject(item: any): Media | null {
    try {
      // Skip only if completely empty or null
      if (!item || typeof item !== 'object') {
        return null;
      }

      // Use title as ID if ID is missing
      const title = item.title || 'بدون عنوان';
      const id = item.id ? String(item.id) : this.generateIdFromTitle(title);

      const media: Media = {
        ...item,
        id: id,
        title: title,
        poster: item.poster || '',
        type: item.type || 'movie',
        year: item.year ? String(item.year) : '2024',
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        description: item.description || null,
        descriptionAr: item.descriptionAr || null,
        backdrop: item.backdrop || null,
        genre: item.genre || null,
        category: item.category || null,
        duration: item.duration || null,
        watchUrl: item.watchUrl || null,
        servers: item.servers || null,
        episodes: item.episodes || null,
        episodeCount: item.episodeCount || null,
        seasons: item.seasons || null,
        trailerUrl: item.trailerUrl || null,
        rating: item.rating || null,
        isNew: item.isNew || false,
        isTrending: item.isTrending || false,
        isPopular: item.isPopular || false,
        isFeatured: item.isFeatured || false,
      };
      
      return media;
    } catch (error) {
      console.warn(`خطأ في إنشاء كائن الوسائط:`, error);
      return null;
    }
  }

  // File management methods
  private loadDataFromFiles(): void {
    try {
      let loadedCount = 0;
      let skippedCount = 0;

      // Load movies
      if (existsSync(this.moviesFilePath)) {
        const moviesData = this.safeParseJSON(this.moviesFilePath);
        moviesData.forEach((movie: any) => {
          try {
            const media = this.createMediaObject(movie);
            if (media) {
              this.movies.set(media.id, media);
              loadedCount++;
            } else {
              skippedCount++;
            }
          } catch (error) {
            console.warn(`تم تجاهل فيلم بسبب خطأ:`, error);
            skippedCount++;
          }
        });
        console.log(`✓ تم تحميل ${loadedCount} فيلم من ${this.moviesFilePath}${skippedCount > 0 ? ` (تم تجاهل ${skippedCount} عنصر)` : ''}`);
      }

      // Load series
      loadedCount = 0;
      skippedCount = 0;
      if (existsSync(this.seriesFilePath)) {
        const seriesData = this.safeParseJSON(this.seriesFilePath);
        seriesData.forEach((serie: any) => {
          try {
            const media = this.createMediaObject(serie);
            if (media) {
              this.series.set(media.id, media);
              loadedCount++;
            } else {
              skippedCount++;
            }
          } catch (error) {
            console.warn(`تم تجاهل مسلسل بسبب خطأ:`, error);
            skippedCount++;
          }
        });
        console.log(`✓ تم تحميل ${loadedCount} مسلسل من ${this.seriesFilePath}${skippedCount > 0 ? ` (تم تجاهل ${skippedCount} عنصر)` : ''}`);
      }

      // Load anime
      loadedCount = 0;
      skippedCount = 0;
      if (existsSync(this.animeFilePath)) {
        const animeData = this.safeParseJSON(this.animeFilePath);
        animeData.forEach((anime: any) => {
          try {
            const media = this.createMediaObject(anime);
            if (media) {
              this.anime.set(media.id, media);
              loadedCount++;
            } else {
              skippedCount++;
            }
          } catch (error) {
            console.warn(`تم تجاهل أنمي بسبب خطأ:`, error);
            skippedCount++;
          }
        });
        console.log(`✓ تم تحميل ${loadedCount} أنمي من ${this.animeFilePath}${skippedCount > 0 ? ` (تم تجاهل ${skippedCount} عنصر)` : ''}`);
      }

      // Load asian series
      loadedCount = 0;
      skippedCount = 0;
      if (existsSync(this.asianFilePath)) {
        const asianData = this.safeParseJSON(this.asianFilePath);
        asianData.forEach((asian: any) => {
          try {
            const media = this.createMediaObject(asian);
            if (media) {
              this.series.set(media.id, media);
              loadedCount++;
            } else {
              skippedCount++;
            }
          } catch (error) {
            console.warn(`تم تجاهل مسلسل آسيوي بسبب خطأ:`, error);
            skippedCount++;
          }
        });
        console.log(`✓ تم تحميل ${loadedCount} مسلسل آسيوي من ${this.asianFilePath}${skippedCount > 0 ? ` (تم تجاهل ${skippedCount} عنصر)` : ''}`);
      }

      // Load other media
      loadedCount = 0;
      skippedCount = 0;
      if (existsSync(this.otherMediaFilePath)) {
        const otherMediaData = this.safeParseJSON(this.otherMediaFilePath);
        otherMediaData.forEach((otherItem: any) => {
          try {
            const media = this.createMediaObject(otherItem);
            if (media) {
              this.otherMedia.set(media.id, media);
              loadedCount++;
            } else {
              skippedCount++;
            }
          } catch (error) {
            console.warn(`تم تجاهل محتوى آخر بسبب خطأ:`, error);
            skippedCount++;
          }
        });
        console.log(`✓ تم تحميل ${loadedCount} عنصر محتوى آخر من ${this.otherMediaFilePath}${skippedCount > 0 ? ` (تم تجاهل ${skippedCount} عنصر)` : ''}`);
      }

      // Populate legacy media map for backward compatibility
      this.populateLegacyMediaMap();

    } catch (error) {
      console.error('خطأ عام في تحميل البيانات من الملفات:', error);
      console.log('سيستمر التطبيق بالبيانات المتاحة...');
    }
  }

  private populateLegacyMediaMap(): void {
    // Clear legacy map first
    this.media.clear();
    
    // Add all media from separated storages to legacy map
    this.movies.forEach((media, id) => {
      this.media.set(id, media);
    });
    this.series.forEach((media, id) => {
      this.media.set(id, media);
    });
    this.anime.forEach((media, id) => {
      this.media.set(id, media);
    });
    this.otherMedia.forEach((media, id) => {
      this.media.set(id, media);
    });
  }

  private saveDataToFiles(): void {
    // Skip file writes in serverless environment (data is read-only)
    if (this.isServerless) {
      console.log('تخطي حفظ البيانات في بيئة serverless (البيانات للقراءة فقط)');
      return;
    }

    try {
      // Save movies
      const moviesArray = Array.from(this.movies.values());
      writeFileSync(this.moviesFilePath, JSON.stringify(moviesArray, null, 2), 'utf-8');
      
      // Save series
      const seriesArray = Array.from(this.series.values());
      writeFileSync(this.seriesFilePath, JSON.stringify(seriesArray, null, 2), 'utf-8');
      
      // Save anime
      const animeArray = Array.from(this.anime.values());
      writeFileSync(this.animeFilePath, JSON.stringify(animeArray, null, 2), 'utf-8');
      
      // Save other media
      const otherMediaArray = Array.from(this.otherMedia.values());
      writeFileSync(this.otherMediaFilePath, JSON.stringify(otherMediaArray, null, 2), 'utf-8');
      
      console.log('تم حفظ البيانات في الملفات المنفصلة بنجاح');
    } catch (error) {
      console.error('خطأ في حفظ البيانات:', error);
    }
  }

  // Helper methods for managing separated storage
  private getMediaTypeStorage(type: string): Map<string, Media> {
    if (type === 'movie') {
      return this.movies;
    } else if (type === 'anime') {
      return this.anime;
    } else if (['series', 'foreign_series', 'asian_series'].includes(type)) {
      return this.series;
    } else {
      return this.otherMedia;
    }
  }

  private getAllMediaFromSeparatedStorage(): Media[] {
    return [
      ...Array.from(this.movies.values()),
      ...Array.from(this.series.values()),
      ...Array.from(this.anime.values()),
      ...Array.from(this.otherMedia.values()),
    ];
  }

  private addMediaToSeparatedStorage(media: Media): void {
    const storage = this.getMediaTypeStorage(media.type);
    storage.set(media.id, media);
    // Also add to legacy storage for backward compatibility
    this.media.set(media.id, media);
    // Save to files after adding
    this.saveDataToFiles();
  }

  private removeMediaFromSeparatedStorage(id: string, type: string): boolean {
    const storage = this.getMediaTypeStorage(type);
    const removed = storage.delete(id);
    // Also remove from legacy storage
    this.media.delete(id);
    // Save to files after removing
    if (removed) {
      this.saveDataToFiles();
    }
    return removed;
  }

  private findMediaInSeparatedStorage(id: string): Media | undefined {
    // Check movies first
    let media = this.movies.get(id);
    if (media) return media;
    
    // Check series
    media = this.series.get(id);
    if (media) return media;
    
    // Check anime
    media = this.anime.get(id);
    if (media) return media;
    
    // Check other media
    media = this.otherMedia.get(id);
    if (media) return media;
    
    return undefined;
  }

  // Implementation of all interface methods follows...
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const user: User = {
      ...userData,
      id: randomUUID(),
      age: userData.age || null,
      avatarUrl: userData.avatarUrl || null,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Legacy method - maintained for backward compatibility
  async getAllMedia(filters?: {
    type?: string;
    year?: number;
    category?: string;
  }): Promise<Media[]> {
    let result = this.getAllMediaFromSeparatedStorage();

    if (filters) {
      if (filters.type) {
        result = result.filter(media => media.type === filters.type);
      }
      if (filters.year) {
        result = result.filter(media => media.year === filters.year!.toString());
      }
      if (filters.category) {
        result = result.filter(media => 
          media.category?.toLowerCase().includes(filters.category!.toLowerCase())
        );
      }
    }

    // Remove duplicates by name
    return this.removeDuplicatesByName(result);
  }

  // Movies - Separate storage methods
  async getAllMovies(filters?: {
    year?: number;
    category?: string;
  }): Promise<Media[]> {
    let result = Array.from(this.movies.values());

    if (filters) {
      if (filters.year) {
        result = result.filter(media => media.year === filters.year!.toString());
      }
      if (filters.category) {
        result = result.filter(media => 
          media.category?.toLowerCase().includes(filters.category!.toLowerCase())
        );
      }
    }

    // Remove duplicates by name
    return this.removeDuplicatesByName(result);
  }

  async getTrendingMovies(): Promise<Media[]> {
    const result = Array.from(this.movies.values()).filter(media => media.isTrending);
    return this.removeDuplicatesByName(result);
  }

  async getNewMovies(): Promise<Media[]> {
    const result = Array.from(this.movies.values()).filter(media => media.isNew);
    return this.removeDuplicatesByName(result);
  }

  async searchMovies(query: string, limit?: number): Promise<Media[]> {
    const results = Array.from(this.movies.values()).filter(media =>
      media.title.toLowerCase().includes(query.toLowerCase()) ||
      media.description?.toLowerCase().includes(query.toLowerCase()) ||
      media.descriptionAr?.includes(query)
    );

    // Remove duplicates by similar names
    const uniqueResults = this.removeDuplicatesByName(results);

    return limit ? uniqueResults.slice(0, limit) : uniqueResults;
  }

  async getMovieById(id: string): Promise<Media | undefined> {
    return this.movies.get(id);
  }

  // Series - Separate storage methods  
  async getAllSeries(filters?: {
    year?: number;
    category?: string;
    seriesType?: string;
  }): Promise<Media[]> {
    let result = Array.from(this.series.values());

    if (filters) {
      if (filters.year) {
        result = result.filter(media => media.year === filters.year!.toString());
      }
      if (filters.category) {
        result = result.filter(media => 
          media.category?.toLowerCase().includes(filters.category!.toLowerCase())
        );
      }
      if (filters.seriesType) {
        result = result.filter(media => media.type === filters.seriesType);
      }
    }

    // Remove duplicates by name
    return this.removeDuplicatesByName(result);
  }

  async getTrendingSeries(): Promise<Media[]> {
    const result = Array.from(this.series.values()).filter(media => media.isTrending);
    return this.removeDuplicatesByName(result);
  }

  async getNewSeries(): Promise<Media[]> {
    const result = Array.from(this.series.values()).filter(media => media.isNew);
    return this.removeDuplicatesByName(result);
  }

  async getSeriesById(id: string): Promise<Media | undefined> {
    // Check series map first
    let media = this.series.get(id);
    if (media) return media;
    
    // Also check anime map as they are series type
    media = this.anime.get(id);
    if (media) return media;
    
    return undefined;
  }

  async searchSeries(query: string, limit?: number): Promise<Media[]> {
    const results = Array.from(this.series.values()).filter(media =>
      media.title.toLowerCase().includes(query.toLowerCase()) ||
      media.description?.toLowerCase().includes(query.toLowerCase()) ||
      media.descriptionAr?.includes(query)
    );

    // Remove duplicates by similar names
    const uniqueResults = this.removeDuplicatesByName(results);

    return limit ? uniqueResults.slice(0, limit) : uniqueResults;
  }

  // Other Media - Separate storage methods
  async getAllOtherMedia(filters?: {
    type?: string;
    year?: number;
    category?: string;
  }): Promise<Media[]> {
    let result = Array.from(this.otherMedia.values());

    if (filters) {
      if (filters.type) {
        result = result.filter(media => media.type === filters.type);
      }
      if (filters.year) {
        result = result.filter(media => media.year === filters.year!.toString());
      }
      if (filters.category) {
        result = result.filter(media => 
          media.category?.toLowerCase().includes(filters.category!.toLowerCase())
        );
      }
    }

    // Remove duplicates by name
    return this.removeDuplicatesByName(result);
  }

  async getTrendingOtherMedia(): Promise<Media[]> {
    const result = Array.from(this.otherMedia.values()).filter(media => media.isTrending);
    return this.removeDuplicatesByName(result);
  }

  async getNewOtherMedia(): Promise<Media[]> {
    const result = Array.from(this.otherMedia.values()).filter(media => media.isNew);
    return this.removeDuplicatesByName(result);
  }

  async searchOtherMedia(query: string, limit?: number): Promise<Media[]> {
    const results = Array.from(this.otherMedia.values()).filter(media =>
      media.title.toLowerCase().includes(query.toLowerCase()) ||
      media.description?.toLowerCase().includes(query.toLowerCase()) ||
      media.descriptionAr?.includes(query)
    );

    // Remove duplicates by similar names
    const uniqueResults = this.removeDuplicatesByName(results);

    return limit ? uniqueResults.slice(0, limit) : uniqueResults;
  }

  async getMediaById(id: string): Promise<Media | undefined> {
    // Use the separated storage to find media
    return this.findMediaInSeparatedStorage(id);
  }

  async getTrendingMedia(): Promise<Media[]> {
    const result = this.getAllMediaFromSeparatedStorage().filter(media => media.isTrending);
    return this.removeDuplicatesByName(result);
  }

  async getNewReleases(): Promise<Media[]> {
    const result = this.getAllMediaFromSeparatedStorage().filter(media => media.isNew);
    return this.removeDuplicatesByName(result);
  }

  async searchMedia(query: string, limit?: number): Promise<Media[]> {
    const results = this.getAllMediaFromSeparatedStorage().filter(media =>
      media.title.toLowerCase().includes(query.toLowerCase()) ||
      media.description?.toLowerCase().includes(query.toLowerCase()) ||
      media.descriptionAr?.includes(query)
    );

    // Remove duplicates by similar names
    const uniqueResults = this.removeDuplicatesByName(results);

    // Sort results: prioritize items with numbers in order
    uniqueResults.sort((a, b) => {
      // Extract numbers from titles
      const numA = this.extractNumberFromTitle(a.title);
      const numB = this.extractNumberFromTitle(b.title);
      
      // If both have numbers, sort by number
      if (numA > 0 && numB > 0) {
        return numA - numB;
      }
      
      // If only one has a number, items with numbers come first
      if (numA > 0) return -1;
      if (numB > 0) return 1;
      
      // Otherwise, sort alphabetically
      return a.title.localeCompare(b.title, 'ar');
    });

    return limit ? uniqueResults.slice(0, limit) : uniqueResults;
  }

  async createMedia(mediaData: InsertMedia): Promise<Media> {
    const media: Media = {
      ...mediaData,
      id: randomUUID(),
      createdAt: new Date(),
      description: mediaData.description || null,
      descriptionAr: mediaData.descriptionAr || null,
      backdrop: mediaData.backdrop || null,
      genre: mediaData.genre || null,
      category: mediaData.category || null,
      duration: mediaData.duration || null,
      watchUrl: mediaData.watchUrl || null,
      servers: (mediaData.servers as any) || null,
      episodes: (mediaData.episodes as any) || null,
      episodeCount: mediaData.episodeCount || null,
      seasons: mediaData.seasons || null,
      trailerUrl: mediaData.trailerUrl || null,
      rating: mediaData.rating || null,
      isNew: mediaData.isNew || false,
      isTrending: mediaData.isTrending || false,
      isPopular: mediaData.isPopular || false,
      isFeatured: mediaData.isFeatured || false,
    };

    // Add to separated storage based on type
    this.addMediaToSeparatedStorage(media);
    return media;
  }

  async getEpisodeById(
    seriesId: string,
    episodeNumber: number,
  ): Promise<{ episode: Episode; series: Media } | null> {
    const series = this.findMediaInSeparatedStorage(seriesId);
    if (!series || !series.episodes) return null;

    const episodes = series.episodes as Episode[];
    const episode = episodes.find(ep => ep.number === episodeNumber);
    if (!episode) return null;

    return { episode, series };
  }

  // Helper function to check if two media types are compatible
  private areTypesCompatible(type1: string, type2: string): boolean {
    // Define compatible type groups
    const animeTypes = ['anime', 'anime_movie'];
    const seriesTypes = ['series', 'foreign_series', 'asian_series'];
    const movieTypes = ['movie'];

    // Check if both types are in the same group
    if (animeTypes.includes(type1) && animeTypes.includes(type2)) return true;
    if (seriesTypes.includes(type1) && seriesTypes.includes(type2)) return true;
    if (movieTypes.includes(type1) && movieTypes.includes(type2)) return true;

    return false;
  }

  // Helper function to get type priority score (higher = more similar)
  private getTypeAffinityScore(sourceType: string, candidateType: string): number {
    // Exact match gets highest priority
    if (sourceType === candidateType) return 10;

    // Define affinity groups with scores
    const affinityGroups = [
      { types: ['anime', 'anime_movie'], score: 8 },
      { types: ['series', 'foreign_series', 'asian_series'], score: 6 },
      { types: ['movie', 'anime_movie'], score: 4 },
    ];

    // Check if both types are in the same affinity group
    for (const group of affinityGroups) {
      if (group.types.includes(sourceType) && group.types.includes(candidateType)) {
        return group.score;
      }
    }

    return 0; // No affinity
  }

  // Helper function to normalize title for smart matching
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .trim()
      // Remove season numbers in various formats
      .replace(/season\s*\d+/gi, '')
      .replace(/الموسم\s*(الأول|الثاني|الثالث|الرابع|الخامس|\d+)/gi, '')
      .replace(/s\d+/gi, '') // S1, S2, etc.
      // Remove part numbers
      .replace(/part\s*\d+/gi, '')
      .replace(/الجزء\s*(الأول|الثاني|الثالث|الرابع|الخامس|\d+)/gi, '')
      // Remove movie/special indicators
      .replace(/movie\s*\d*/gi, '')
      .replace(/فيلم\s*\d*/gi, '')
      .replace(/ova\s*\d*/gi, '')
      .replace(/special\s*\d*/gi, '')
      // Remove years
      .replace(/\b(19|20)\d{2}\b/g, '')
      // Remove extra whitespace and special characters
      .replace(/[:\-\–\—\(\)\[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Helper function to remove duplicates by similar names
  private removeDuplicatesByName(mediaList: Media[]): Media[] {
    const seen = new Map<string, Media>();
    
    for (const media of mediaList) {
      const normalizedTitle = this.normalizeTitle(media.title);
      
      // If we haven't seen this normalized title, add it
      if (!seen.has(normalizedTitle)) {
        seen.set(normalizedTitle, media);
      }
    }
    
    return Array.from(seen.values());
  }

  // Helper function to check if titles are similar (partial matching)
  private areTitlesSimilar(title1: string, title2: string): boolean {
    const normalized1 = this.normalizeTitle(title1);
    const normalized2 = this.normalizeTitle(title2);
    
    // Exact match after normalization
    if (normalized1 === normalized2) return true;
    
    // Check if one contains a significant part of the other
    const minLength = Math.min(normalized1.length, normalized2.length);
    if (minLength < 3) return false; // Too short to compare
    
    // Split into words and check for common significant words
    const words1 = normalized1.split(' ').filter(w => w.length > 2);
    const words2 = normalized2.split(' ').filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return false;
    
    // Count matching words
    const matchingWords = words1.filter(w1 => 
      words2.some(w2 => w1 === w2 || w1.includes(w2) || w2.includes(w1))
    );
    
    // If more than 60% of words match, consider similar
    const matchRatio = matchingWords.length / Math.min(words1.length, words2.length);
    return matchRatio >= 0.6;
  }

  // Helper function to extract numbers from the end of a title for sorting
  private extractNumberFromTitle(title: string): number {
    // Try to find numbers at the end of the title
    const matches = title.match(/(\d+)\s*$/);
    if (matches) {
      return parseInt(matches[1], 10);
    }
    
    // Try to find season/episode numbers in Arabic
    const arabicSeasonMatch = title.match(/الموسم\s*(\d+)/i);
    if (arabicSeasonMatch) {
      return parseInt(arabicSeasonMatch[1], 10);
    }
    
    // Try to find season/episode numbers in English
    const englishSeasonMatch = title.match(/season\s*(\d+)/i);
    if (englishSeasonMatch) {
      return parseInt(englishSeasonMatch[1], 10);
    }
    
    // Try to find part numbers
    const partMatch = title.match(/part\s*(\d+)/i);
    if (partMatch) {
      return parseInt(partMatch[1], 10);
    }
    
    return 0; // No number found
  }

  async getRecommendations(mediaId: string): Promise<Media[]> {
    const media = this.findMediaInSeparatedStorage(mediaId);
    if (!media) return [];

    // Get all media from all storages
    const allMedia = this.getAllMediaFromSeparatedStorage();

    // Filter candidates: same type only, exclude current media
    const candidates = allMedia.filter(m => 
      m.id !== mediaId && m.type === media.type
    );

    // Priority 1: Check for exact same name or similar names
    const similarNameMatches = candidates.filter(candidate => 
      this.areTitlesSimilar(media.title, candidate.title)
    );

    // If there are items with similar names, return ONLY those (no other recommendations)
    if (similarNameMatches.length > 0) {
      // Sort by numbers in title first, then by title, then by rating
      similarNameMatches.sort((a, b) => {
        // Extract numbers from titles
        const numA = this.extractNumberFromTitle(a.title);
        const numB = this.extractNumberFromTitle(b.title);
        
        // If both have numbers, sort by number
        if (numA > 0 && numB > 0) {
          return numA - numB;
        }
        
        // If only one has a number, prioritize it
        if (numA > 0) return -1;
        if (numB > 0) return 1;
        
        // Otherwise, sort alphabetically
        const titleCompare = a.title.localeCompare(b.title, 'ar');
        if (titleCompare !== 0) return titleCompare;
        
        // Finally, sort by rating
        const ratingA = parseFloat(a.rating || '0');
        const ratingB = parseFloat(b.rating || '0');
        return ratingB - ratingA;
      });
      return similarNameMatches; // Return ALL similar items without limit
    }

    // Priority 2: If NO similar name matches found, show all items from the same type/category
    const recommendations: Media[] = [];

    // Priority 2: Same type AND same category
    const sameTypeAndCategory = candidates.filter(candidate => {
      const mediaCategory = (media.category || '').toLowerCase();
      const candidateCategory = (candidate.category || '').toLowerCase();
      return mediaCategory && candidateCategory && 
        (mediaCategory.includes(candidateCategory) || 
         candidateCategory.includes(mediaCategory) ||
         mediaCategory.split(',').some(cat => candidateCategory.includes(cat.trim())) ||
         candidateCategory.split(',').some(cat => mediaCategory.includes(cat.trim())));
    });
    
    // Sort by rating
    sameTypeAndCategory.sort((a, b) => {
      const ratingA = parseFloat(a.rating || '0');
      const ratingB = parseFloat(b.rating || '0');
      return ratingB - ratingA;
    });
    
    recommendations.push(...sameTypeAndCategory);

    // Priority 3: Same type only (if we have less than 100)
    if (recommendations.length < 100) {
      const sameTypeOnly = candidates.filter(candidate => 
        !recommendations.some(r => r.id === candidate.id)
      );
      
      // Sort by rating
      sameTypeOnly.sort((a, b) => {
        const ratingA = parseFloat(a.rating || '0');
        const ratingB = parseFloat(b.rating || '0');
        return ratingB - ratingA;
      });
      
      recommendations.push(...sameTypeOnly.slice(0, 100 - recommendations.length));
    }

    return recommendations;
  }

  async getWatchHistory(userId: string): Promise<(WatchHistory & { media: Media })[]> {
    const history = Array.from(this.watchHistory.values())
      .filter(h => h.userId === userId)
      .sort((a, b) => new Date(b.watchedAt || 0).getTime() - new Date(a.watchedAt || 0).getTime());

    const result: (WatchHistory & { media: Media })[] = [];
    for (const h of history) {
      const media = this.findMediaInSeparatedStorage(h.mediaId);
      if (media) {
        result.push({ ...h, media });
      }
    }

    return result;
  }

  async getWatchHistoryByMedia(
    userId: string,
    mediaId: string,
  ): Promise<WatchHistory | undefined> {
    for (const history of Array.from(this.watchHistory.values())) {
      if (history.userId === userId && history.mediaId === mediaId) {
        return history;
      }
    }
    return undefined;
  }

  async updateWatchHistory(historyData: InsertWatchHistory): Promise<WatchHistory> {
    // Find existing history or create new one
    let existing: WatchHistory | undefined;
    for (const history of Array.from(this.watchHistory.values())) {
      if (history.userId === historyData.userId && history.mediaId === historyData.mediaId) {
        existing = history;
        break;
      }
    }

    if (existing) {
      const updated: WatchHistory = {
        ...existing,
        ...historyData,
        progress: historyData.progress ?? 0,
        currentEpisode: historyData.currentEpisode ?? 1,
        currentSeason: historyData.currentSeason ?? 1,
        watchedAt: new Date(),
      };
      this.watchHistory.set(existing.id, updated);
      return updated;
    } else {
      const newHistory: WatchHistory = {
        ...historyData,
        id: randomUUID(),
        progress: historyData.progress ?? 0,
        currentEpisode: historyData.currentEpisode ?? 1,
        currentSeason: historyData.currentSeason ?? 1,
        watchedAt: new Date(),
      };
      this.watchHistory.set(newHistory.id, newHistory);
      return newHistory;
    }
  }

  async getContinueWatching(userId: string): Promise<(WatchHistory & { media: Media })[]> {
    const history = await this.getWatchHistory(userId);
    return history.filter(h => (h.progress || 0) > 0 && (h.progress || 0) < 100);
  }

  async getFavorites(userId: string): Promise<(Favorite & { media: Media })[]> {
    const favorites = Array.from(this.favorites.values())
      .filter(f => f.userId === userId)
      .sort((a, b) => new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime());

    const result: (Favorite & { media: Media })[] = [];
    for (const f of favorites) {
      const media = this.findMediaInSeparatedStorage(f.mediaId);
      if (media) {
        result.push({ ...f, media });
      }
    }

    return result;
  }

  async addToFavorites(favoriteData: InsertFavorite): Promise<Favorite> {
    const favorite: Favorite = {
      ...favoriteData,
      id: randomUUID(),
      addedAt: new Date(),
    };
    this.favorites.set(favorite.id, favorite);
    return favorite;
  }

  async removeFromFavorites(userId: string, mediaId: string): Promise<boolean> {
    for (const [id, favorite] of Array.from(this.favorites.entries())) {
      if (favorite.userId === userId && favorite.mediaId === mediaId) {
        this.favorites.delete(id);
        return true;
      }
    }
    return false;
  }

  async isFavorite(userId: string, mediaId: string): Promise<boolean> {
    for (const favorite of Array.from(this.favorites.values())) {
      if (favorite.userId === userId && favorite.mediaId === mediaId) {
        return true;
      }
    }
    return false;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const notification: Notification = {
      ...notificationData,
      id: randomUUID(),
      mediaId: notificationData.mediaId || null,
      isRead: notificationData.isRead || false,
      createdAt: new Date(),
    };
    this.notifications.set(notification.id, notification);
    return notification;
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.isRead = true;
      this.notifications.set(id, notification);
      return true;
    }
    return false;
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId && !n.isRead)
      .length;
  }

  async importMediaFromJSON(
    jsonData: any[],
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of jsonData) {
      try {
        const transformedMedia = transformExternalMedia(item);
        await this.createMedia(transformedMedia);
        success++;
      } catch (error) {
        failed++;
        errors.push(`Failed to import ${item.title || 'Unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { success, failed, errors };
  }

  async exportAllMediaToJSON(): Promise<any[]> {
    return this.getAllMediaFromSeparatedStorage();
  }

  async bulkCreateMedia(mediaList: InsertMedia[]): Promise<Media[]> {
    const results: Media[] = [];
    for (const mediaData of mediaList) {
      try {
        const media = await this.createMedia(mediaData);
        results.push(media);
      } catch (error) {
        console.error('Failed to create media:', error);
      }
    }
    return results;
  }

  async getYearsWithCounts(type?: string): Promise<{ year: string; count: number }[]> {
    const mediaArray = this.getAllMediaFromSeparatedStorage();
    const filteredMedia = type ? mediaArray.filter(media => media.type === type) : mediaArray;
    
    const yearCounts = new Map<string, number>();
    
    for (const media of filteredMedia) {
      const year = media.year;
      yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
    }
    
    return Array.from(yearCounts.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => b.year.localeCompare(a.year));
  }

}

// Export a singleton instance
export const storage = new MemStorage();