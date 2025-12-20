/**
 * Calendar Integration Page
 * Manage interview scheduling and calendar connections
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Calendar,
    Plus,
    Link,
    Unlink,
    Clock,
    Users,
    Loader2,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Video
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout/Layout";

interface CalendarConnection {
    _id: string;
    provider: string;
    email: string;
    name: string;
    isActive: boolean;
    lastSyncedAt?: string;
}

interface InterviewSlot {
    start: string;
    end: string;
}

export default function CalendarPage() {
    const [connections, setConnections] = useState<CalendarConnection[]>([]);
    const [availability, setAvailability] = useState<InterviewSlot[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [connectOpen, setConnectOpen] = useState(false);
    const { toast } = useToast();

    // Connection form
    const [provider, setProvider] = useState<"google" | "outlook">("google");

    // Schedule form
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        fetchConnections();
    }, []);

    const fetchConnections = async () => {
        try {
            const response = await fetch("/api/calendar/connections");
            if (response.ok) {
                const data = await response.json();
                setConnections(data);
            }
        } catch (err) {
            console.error("Fetch connections error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            const response = await fetch("/api/calendar/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider,
                    credentials: { redirectUri: window.location.origin + "/calendar/callback" }
                })
            });
            const data = await response.json();
            if (data.authUrl) {
                window.open(data.authUrl, "_blank", "width=500,height=600");
            }
            toast({ title: "Calendar Connection Started", description: "Complete authorization in the popup" });
            setConnectOpen(false);
        } catch (err) {
            toast({ title: "Error", description: "Failed to connect calendar", variant: "destructive" });
        }
    };

    const handleDisconnect = async (id: string) => {
        if (!confirm("Disconnect this calendar?")) return;
        try {
            await fetch(`/api/calendar/connections/${id}`, { method: "DELETE" });
            setConnections(prev => prev.filter(c => c._id !== id));
            toast({ title: "Calendar Disconnected" });
        } catch (err) {
            toast({ title: "Error", description: "Failed to disconnect", variant: "destructive" });
        }
    };

    const handleSync = async (id: string) => {
        try {
            const response = await fetch(`/api/calendar/connections/${id}/sync`, { method: "POST" });
            if (response.ok) {
                const data = await response.json();
                toast({ title: "Calendar Synced", description: `${data.eventsProcessed} events synced` });
                fetchConnections();
            }
        } catch (err) {
            toast({ title: "Error", description: "Failed to sync", variant: "destructive" });
        }
    };

    const checkAvailability = async () => {
        if (connections.length === 0) return;
        try {
            const response = await fetch(`/api/calendar/availability/${connections[0]._id}?days=5`);
            if (response.ok) {
                const data = await response.json();
                setAvailability(data.slots || []);
            }
        } catch (err) {
            console.error("Availability check error:", err);
        }
    };

    // Simple calendar days
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(i);
        return days;
    };

    const formatMonth = (date: Date) => {
        return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Calendar className="w-7 h-7 text-primary" />
                            Calendar Integration
                        </h1>
                        <p className="text-muted-foreground">Manage interview scheduling</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={checkAvailability}>
                            <Clock className="w-4 h-4 mr-2" /> Check Availability
                        </Button>
                        <Button onClick={() => setConnectOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" /> Connect Calendar
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                    {/* Calendar View */}
                    <Card className="col-span-2">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Interview Calendar</CardTitle>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <span className="font-medium">{formatMonth(selectedDate)}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-7 gap-1 text-center text-sm">
                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                                    <div key={day} className="font-medium text-muted-foreground py-2">{day}</div>
                                ))}
                                {getDaysInMonth(selectedDate).map((day, i) => (
                                    <div
                                        key={i}
                                        className={`p-2 rounded-lg cursor-pointer transition-colors ${day ? 'hover:bg-muted' : ''
                                            } ${day === new Date().getDate() &&
                                                selectedDate.getMonth() === new Date().getMonth() &&
                                                selectedDate.getFullYear() === new Date().getFullYear()
                                                ? 'bg-primary text-primary-foreground'
                                                : ''
                                            }`}
                                    >
                                        {day}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Connected Calendars */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Connected Calendars</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {isLoading ? (
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                ) : connections.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No calendars connected
                                    </p>
                                ) : (
                                    connections.map(conn => (
                                        <div key={conn._id} className="flex items-center justify-between p-2 border rounded">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${conn.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                                                <div>
                                                    <div className="font-medium text-sm capitalize">{conn.provider}</div>
                                                    <div className="text-xs text-muted-foreground">{conn.email}</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => handleSync(conn._id)}>
                                                    <Clock className="w-3 h-3" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDisconnect(conn._id)}>
                                                    <Unlink className="w-3 h-3 text-red-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        {/* Available Slots */}
                        {availability.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Available Slots</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {availability.slice(0, 5).map((slot, i) => (
                                        <div key={i} className="p-2 border rounded text-sm flex justify-between items-center">
                                            <span>{new Date(slot.start).toLocaleString()}</span>
                                            <Badge variant="outline">Available</Badge>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {/* Quick Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button variant="outline" className="w-full justify-start">
                                    <Video className="w-4 h-4 mr-2" /> Schedule Interview
                                </Button>
                                <Button variant="outline" className="w-full justify-start">
                                    <Users className="w-4 h-4 mr-2" /> Panel Interview
                                </Button>
                                <Button variant="outline" className="w-full justify-start">
                                    <Clock className="w-4 h-4 mr-2" /> Block Time
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Connect Dialog */}
                <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Connect Calendar</DialogTitle>
                            <DialogDescription>Choose your calendar provider</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Button
                                    variant={provider === "google" ? "default" : "outline"}
                                    className="h-20 flex-col"
                                    onClick={() => setProvider("google")}
                                >
                                    <svg className="w-8 h-8 mb-2" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                                    </svg>
                                    Google
                                </Button>
                                <Button
                                    variant={provider === "outlook" ? "default" : "outline"}
                                    className="h-20 flex-col"
                                    onClick={() => setProvider("outlook")}
                                >
                                    <svg className="w-8 h-8 mb-2" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3Q0 17.4 0 17V6.38q0-.41.3-.7.29-.3.7-.3h6.38V2q0-.41.3-.7.29-.3.7-.3h6.13V1h.87v.62h1.25V1h.87v.62h1.25V1h.88v1.62h3.37q.46 0 .8.3.33.33.33.8Z" />
                                    </svg>
                                    Outlook
                                </Button>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setConnectOpen(false)}>Cancel</Button>
                            <Button onClick={handleConnect}>
                                <Link className="w-4 h-4 mr-2" /> Connect
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}
