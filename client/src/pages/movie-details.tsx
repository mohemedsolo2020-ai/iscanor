import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useSearch, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useToggleFavorite } from "@/hooks/use-profile";
import { useUpdateWatchHistory } from "@/hooks/use-media";
import { Play, Heart, ArrowRight, Star, Clock, Calendar, Film, Server, RotateCcw, ThumbsUp } from "lucide-react";
import { Link } from "wouter";
import { useVirtualizer } from "@tanstack/react-virtual";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottom-nav";
import Sidebar from "@/components/layout/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Episode, Server as ServerType, Media } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import MovieCard from "@/components/media/movie-card";
import { DEFAULT_POSTER, MEDIA_TYPES } from "@/lib/constants";

const EPISODES_PER_PAGE = 12;

interface MovieDetailsProps {
  id: string;
}

// Helper function to check if media has episodes (considers both type and actual episode data)
const hasEpisodesData = (media: any) => {
  const episodeTypes = [
    MEDIA_TYPES.SERIES,
    MEDIA_TYPES.ANIME,
    MEDIA_TYPES.ANIME_MOVIE,
    MEDIA_TYPES.FOREIGN_SERIES,
    MEDIA_TYPES.ASIAN_SERIES
  ];
  
  // For traditional episode-based types, check if they have episode data
  if (episodeTypes.includes(media.type)) {
    return Array.isArray(media.episodes) && media.episodes.length > 0;
  }
  
  // For movies, only show episodes if they actually have episode data (multi-part movies)
  if (media.type === MEDIA_TYPES.MOVIE) {
    return Array.isArray(media.episodes) && media.episodes.length > 0;
  }
  
  return false;
};

