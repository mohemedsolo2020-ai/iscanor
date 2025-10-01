import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useSearchMedia } from "@/hooks/use-media";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MovieCard from "@/components/media/movie-card";
import { Search, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottom-nav";
import { useIsMobile } from "@/hooks/use-mobile";

export default function SearchResults() {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  
  // Extract search query from URL parameters and update when location changes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryFromUrl = urlParams.get('q') || "";
    setSearchQuery(queryFromUrl);
  }, [location]);
  
  const { data: searchResults = [], isLoading, error } = useSearchMedia(searchQuery);

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="space-y-3">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );

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

        <main className="p-6 space-y-6">
      {/* Search Header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold text-foreground">نتائج البحث</h1>
        </div>
        {searchQuery && (
          <Badge variant="secondary" className="text-sm">
            البحث عن: "{searchQuery}"
          </Badge>
        )}
      </div>

      {/* Search Results Count */}
      {!isLoading && searchResults.length > 0 && (
        <div className="text-muted-foreground">
          تم العثور على {searchResults.length} نتيجة
        </div>
      )}

      {/* Loading State */}
      {isLoading && <LoadingSkeleton />}

      {/* Error State */}
      {error && (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <X className="w-12 h-12 text-destructive" />
            <h3 className="text-lg font-semibold text-foreground">خطأ في البحث</h3>
            <p className="text-muted-foreground">حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.</p>
          </div>
        </Card>
      )}

      {/* No Results */}
      {!isLoading && !error && searchQuery && searchResults.length === 0 && (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <Search className="w-12 h-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">لا توجد نتائج</h3>
            <p className="text-muted-foreground">
              لم نجد أي نتائج تطابق بحثك "{searchQuery}". جرب كلمات مختلفة.
            </p>
          </div>
        </Card>
      )}

      {/* Empty State (no search query) */}
      {!searchQuery && (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <Search className="w-12 h-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">ابدأ البحث</h3>
            <p className="text-muted-foreground">
              ابحث عن الأفلام والمسلسلات المفضلة لديك
            </p>
          </div>
        </Card>
      )}

      {/* Search Results Grid */}
      {!isLoading && !error && searchResults.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {searchResults.map((media) => (
            <MovieCard
              key={media.id}
              media={media}
              data-testid={`search-result-${media.id}`}
            />
          ))}
        </div>
      )}
        </main>

        {isMobile && <BottomNav />}
      </div>
    </div>
  );
}