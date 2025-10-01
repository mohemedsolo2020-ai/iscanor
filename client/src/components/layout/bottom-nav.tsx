import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Search, Heart, History, User } from "lucide-react";

const navigationItems = [
  { path: "/", icon: Home, label: "الرئيسية", testId: "home" },
  { path: "/search", icon: Search, label: "البحث", testId: "search" },
  { path: "/favorites", icon: Heart, label: "المفضلة", testId: "favorites" },
  { path: "/watch-history", icon: History, label: "السجل", testId: "history" },
  { path: "/profile", icon: User, label: "الملف الشخصي", testId: "profile" },
];

export default function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 glass-effect border-t border-border z-30 pb-safe">
      <div className="flex items-center justify-around py-2 px-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;

          return (
            <Link key={item.path} href={item.path}>
              <Button
                variant="ghost"
                size="sm"
                className={`
                  bottom-nav-item flex flex-col items-center p-2 h-auto min-h-[40px] min-w-[40px] 
                  rounded-lg transition-all duration-200 mobile-card
                  ${isActive 
                    ? 'text-primary bg-primary/10 border border-primary/20 active' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }
                `}
                data-testid={`bottom-nav-${item.testId}`}
              >
                <Icon className={`w-4 h-4 mb-0.5 transition-transform duration-200 ${
                  isActive ? 'scale-110' : 'scale-100'
                }`} />
                <span className={`text-[10px] font-medium transition-all duration-200 ${
                  isActive ? 'text-primary' : 'text-inherit'
                }`}>{item.label}</span>
              </Button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
