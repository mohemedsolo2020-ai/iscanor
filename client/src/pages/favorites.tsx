import { useState } from "react";
import { useFavorites } from "@/hooks/use-profile";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottom-nav";
import MovieCard from "@/components/media/movie-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart } from "lucide-react";

export default function Favorites() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();

  const { data: favorites = [], isLoading } = useFavorites();

  const filteredFavorites = searchQuery 
    ? favorites.filter((fav: any) => 
        fav.media.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : favorites;

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
              <Heart className="w-8 h-8 text-primary fill-current" />
              <h1 className="text-3xl font-bold gradient-text" data-testid="favorites-title">
                المفضلة
              </h1>
            </div>
            <p className="text-muted-foreground">
              الأفلام والمسلسلات التي أضفتها إلى قائمة المفضلة
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
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="w-full aspect-[2/3] rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredFavorites.length === 0 ? (
            <div className="text-center py-12" data-testid="no-favorites-message">
              <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground text-lg mb-2">
                {searchQuery ? "لم يتم العثور على مفضلة تطابق بحثك" : "لا توجد عناصر في المفضلة"}
              </p>
              {!searchQuery && (
                <p className="text-muted-foreground text-sm">
                  ابدأ بإضافة الأفلام والمسلسلات التي تحبها إلى المفضلة
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 lg:gap-5 xl:gap-6 fade-in">
              {filteredFavorites.map((favorite: any) => (
                <MovieCard 
                  key={favorite.id} 
                  media={favorite.media} 
                  isFavorite={true}
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
