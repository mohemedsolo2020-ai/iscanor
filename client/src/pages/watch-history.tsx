import { useState } from "react";
import { useWatchHistory } from "@/hooks/use-profile";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottom-nav";
import MovieCard from "@/components/media/movie-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { History, Play, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export default function WatchHistory() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();

  const { data: watchHistory = [], isLoading } = useWatchHistory();

  const filteredHistory = searchQuery 
    ? watchHistory.filter((item: any) => 
        item.media.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : watchHistory;

  const handleContinueWatching = (item: any) => {
    const mediaId = item.media.id;
    
    // Navigate to the media details page
    setLocation(`/movie/${mediaId}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className={`min-h-screen pb-20 md:pb-0 transition-all duration-300 ${sidebarOpen ? 'md:mr-64 lg:mr-72' : ''}`}>
        <Header
          onToggleSidebar={() => setSidebarOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="p-4">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <History className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold gradient-text" data-testid="watch-history-title">
                سجل المشاهدة
              </h1>
            </div>
            <p className="text-muted-foreground">
              آخر الأفلام والمسلسلات التي زرتها
            </p>
          </div>

          {/* Statistics */}
          {!isLoading && watchHistory.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="flex items-center gap-3">
                  <History className="w-6 h-6 text-primary" />
                  <div>
                    <p className="text-2xl font-bold" data-testid="total-visited">
                      {watchHistory.length}
                    </p>
                    <p className="text-sm text-muted-foreground">عدد العناصر</p>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold" data-testid="recent-count">
                      {watchHistory.filter((item: any) => 
                        new Date().getTime() - new Date(item.watchedAt).getTime() < 7 * 24 * 60 * 60 * 1000
                      ).length}
                    </p>
                    <p className="text-sm text-muted-foreground">هذا الأسبوع</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {searchQuery && (
            <div className="mb-6">
              <p className="text-muted-foreground" data-testid="search-results-count">
                نتائج البحث عن "{searchQuery}": {filteredHistory.length} عنصر
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-4 p-4 bg-card rounded-lg border border-border">
                  <Skeleton className="w-20 h-28 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/4" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12" data-testid="no-history-message">
              <History className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground text-lg mb-2">
                {searchQuery ? "لم يتم العثور على سجل مشاهدة يطابق بحثك" : "لا يوجد سجل مشاهدة"}
              </p>
              {!searchQuery && (
                <p className="text-muted-foreground text-sm">
                  ابدأ بمشاهدة الأفلام والمسلسلات لبناء سجل المشاهدة الخاص بك
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4 fade-in">
              {filteredHistory.map((item: any) => (
                <div 
                  key={item.id} 
                  className="flex gap-4 p-4 bg-card rounded-lg border border-border hover:bg-muted/20 transition-colors"
                  data-testid={`history-item-${item.id}`}
                >
                  {/* Media Poster */}
                  <div className="flex-shrink-0">
                    <img
                      src={item.media.poster}
                      alt={item.media.title}
                      className="w-20 h-28 object-cover rounded border-2 border-primary/20"
                      data-testid="history-poster"
                    />
                  </div>

                  {/* Media Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg mb-2" data-testid="history-title">
                      {item.media.title}
                    </h3>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span data-testid="media-info">
                        {item.media.year} • {item.media.genre} • {item.media.type === 'movie' ? 'فيلم' : 'مسلسل'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground" data-testid="watch-date">
                        آخر زيارة: {formatDistanceToNow(new Date(item.watchedAt), { 
                          addSuffix: true, 
                          locale: ar 
                        })}
                      </span>
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => handleContinueWatching(item)}
                        data-testid="continue-watching-button"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        مشاهدة
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {isMobile && <BottomNav />}
      </div>
    </div>
  );
}
