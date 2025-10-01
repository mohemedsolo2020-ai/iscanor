import { Button } from "@/components/ui/button";
import { useContinueWatching } from "@/hooks/use-media";
import { Skeleton } from "@/components/ui/skeleton";
import MovieCard from "./movie-card";
import { ChevronLeft } from "lucide-react";
import { Link } from "wouter";

export default function ContinueWatching() {
  const { data: continueWatching, isLoading } = useContinueWatching();

  if (isLoading) {
    return (
      <section className="fade-in">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold">متابعة المشاهدة</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 lg:gap-5 xl:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="w-full aspect-[2/3] rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!continueWatching || continueWatching.length === 0) {
    return null;
  }

  return (
    <section className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold" data-testid="continue-watching-title">متابعة المشاهدة</h3>
        <Link href="/continue-watching">
          <Button 
            variant="ghost" 
            className="text-primary hover:text-primary/80 flex items-center gap-2"
            data-testid="continue-watching-view-all"
          >
            <span>عرض الكل</span>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 lg:gap-5 xl:gap-6 custom-scrollbar">
        {continueWatching.map((item) => (
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
    </section>
  );
}
