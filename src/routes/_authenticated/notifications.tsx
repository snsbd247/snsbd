import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listNotifications, markAllNotificationsRead, markNotificationRead, deleteNotification,
} from "@/lib/notifications.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listNotifications);
  const markOne = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);
  const del = useServerFn(deleteNotification);

  const q = useQuery({ queryKey: ["notifications"], queryFn: () => list() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["notifications"] });
  const mOne = useMutation({ mutationFn: (id: string) => markOne({ data: { id } }), onSuccess: invalidate });
  const mAll = useMutation({ mutationFn: () => markAll(), onSuccess: invalidate });
  const mDel = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: invalidate });

  const items = (q.data as any)?.items ?? [];
  const unread = (q.data as any)?.unread ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground">Recent activity across your account.</p>
        </div>
        <Button variant="outline" size="sm" disabled={unread === 0} onClick={() => mAll.mutate()}>
          <Check className="mr-2 h-4 w-4" /> Mark all read
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Inbox {unread > 0 && <Badge className="ml-2">{unread} unread</Badge>}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {q.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <ul className="divide-y">
              {items.map((n: any) => (
                <li key={n.id} className={`flex items-start justify-between gap-3 p-4 ${!n.read_at ? "bg-accent/30" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {!n.read_at && <span className="h-2 w-2 rounded-full bg-primary" />}
                      <span className="text-sm font-medium">{n.title}</span>
                      <Badge variant="outline" className="text-[10px]">{n.type}</Badge>
                    </div>
                    {n.body && <div className="mt-1 text-sm text-muted-foreground">{n.body}</div>}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </div>
                    {n.link && (
                      <Link to={n.link as any} className="mt-1 inline-block text-xs text-primary hover:underline" onClick={() => !n.read_at && mOne.mutate(n.id)}>
                        Open →
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!n.read_at && (
                      <Button size="icon" variant="ghost" onClick={() => mOne.mutate(n.id)} aria-label="Mark read">
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => mDel.mutate(n.id)} aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
