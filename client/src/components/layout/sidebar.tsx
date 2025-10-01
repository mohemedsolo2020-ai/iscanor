import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Home, Film, Tv, Zap, FileText, Heart, Filter, Calendar, History } from "lucide-react";
import logoIcon from "@assets/logo-icon.png";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();

  // Close sidebar when location changes
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location]);

  const navigationItems = [
    { path: "/", icon: Home, label: "الرئيسية" },
    { path: "/movies", icon: Film, label: "الأفلام" },
    { path: "/series", icon: Tv, label: "المسلسلات" },
    { path: "/anime", icon: Zap, label: "الأنمي" },
    { path: "/anime-movies", icon: Film, label: "أفلام أنمي" },
    { path: "/foreign-series", icon: Tv, label: "مسلسلات أجنبية" },
    { path: "/asian-series", icon: Tv, label: "مسلسلات آسيوية" },
    { path: "/categories", icon: Filter, label: "التصنيفات" },
    { path: "/years", icon: Calendar, label: "السنوات" },
    { path: "/favorites", icon: Heart, label: "المفضلة" },
    { path: "/watch-history", icon: History, label: "سجل المشاهدة" },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 right-0 h-full w-80 bg-card/95 glass-effect border-l border-border z-50 
        transform transition-transform duration-300 ease-in-out custom-scrollbar overflow-y-auto
        md:w-64 lg:w-72
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}
      style={{ 
        willChange: isOpen ? 'transform' : 'auto',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
      }}>
        <div className="p-4 md:p-6">
          {/* Logo and Close Button */}
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <Link href="/">
              <div className="flex items-center justify-center w-full cursor-pointer px-2">
                <img src={logoIcon} alt="FlaynPrime" className="h-14 md:h-16 w-auto object-contain" />
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground hover:text-foreground flex-shrink-0 absolute left-4 top-4"
              onClick={onClose}
              data-testid="sidebar-close-button"
            >
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </Button>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1 md:space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Link key={item.path} href={item.path}>
                  <div
                    className={`
                      flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg font-medium transition-all duration-200 w-full text-right cursor-pointer hover:scale-[1.02]
                      ${isActive 
                        ? 'bg-primary text-primary-foreground shadow-lg border border-primary-foreground/20' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:shadow-md'
                      }
                    `}
                    data-testid={`nav-link-${item.path.replace('/', '') || 'home'}`}
                  >
                    <Icon className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                    <span className="text-sm md:text-base truncate">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

        </div>
      </div>
    </>
  );
}