export default function MovieDetails() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearch();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [selectedServer, setSelectedServer] = useState<ServerType | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [isLoopEnabled, setIsLoopEnabled] = useState(false);
  const [triedServers, setTriedServers] = useState<Set<string>>(new Set());
  const [serversExhausted, setServersExhausted] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [episodesToShow, setEpisodesToShow] = useState(EPISODES_PER_PAGE);
  const [iframeReady, setIframeReady] = useState(false);
  const { toast } = useToast();
  const episodesParentRef = useRef<HTMLDivElement>(null);
  const toggleFavorite = useToggleFavorite();
  const updateWatchHistory = useUpdateWatchHistory();
  const isMobile = useIsMobile();
  const videoRef = useRef<HTMLIFrameElement>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const watchdogTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const popupBlockerRef = useRef<NodeJS.Timeout | null>(null);

  // Determine media type from current URL path
  const isSeriesRoute = location.startsWith('/series/');
  const apiEndpoint = isSeriesRoute ? `/api/series/${id}` : `/api/movie/${id}`;

  // Fetch media data from API - optimized for mobile
  const { data: media, isLoading, error } = useQuery<Media>({
    queryKey: [apiEndpoint],
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes  
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  // Sample fallback data for development (remove when API is fully connected)
  const fallbackMedia = {
    id: "624",
    title: "Freedom 2024",
    description: "مستوحاة من أحداث حقيقية، قصة برونو سولاك، أرسين لوبين الحقيقي من القرن العشرين.",
    descriptionAr: "مستوحاة من أحداث حقيقية، قصة برونو سولاك، أرسين لوبين الحقيقي من القرن العشرين.",
    poster: "https://web6.topcinema.cam/wp-content/uploads/2024/11/MV5BNWU3NzdjY2EtOGJhZC00MzM5LWExNjctNjZhMDc5Zjc2YzQ2XkEyXkFqcGc@.jpg_V1_SX700-439x650.jpg",
    backdrop: "https://web6.topcinema.cam/wp-content/uploads/2024/11/MV5BNWU3NzdjY2EtOGJhZC00MzM5LWExNjctNjZhMDc5Zjc2YzQ2XkEyXkFqcGc@.jpg_V1_SX700-439x650.jpg",
    watchUrl: "https://vidtube.pro/embed-q10ze7w2kxnp.html",
    servers: [
      {
        name: "سيرفر 1",
        url: "https://vidtube.pro/embed-q10ze7w2kxnp.html"
      },
      {
        name: "سيرفر 2",
        url: "https://updown.icu/embed-9gbd8qcwfhnq-1280x640.html"
      }
    ],
    year: "2024",
    duration: "1 ساعة و 50 دقيقة",
    rating: "5.9",
    category: "Biography, Crime, Drama",
    type: "movie",
    genre: "Biography",
    isNew: true,
    isPopular: false,
    isFeatured: false,
    isTrending: false,
    trailerUrl: "",
    episodes: null,
    episodeCount: null,
    seasons: null,
    createdAt: new Date()
  };

  // Enhanced security monitoring - disabled on mobile for performance
  useEffect(() => {
    if (isMobile) return; // Skip on mobile to improve performance
    
    const securityMonitor = () => {
      const iframe = videoRef.current;
      if (!iframe) return;
      
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
            const newSrc = (mutation.target as HTMLIFrameElement).src;
            if (selectedServer && !newSrc.includes(selectedServer.url)) {
              console.warn('Iframe src changed unexpectedly:', newSrc);
            }
          }
        });
      });
      
      observer.observe(iframe, {
        attributes: true,
        attributeFilter: ['src']
      });
      
      return () => {
        observer.disconnect();
      };
    };
    
    const cleanup = securityMonitor();
    return cleanup;
  }, [selectedServer, isMobile]);

  useEffect(() => {
    const mediaData = media || fallbackMedia;
    if (mediaData?.episodes && Array.isArray(mediaData.episodes) && mediaData.episodes.length > 0) {
      setSelectedEpisode(mediaData.episodes[0]);
      setSelectedServer(mediaData.episodes[0].servers[0]);
    } else if (mediaData?.type === 'movie' && mediaData?.servers && Array.isArray(mediaData.servers) && mediaData.servers.length > 0) {
      // For movies, set the first server as selected
      setSelectedServer(mediaData.servers[0]);
    }
  }, [media]);


  // Track page visit in watch history - deferred for better performance
  useEffect(() => {
    if (!media?.id) return;
    
    const timeout = setTimeout(() => {
      updateWatchHistory.mutate({
        mediaId: media.id,
        progress: 0,
      });
    }, 1000);
    
    return () => clearTimeout(timeout);
  }, [media?.id]);

  // Use media data or fallback
  const displayMedia = media || fallbackMedia;

  // Query for recommendations - optimized for mobile
  // Use the correct endpoint based on media type to handle ID conflicts
  const recommendationsEndpoint = isSeriesRoute 
    ? `/api/series/${id}/recommendations` 
    : `/api/movie/${id}/recommendations`;
  
  const { data: recommendedMedia, isLoading: isLoadingRecommendations, error: recommendationsError } = useQuery<Media[]>({
    queryKey: [recommendationsEndpoint],
    queryFn: async () => {
      const response = await fetch(recommendationsEndpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }
      return response.json();
    },
    enabled: !!id && !!media,
    retry: 1,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Fallback recommendations logic for development
  const getRecommendations = (currentMedia: any): Media[] => {
    // Sample data for recommendations - in real app this would come from API
    const sampleRecommendations: Media[] = [
      {
        id: "rec1",
        title: "Breaking Bad",
        description: "مدرس كيمياء يبدأ في تصنيع المخدرات",
        descriptionAr: "مدرس كيمياء يبدأ في تصنيع المخدرات مع طالب سابق",
        poster: "https://via.placeholder.com/300x450?text=Breaking+Bad",
        backdrop: "https://via.placeholder.com/1920x1080?text=Breaking+Bad",
        type: currentMedia.type, // Same type (movie/series)
        genre: currentMedia.genre || "drama",
        category: "crime, drama, thriller",
        year: "2008",
        rating: "9.5",
        duration: "47 دقيقة",
        watchUrl: currentMedia.type === 'movie' ? "https://example.com/movie1" : null,
        servers: currentMedia.type === 'movie' ? [{ name: "سيرفر 1", url: "https://example.com/movie1" }] : null,
        episodes: currentMedia.type === 'series' ? [] : null,
        episodeCount: currentMedia.type === 'series' ? 62 : null,
        seasons: currentMedia.type === 'series' ? 5 : null,
        trailerUrl: null,
        isNew: false,
        isTrending: true,
        isPopular: true,
        isFeatured: true,
        createdAt: new Date()
      },
      {
        id: "rec2", 
        title: "Better Call Saul",
        description: "قصة المحامي سول جودمان قبل أحداث بريكنغ باد",
        descriptionAr: "قصة المحامي سول جودمان قبل أحداث بريكنغ باد",
        poster: "https://via.placeholder.com/300x450?text=Better+Call+Saul",
        backdrop: "https://via.placeholder.com/1920x1080?text=Better+Call+Saul",
        type: currentMedia.type,
        genre: currentMedia.genre || "drama", 
        category: "crime, drama, legal",
        year: "2015",
        rating: "8.8",
        duration: "45 دقيقة",
        watchUrl: currentMedia.type === 'movie' ? "https://example.com/movie2" : null,
        servers: currentMedia.type === 'movie' ? [{ name: "سيرفر 1", url: "https://example.com/movie2" }] : null,
        episodes: currentMedia.type === 'series' ? [] : null,
        episodeCount: currentMedia.type === 'series' ? 63 : null,
        seasons: currentMedia.type === 'series' ? 6 : null,
        trailerUrl: null,
        isNew: false,
        isTrending: false,
        isPopular: true,
        isFeatured: false,
        createdAt: new Date()
      },
      {
        id: "rec3",
        title: "Ozark", 
        description: "عائلة تنتقل لغسل الأموال في منطقة أوزارك",
        descriptionAr: "عائلة تنتقل لغسل الأموال في منطقة أوزارك",
        poster: "https://via.placeholder.com/300x450?text=Ozark",
        backdrop: "https://via.placeholder.com/1920x1080?text=Ozark", 
        type: currentMedia.type,
        genre: currentMedia.genre || "drama",
        category: "crime, drama, thriller",
        year: "2017",
        rating: "8.4",
        duration: "50 دقيقة",
        watchUrl: currentMedia.type === 'movie' ? "https://example.com/movie3" : null,
        servers: currentMedia.type === 'movie' ? [{ name: "سيرفر 1", url: "https://example.com/movie3" }] : null,
        episodes: currentMedia.type === 'series' ? [] : null,
        episodeCount: currentMedia.type === 'series' ? 44 : null,
        seasons: currentMedia.type === 'series' ? 4 : null,
        trailerUrl: null,
        isNew: false,
        isTrending: true,
        isPopular: true,
        isFeatured: false,
        createdAt: new Date()
      },
      {
        id: "rec4",
        title: "Narcos",
        description: "قصة كارتلات المخدرات في كولومبيا",
        descriptionAr: "قصة كارتلات المخدرات في كولومبيا",
        poster: "https://via.placeholder.com/300x450?text=Narcos",
        backdrop: "https://via.placeholder.com/1920x1080?text=Narcos",
        type: currentMedia.type,
        genre: currentMedia.genre || "drama",
        category: "crime, drama, biography",
        year: "2015",
        rating: "8.8",
        duration: "49 دقيقة", 
        watchUrl: currentMedia.type === 'movie' ? "https://example.com/movie4" : null,
        servers: currentMedia.type === 'movie' ? [{ name: "سيرفر 1", url: "https://example.com/movie4" }] : null,
        episodes: currentMedia.type === 'series' ? [] : null,
        episodeCount: currentMedia.type === 'series' ? 30 : null,
        seasons: currentMedia.type === 'series' ? 3 : null,
        trailerUrl: null,
        isNew: false,
        isTrending: false,
        isPopular: true,
        isFeatured: false,
        createdAt: new Date()
      }
    ];

    // Filter recommendations based on genre and category similarity
    const currentGenre = currentMedia.genre?.toLowerCase() || '';
    const currentCategory = currentMedia.category?.toLowerCase() || '';
    
    return sampleRecommendations.filter(item => {
      // Same type (movie/series)
      if (item.type !== currentMedia.type) return false;
      
      // Similar genre or category
      const itemGenre = item.genre?.toLowerCase() || '';
      const itemCategory = item.category?.toLowerCase() || '';
      
      return itemGenre.includes(currentGenre) || 
             currentGenre.includes(itemGenre) ||
             itemCategory.includes(currentCategory) ||
             currentCategory.includes(itemCategory);
    }); // Show all recommendations
  };

  // Show all recommendations
  const displayRecommendations = (recommendedMedia ?? getRecommendations(displayMedia));

  // Episodes virtualization for better mobile performance
  const allEpisodes = useMemo(() => {
    return (displayMedia?.episodes as Episode[]) || [];
  }, [displayMedia?.episodes]);
  
  const episodeVirtualizer = useVirtualizer({
    count: allEpisodes.length,
    getScrollElement: () => episodesParentRef.current,
    estimateSize: () => (isMobile ? 180 : 220),
    overscan: isMobile ? 8 : 5,
    enabled: allEpisodes.length > 0,
  });

  // Auto-play effect - placed after all hooks but before early returns
  useEffect(() => {
    const urlParams = new URLSearchParams(searchParams);
    const mediaData = media || fallbackMedia;
    if (urlParams.get('autoplay') === 'true') {
      if (selectedEpisode) {
        // Start playing the first episode automatically
        handlePlayEpisode(selectedEpisode);
      } else if (mediaData?.type === 'movie' && selectedServer) {
        // Start playing the movie automatically
        handlePlayMovie();
      }
    }
  }, [selectedEpisode, selectedServer, searchParams]);

  if (isLoading) {
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
            <div className="space-y-4">
              <Skeleton className="h-96 w-full rounded-xl" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </main>
          {isMobile && <BottomNav />}
        </div>
      </div>
    );
  }

  if (error && !fallbackMedia) {
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
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">لم يتم العثور على المحتوى المطلوب</p>
              <Link href="/">
                <Button className="mt-4">العودة للرئيسية</Button>
              </Link>
            </div>
          </main>
          {isMobile && <BottomNav />}
        </div>
      </div>
    );
  }

  function handlePlayEpisode(episode: Episode, server?: ServerType) {
    // Guard against episodes with no servers
    if (!episode.servers || episode.servers.length === 0) {
      toast({
        title: "خطأ",
        description: "لا توجد سيرفرات متاحة لهذه الحلقة",
        variant: "destructive",
      });
      return;
    }

    // Navigate to the episode page with autoplay enabled
    const episodeRoute = `/series/${id}/episode/${episode.number}?autoplay=true`;
    setLocation(episodeRoute);
    
    toast({
      title: "بدء التشغيل",
      description: `انتقال إلى ${episode.title}`,
    });
  }

  function handlePlayMovie() {
    const mediaData = media || fallbackMedia;
    
    // Guard against movies with no servers
    if (!mediaData?.servers || !Array.isArray(mediaData.servers) || mediaData.servers.length === 0) {
      toast({
        title: "خطأ",
        description: "لا توجد سيرفرات متاحة لهذا الفيلم",
        variant: "destructive",
      });
      return;
    }

    // Show the player and start playing
    setShowPlayer(true);
    startWatchdog();
    
    toast({
      title: "بدء التشغيل",
      description: `بدء تشغيل ${mediaData.title}`,
    });
  }


  function handleMovieServerError() {
    const mediaData = media || fallbackMedia;
    if (!mediaData?.servers || !selectedServer || serversExhausted) return;
    
    clearWatchdog();
    
    // Clear any existing timeout
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    
    // Debounce errors to prevent rapid switching
    errorTimeoutRef.current = setTimeout(() => {
      // Add current server to tried servers using functional update
      setTriedServers(prev => {
        const newTriedServers = new Set(prev);
        newTriedServers.add(selectedServer.url);
        
        // Find next untried server
        const availableServers = (mediaData.servers as ServerType[])?.filter(
          (server: ServerType) => !newTriedServers.has(server.url)
        ) || [];
        
        if (availableServers.length > 0) {
          const nextServer = availableServers[0];
          setSelectedServer(nextServer);
          startWatchdog(); // Start watchdog for new server
          toast({
            title: "تم التبديل تلقائياً",
            description: `جاري المحاولة مع ${nextServer.name}`,
          });
        } else {
          // All servers tried, set exhausted state
          setServersExhausted(true);
          toast({
            title: "فشل في تحميل جميع السيرفرات",
            description: "يرجى المحاولة لاحقاً أو اختيار فيلم آخر",
            variant: "destructive",
          });
        }
        
        return newTriedServers;
      });
    }, 1000); // 1 second debounce
  }

  const handleToggleFavorites = async () => {
    try {
      await toggleFavorite.mutateAsync({
        mediaId: displayMedia.id,
        action: isFavorite ? 'remove' : 'add',
      });
      setIsFavorite(!isFavorite);
      toast({
        title: isFavorite ? "تم الحذف من المفضلة" : "تم الإضافة للمفضلة",
        description: displayMedia.title,
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحديث المفضلة",
        variant: "destructive",
      });
    }
  };

  const handleToggleLoop = () => {
    setIsLoopEnabled(!isLoopEnabled);
    toast({
      title: isLoopEnabled ? "تم إيقاف التكرار اليدوي" : "تم تفعيل التكرار اليدوي",
      description: isLoopEnabled ? "سيتم تشغيل الحلقة مرة واحدة" : "يمكنك الآن إعادة تشغيل الحلقة يدوياً",
    });
  };

  function startWatchdog() {
    // Clear any existing watchdog
    if (watchdogTimeoutRef.current) {
      clearTimeout(watchdogTimeoutRef.current);
    }
    
    // Start new watchdog for server load timeout (10 seconds)
    watchdogTimeoutRef.current = setTimeout(() => {
      handleServerError(); // Treat timeout as server error
    }, 10000);
  }

  function clearWatchdog() {
    if (watchdogTimeoutRef.current) {
      clearTimeout(watchdogTimeoutRef.current);
      watchdogTimeoutRef.current = null;
    }
  }

  function handleServerError() {
    const mediaData = media || fallbackMedia;
    
    // Handle movie server errors
    if (mediaData?.type === 'movie') {
      handleMovieServerError();
      return;
    }
    
    // Handle episode server errors
    if (!selectedEpisode || !selectedServer || serversExhausted) return;
    
    clearWatchdog();
    
    // Clear any existing timeout
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    
    // Debounce errors to prevent rapid switching
    errorTimeoutRef.current = setTimeout(() => {
      // Add current server to tried servers using functional update
      setTriedServers(prev => {
        const newTriedServers = new Set(prev);
        newTriedServers.add(selectedServer.url);
        
        // Find next untried server
        const availableServers = selectedEpisode.servers.filter(
          server => !newTriedServers.has(server.url)
        );
        
        if (availableServers.length > 0) {
          const nextServer = availableServers[0];
          setSelectedServer(nextServer);
          startWatchdog(); // Start watchdog for new server
          toast({
            title: "تم التبديل تلقائياً",
            description: `جاري المحاولة مع ${nextServer.name}`,
          });
        } else {
          // All servers tried, set exhausted state
          setServersExhausted(true);
          toast({
            title: "فشل في تحميل جميع السيرفرات",
            description: "يرجى المحاولة لاحقاً أو اختيار حلقة أخرى",
            variant: "destructive",
          });
        }
        
        return newTriedServers;
      });
    }, 1000); // 1 second debounce
  }

  const handleServerLoad = () => {
    // Clear all timeouts on successful load
    clearWatchdog();
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    
    // Reset error state and tried servers on successful load
    if (selectedServer?.url) {
      setTriedServers(new Set([selectedServer.url]));
      setServersExhausted(false);
    }
  };

  const handleRestartEpisode = () => {
    if (videoRef.current) {
      // Clear all timers before restart
      clearWatchdog();
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
      
      // Start watchdog before reloading
      startWatchdog();
      videoRef.current.src = videoRef.current.src;
      toast({
        title: "تم إعادة تشغيل الحلقة",
        description: "بدء الحلقة من جديد",
      });
    }
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

        <main className="p-3 sm:p-4 md:p-6">
          {/* Breadcrumb - Mobile optimized */}
          <div className="mb-3 sm:mb-4 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground overflow-x-auto scrollbar-hide">
            <Link href="/">
              <span className="hover:text-foreground cursor-pointer whitespace-nowrap">الرئيسية</span>
            </Link>
            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <Link href={displayMedia.type === 'movie' ? '/movies' : '/series'}>
              <span className="hover:text-foreground cursor-pointer whitespace-nowrap">
                {displayMedia.type === 'movie' ? 'الأفلام' : 
                 displayMedia.type === 'anime' ? 'الأنمي' :
                 displayMedia.type === 'anime_movie' ? 'أفلام الأنمي' :
                 displayMedia.type === 'foreign_series' ? 'المسلسلات الأجنبية' :
                 displayMedia.type === 'asian_series' ? 'المسلسلات الآسيوية' :
                 'المسلسلات'}
              </span>
            </Link>
            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="text-foreground truncate">{displayMedia.title}</span>
          </div>

          {/* Hero Section - Enhanced Mobile Layout */}
          <div className="relative rounded-lg sm:rounded-xl overflow-hidden mb-4 sm:mb-6 lg:mb-8">
            <div 
              className="h-96 sm:h-96 md:h-80 lg:h-96 bg-cover bg-center relative"
              style={{ backgroundImage: `url(${(displayMedia as any).backdrop || (displayMedia as any).poster || (displayMedia as any).backdropUrl || (displayMedia as any).posterUrl})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
              
              {/* Mobile Layout */}
              <div className="md:hidden absolute inset-0 flex flex-col justify-end p-4 pb-8">
                <div className="flex gap-3 mb-3">
                  <img
                    src={(displayMedia as any).poster || (displayMedia as any).posterUrl}
                    alt={displayMedia.title}
                    className="w-36 h-52 object-cover rounded-lg shadow-2xl flex-shrink-0 border-2 border-white/20"
                    loading="eager"
                    decoding="async"
                    data-testid="movie-poster"
                  />
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold text-white mb-2 leading-tight" data-testid="movie-title">
                      {displayMedia.title}
                    </h1>
                    
                    <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                      <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-md">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-white font-medium">{displayMedia.rating}</span>
                      </div>
                      <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-md">
                        <Calendar className="w-3 h-3 text-white/80" />
                        <span className="text-white/80">{displayMedia.year}</span>
                      </div>
                      <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-md">
                        <Clock className="w-3 h-3 text-white/80" />
                        <span className="text-white/80">{displayMedia.duration}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2">
                      {displayMedia.category?.split(',').slice(0, 2).map((cat, index) => (
                        <Badge key={index} variant="secondary" className="bg-white/20 text-white text-xs px-2 py-0.5">
                          {cat.trim()}
                        </Badge>
                      ))}
                    </div>
                    
                    {hasEpisodesData(displayMedia) && (
                      <div className="flex items-center gap-1 text-xs text-white/80 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-md inline-flex">
                        <Film className="w-3 h-3" />
                        <span>{(displayMedia.episodes as Episode[]).length} حلقة</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {hasEpisodesData(displayMedia) && selectedEpisode && selectedServer && (
                    <Button 
                      className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold h-11 shadow-lg"
                      onClick={() => handlePlayEpisode(selectedEpisode, selectedServer)}
                      data-testid="play-button"
                    >
                      <Play className="w-5 h-5 mr-1 fill-current" />
                      <span className="text-sm">تشغيل</span>
                    </Button>
                  )}
                  {displayMedia.type === 'movie' && (displayMedia as any).servers && Array.isArray((displayMedia as any).servers) && (displayMedia as any).servers.length > 0 && (
                    <Button 
                      className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold h-11 shadow-lg"
                      onClick={handlePlayMovie}
                      data-testid="play-movie-button"
                    >
                      <Play className="w-5 h-5 mr-1 fill-current" />
                      <span className="text-sm">تشغيل</span>
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    className={`flex-1 border-2 text-white hover:bg-white/10 backdrop-blur-sm h-11 font-semibold shadow-lg ${isFavorite ? 'bg-primary/30 border-primary' : 'border-white/30'}`}
                    onClick={handleToggleFavorites}
                    data-testid="favorite-button"
                  >
                    <Heart className={`w-5 h-5 mr-1 ${isFavorite ? 'fill-current text-primary' : ''}`} />
                    <span className="text-sm">{isFavorite ? 'المفضلة' : 'مفضلة'}</span>
                  </Button>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden md:block absolute bottom-0 left-0 right-0 p-6 lg:p-8">
                <div className="flex gap-6">
                  <img
                    src={(displayMedia as any).poster || (displayMedia as any).posterUrl}
                    alt={displayMedia.title}
                    className="w-32 h-48 lg:w-48 lg:h-72 object-cover rounded-lg shadow-2xl"
                    loading="eager"
                    decoding="async"
                    data-testid="movie-poster"
                  />
                  <div className="flex-1">
                    <h1 className="text-3xl lg:text-5xl font-bold text-white mb-2 leading-tight" data-testid="movie-title">
                      {displayMedia.title}
                    </h1>
                    
                    <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="w-5 h-5 text-yellow-400 fill-current" />
                        <span className="text-white font-medium">{displayMedia.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-white/80" />
                        <span className="text-white/80">{displayMedia.year}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-white/80" />
                        <span className="text-white/80">{displayMedia.duration}</span>
                      </div>
                      {hasEpisodesData(displayMedia) && (
                        <div className="flex items-center gap-1">
                          <Film className="w-4 h-4 text-white/80" />
                          <span className="text-white/80">{(displayMedia.episodes as Episode[]).length} حلقة</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {displayMedia.category?.split(',').slice(0, 4).map((cat, index) => (
                        <Badge key={index} variant="secondary" className="bg-white/20 text-white text-sm">
                          {cat.trim()}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {hasEpisodesData(displayMedia) && selectedEpisode && selectedServer && (
                        <Button 
                          size="lg"
                          className="bg-primary hover:bg-primary/90"
                          onClick={() => handlePlayEpisode(selectedEpisode, selectedServer)}
                          data-testid="play-button"
                        >
                          <Play className="w-5 h-5 mr-2" />
                          تشغيل {selectedEpisode.title}
                        </Button>
                      )}
                      {displayMedia.type === 'movie' && (displayMedia as any).servers && Array.isArray((displayMedia as any).servers) && (displayMedia as any).servers.length > 0 && (
                        <Button 
                          size="lg"
                          className="bg-primary hover:bg-primary/90"
                          onClick={handlePlayMovie}
                          data-testid="play-movie-button"
                        >
                          <Play className="w-5 h-5 mr-2" />
                          تشغيل الفيلم
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="lg"
                        className={`border-white/30 text-white hover:bg-white/10 ${isFavorite ? 'bg-blue-500/20 border-blue-400' : ''}`}
                        onClick={handleToggleFavorites}
                        data-testid="favorite-button"
                      >
                        <Heart className={`w-5 h-5 mr-2 ${isFavorite ? 'fill-current text-blue-400' : ''}`} />
                        {isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Tabs - Enhanced Mobile Design */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className={`grid w-full h-auto p-1.5 ${hasEpisodesData(displayMedia) ? 'grid-cols-3' : 'grid-cols-2'} gap-1`}>
              <TabsTrigger value="overview" className="text-sm py-3 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md transition-all duration-200">
                نظرة عامة
              </TabsTrigger>
              {hasEpisodesData(displayMedia) && (
                <TabsTrigger value="episodes" className="text-sm py-3 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md transition-all duration-200">
                  الحلقات
                </TabsTrigger>
              )}
              <TabsTrigger value="recommendations" className="text-sm py-3 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md transition-all duration-200">
                {hasEpisodesData(displayMedia) ? (
                  <>
                    <span className="block md:hidden">المقترحات</span>
                    <span className="hidden md:block">اقتراحات مشابهة</span>
                  </>
                ) : 'اقتراحات مشابهة'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <h3 className="text-lg sm:text-xl font-bold">القصة</h3>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed" data-testid="movie-description">
                    {displayMedia.description}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <h3 className="text-lg sm:text-xl font-bold">التفاصيل</h3>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <h4 className="font-medium text-muted-foreground mb-1">العنوان الأصلي</h4>
                      <p>{displayMedia.title}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-muted-foreground mb-1">سنة الإنتاج</h4>
                      <p>{displayMedia.year}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-muted-foreground mb-1">التقييم</h4>
                      <p className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        {displayMedia.rating}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-muted-foreground mb-1">المدة</h4>
                      <p>{displayMedia.duration}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-muted-foreground mb-1">النوع</h4>
                      <p>{displayMedia.type === 'movie' ? 'فيلم' : displayMedia.type === 'series' ? 'مسلسل' : displayMedia.type}</p>
                    </div>
                    {displayMedia.type === 'series' && Array.isArray(displayMedia.episodes) && displayMedia.episodes.length > 0 && (
                      <div>
                        <h4 className="font-medium text-muted-foreground mb-1">عدد الحلقات</h4>
                        <p>{displayMedia.episodes.length} حلقة</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Video Player - Mobile optimized */}
              {showPlayer && selectedServer && (selectedEpisode || displayMedia.type === 'movie') && (
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex flex-col gap-3">
                      <h3 className="text-xl font-bold">مشغل الفيديو</h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <RotateCcw className="w-4 h-4" />
                          <span className="text-sm font-medium">تكرار يدوي</span>
                        </div>
                        <Switch 
                          checked={isLoopEnabled}
                          onCheckedChange={handleToggleLoop}
                          data-testid="loop-toggle"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Server Selection - Enhanced Mobile Design */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">اختر السيرفر المناسب:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2">
                        {(() => {
                          // Get servers based on content type
                          const servers = displayMedia.type === 'movie' 
                            ? ((displayMedia as any).servers as ServerType[] || [])
                            : (selectedEpisode?.servers || []);
                          
                          return servers.map((server: ServerType, index: number) => (
                            <Button
                              key={index}
                              size="default"
                              variant={selectedServer?.url === server.url ? "default" : "outline"}
                              onClick={() => {
                                // Clear any pending error timeout before user action
                                if (errorTimeoutRef.current) {
                                  clearTimeout(errorTimeoutRef.current);
                                  errorTimeoutRef.current = null;
                                }
                                
                                setSelectedServer(server);
                                setTriedServers(prev => new Set(prev).add(server.url));
                                setServersExhausted(false);
                                startWatchdog(); // Start watchdog for manual server change
                                toast({
                                  title: "تم التبديل للسيرفر",
                                  description: server.name,
                                });
                              }}
                              data-testid={`server-button-${index}`}
                              className={`h-12 text-sm font-medium ${selectedServer?.url === server.url ? 
                                'bg-primary text-primary-foreground border-primary' : 
                                'border-border hover:border-primary/50 hover:bg-primary/5'
                              } transition-all duration-200`}
                            >
                              <Server className="w-4 h-4 mr-2" />
                              {server.name}
                              {selectedServer?.url === server.url && (
                                <div className="w-2 h-2 bg-green-400 rounded-full mr-2" />
                              )}
                            </Button>
                          ));
                        })()}
                      </div>
                      {(() => {
                        const servers = displayMedia.type === 'movie' 
                          ? ((displayMedia as any).servers as ServerType[] || [])
                          : (selectedEpisode?.servers || []);
                        return servers.length > 1 && (
                          <p className="text-xs text-muted-foreground">
                            💡 يمكنك تجربة سيرفر آخر إذا واجهت مشاكل في التحميل
                          </p>
                        );
                      })()}
                    </div>
                    
                    {/* Video Frame - Mobile optimized */}
                    <div className="aspect-video w-full video-player-container rounded-lg overflow-hidden bg-black">
                      <iframe
                        ref={videoRef}
                        key={selectedServer.url} // Force reload when server changes
                        src={selectedServer.url}
                        className="w-full h-full border-0 video-player-iframe"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-presentation"
                        loading="lazy"
                        referrerPolicy={selectedServer.url.includes('vidtube.pro') ? 'no-referrer' : 'no-referrer-when-downgrade'}
                        title={selectedEpisode ? selectedEpisode.title : displayMedia.title}
                        data-testid="video-player"
                        onError={handleServerError}
                        onLoad={handleServerLoad}
                        style={{
                          filter: 'none',
                          background: '#000',
                          border: 'none',
                          outline: 'none',
                          display: 'block'
                        }}
                      />
                    
                      {/* Player Controls Under Video */}
                      <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                              <Film className="w-4 h-4 text-primary" />
                              <span className="font-medium">الآن يتم تشغيل:</span>
                              <span className="text-muted-foreground">{selectedEpisode ? selectedEpisode.title : displayMedia.title}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Server className="w-4 h-4 text-primary" />
                              <span className="text-muted-foreground">{selectedServer.name}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                              السيرفر محمي من الإعلانات والنوافذ المنبثقة
                            </div>
                            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                              ✓ محمي من الإعلانات
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Loop Info */}
                      {isLoopEnabled && (
                        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <div className="flex items-center gap-2 text-sm text-primary">
                            <RotateCcw className="w-4 h-4" />
                            <span>تم تفعيل التكرار اليدوي - اضغط الزر أدناه لإعادة التشغيل</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Loop Button for Manual Restart */}
                      {isLoopEnabled && (
                        <Button 
                          onClick={handleRestartEpisode}
                          variant="outline"
                          size="sm"
                          data-testid="restart-episode-button"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          إعادة تشغيل الحلقة
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {hasEpisodesData(displayMedia) && (
              <TabsContent value="episodes" className="space-y-4 sm:space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg sm:text-xl font-bold">الحلقات</h3>
                    <Badge variant="secondary" className="bg-primary/20 text-primary text-xs sm:text-sm">
                      {allEpisodes.length} حلقة
                    </Badge>
                  </div>
                  
                  {allEpisodes.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">لا توجد حلقات متاحة</p>
                    </div>
                  ) : (
                  <div 
                    ref={episodesParentRef}
                    className="space-y-4"
                    style={{ height: isMobile ? '600px' : '800px', overflow: 'auto' }}
                    key={`episodes-${allEpisodes.length}`}
                  >
                    <div
                      style={{
                        height: `${episodeVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                        minHeight: '100px',
                      }}
                    >
                      {allEpisodes.length > 0 && episodeVirtualizer.getVirtualItems().map((virtualItem) => {
                        const episode = allEpisodes[virtualItem.index];
                        if (!episode) return null;
                        return (
                      <div
                        key={virtualItem.key}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualItem.size}px`,
                          transform: `translateY(${virtualItem.start}px)`,
                          paddingBottom: '8px',
                        }}
                      >
                      <div 
                        className="episode-card group relative bg-card hover:bg-card/80 rounded-xl border border-border/50 overflow-hidden hover:border-primary/30 transition-all duration-200 h-full"
                        data-testid={`episode-card-${episode.number}`}
                      >
                        {/* Mobile Layout */}
                        <div className="md:hidden">
                          <div 
                            className="flex gap-4 p-3 cursor-pointer active:scale-[0.98] transition-transform"
                            onClick={() => episode.servers && episode.servers.length > 0 && handlePlayEpisode(episode)}
                          >
                            {/* Episode Thumbnail */}
                            <div className="episode-thumbnail relative w-24 h-36 flex-shrink-0 overflow-hidden rounded-lg shadow-lg border-2 border-primary/20">
                              <img 
                                src={(displayMedia as any).poster || (displayMedia as any).posterUrl || DEFAULT_POSTER}
                                alt={`${displayMedia.title} - الحلقة ${episode.number}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                              <div className="absolute top-2 right-2 z-10">
                                <div className="bg-primary text-primary-foreground px-2.5 py-1 rounded-lg text-sm font-bold shadow-lg">
                                  {episode.number}
                                </div>
                              </div>
                              
                              {/* Play Overlay */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-primary/95 backdrop-blur-sm rounded-full p-3 shadow-2xl ring-2 ring-white/30">
                                  <Play className="w-6 h-6 text-white fill-current" />
                                </div>
                              </div>
                            </div>
                            
                            {/* Episode Info */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                              <div>
                                <div className="flex items-start gap-2 mb-2">
                                  <h4 className="text-base font-bold line-clamp-2 flex-1" data-testid={`episode-title-${episode.number}`}>
                                    {episode.title}
                                  </h4>
                                </div>
                                
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="flex items-center gap-1 text-xs bg-primary/10 border border-primary/20 px-2 py-1 rounded-md">
                                    <span className="font-semibold text-primary">الحلقة {episode.number}</span>
                                  </div>
                                  {episode.servers && episode.servers.length > 0 && (
                                    <div className="flex items-center gap-1 text-xs bg-primary/10 border border-primary/20 px-2 py-1 rounded-md">
                                      <Server className="w-3 h-3 text-primary" />
                                      <span className="text-primary font-semibold">{episode.servers.length}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Action Button */}
                              <div>
                                {episode.servers && episode.servers.length > 0 ? (
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePlayEpisode(episode);
                                    }}
                                    className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground h-11 font-bold shadow-lg"
                                    size="sm"
                                    data-testid={`play-episode-${episode.number}`}
                                  >
                                    <Play className="w-5 h-5 mr-2 fill-current" />
                                    تشغيل الآن
                                  </Button>
                                ) : (
                                  <Button variant="secondary" disabled size="sm" className="w-full h-11">
                                    غير متاحة
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Desktop Layout */}
                        <div 
                          className="hidden md:flex cursor-pointer"
                          onClick={() => episode.servers && episode.servers.length > 0 && handlePlayEpisode(episode)}
                        >
                          {/* Episode Thumbnail */}
                          <div className="episode-thumbnail relative w-40 h-full overflow-hidden flex-shrink-0">
                            <img 
                              src={(displayMedia as any).poster || (displayMedia as any).posterUrl || DEFAULT_POSTER}
                              alt={`${displayMedia.title} - الحلقة ${episode.number}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                            <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-black/40 to-black/60" />
                            <div className="absolute top-2 right-2 z-10">
                              <div className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm font-bold">
                                {episode.number}
                              </div>
                            </div>
                            
                            {/* Play Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50">
                              <div className="bg-white rounded-full p-3 transform scale-90 group-hover:scale-100 transition-transform">
                                <Play className="w-6 h-6 text-black fill-current" />
                              </div>
                            </div>
                          </div>
                          
                          {/* Episode Info */}
                          <div className="flex-1 p-6">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors" data-testid={`episode-title-${episode.number}`}>
                                  {episode.title}
                                </h4>
                                <p className="text-sm text-muted-foreground mb-3">
                                  الحلقة {episode.number} • {displayMedia.title}
                                </p>
                              </div>
                              <Badge variant="outline" className="ml-3">
                                {episode.servers?.length || 0} سيرفر
                              </Badge>
                            </div>
                            
                            {/* Episode Description */}
                            <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                              {`استمتع بمشاهدة ${episode.title} من ${displayMedia.title} مع جودة عالية وبدون إعلانات مزعجة.`}
                            </p>
                            
                            {/* Progress Bar Placeholder */}
                            <div className="flex items-center gap-3 mb-4">
                              <div className="flex-1">
                                <div className="h-1 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary/30 rounded-full" style={{width: '0%'}} />
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground">45 دقيقة</span>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2">
                              {episode.servers && episode.servers.length > 0 ? (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlayEpisode(episode);
                                  }}
                                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                  size="sm"
                                  data-testid={`play-episode-${episode.number}`}
                                >
                                  <Play className="w-4 h-4 mr-2" />
                                  تشغيل الآن
                                </Button>
                              ) : (
                                <Button variant="secondary" disabled size="sm">
                                  غير متاح
                                </Button>
                              )}
                              
                            </div>

                            {/* Server Selection for Desktop */}
                            {episode.servers && episode.servers.length > 1 && (
                              <div className="mt-4 pt-4 border-t border-border/30">
                                <div className="flex flex-wrap gap-2">
                                  <span className="text-xs text-muted-foreground mr-2">السيرفرات المتاحة:</span>
                                  {episode.servers.map((server, serverIndex) => (
                                    <Badge 
                                      key={serverIndex} 
                                      variant="secondary" 
                                      className="text-xs cursor-pointer hover:bg-primary/20 hover:text-primary transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePlayEpisode(episode, server);
                                      }}
                                    >
                                      {server.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      </div>
                        );
                      })}
                    </div>
                  </div>
                  )}
                </div>
              </TabsContent>
            )}

            <TabsContent value="recommendations" className="space-y-4 sm:space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    اقتراحات مشابهة
                  </h3>
                  <Badge variant="secondary" className="bg-primary/20 text-primary text-xs sm:text-sm">
                    {displayRecommendations.length} {displayMedia.type === 'movie' ? 'فيلم' : 'مسلسل'}
                  </Badge>
                </div>
                
                <p className="text-muted-foreground text-xs sm:text-sm">
                  {displayMedia.type === 'movie' ? 'أفلام' : 'مسلسلات'} مشابهة لـ {displayMedia.title} قد تستمتع بمشاهدتها
                </p>

                {isLoadingRecommendations ? (
                  <div className="space-y-4" data-testid="status-recommendations-loading">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      جاري البحث عن محتوى مشابه...
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
                      {Array.from({ length: isMobile ? 4 : 8 }).map((_, index) => (
                        <div key={index} className="space-y-2 animate-pulse">
                          <Skeleton className="h-48 sm:h-56 md:h-64 w-full rounded-lg" />
                          <Skeleton className="h-3 sm:h-4 w-3/4" />
                          <Skeleton className="h-2 sm:h-3 w-1/2" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : recommendationsError ? (
                  <Card className="border-destructive/20 bg-destructive/5" data-testid="status-recommendations-error">
                    <CardContent className="p-6 text-center">
                      <div className="space-y-3">
                        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                          <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h4 className="text-lg font-medium">خطأ في تحميل الاقتراحات</h4>
                        <p className="text-muted-foreground text-sm">
                          حدث خطأ أثناء جلب المحتوى المشابه. يرجى المحاولة مرة أخرى.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.location.reload()}
                          className="mt-3"
                        >
                          إعادة المحاولة
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : displayRecommendations && displayRecommendations.length > 0 ? (
                  <div className="space-y-4" data-testid="status-recommendations-success">
                    <div className="text-sm text-muted-foreground">
                      تم العثور على {displayRecommendations.length} عنصر مشابه
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
                      {displayRecommendations.map((recommendedItem, index) => (
                        <div 
                          key={recommendedItem.id}
                          className="transform transition-all duration-300 hover:scale-105"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <MovieCard
                            media={recommendedItem}
                            size="default"
                            data-testid={`recommendation-${recommendedItem.id}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Card className="bg-muted/30" data-testid="status-recommendations-empty">
                    <CardContent className="p-8 text-center">
                      <div className="space-y-4">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                          <ThumbsUp className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-lg font-medium">لا توجد اقتراحات متاحة حالياً</h4>
                          <p className="text-muted-foreground text-sm max-w-md mx-auto">
                            نعمل على إضافة المزيد من المحتوى المشابه لـ {displayMedia.title} قريباً. 
                            في هذه الأثناء، يمكنك تصفح أقسام أخرى.
                          </p>
                        </div>
                        <div className="flex justify-center gap-2 pt-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={displayMedia.type === 'movie' ? '/movies' : '/series'}>
                              تصفح المزيد من {displayMedia.type === 'movie' ? 'الأفلام' : 'المسلسلات'}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Additional info about recommendations */}
                <Card className="bg-muted/20 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <ThumbsUp className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <h4 className="font-medium text-sm">كيف نختار الاقتراحات؟</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          نقترح عليك محتوى مشابه بناءً على النوع، التصنيف، والتقييم لضمان تجربة مشاهدة ممتعة
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>


          </Tabs>
        </main>

        {isMobile && <BottomNav />}
      </div>
    </div>
  );
}