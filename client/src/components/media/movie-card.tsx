import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Media } from "@shared/schema";
import { Star, Clock } from "lucide-react";
import { DEFAULT_POSTER } from "@/lib/constants";
import { useLocation } from "wouter";
import { memo } from "react";

interface MovieCardProps {
  media: Media;
  showProgress?: boolean;
  progress?: number;
  currentEpisode?: number;
  currentSeason?: number;
  isFavorite?: boolean;
  size?: 'default' | 'large';
}

function MovieCard({ 
  media, 
  showProgress = false, 
  progress = 0,
  currentEpisode,
  currentSeason,
  isFavorite = false,
  size = 'default'
}: MovieCardProps) {
  const [, setLocation] = useLocation();

  const handleCardClick = (e: React.MouseEvent) => {
    const route = media.type === 'movie' ? `/movie/${media.id}` : `/series/${media.id}`;
    
    if (e.ctrlKey || e.metaKey) {
      window.open(route, '_blank');
    } else {
      setLocation(route);
    }
  };

  return (
    <Card 
      className={`
        group cursor-pointer overflow-hidden bg-transparent border-none movie-card-hover
        ${size === 'large' ? 'row-span-2' : ''}
      `}
      onClick={handleCardClick}
      data-testid={`movie-card-${media.id}`}
    >
      <div className="relative">
        {/* Aspect ratio container for poster (2:3 ratio typical for movie posters) */}
        <div className={`relative w-full ${size === 'large' ? 'aspect-[2/3]' : 'aspect-[2/3]'} overflow-hidden rounded-t-lg bg-gradient-to-br from-muted to-muted/50`}>
          <img
            src={media.poster || DEFAULT_POSTER}
            alt={media.title}
            className="absolute inset-0 w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            data-testid="movie-poster"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== DEFAULT_POSTER) {
                target.src = DEFAULT_POSTER;
              }
            }}
          />

          {/* Rating Badge */}
          {media.rating && (
            <Badge className="absolute top-2 right-2 bg-black/80 text-primary border-none z-10">
              <Star className="w-3 h-3 mr-1" />
              <span data-testid="movie-rating">{media.rating}</span>
            </Badge>
          )}

          {/* New Badge */}
          {media.isNew && (
            <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground z-10">
              جديد
            </Badge>
          )}


          {/* Progress Bar */}
          {showProgress && progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50 z-10">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
                data-testid="progress-bar"
              />
            </div>
          )}
        </div>
      </div>

      {size === 'large' && (
        <div className="p-4">
          <h4 className="font-bold text-lg mb-2" data-testid="movie-title">{media.title}</h4>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <span data-testid="movie-year-category">{media.year} • {media.category}</span>
            {media.duration && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span data-testid="movie-duration">{media.duration}</span>
              </div>
            )}
          </div>
          {media.descriptionAr && (
            <p className="text-muted-foreground text-sm line-clamp-2" data-testid="movie-description">
              {media.descriptionAr}
            </p>
          )}
        </div>
      )}

      {size === 'default' && (
        <div className="p-3">
          <h4 className="font-medium text-sm mb-1" data-testid="movie-title">{media.title}</h4>
          <div className="text-xs text-muted-foreground">
            <span data-testid="movie-year-category">{media.year} • {media.category}</span>
          </div>
          {showProgress && currentEpisode && (
            <div className="text-xs text-muted-foreground mt-1">
              <span data-testid="episode-info">
                الحلقة {currentEpisode}
                {currentSeason && ` • الموسم ${currentSeason}`}
              </span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default memo(MovieCard);
