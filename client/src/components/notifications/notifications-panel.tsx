import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, useMarkNotificationAsRead } from "@/hooks/use-notifications";
import { X, Clock, Film, Tv, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const { data: notifications = [] } = useNotifications();
  const markAsRead = useMarkNotificationAsRead();

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleNotificationClick = async (notificationId: string) => {
    if (!notifications.find(n => n.id === notificationId)?.isRead) {
      await markAsRead.mutateAsync(notificationId);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_episode':
        return <Tv className="w-4 h-4" />;
      case 'new_movie':
        return <Film className="w-4 h-4" />;
      case 'reminder':
        return <Clock className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Notifications Panel */}
      <div className="fixed top-16 right-4 w-96 max-w-[calc(100vw-2rem)] bg-popover rounded-lg border border-border shadow-lg z-50 slide-in-right">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold" data-testid="notifications-title">الإشعارات</h3>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={onClose}
              data-testid="close-notifications"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="max-h-96 custom-scrollbar" data-testid="notifications-list">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground" data-testid="no-notifications">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد إشعارات جديدة</p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`
                    p-4 border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer
                    ${!notification.isRead ? 'bg-muted/20' : ''}
                  `}
                  onClick={() => handleNotificationClick(notification.id)}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex gap-3">
                    <div className={`
                      w-2 h-2 rounded-full mt-2 flex-shrink-0
                      ${!notification.isRead ? 'bg-primary pulse-notification' : 'bg-muted'}
                    `} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        {getNotificationIcon(notification.type)}
                        <h4 className={`
                          font-medium text-sm
                          ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}
                        `} data-testid="notification-title">
                          {notification.title}
                        </h4>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2" data-testid="notification-message">
                        {notification.message}
                      </p>
                      <span className="text-xs text-primary" data-testid="notification-time">
                        {formatDistanceToNow(notification.createdAt ? new Date(notification.createdAt) : new Date(), { 
                          addSuffix: true, 
                          locale: ar 
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </>
  );
}
