import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUpdateWatchHistory } from "@/hooks/use-media";
import { useToggleFavorite } from "@/hooks/use-profile";
import { useToast } from "@/hooks/use-toast";
import type { Media } from "@shared/schema";
import { Play, Plus } from "lucide-react";
import { DEFAULT_BACKDROP } from "@/lib/constants";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";

interface HeroSectionProps {
  media?: Media;
  isFavorite?: boolean;
}

export default function HeroSection({ media, isFavorite = false }: HeroSectionProps) {
  const { toast } = useToast();
  const updateWatchHistory = useUpdateWatchHistory();
  const toggleFavorite = useToggleFavorite();
  const [, setLocation] = useLocation();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentImage, setCurrentImage] = useState(media?.backdrop || media?.poster || DEFAULT_BACKDROP);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Handle smooth content transitions when media changes
  useEffect(() => {
    if (media) {
      setIsTransitioning(true);
      setImageLoaded(false);
      
      // Set new image source
      const newImageSrc = media.backdrop || media.poster || DEFAULT_BACKDROP;
      setCurrentImage(newImageSrc);
      
      // Reset transition state after animation (matched to CSS duration)
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 700);
      
      return () => clearTimeout(timer);
    }
  }, [media?.id, media?.backdrop, media?.poster]);

  if (!media) return null;

  const handlePlay = async () => {
    try {
      await updateWatchHistory.mutateAsync({
        mediaId: media.id,
        progress: 5,
      });
      
      // Redirect to viewing page with auto-play parameter
      const route = media.type === 'movie' ? `/movie/${media.id}?autoplay=true` : `/series/${media.id}?autoplay=true`;
      setLocation(route);
      
      toast({
        title: "تم بدء التشغيل",
        description: `بدء تشغيل ${media.title}`,
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "حدث خطأ في بدء التشغيل",
        variant: "destructive",
      });
    }
  };

  const handleAddToList = async () => {
    try {
      await toggleFavorite.mutateAsync({
        mediaId: media.id,
        action: isFavorite ? 'remove' : 'add',
      });
      toast({
        title: isFavorite ? "تم الحذف من المفضلة" : "تم الإضافة للمفضلة",
        description: media.title,
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "حدث خطأ في تحديث المفضلة",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="relative h-[70vh] md:h-[600px] rounded-2xl overflow-hidden shadow-2xl">
      {/* Enhanced image container with professional transitions */}
      <div className="relative w-full h-full">
        {/* Main backdrop/poster image with enhanced loading and transitions */}
        <div className={`absolute inset-0 transition-all duration-700 ease-out ${
          isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
        }`}>
          <img
            src={currentImage}
            alt={media.title}
            className={`w-full h-full object-cover transition-all duration-1000 ease-out ${
              imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
            }`}
            data-testid="hero-backdrop"
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== DEFAULT_BACKDROP) {
                target.src = DEFAULT_BACKDROP;
              }
            }}
          />
        </div>

        {/* Enhanced poster overlay with floating animation */}
        {media.poster && media.poster !== currentImage && (
          <div className="absolute top-8 right-8 w-32 md:w-40 lg:w-48 opacity-90 hover:opacity-100 transition-opacity duration-300 hero-poster-float">
            <img
              src={media.poster}
              alt={`${media.title} Poster`}
              className="w-full h-auto rounded-xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 border-2 border-white/20 backdrop-blur-sm"
              data-testid="hero-poster"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      {/* Enhanced gradient overlays for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/90 pointer-events-none" />

      {/* Content area with professional animations */}
      <div className={`absolute bottom-8 right-8 left-8 md:left-auto max-w-xl transition-all duration-700 ease-out z-20 ${
        isTransitioning ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
      }`}>
        {/* Animated badge */}
        {media.isNew && (
          <Badge 
            className="bg-gradient-to-r from-primary to-primary/80 text-white mb-4 px-3 py-1 text-sm font-semibold shadow-lg animate-pulse hover:animate-none transition-all duration-300" 
            data-testid="hero-new-badge"
          >
            جديد
          </Badge>
        )}
        
        {/* Enhanced title with gradient effect */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-white drop-shadow-2xl leading-tight gradient-text-white relative" data-testid="hero-title">
          {media.title}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/90 bg-clip-text text-transparent">
            {media.title}
          </div>
        </h1>
        
        {/* Enhanced description with fade-in animation */}
        {(media.descriptionAr || media.description) && (
          <p className="text-white/90 mb-8 leading-relaxed line-clamp-3 text-lg md:text-xl max-w-2xl drop-shadow-lg backdrop-blur-sm bg-black/10 p-4 rounded-lg border border-white/10" data-testid="hero-description">
            {media.descriptionAr || media.description}
          </p>
        )}
        
        {/* Enhanced action buttons with professional effects */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            className="px-8 py-4 bg-gradient-to-r from-primary to-primary/80 text-white hover:from-primary/90 hover:to-primary/70 font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 relative overflow-hidden group hero-button-glow"
            onClick={handlePlay}
            disabled={updateWatchHistory.isPending}
            data-testid="hero-play-button"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Play className="w-6 h-6 ml-2 fill-current relative z-10" />
            <span className="relative z-10">شاهد الآن</span>
          </Button>
          
          <Button
            variant="secondary"
            className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border border-white/30 relative overflow-hidden group hero-button-glow"
            onClick={handleAddToList}
            disabled={toggleFavorite.isPending}
            data-testid="hero-add-button"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Plus className="w-6 h-6 ml-2 relative z-10" />
            <span className="relative z-10">{isFavorite ? 'حذف من المفضلة' : 'أضف للمفضلة'}</span>
          </Button>
        </div>
      </div>

      {/* Loading overlay during transitions */}
      {isTransitioning && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-30 pointer-events-none">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </section>
  );
}
