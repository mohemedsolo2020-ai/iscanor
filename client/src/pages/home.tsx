import { useState, useMemo } from "react";
import { useMedia, useTrendingMedia, useNewReleases } from "@/hooks/use-media";
import { useIsMobile } from "@/hooks/use-mobile";
import { useFavorites } from "@/hooks/use-profile";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottom-nav";
import HeroSection from "@/components/media/hero-section";
import DecorativeCircles from "@/components/ui/decorative-circles";
import MovieCard from "@/components/media/movie-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";
import { MEDIA_TYPES } from "@/lib/constants";
import { Link } from "wouter";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();

  const { data: trending = [], isLoading: trendingLoading } = useTrendingMedia();
  const { data: newReleases = [], isLoading: newReleasesLoading } = useNewReleases();
  const { data: favorites = [] } = useFavorites();
  
  // Get different categories for homepage sections
  const { data: movies = [] } = useMedia({ type: MEDIA_TYPES.MOVIE });
  const { data: series = [] } = useMedia({ type: MEDIA_TYPES.SERIES });
  const { data: anime = [] } = useMedia({ type: MEDIA_TYPES.ANIME });
  const { data: animeMovies = [] } = useMedia({ type: MEDIA_TYPES.ANIME_MOVIE });
  const { data: foreignSeries = [] } = useMedia({ type: MEDIA_TYPES.FOREIGN_SERIES });
  const { data: asianSeries = [] } = useMedia({ type: MEDIA_TYPES.ASIAN_SERIES });

  // Stable random selection of high-rated content from all types
  const heroContent = useMemo(() => {
    // Combine all media from different sources
    const allMediaSources = [
      ...trending,
      ...newReleases,
      ...movies,
      ...series,
      ...anime,
      ...animeMovies,
      ...foreignSeries,
      ...asianSeries
    ];

    if (allMediaSources.length === 0) return null;
    
    // Remove duplicates by ID to avoid bias
    const uniqueMedia = allMediaSources.reduce((acc, media) => {
      if (!acc.some(item => item.id === media.id)) {
        acc.push(media);
      }
      return acc;
    }, [] as typeof allMediaSources);
    
    // Filter content with rating 9.0 or higher
    const highRatedContent = uniqueMedia.filter(media => {
      const rating = parseFloat(media.rating || '0');
      return rating >= 9.0;
    });
    
    // If no high-rated content, fall back to content with rating 8+ 
    const fallbackContent = uniqueMedia.filter(media => {
      const rating = parseFloat(media.rating || '0');
      return rating >= 8.0;
    });
    
    const contentPool = highRatedContent.length > 0 ? highRatedContent : fallbackContent;
    
    if (contentPool.length === 0) return trending[0] || null;
    
    // Select random item (stable until dependencies change)
    return contentPool[Math.floor(Math.random() * contentPool.length)];
  }, [trending, newReleases, movies, series, anime, animeMovies, foreignSeries, asianSeries]);

  // Check if hero content is in favorites
  const isHeroFavorite = useMemo(() => {
    if (!heroContent || !favorites) return false;
    return favorites.some((fav: any) => fav.mediaId === heroContent.id);
  }, [heroContent, favorites]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden max-w-full relative">
      <DecorativeCircles />
      
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className={`min-h-screen pb-20 md:pb-0 transition-all duration-300 max-w-full overflow-x-hidden relative z-10 ${sidebarOpen ? 'md:mr-64 lg:mr-72' : ''}`}>
        <Header
          onToggleSidebar={() => setSidebarOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="p-4 md:p-6 lg:p-8 space-y-8 md:space-y-10 lg:space-y-12 relative z-10">
          {/* Hero Section */}
          {heroContent && (
            <HeroSection media={heroContent} isFavorite={isHeroFavorite} />
          )}

          {/* Trending Movies */}
          <section className="fade-in">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h3 className="text-xl md:text-2xl lg:text-3xl font-bold" data-testid="trending-title">الأكثر شعبية</h3>
              <Link href="/trending">
                <Button 
                  variant="ghost" 
                  className="text-primary hover:text-primary/80 flex items-center gap-1 md:gap-2 text-sm md:text-base"
                  data-testid="trending-view-all"
                >
                  <span className="hidden sm:inline">عرض الكل</span>
                  <span className="sm:hidden">الكل</span>
                  <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
                </Button>
              </Link>
            </div>

            {trendingLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 lg:gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2 md:space-y-3">
                    <Skeleton className="w-full aspect-[2/3] rounded-lg" />
                    <Skeleton className="h-3 md:h-4 w-3/4" />
                    <Skeleton className="h-2 md:h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                {trending.slice(0, 12).map((media) => (
                  <div key={media.id} className="flex-none w-32 sm:w-40 md:w-48 lg:w-52">
                    <MovieCard media={media} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* New Releases */}
          <section className="fade-in">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h3 className="text-xl md:text-2xl lg:text-3xl font-bold" data-testid="new-releases-title">الإصدارات الجديدة</h3>
              <Link href="/new-releases">
                <Button 
                  variant="ghost" 
                  className="text-primary hover:text-primary/80 flex items-center gap-1 md:gap-2 text-sm md:text-base"
                  data-testid="new-releases-view-all"
                >
                  <span className="hidden sm:inline">عرض الكل</span>
                  <span className="sm:hidden">الكل</span>
                  <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
                </Button>
              </Link>
            </div>

            {newReleasesLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2 md:space-y-3">
                    <Skeleton className="w-full aspect-[2/3] rounded-lg" />
                    <Skeleton className="h-3 md:h-4 w-3/4" />
                    <Skeleton className="h-2 md:h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                {newReleases.slice(0, 12).map((media) => (
                  <div key={media.id} className="flex-none w-32 sm:w-40 md:w-48 lg:w-52">
                    <MovieCard media={media} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Movies Section */}
          {movies.length > 0 && (
            <section className="fade-in">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h3 className="text-xl md:text-2xl lg:text-3xl font-bold" data-testid="movies-title">أفلام</h3>
                <Link href="/movies">
                  <Button 
                    variant="ghost" 
                    className="text-primary hover:text-primary/80 flex items-center gap-1 md:gap-2 text-sm md:text-base"
                    data-testid="movies-view-all"
                  >
                    <span className="hidden sm:inline">عرض الكل</span>
                    <span className="sm:hidden">الكل</span>
                    <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                </Link>
              </div>
              <div className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                {movies.slice(0, 12).map((media) => (
                  <div key={media.id} className="flex-none w-32 sm:w-40 md:w-48 lg:w-52">
                    <MovieCard media={media} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Anime Section */}
          {anime.length > 0 && (
            <section className="fade-in">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h3 className="text-xl md:text-2xl lg:text-3xl font-bold" data-testid="anime-title">أنمي</h3>
                <Link href="/anime">
                  <Button 
                    variant="ghost" 
                    className="text-primary hover:text-primary/80 flex items-center gap-1 md:gap-2 text-sm md:text-base"
                    data-testid="anime-view-all"
                  >
                    <span className="hidden sm:inline">عرض الكل</span>
                    <span className="sm:hidden">الكل</span>
                    <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                </Link>
              </div>
              <div className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                {anime.slice(0, 12).map((media) => (
                  <div key={media.id} className="flex-none w-32 sm:w-40 md:w-48 lg:w-52">
                    <MovieCard media={media} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Anime Movies Section */}
          {animeMovies.length > 0 && (
            <section className="fade-in">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h3 className="text-xl md:text-2xl lg:text-3xl font-bold" data-testid="anime-movies-title">أفلام الأنمي</h3>
                <Link href="/anime-movies">
                  <Button 
                    variant="ghost" 
                    className="text-primary hover:text-primary/80 flex items-center gap-1 md:gap-2 text-sm md:text-base"
                    data-testid="anime-movies-view-all"
                  >
                    <span className="hidden sm:inline">عرض الكل</span>
                    <span className="sm:hidden">الكل</span>
                    <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                </Link>
              </div>
              <div className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                {animeMovies.slice(0, 12).map((media) => (
                  <div key={media.id} className="flex-none w-32 sm:w-40 md:w-48 lg:w-52">
                    <MovieCard media={media} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Foreign Series Section */}
          {foreignSeries.length > 0 && (
            <section className="fade-in">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h3 className="text-xl md:text-2xl lg:text-3xl font-bold" data-testid="foreign-series-title">المسلسلات الأجنبية</h3>
                <Link href="/foreign-series">
                  <Button 
                    variant="ghost" 
                    className="text-primary hover:text-primary/80 flex items-center gap-1 md:gap-2 text-sm md:text-base"
                    data-testid="foreign-series-view-all"
                  >
                    <span className="hidden sm:inline">عرض الكل</span>
                    <span className="sm:hidden">الكل</span>
                    <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                </Link>
              </div>
              <div className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                {foreignSeries.slice(0, 12).map((media) => (
                  <div key={media.id} className="flex-none w-32 sm:w-40 md:w-48 lg:w-52">
                    <MovieCard media={media} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Asian Series Section */}
          {asianSeries.length > 0 && (
            <section className="fade-in">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h3 className="text-xl md:text-2xl lg:text-3xl font-bold" data-testid="asian-series-title">المسلسلات الآسيوية</h3>
                <Link href="/asian-series">
                  <Button 
                    variant="ghost" 
                    className="text-primary hover:text-primary/80 flex items-center gap-1 md:gap-2 text-sm md:text-base"
                    data-testid="asian-series-view-all"
                  >
                    <span className="hidden sm:inline">عرض الكل</span>
                    <span className="sm:hidden">الكل</span>
                    <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                </Link>
              </div>
              <div className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                {asianSeries.slice(0, 12).map((media) => (
                  <div key={media.id} className="flex-none w-32 sm:w-40 md:w-48 lg:w-52">
                    <MovieCard media={media} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Series Section */}
          {series.length > 0 && (
            <section className="fade-in">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h3 className="text-xl md:text-2xl lg:text-3xl font-bold" data-testid="series-title">مسلسلات</h3>
                <Link href="/series">
                  <Button 
                    variant="ghost" 
                    className="text-primary hover:text-primary/80 flex items-center gap-1 md:gap-2 text-sm md:text-base"
                    data-testid="series-view-all"
                  >
                    <span className="hidden sm:inline">عرض الكل</span>
                    <span className="sm:hidden">الكل</span>
                    <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                </Link>
              </div>
              <div className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                {series.slice(0, 12).map((media) => (
                  <div key={media.id} className="flex-none w-32 sm:w-40 md:w-48 lg:w-52">
                    <MovieCard media={media} />
                  </div>
                ))}
              </div>
            </section>
          )}

        </main>

        {isMobile && <BottomNav />}
      </div>
    </div>
  );
}
