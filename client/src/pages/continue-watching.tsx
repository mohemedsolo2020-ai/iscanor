import { useState } from "react";
import { useContinueWatching } from "@/hooks/use-media";
import { WatchHistory, Media } from "@shared/schema";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottom-nav";
import MovieCard from "@/components/media/movie-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ContinueWatchingPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | undefined>();
  const [selectedGenre, setSelectedGenre] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();

  const { data: continueWatching = [], isLoading } = useContinueWatching();

  const filteredWatching = searchQuery 
    ? continueWatching.filter((item: WatchHistory & { media: Media }) => 
        item.media.titleAr.includes(searchQuery) || 
        item.media.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : continueWatching;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        selectedGenre={selectedGenre}
        onGenreChange={setSelectedGenre}
      />

      <div className={`min-h-screen pb-20 md:pb-0 transition-all duration-300 ${sidebarOpen ? 'md:mr-64 lg:mr-72' : ''}`}>
        <Header
          onToggleSidebar={() => setSidebarOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="p-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold gradient-text mb-2" data-testid="continue-watching-page-title">
              متابعة المشاهدة
            </h1>
            <p className="text-muted-foreground">
              استكمل مشاهدة الأفلام والمسلسلات من حيث توقفت
            </p>
          </div>

          {searchQuery && (
            <div className="mb-6">
              <p className="text-muted-foreground" data-testid="search-results-count">
                نتائج البحث عن "{searchQuery}"
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 lg:gap-5 xl:gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="w-full aspect-[2/3] rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredWatching.length === 0 ? (
            <div className="text-center py-12" data-testid="no-continue-watching-message">
              <p className="text-muted-foreground text-lg">
                {searchQuery ? "لم يتم العثور على محتوى يطابق بحثك" : "لا توجد عناصر في قائمة المتابعة"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 lg:gap-5 xl:gap-6 fade-in">
              {filteredWatching.map((item: WatchHistory & { media: Media }) => (
                <div key={item.id} className="space-y-3">
                  <MovieCard
                    media={item.media}
                    showProgress={true}
                    progress={item.progress || 0}
                    currentEpisode={item.currentEpisode || undefined}
                    currentSeason={item.currentSeason || undefined}
                  />
                  <div className="px-1">
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 bg-muted rounded">
                        <div 
                          className="h-full bg-primary rounded transition-all duration-300" 
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground" data-testid={`progress-${item.id}`}>
                        {item.progress}%
                      </span>
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