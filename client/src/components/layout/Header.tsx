import { Search, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";

export function Header({ title }: { title: string }) {
  return (
    <header className="h-16 border-b border-border bg-background/50 backdrop-blur-sm px-8 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-xl font-display font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search candidates, jobs..."
            className="pl-9 h-9 bg-background border-border focus:ring-primary/20"
          />
        </div>

        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <HelpCircle className="h-5 w-5" />
        </Button>

        {/* Real-time notification bell */}
        <NotificationBell />
      </div>
    </header>
  );
}
