import { useState } from "react";
import { useMedia } from "@/hooks/use-media";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottom-nav";
import MovieCard from "@/components/media/movie-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getCategoriesForType, CategoryOption, MEDIA_TYPES } from "@/lib/constants";
import { Filter, ArrowRight } from "lucide-react";

// Media type configurations
const MEDIA_TYPE_CONFIG = {
  [MEDIA_TYPES.MOVIE]: { label: "الأفلام", image: "https://www2.0zz0.com/2025/09/30/02/477768248.png" },
  [MEDIA_TYPES.SERIES]: { label: "المسلسلات", image: "https://www2.0zz0.com/2025/09/30/02/472841514.png" },
  [MEDIA_TYPES.ANIME]: { label: "الأنمي", image: "https://www2.0zz0.com/2025/09/30/02/794674501.png" },
  [MEDIA_TYPES.ANIME_MOVIE]: { label: "أفلام أنمي", image: "https://www2.0zz0.com/2025/09/30/02/785804526.png" },
  [MEDIA_TYPES.FOREIGN_SERIES]: { label: "مسلسلات أجنبية", image: "https://www2.0zz0.com/2025/09/30/02/905171751.png" },
  [MEDIA_TYPES.ASIAN_SERIES]: { label: "مسلسلات آسيوية", image: "https://www2.0zz0.com/2025/09/30/02/149806841.png" },
};

export default function Categories() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMediaType, setSelectedMediaType] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();

  // Fetch all media for counting
  const { data: allMediaForCounting = [] } = useMedia();
  
  // Fetch filtered media for display
  const { data: allMedia = [], isLoading } = useMedia({
    type: selectedMediaType as any,
    category: selectedCategory
  });

  const filteredMedia = searchQuery 
    ? allMedia.filter((item: any) => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allMedia;

  // Get available categories based on selected media type
  const availableCategories = selectedMediaType ? getCategoriesForType(selectedMediaType) : [];

  // Get real count for each category based on selected media type
  const getCategoryCount = (category: string): number => {
    if (!selectedMediaType || !allMediaForCounting.length) return 0;
    
    return allMediaForCounting.filter((item: any) => 
      item.type === selectedMediaType && item.category === category
    ).length;
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

        <main className="p-4 md:p-6 lg:p-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Filter className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold gradient-text" data-testid="categories-title">
                التصنيفات
              </h1>
            </div>
            <p className="text-muted-foreground">
              استكشف المحتوى حسب النوع والتصنيف
            </p>
          </div>

          {/* Media Type Selection */}
          {!selectedMediaType && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">اختر نوع المحتوى</h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {Object.entries(MEDIA_TYPE_CONFIG).map(([type, config]) => {
                  return (
                    <Card 
                      key={type}
                      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-border bg-card"
                      onClick={() => setSelectedMediaType(type)}
                      data-testid={`media-type-card-${type}`}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="w-32 h-32 md:w-48 md:h-48 lg:w-56 lg:h-56 mx-auto mb-3">
                          <img src={config.image} alt={config.label} className="w-full h-full object-contain border-2 border-blue-500 rounded-lg" />
                        </div>
                        <h3 className="font-semibold text-foreground">{config.label}</h3>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category Selection */}
          {selectedMediaType && !selectedCategory && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  اختر الفئة - {MEDIA_TYPE_CONFIG[selectedMediaType as keyof typeof MEDIA_TYPE_CONFIG]?.label}
                </h2>
                <Button
                  variant="outline"
                  onClick={() => setSelectedMediaType(undefined)}
                  className="flex items-center gap-2"
                  data-testid="button-back-to-types"
                >
                  <ArrowRight className="w-4 h-4" />
                  عودة لاختيار النوع
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {availableCategories.map((category) => (
                  <Card 
                    key={category.key}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-border bg-card"
                    onClick={() => setSelectedCategory(category.label)}
                    data-testid={`category-card-${category.key}`}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="mb-2">
                        <h3 className="font-semibold text-foreground">{category.label}</h3>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {getCategoryCount(category.label)} عنصر
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Selected Category Content */}
          {selectedMediaType && selectedCategory && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold" data-testid="selected-category-title">
                    {MEDIA_TYPE_CONFIG[selectedMediaType as keyof typeof MEDIA_TYPE_CONFIG]?.label} - {selectedCategory}
                  </h2>
                  <Badge variant="outline" data-testid="category-count">
                    {filteredMedia.length} عنصر
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedCategory(undefined)}
                    className="flex items-center gap-2"
                    data-testid="button-back-to-categories"
                  >
                    <ArrowRight className="w-4 h-4" />
                    عودة للفئات
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedCategory(undefined);
                      setSelectedMediaType(undefined);
                    }}
                    className="flex items-center gap-2"
                    data-testid="button-back-to-start"
                  >
                    <ArrowRight className="w-4 h-4" />
                    البداية
                  </Button>
                </div>
              </div>

              {searchQuery && (
                <div className="mb-6">
                  <p className="text-muted-foreground" data-testid="search-results-count">
                    نتائج البحث عن "{searchQuery}" في {MEDIA_TYPE_CONFIG[selectedMediaType as keyof typeof MEDIA_TYPE_CONFIG]?.label} - {selectedCategory}: {filteredMedia.length} عنصر
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
              ) : filteredMedia.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 lg:gap-5 xl:gap-6">
                  {filteredMedia.map((item: any) => (
                    <MovieCard
                      key={item.id}
                      media={item}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Filter className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2" data-testid="no-content-title">
                    لا يوجد محتوى
                  </h3>
                  <p className="text-muted-foreground" data-testid="no-content-message">
                    {searchQuery 
                      ? `لم نجد نتائج للبحث عن "${searchQuery}" في ${MEDIA_TYPE_CONFIG[selectedMediaType as keyof typeof MEDIA_TYPE_CONFIG]?.label} - ${selectedCategory}`
                      : `لا يوجد محتوى متاح في ${MEDIA_TYPE_CONFIG[selectedMediaType as keyof typeof MEDIA_TYPE_CONFIG]?.label} - ${selectedCategory} حالياً`
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {isMobile && <BottomNav />}
    </div>
  );
}