import { useState, useMemo } from "react";
import { useMedia } from "@/hooks/use-media";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottom-nav";
import MovieCard from "@/components/media/movie-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MEDIA_TYPES } from "@/lib/constants";

const ITEMS_PER_PAGE = 24;

export default function AsianSeries() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsToShow, setItemsToShow] = useState(ITEMS_PER_PAGE);
  const isMobile = useIsMobile();

  const { data: asianSeries = [], isLoading } = useMedia({ 
    type: MEDIA_TYPES.ASIAN_SERIES
  });

  const filteredAsianSeries = useMemo(() => 
    searchQuery 
      ? asianSeries.filter((series: any) => 
          series.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : asianSeries,
    [asianSeries, searchQuery]
  );

  const displayedAsianSeries = useMemo(() => 
    filteredAsianSeries.slice(0, itemsToShow),
    [filteredAsianSeries, itemsToShow]
  );

  const hasMore = displayedAsianSeries.length < filteredAsianSeries.length;

  const loadMore = () => {
    setItemsToShow(prev => prev + ITEMS_PER_PAGE);
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
            <h1 className="text-3xl font-bold gradient-text mb-2" data-testid="asian-series-title">
              المسلسلات الآسيوية
            </h1>
            <p className="text-muted-foreground">
              أفضل المسلسلات الآسيوية من اليابان وتايلاند وآسيا
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
          ) : filteredAsianSeries.length === 0 ? (
            <div className="text-center py-12" data-testid="no-asian-series-message">
              <p className="text-muted-foreground text-lg">
                {searchQuery ? "لم يتم العثور على مسلسلات آسيوية تطابق بحثك" : "لا توجد مسلسلات آسيوية متاحة"}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 lg:gap-5 xl:gap-6 fade-in">
                {displayedAsianSeries.map((series) => (
                  <MovieCard key={series.id} media={series} />
                ))}
              </div>
              
              {hasMore && (
                <div className="flex justify-center mt-8 mb-4">
                  <Button 
                    onClick={loadMore}
                    variant="outline"
                    size="lg"
                    className="px-8"
                    data-testid="button-load-more"
                  >
                    تحميل المزيد
                  </Button>
                </div>
              )}
            </>
          )}
        </main>

        {isMobile && <BottomNav />}
      </div>
    </div>
  );
}