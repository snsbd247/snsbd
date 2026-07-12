import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  listNotifications, markAllNotificationsRead, markNotificationRead,
} from "@/lib/notifications.functions";
import { formatDistanceToNow } from "date-fns";

export function NotificationsBell() {
  const qc = useQueryClient();
  const list = useServerFn(listNotifications);
  const markOne = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);

  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: () => list(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const mOne = useMutation({
    mutationFn: (id: string) => markOne({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const mAll = useMutation({
    mutationFn: () => markAll(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const items = (q.data as any)?.items ?? [];
  const unread = (q.data as any)?.unread ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <Badge className="absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px]" variant="destructive">
              {unread > 99 ? "99+" : unread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b p-2">
          <div className="text-sm font-medium">Notifications</div>
          <Button
            variant="ghost" size="sm" className="h-7 text-xs"
            disabled={unread === 0 || mAll.isPending}
            onClick={() => mAll.mutate()}
          >
            <Check className="mr-1 h-3 w-3" /> Mark all read
          </Button>
        </div>
        <div className="max-h-96 overflow-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No notifications</div>
          ) : (
            items.map((n: any) => {
              const inner = (
                <div className={`flex flex-col gap-0.5 p-3 hover:bg-accent ${!n.read_at ? "bg-accent/30" : ""}`}>
                  <div className="flex items-center gap-2">
                    {!n.read_at && <span className="h-2 w-2 rounded-full bg-primary" />}
                    <span className="text-sm font-medium truncate">{n.title}</span>
                  </div>
                  {n.body && <div className="text-xs text-muted-foreground line-clamp-2">{n.body}</div>}
                  <div className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </div>
                </div>
              );
              return (
                <div key={n.id} className="border-b last:border-0">
                  {n.link ? (
                    <Link to={n.link as any} onClick={() => !n.read_at && mOne.mutate(n.id)}>{inner}</Link>
                  ) : (
                    <button className="w-full text-left" onClick={() => !n.read_at && mOne.mutate(n.id)}>{inner}</button>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="border-t p-2 text-center">
          <Link to="/notifications" className="text-xs text-muted-foreground hover:underline">
            View all
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
