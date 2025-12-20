import { useState, useEffect, useCallback, useRef } from "react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
    Bell,
    Check,
    X,
    User,
    Calendar,
    FileText,
    Mail,
    CheckCircle,
    AlertTriangle,
    Info,
    Sparkles
} from "lucide-react";

interface Notification {
    _id: string;
    type: string;
    title: string;
    message?: string;
    link?: string;
    isRead: boolean;
    createdAt: string;
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const eventSourceRef = useRef<EventSource | null>(null);
    const { toast } = useToast();
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId") || "user";

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch(`/api/notifications?userId=${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
                setUnreadCount(data.filter((n: Notification) => !n.isRead).length);
            }
        } catch (error) {
            console.error("Failed to fetch notifications");
        }
    }, [userId, token]);

    // Connect to SSE stream
    useEffect(() => {
        fetchNotifications();

        // Set up SSE connection
        const eventSource = new EventSource(`/api/notifications/stream?userId=${userId}`);
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type !== "connected") {
                    // Show toast notification
                    toast({
                        title: data.title,
                        description: data.message,
                    });

                    // Refresh notifications
                    fetchNotifications();
                }
            } catch (error) {
                console.error("SSE parse error:", error);
            }
        };

        eventSource.onerror = (error) => {
            console.error("SSE error:", error);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [userId, fetchNotifications, toast]);

    // Mark as read
    const markAsRead = async (id: string) => {
        try {
            await fetch(`/api/notifications/${id}/read`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchNotifications();
        } catch (error) {
            console.error("Failed to mark as read");
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            await fetch("/api/notifications/mark-all-read", {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userId })
            });
            fetchNotifications();
        } catch (error) {
            console.error("Failed to mark all as read");
        }
    };

    // Get icon for notification type
    const getIcon = (type: string) => {
        switch (type) {
            case "success": return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            case "error": return <X className="h-4 w-4 text-red-500" />;
            case "action": return <Sparkles className="h-4 w-4 text-purple-500" />;
            default: return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    // Format time ago
    const formatTimeAgo = (date: string) => {
        const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
        if (seconds < 60) return "Just now";
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold">Notifications</h4>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                            Mark all read
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-80">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                            <Bell className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <div
                                    key={notification._id}
                                    className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${!notification.isRead ? "bg-blue-50/50" : ""
                                        }`}
                                    onClick={() => {
                                        if (!notification.isRead) markAsRead(notification._id);
                                        if (notification.link) window.location.href = notification.link;
                                    }}
                                >
                                    <div className="flex gap-3">
                                        <div className="mt-0.5">
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium ${!notification.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                                                {notification.title}
                                            </p>
                                            {notification.message && (
                                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                                    {notification.message}
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {formatTimeAgo(notification.createdAt)}
                                            </p>
                                        </div>
                                        {!notification.isRead && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}

export default NotificationBell;
