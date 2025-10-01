import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUnreadNotificationCount } from "@/hooks/use-notifications";
import { useOptimizedSearchMedia } from "@/hooks/use-media";
import NotificationsPanel from "@/components/notifications/notifications-panel";
import { Menu, Search, Bell, ArrowRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import logoIcon from "@assets/logo-icon.png";

interface HeaderProps {
  onToggleSidebar: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function Header({ onToggleSidebar, searchQuery, onSearchChange }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [, setLocation] = useLocation();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: searchResults = [], isLoading: isSearchLoading } = useOptimizedSearchMedia(searchQuery, { 
    debounceMs: 300, 
    minLength: 2, 
    limit: 100 
  });
  
  useEffect(() => {
    setShowSearchResults(searchQuery.length >= 2 && (searchResults.length > 0 || isSearchLoading));
  }, [searchQuery, searchResults, isSearchLoading]);

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearchResults(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const handleResultClick = (mediaId: string, mediaType: string) => {
    const route = mediaType === 'movie' ? `/movie/${mediaId}` : `/series/${mediaId}`;
    setLocation(route);
    setShowSearchResults(false);
    onSearchChange('');
  };

  return (
    <header className="sticky top-0 z-30 bg-background/95 glass-effect border-b border-border">
      <div className="flex items-center justify-between p-3 md:p-4 gap-2 md:gap-4">
        {/* Mobile Menu and Logo */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground hover:text-primary w-9 h-9 md:w-10 md:h-10"
            onClick={onToggleSidebar}
            data-testid="toggle-sidebar-button"
          >
            <Menu className="w-5 h-5 md:w-6 md:h-6" />
          </Button>
          <Link href="/">
            <div className="flex items-center cursor-pointer">
              <img src={logoIcon} alt="FlaynPrime" className="h-9 md:h-11 w-auto object-contain" />
            </div>
          </Link>
        </div>

        {/* Search and Actions */}
        <div className="flex items-center gap-2 md:gap-3 flex-1 justify-end max-w-2xl">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Input
              type="text"
              placeholder="ابحث..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
              className="w-full pr-10 md:pr-12 text-sm md:text-base bg-input border border-border/20 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/10 h-9 md:h-10 rounded-full transition-all"
              data-testid="search-input"
            />
            <div className="absolute right-2.5 md:right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-primary/10 transition-colors cursor-pointer group" onClick={handleSearchSubmit}>
              <Search 
                className="text-muted-foreground group-hover:text-primary w-4 h-4 md:w-[18px] md:h-[18px] transition-colors" 
                data-testid="search-icon"
              />
            </div>
            
            {/* Search Results Dropdown */}
            {showSearchResults && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setShowSearchResults(false)}
                />
                <Card className="absolute top-full left-0 right-0 mt-2 max-h-80 overflow-y-auto z-40 bg-popover border-border">
                  <div className="p-2">
                    {isSearchLoading && (
                      <div className="p-4 text-center text-muted-foreground">
                        <div className="w-8 h-8 mx-auto mb-2 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                        <p className="text-sm">جاري البحث...</p>
                      </div>
                    )}
                    {!isSearchLoading && searchResults.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                        onClick={() => handleResultClick(item.id, item.type)}
                      >
                        <img
                          src={item.poster}
                          alt={item.title}
                          className="w-12 h-16 object-cover rounded border"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{item.title}</h4>
                          <p className="text-xs text-muted-foreground truncate">{item.year} • {item.genre}</p>
                          <div className="flex items-center gap-1 mt-1">
                            {item.rating && (
                              <span className="text-xs text-primary font-medium">
                                ⭐ {(item.rating / 10).toFixed(1)}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {item.type === 'movie' ? 'فيلم' : 
                               item.type === 'series' ? 'مسلسل' :
                               item.type === 'anime' ? 'أنمي' :
                               item.type === 'anime_movie' ? 'فيلم أنمي' :
                               item.type === 'korean_series' ? 'كوري' :
                               item.type === 'foreign_series' ? 'أجنبي' :
                               item.type === 'asian_series' ? 'آسيوي' : 'وثائقي'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!isSearchLoading && searchResults.length === 0 && (
                      <div className="p-4 text-center text-muted-foreground">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">لم يتم العثور على نتائج</p>
                      </div>
                    )}
                    {!isSearchLoading && searchResults.length > 0 && (
                      <div className="border-t border-border mt-2 pt-2">
                        <Button
                          variant="ghost"
                          className="w-full justify-between text-sm h-8 font-normal"
                          onClick={handleSearchSubmit}
                          data-testid="view-all-results-button"
                        >
                          <span>عرض جميع النتائج</span>
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* Notifications */}
          <div className="relative flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-foreground hover:bg-muted/50 w-9 h-9 md:w-10 md:h-10"
              onClick={() => setShowNotifications(!showNotifications)}
              data-testid="notifications-button"
            >
              <Bell className="w-5 h-5 md:w-6 md:h-6" />
              {unreadCount > 0 && (
                <Badge 
                  className="absolute -top-0.5 -left-0.5 md:-top-1 md:-left-1 w-4 h-4 md:w-5 md:h-5 bg-primary text-primary-foreground text-[10px] md:text-xs font-bold p-0 flex items-center justify-center pulse-notification"
                  data-testid="notification-badge"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
            
            <NotificationsPanel 
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
