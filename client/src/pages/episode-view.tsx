import { useState, useEffect, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Server, RotateCcw, ArrowLeft, ChevronLeft, ChevronRight, Play, SkipForward, SkipBack, ThumbsUp } from "lucide-react";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottom-nav";
import Sidebar from "@/components/layout/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Episode, Server as ServerType, Media } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import MovieCard from "@/components/media/movie-card";

export default function EpisodeView() {
  const { seriesId, episodeNumber } = useParams<{ seriesId: string; episodeNumber: string }>();
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServer, setSelectedServer] = useState<ServerType | null>(null);
  const [isLoopEnabled, setIsLoopEnabled] = useState(false);
  const [triedServers, setTriedServers] = useState<Set<string>>(new Set());
  const [serversExhausted, setServersExhausted] = useState(false);
  const [autoSwitchEnabled, setAutoSwitchEnabled] = useState(true);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const videoRef = useRef<HTMLIFrameElement>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const watchdogTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const serverCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentServerUrlRef = useRef<string | null>(null);
  const selectedServerRef = useRef<ServerType | null>(null);
  const retryCountRef = useRef<number>(0);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch episode data from API - optimized for mobile
  const { data: episodeData, isLoading, error } = useQuery<{episode: Episode, series: Media}>({
    queryKey: ['/api/series', seriesId, 'episodes', episodeNumber],
    enabled: !!seriesId && !!episodeNumber,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const episode = episodeData?.episode;
  const series = episodeData?.series;
  
  // Get all episodes for navigation
  const allEpisodes = (series?.episodes as Episode[]) || [];
  const currentEpisodeIndex = allEpisodes.findIndex(ep => ep.number === parseInt(episodeNumber || '1'));
  const previousEpisode = currentEpisodeIndex > 0 ? allEpisodes[currentEpisodeIndex - 1] : null;
  const nextEpisode = currentEpisodeIndex < allEpisodes.length - 1 ? allEpisodes[currentEpisodeIndex + 1] : null;

  // Query for recommendations - optimized for mobile
  const { data: recommendedMedia, isLoading: isLoadingRecommendations, error: recommendationsError } = useQuery<Media[]>({
    queryKey: ['/api/media/recommendations', seriesId],
    queryFn: async () => {
      const response = await fetch(`/api/media/recommendations/${seriesId}`);
      if (!response.ok && response.status !== 304) {
        throw new Error('Failed to fetch recommendations');
      }
      if (response.status === 304) {
        return [];
      }
      return response.json();
    },
    enabled: !!seriesId,
    retry: 1,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Fallback recommendations logic for development
  const getRecommendations = (currentSeries: Media | undefined): Media[] => {
    if (!currentSeries) return [];
    
    // Sample data for recommendations
    const sampleRecommendations: Media[] = [
      {
        id: "rec-series-1",
        title: "روما",
        description: "مسلسل تاريخي يحكي قصة الإمبراطورية الرومانية",
        descriptionAr: "مسلسل تاريخي يحكي قصة الإمبراطورية الرومانية",
        poster: "https://via.placeholder.com/300x450?text=Rome",
        backdrop: "https://via.placeholder.com/1920x1080?text=Rome",
        type: "series",
        genre: "دراما",
        category: "مسلسلات تاريخية",
        year: "2005",
        rating: "9.0",
        duration: "55 دقيقة",
        episodes: [],
        episodeCount: 22,
        seasons: 2,
        trailerUrl: null,
        isNew: false,
        isTrending: true,
        isPopular: true,
        isFeatured: false,
        createdAt: new Date(),
        servers: [],
        watchUrl: null
      },
      {
        id: "rec-series-2",
        title: "الفايكنغ",
        description: "مسلسل تاريخي عن محاربي الفايكنغ",
        descriptionAr: "مسلسل تاريخي عن محاربي الفايكنغ",
        poster: "https://via.placeholder.com/300x450?text=Vikings",
        backdrop: "https://via.placeholder.com/1920x1080?text=Vikings",
        type: "series",
        genre: "دراما",
        category: "مسلسلات تاريخية",
        year: "2013",
        rating: "8.5",
        duration: "45 دقيقة",
        episodes: [],
        episodeCount: 89,
        seasons: 6,
        trailerUrl: null,
        isNew: false,
        isTrending: false,
        isPopular: true,
        isFeatured: false,
        createdAt: new Date(),
        servers: [],
        watchUrl: null
      }
    ];

    // Filter recommendations based on genre and category similarity
    const currentGenre = currentSeries.genre?.toLowerCase() || '';
    const currentCategory = currentSeries.category?.toLowerCase() || '';
    
    return sampleRecommendations.filter(item => {
      // Same type (series)
      if (item.type !== currentSeries.type) return false;
      
      // Similar genre or category
      const itemGenre = item.genre?.toLowerCase() || '';
      const itemCategory = item.category?.toLowerCase() || '';
      
      return itemGenre.includes(currentGenre) || 
             currentGenre.includes(itemGenre) ||
             itemCategory.includes(currentCategory) ||
             currentCategory.includes(itemCategory);
    }).slice(0, 6); // Limit to 6 recommendations for episode view
  };

  // Limit recommendations on mobile for better performance
  const recommendationLimit = isMobile ? 3 : 6;
  const displayRecommendations = (recommendedMedia ?? getRecommendations(series)).slice(0, recommendationLimit);

  useEffect(() => {
    if (episode?.servers && episode.servers.length > 0) {
      const firstServer = episode.servers[0];
      setSelectedServer(firstServer);
      selectedServerRef.current = firstServer;
      setTriedServers(new Set([firstServer.url]));
      // Start watchdog immediately when episode loads
      setTimeout(() => {
        startWatchdog(firstServer.url);
      }, 1000);
    }
  }, [episode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearWatchdog();
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
        autoPlayTimeoutRef.current = null;
      }
    };
  }, []);

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

  const startWatchdog = (serverUrl: string) => {
    if (!autoSwitchEnabled) return;
    if (isMobile) return; // Disable watchdog on mobile for performance
    
    if (watchdogTimeoutRef.current) {
      clearTimeout(watchdogTimeoutRef.current);
    }
    if (serverCheckIntervalRef.current) {
      clearInterval(serverCheckIntervalRef.current);
    }
    
    currentServerUrlRef.current = serverUrl;
    const isVidtubeUrl = serverUrl.includes('vidtube.pro');
    const isMegaNzUrl = serverUrl.includes('mega.nz');
    const isVideaUrl = serverUrl.includes('videa.hu');
    const isDailymotionUrl = serverUrl.includes('dailymotion');
    const is4SharedUrl = serverUrl.includes('4shared.com');
    const isOkRuUrl = serverUrl.includes('ok.ru');
    const isMyAnimeListUrl = serverUrl.includes('myanimelist.');
    
    // Reset retry count for new server
    retryCountRef.current = 0;
    
    // Start periodic checks to see if iframe is responsive
    let checkCount = 0;
    // Different timeouts for different domains
    let maxChecks = 8; // Default: 40s (8 * 5s)
    if (isVidtubeUrl) {
      maxChecks = 15; // Vidtube: 75s (15 * 5s)
    } else if (isMegaNzUrl || isVideaUrl) {
      maxChecks = 12; // Mega.nz/Videa: 60s (12 * 5s)
    } else if (isDailymotionUrl || is4SharedUrl || isOkRuUrl) {
      maxChecks = 10; // Other popular sites: 50s (10 * 5s)
    } else if (isMyAnimeListUrl) {
      maxChecks = 6; // CDN resources: 30s (6 * 5s)
    }
    
    // Store interval ID locally to prevent cross-interference
    const intervalId = setInterval(() => {
      checkCount++;
      
      // Only continue if we're still on the same server - use refs for latest values
      const currentUrl = currentServerUrlRef.current;
      const currentServer = selectedServerRef.current;
      
      if (currentUrl !== serverUrl || !currentServer || currentServer.url !== serverUrl) {
        console.log('Server changed, stopping checks for:', serverUrl);
        clearInterval(intervalId); // Clear our own interval, not the ref
        return;
      }
      
      console.log(`Server check ${checkCount}/${maxChecks} for:`, currentServer?.name);
      
      const iframe = videoRef.current;
      if (iframe && iframe.contentWindow) {
        try {
          // Try to ping the iframe - if it's responsive, clear watchdog
          iframe.contentWindow.postMessage('ping', '*');
        } catch (error) {
          console.log('Cannot communicate with iframe (expected for external domains)');
        }
      }
      
      // Auto-switch after checks are complete
      if (checkCount >= maxChecks) {
        console.log(`Auto-switching after ${maxChecks} checks for:`, currentServer?.name);
        clearInterval(intervalId);
        handleServerError();
        return;
      }
    }, 5000);
    
    // Store the interval ID in ref for external clearing
    serverCheckIntervalRef.current = intervalId;
    
    // Immediate failure detection (X-Frame-Options/CSP blocks)
    const quickTimeoutId = setTimeout(() => {
      const currentUrl = currentServerUrlRef.current;
      const currentServer = selectedServerRef.current;
      
      if (currentUrl === serverUrl && currentServer && currentServer.url === serverUrl) {
        // Check if iframe failed to load content - this might indicate immediate blocking
        const iframe = videoRef.current;
        if (iframe) {
          try {
            // If we can't access the iframe content at all, it might be blocked
            const hasContent = iframe.contentDocument || iframe.contentWindow;
            if (!hasContent) {
              console.log('Iframe blocked immediately, switching server:', currentServer?.name);
              clearInterval(intervalId);
              handleServerError();
              return;
            }
          } catch (error) {
            // Expected for cross-origin, continue monitoring
          }
        }
      }
    }, isVidtubeUrl ? 15000 : (isMegaNzUrl || isVideaUrl || isDailymotionUrl) ? 12000 : 10000); // Different timeouts for different domains
    
    // Store the timeout ID in ref for external clearing  
    watchdogTimeoutRef.current = quickTimeoutId;
  };

  const clearWatchdog = () => {
    if (watchdogTimeoutRef.current) {
      clearTimeout(watchdogTimeoutRef.current);
      watchdogTimeoutRef.current = null;
    }
    if (serverCheckIntervalRef.current) {
      clearInterval(serverCheckIntervalRef.current);
      serverCheckIntervalRef.current = null;
    }
    currentServerUrlRef.current = null;
  };

  const handleServerError = () => {
    if (!episode || !selectedServer || serversExhausted || !autoSwitchEnabled) return;

    console.log('Server error detected, switching from:', selectedServer.name);
    console.log('Tried servers:', Array.from(triedServers));
    console.log('Retry count:', retryCountRef.current);

    // Check the domain type for specific error handling
    const isVidtubeUrl = selectedServer.url.includes('vidtube.pro');
    const isMegaNzUrl = selectedServer.url.includes('mega.nz');
    const isVideaUrl = selectedServer.url.includes('videa.hu');
    const isDailymotionUrl = selectedServer.url.includes('dailymotion');
    const is4SharedUrl = selectedServer.url.includes('4shared.com');
    const isOkRuUrl = selectedServer.url.includes('ok.ru');
    const isMyAnimeListUrl = selectedServer.url.includes('myanimelist.');
    
    // Retry current server once before switching
    if (retryCountRef.current < 1) {
      retryCountRef.current++;
      console.log(`Retrying server ${selectedServer.name} (attempt ${retryCountRef.current})`);
      
      // Small delay before retry
      setTimeout(() => {
        if (videoRef.current && selectedServer) {
          videoRef.current.src = selectedServer.url;
          startWatchdog(selectedServer.url);
        }
      }, 2000);
      
      toast({
        title: "إعادة محاولة",
        description: `جاري إعادة المحاولة مع ${selectedServer.name}...`,
      });
      return;
    }
    
    const allServers = episode.servers;
    const remainingServers = allServers.filter(s => !triedServers.has(s.url));
    
    if (remainingServers.length > 0) {
      const nextServer = remainingServers[0];
      console.log('Switching to server:', nextServer.name);
      
      setSelectedServer(nextServer);
      selectedServerRef.current = nextServer;
      setTriedServers(prev => new Set(prev).add(nextServer.url));
      retryCountRef.current = 0; // Reset retry count for new server
      startWatchdog(nextServer.url);
      
      let toastDescription = `${selectedServer.name} لا يعمل - تم التبديل إلى ${nextServer.name}`;
      
      if (isVidtubeUrl) {
        toastDescription = `${selectedServer.name} قد يحتاج وقت أطول للتحميل - تم التبديل إلى ${nextServer.name}`;
      } else if (isMegaNzUrl) {
        toastDescription = `${selectedServer.name} (Mega.nz) قد يكون محجوب - تم التبديل إلى ${nextServer.name}`;
      } else if (isVideaUrl) {
        toastDescription = `${selectedServer.name} (Videa.hu) قد يحتاج إلغاء حجب الإعلانات - تم التبديل إلى ${nextServer.name}`;
      } else if (isDailymotionUrl) {
        toastDescription = `${selectedServer.name} (Dailymotion) قد يحتاج انتظار انتهاء الإعلانات - تم التبديل إلى ${nextServer.name}`;
      } else if (is4SharedUrl || isOkRuUrl) {
        toastDescription = `${selectedServer.name} قد يحتاج تسجيل دخول - تم التبديل إلى ${nextServer.name}`;
      } else if (isMyAnimeListUrl) {
        toastDescription = `${selectedServer.name} (CDN) قد يكون غير متاح مؤقتاً - تم التبديل إلى ${nextServer.name}`;
      }
      
      toast({
        title: "تبديل السيرفر",
        description: toastDescription,
      });
    } else {
      setServersExhausted(true);
      clearWatchdog();
      toast({
        title: "خطأ في التشغيل",
        description: "جميع السيرفرات غير متاحة حالياً. جرب إعادة تحميل الصفحة أو اضغط 'الفيديو يعمل' إذا كان يعمل بالفعل.",
        variant: "destructive",
      });
    }
  };

  const handleToggleLoop = (enabled: boolean) => {
    setIsLoopEnabled(enabled);
    
    // Cancel any pending auto-play when disabled
    if (!enabled && autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
      toast({
        title: "تم إلغاء التشغيل التلقائي",
        description: "تم إيقاف العد التنازلي للحلقة التالية",
      });
    } else {
      toast({
        title: enabled ? "تم تفعيل التشغيل التلقائي" : "تم إلغاء التشغيل التلقائي",
        description: enabled ? "سيتم تشغيل الحلقة التالية تلقائياً" : "لن يتم تشغيل الحلقة التالية تلقائياً",
      });
    }
  };

  const handleToggleAutoSwitch = (enabled: boolean) => {
    setAutoSwitchEnabled(enabled);
    if (!enabled) {
      clearWatchdog();
    } else if (selectedServer) {
      startWatchdog(selectedServer.url);
    }
    
    toast({
      title: enabled ? "تم تفعيل التبديل التلقائي" : "تم إلغاء التبديل التلقائي",
      description: enabled ? "سيتم تبديل السيرفرات تلقائياً عند الحاجة" : "لن يتم تبديل السيرفرات تلقائياً",
    });
  };

  const reloadCurrentEpisode = () => {
    if (!selectedServer || !episode) return;
    
    clearWatchdog();
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    
    setTriedServers(new Set([selectedServer.url]));
    setServersExhausted(false);
    retryCountRef.current = 0;
    
    // Reload iframe
    if (videoRef.current) {
      videoRef.current.src = selectedServer.url;
    }
    
    if (autoSwitchEnabled) {
      startWatchdog(selectedServer.url);
    }
    
    toast({
      title: "إعادة تحميل",
      description: "جاري إعادة تحميل الحلقة...",
    });
  };

  // Navigation functions
  const navigateToEpisode = (targetEpisode: Episode) => {
    if (!series) return;
    
    clearWatchdog();
    setLocation(`/series/${series.id}/episode/${targetEpisode.number}?autoplay=true`);
    
    toast({
      title: "انتقال للحلقة",
      description: `الحلقة ${targetEpisode.number}: ${targetEpisode.title}`,
    });
  };

  const handleAutoPlayNext = () => {
    if (!nextEpisode || !isLoopEnabled) return;
    
    // Clear any existing auto-play timeout
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
    
    const countdown = 5; // 5 seconds countdown
    
    toast({
      title: "تشغيل تلقائي",
      description: `سيتم تشغيل الحلقة التالية خلال ${countdown} ثواني...`,
      duration: countdown * 1000,
    });
    
    // Store the timeout reference so it can be cancelled
    autoPlayTimeoutRef.current = setTimeout(() => {
      // Double check current state in case user disabled it during countdown
      if (isLoopEnabled && nextEpisode) {
        navigateToEpisode(nextEpisode);
      }
      autoPlayTimeoutRef.current = null;
    }, countdown * 1000);
  };

  // Simulate video completion for auto-play (this would normally come from iframe events)
  const handleVideoCompletion = () => {
    if (isLoopEnabled && nextEpisode) {
      handleAutoPlayNext();
    }
  };

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
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="aspect-video bg-muted rounded"></div>
              <div className="flex gap-2">
                <div className="h-8 bg-muted rounded w-20"></div>
                <div className="h-8 bg-muted rounded w-20"></div>
              </div>
            </div>
          </main>
          {isMobile && <BottomNav />}
        </div>
      </div>
    );
  }

  if (error || !episode || !series) {
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
              <h2 className="text-2xl font-bold mb-4">الحلقة غير موجودة</h2>
              <p className="text-muted-foreground mb-6">لم يتم العثور على الحلقة المطلوبة</p>
              <Link href={`/series/${seriesId}`}>
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  العودة للسلسلة
                </Button>
              </Link>
            </div>
          </main>
          {isMobile && <BottomNav />}
        </div>
      </div>
    );
  }

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
        <main className="p-2 sm:p-4 space-y-4 sm:space-y-6">
          {/* Back Button and Episode Info */}
          <div className="flex items-center justify-between">
            <Link href={`/series/${seriesId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                العودة للسلسلة
              </Button>
            </Link>
          </div>

          {/* Episode Header */}
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2" data-testid="episode-title">
                {episode.title}
              </h1>
              <p className="text-muted-foreground text-base md:text-lg">
                من مسلسل {series.title}
              </p>
            </div>
          </div>

          {/* Video Player */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h3 className="text-lg md:text-xl font-bold">المشغل</h3>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-xs sm:text-sm font-medium">تشغيل تلقائي</span>
                  <Switch 
                    checked={isLoopEnabled}
                    onCheckedChange={handleToggleLoop}
                    data-testid="loop-toggle"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  <span className="text-xs sm:text-sm font-medium">تبديل تلقائي</span>
                  <Switch 
                    checked={autoSwitchEnabled}
                    onCheckedChange={handleToggleAutoSwitch}
                    data-testid="auto-switch-toggle"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Server Selection */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {episode.servers.map((server: ServerType, index: number) => (
                    <Button
                      key={index}
                      size="sm"
                      variant={selectedServer?.url === server.url ? "default" : "outline"}
                      onClick={() => {
                        if (errorTimeoutRef.current) {
                          clearTimeout(errorTimeoutRef.current);
                          errorTimeoutRef.current = null;
                        }
                        
                        setSelectedServer(server);
                        selectedServerRef.current = server;
                        setTriedServers(prev => new Set(prev).add(server.url));
                        setServersExhausted(false);
                        startWatchdog(server.url);
                        toast({
                          title: "تم التبديل للسيرفر",
                          description: server.name,
                        });
                      }}
                      data-testid={`server-button-${index}`}
                      className="flex-1 min-w-[100px] sm:flex-none text-xs sm:text-sm min-h-[44px] sm:min-h-auto"
                    >
                      <Server className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      {server.name}
                      {triedServers.has(server.url) && selectedServer?.url !== server.url && (
                        <span className="text-xs opacity-60 mr-1 hidden sm:inline">(مجرب)</span>
                      )}
                    </Button>
                  ))}
                </div>
                
                {/* Server info and controls */}
                <div className="text-xs text-muted-foreground mb-4 space-y-2 px-1">
                  <div className="flex items-start gap-2">
                    <span className="leading-relaxed">💡 {autoSwitchEnabled ? 'سيتم مراقبة السيرفر تلقائياً. أوقات المراقبة: Vidtube (75 ثانية)، Mega.nz/Videa (60 ثانية)، Dailymotion/4shared/OK.ru (50 ثانية)، MyAnimeList (30 ثانية)، الأخرى (40 ثانية). إذا ظهر الفيديو اضغط "الفيديو يعمل".' : 'المراقبة التلقائية معطلة. استخدم الأزرار لتبديل السيرفرات يدوياً.'}</span>
                  </div>
                  {selectedServer && autoSwitchEnabled && (
                    selectedServer.url.includes('vidtube.pro') ? (
                      <div className="flex items-start gap-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 p-2 rounded-md">
                        <span className="leading-relaxed">🔧 Vidtube.pro قد يحتاج وقت أطول للتحميل. إذا رأيت الفيديو يعمل، اضغط "الفيديو يعمل" فوراً</span>
                      </div>
                    ) : selectedServer.url.includes('mega.nz') ? (
                      <div className="flex items-start gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 p-2 rounded-md">
                        <span className="leading-relaxed">📁 Mega.nz - خدمة تخزين ملفات. قد يحتاج تحديث الصفحة إذا لم يظهر الفيديو</span>
                      </div>
                    ) : selectedServer.url.includes('videa.hu') ? (
                      <div className="flex items-start gap-2 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 p-2 rounded-md">
                        <span className="leading-relaxed">🎬 Videa.hu - منصة فيديو مجرية. قد تحتاج إلى إلغاء حجب الإعلانات</span>
                      </div>
                    ) : selectedServer.url.includes('dailymotion') ? (
                      <div className="flex items-start gap-2 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 p-2 rounded-md">
                        <span className="leading-relaxed">📺 Dailymotion - منصة فيديو فرنسية. قد تظهر إعلانات قبل الفيديو</span>
                      </div>
                    ) : (selectedServer.url.includes('4shared.com') || selectedServer.url.includes('ok.ru')) ? (
                      <div className="flex items-start gap-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 p-2 rounded-md">
                        <span className="leading-relaxed">⚠️ هذا السيرفر قد يحتاج تسجيل دخول أو يحتوي على إعلانات كثيرة</span>
                      </div>
                    ) : selectedServer.url.includes('myanimelist.') ? (
                      <div className="flex items-start gap-2 text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 p-2 rounded-md">
                        <span className="leading-relaxed">🗃️ MyAnimeList CDN - مصدر محتوى مباشر</span>
                      </div>
                    ) : null
                  )}
                </div>
                
                {/* User feedback and manual controls */}
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  {/* Video is working confirmation */}
                  {autoSwitchEnabled && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        clearWatchdog();
                        setAutoSwitchEnabled(false);
                        toast({
                          title: "ممتاز! الفيديو يعمل",
                          description: "تم إيقاف التبديل التلقائي - استمتع بالمشاهدة!",
                          duration: 3000,
                        });
                      }}
                      data-testid="video-working-button"
                      className="bg-green-600 hover:bg-green-700 w-full sm:w-auto flex-1 sm:flex-none min-h-[44px] text-sm"
                    >
                      ✓ الفيديو يعمل
                    </Button>
                  )}
                  
                  {/* Manual server switch button */}
                  {selectedServer && episode.servers.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentIndex = episode.servers.findIndex(s => s.url === selectedServer.url);
                        const nextIndex = (currentIndex + 1) % episode.servers.length;
                        const nextServer = episode.servers[nextIndex];
                        
                        clearWatchdog();
                        setSelectedServer(nextServer);
                        selectedServerRef.current = nextServer;
                        setTriedServers(prev => new Set(prev).add(nextServer.url));
                        setServersExhausted(false);
                        retryCountRef.current = 0;
                        
                        if (autoSwitchEnabled) {
                          startWatchdog(nextServer.url);
                        }
                        
                        toast({
                          title: "تم التبديل يدوياً",
                          description: `تم التبديل إلى ${nextServer.name}`,
                        });
                      }}
                      data-testid="manual-switch-button"
                      className="w-full sm:w-auto flex-1 sm:flex-none min-h-[44px] text-sm"
                    >
                      <Server className="w-4 h-4 mr-2" />
                      جرب سرفر آخر
                    </Button>
                  )}
                </div>
                
                {/* Video Frame */}
                {selectedServer && (
                  <div className="aspect-video w-full max-w-4xl mx-auto video-player-container relative rounded-lg overflow-hidden bg-black">
                    {/* Special handling for different domains */}
                    {selectedServer.url.includes('mega.nz') || selectedServer.url.includes('videa.hu') ? (
                      // For domains that block iframes, provide a direct link
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gray-900">
                        <div className="text-center space-y-4">
                          <div className="text-lg font-bold">
                            {selectedServer.url.includes('mega.nz') ? '📁 Mega.nz' : '🎬 Videa.hu'}
                          </div>
                          <p className="text-sm text-gray-300 max-w-md">
                            {selectedServer.url.includes('mega.nz') 
                              ? 'هذا السيرفر لا يدعم العرض المدمج. يرجى فتح الرابط في نافذة جديدة'
                              : 'هذا السيرفر قد يحتاج إلى فتح في نافذة منفصلة لتجنب حجب الإعلانات'
                            }
                          </p>
                          <div className="space-y-2">
                            <Button
                              onClick={() => window.open(selectedServer.url, '_blank', 'noopener,noreferrer')}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              data-testid="open-external-button"
                            >
                              فتح في نافذة جديدة
                            </Button>
                            <div className="text-xs text-gray-400">
                              سيتم فتح الفيديو في نافذة منفصلة
                            </div>
                          </div>
                        </div>
                        {/* Hidden iframe for fallback */}
                        <iframe
                          ref={videoRef}
                          src={selectedServer.url}
                          className="hidden"
                          onLoad={() => {
                            console.log('Hidden iframe loaded for:', selectedServer.name);
                          }}
                        />
                      </div>
                    ) : (
                      // Regular iframe for other domains
                      <iframe
                        ref={videoRef}
                        src={selectedServer.url}
                        frameBorder="0"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-presentation"
                        referrerPolicy={
                          selectedServer.url.includes('vidtube.pro') || 
                          selectedServer.url.includes('updown.icu') || 
                          selectedServer.url.includes('mega.nz') || 
                          selectedServer.url.includes('videa.hu') || 
                          selectedServer.url.includes('dailymotion') || 
                          selectedServer.url.includes('4shared.com') || 
                          selectedServer.url.includes('ok.ru') ||
                          selectedServer.url.includes('myanimelist.') 
                          ? 'no-referrer' : 'no-referrer-when-downgrade'
                        }
                        loading="lazy"
                        onError={(e) => {
                          console.error('Iframe error detected for server:', selectedServer.name, e);
                          console.log('Iframe failed to load, may be blocked by X-Frame-Options');
                          
                          // For blocked iframes, show external link option
                          if (selectedServer.url.includes('dailymotion') || 
                              selectedServer.url.includes('4shared.com') || 
                              selectedServer.url.includes('ok.ru') ||
                              selectedServer.url.includes('myanimelist.')) {
                            handleServerError();
                          }
                        }}
                        onLoad={(e) => {
                          console.log('Iframe loaded successfully for server:', selectedServer.name);
                          
                          // Check if iframe actually has content
                          setTimeout(() => {
                            try {
                              const iframe = e.target as HTMLIFrameElement;
                              console.log('Checking iframe content for:', selectedServer.name);
                              
                              toast({
                                title: "السرفر جاهز",
                                description: `${selectedServer.name} - إذا لم يظهر الفيديو جرب سيرفر آخر`,
                              });
                            } catch (error) {
                              console.log('Cannot access iframe content (expected for cross-origin)');
                            }
                          }, 1000);
                        }}
                        data-testid="video-player"
                        className="video-player-iframe absolute inset-0 w-full h-full rounded-lg border-0"
                        style={{ 
                          background: "#000",
                          border: "none",
                          outline: "none",
                          display: "block"
                        }}
                      />
                    )}
                  </div>
                )}

                {/* Reload Button */}
                {serversExhausted && (
                  <Button 
                    onClick={reloadCurrentEpisode}
                    variant="outline"
                    className="w-full"
                    data-testid="reload-episode-button"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    إعادة تشغيل الحلقة
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Episode Navigation */}
          {allEpisodes.length > 1 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-bold">حلقات المسلسل</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Current Episode Info and Navigation */}
                  <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                        {episode?.number}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{episode?.title}</p>
                        <p className="text-xs text-muted-foreground">
                          الحلقة {episode?.number} من {allEpisodes.length}
                        </p>
                      </div>
                    </div>
                    
                    {/* Quick Navigation Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => previousEpisode && navigateToEpisode(previousEpisode)}
                        disabled={!previousEpisode}
                        data-testid="previous-episode-button"
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => nextEpisode && navigateToEpisode(nextEpisode)}
                        disabled={!nextEpisode}
                        data-testid="next-episode-button"
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Auto-play Next Episode */}
                  {nextEpisode && isLoopEnabled && (
                    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <SkipForward className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700 dark:text-green-300">
                            الحلقة التالية: {nextEpisode.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleAutoPlayNext}
                            className="text-green-700 border-green-300 hover:bg-green-100"
                            data-testid="test-autoplay-button"
                          >
                            جرب التشغيل التلقائي
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => navigateToEpisode(nextEpisode)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            data-testid="play-next-episode-button"
                          >
                            <Play className="w-3 h-3 mr-1" />
                            تشغيل الآن
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Episodes Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {allEpisodes.map((ep) => (
                      <Button
                        key={ep.number}
                        variant={ep.number === episode?.number ? "default" : "outline"}
                        size="sm"
                        onClick={() => ep.number !== episode?.number && navigateToEpisode(ep)}
                        disabled={ep.number === episode?.number}
                        data-testid={`episode-nav-${ep.number}`}
                        className="flex flex-col h-16 p-2 text-xs"
                      >
                        <span className="font-bold">{ep.number}</span>
                        <span className="text-xs opacity-70 truncate max-w-full" title={ep.title}>
                          {ep.title.length > 8 ? ep.title.substring(0, 8) + '...' : ep.title}
                        </span>
                      </Button>
                    ))}
                  </div>

                  {/* Next/Previous Episode Buttons */}
                  {(previousEpisode || nextEpisode) && (
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      {previousEpisode && (
                        <Button
                          variant="outline"
                          onClick={() => navigateToEpisode(previousEpisode)}
                          className="flex-1"
                          data-testid="previous-episode-full-button"
                        >
                          <SkipBack className="w-4 h-4 mr-2" />
                          الحلقة السابقة: {previousEpisode.title}
                        </Button>
                      )}
                      
                      {nextEpisode && (
                        <Button
                          variant="outline"
                          onClick={() => navigateToEpisode(nextEpisode)}
                          className="flex-1"
                          data-testid="next-episode-full-button"
                        >
                          الحلقة التالية: {nextEpisode.title}
                          <SkipForward className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations Section */}
          {series && (
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <ThumbsUp className="w-5 h-5 text-primary" />
                    مسلسلات مشابهة
                  </h3>
                  <Badge variant="secondary" className="bg-primary/20 text-primary">
                    {displayRecommendations.length} مسلسل
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  مسلسلات مشابهة لـ {series.title} قد تستمتع بمشاهدتها
                </p>
              </CardHeader>
              <CardContent>
                {isLoadingRecommendations ? (
                  <div className="space-y-4" data-testid="status-recommendations-loading">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      جاري البحث عن مسلسلات مشابهة...
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="space-y-2 animate-pulse">
                          <Skeleton className="h-48 w-full rounded-lg" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
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
                          حدث خطأ أثناء جلب المسلسلات المشابهة. يرجى المحاولة مرة أخرى.
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
                      تم العثور على {displayRecommendations.length} مسلسل مشابه
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {displayRecommendations.map((recommendedItem, index) => (
                        <div 
                          key={recommendedItem.id}
                          className="transform transition-all duration-300 hover:scale-105"
                          style={{ animationDelay: `${index * 100}ms` }}
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
                    <CardContent className="p-6 text-center">
                      <div className="space-y-4">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                          <ThumbsUp className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-lg font-medium">لا توجد اقتراحات متاحة حالياً</h4>
                          <p className="text-muted-foreground text-sm max-w-md mx-auto">
                            نعمل على إضافة المزيد من المسلسلات المشابهة لـ {series.title} قريباً.
                          </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href="/series">
                            تصفح المزيد من المسلسلات
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          )}

        </main>

        {isMobile && <BottomNav />}
      </div>
    </div>
  );
}