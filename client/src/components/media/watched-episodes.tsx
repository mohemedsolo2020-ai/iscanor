import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWatchHistory } from "@/hooks/use-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Play, Calendar, Film } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { WatchHistory, Media } from "@shared/schema";

interface WatchedItem {
  itemNumber?: number;
  itemTitle: string;
  mediaId: string;
  mediaTitle: string;
  mediaType: string;
  posterUrl?: string;
  serverUrl?: string;
  serverName?: string;
  watchedAt: Date;
  progress: number;
  isEpisode: boolean;
}

export default function WatchedEpisodes() {
  const { data: watchHistory, isLoading } = useWatchHistory();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // تحويل سجل المشاهدة إلى قائمة بالعناصر المشاهدة مع تفاصيل السيرفرات
  const watchedItems: WatchedItem[] = (watchHistory || [])
    .filter((item: WatchHistory & { media: Media }) => (item.progress || 0) >= 5) // جميع العناصر المشاهدة
    .slice(0, 12) // أحدث 12 عنصر
    .map((item: WatchHistory & { media: Media }) => {
      // للمسلسلات والأنمي - استخدم الحلقات
      if (item.media.type === 'series' || item.media.type === 'anime' || item.media.type === 'korean_series' || item.media.type === 'foreign_series' || item.media.type === 'asian_series') {
        const episodes = item.media.episodes as any[] || [];
        const currentEpisode = episodes.find(ep => ep.number === item.currentEpisode);
        const firstServer = currentEpisode?.servers?.[0];

        return {
          itemNumber: item.currentEpisode,
          itemTitle: currentEpisode?.title || `الحلقة ${item.currentEpisode}`,
          mediaId: item.mediaId,
          mediaTitle: item.media.titleAr,
          mediaType: item.media.type,
          posterUrl: item.media.poster,
          serverUrl: firstServer?.url,
          serverName: firstServer?.name || "سيرفر 1",
          watchedAt: item.watchedAt || new Date(),
          progress: item.progress || 0,
          isEpisode: true
        };
      } else {
        // للأفلام وأفلام الأنمي والوثائقيات - استخدم المحتوى نفسه
        return {
          itemTitle: item.media.titleAr,
          mediaId: item.mediaId,
          mediaTitle: item.media.titleAr,
          mediaType: item.media.type,
          posterUrl: item.media.poster,
          serverUrl: item.media.poster, // استخدم الصورة بدلاً من السيرفر للأفلام
          serverName: "فيلم مكتمل",
          watchedAt: item.watchedAt || new Date(),
          progress: item.progress || 0,
          isEpisode: false
        };
      }
    });

  const handleItemClick = (item: WatchedItem) => {
    if (item.isEpisode && item.itemNumber) {
      // للمسلسلات والأنمي - انتقل إلى صفحة الحلقة
      setLocation(`/series/${item.mediaId}/episode/${item.itemNumber}`);
    } else {
      // للأفلام - انتقل إلى صفحة الفيلم
      const route = item.mediaType === 'movie' || item.mediaType === 'anime_movie' || item.mediaType === 'documentary' ? 
                    `/movie/${item.mediaId}` : `/series/${item.mediaId}`;
      setLocation(route);
    }
  };

  if (isLoading) {
    return (
      <section className="fade-in">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold">المشاهدات الأخيرة</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="w-full aspect-video rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!watchedItems || watchedItems.length === 0) {
    return null;
  }

  return (
    <section className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold" data-testid="watched-items-title">المشاهدات الأخيرة</h3>
        <Link href="/watch-history">
          <Button 
            variant="ghost" 
            className="text-primary hover:text-primary/80 flex items-center gap-2"
            data-testid="watched-items-view-all"
          >
            <span>عرض الكل</span>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {watchedItems.map((item, index) => (
          <Card 
            key={`${item.mediaId}-${item.itemNumber || 'movie'}-${index}`}
            className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
            onClick={() => handleItemClick(item)}
            data-testid={`watched-item-${item.mediaId}-${item.itemNumber || 'movie'}`}
          >
            <div className="relative aspect-video bg-muted">
              {item.serverUrl && item.isEpisode ? (
                <iframe
                  src={item.serverUrl}
                  className="absolute inset-0 w-full h-full object-cover rounded-t-lg pointer-events-none"
                  style={{ 
                    transform: 'scale(1.1)',
                    transformOrigin: 'center center'
                  }}
                  loading="lazy"
                  allowFullScreen={false}
                  sandbox="allow-same-origin"
                  data-testid={`item-iframe-${item.mediaId}-${item.itemNumber || 'movie'}`}
                />
              ) : item.posterUrl ? (
                <img
                  src={item.posterUrl}
                  alt={item.itemTitle}
                  className="absolute inset-0 w-full h-full object-cover rounded-t-lg"
                  loading="lazy"
                  data-testid={`item-poster-${item.mediaId}-${item.itemNumber || 'movie'}`}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <Film className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              
              {/* تراكب التشغيل */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button
                    size="icon"
                    className="bg-white/90 text-black hover:bg-white rounded-full w-12 h-12 shadow-lg"
                    data-testid={`play-item-${item.mediaId}-${item.itemNumber || 'movie'}`}
                  >
                    <Play className="w-6 h-6" />
                  </Button>
                </div>
              </div>

              {/* شريط التقدم */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>

              {/* شارة نوع المحتوى */}
              {item.serverName && (
                <Badge className="absolute top-2 left-2 bg-black/70 text-white text-xs">
                  {item.serverName}
                </Badge>
              )}
            </div>

            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate" data-testid={`item-title-${item.mediaId}-${item.itemNumber || 'movie'}`}>
                    {item.itemTitle}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate mt-1" data-testid={`media-title-${item.mediaId}-${item.itemNumber || 'movie'}`}>
                    {item.mediaTitle}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {new Date(item.watchedAt).toLocaleDateString('ar-EG')}
                  </span>
                </div>
                <span className="text-primary font-medium">
                  {item.progress}% مكتملة
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}