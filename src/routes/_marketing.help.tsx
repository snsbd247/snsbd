import { createFileRoute, Link } from "@tanstack/react-router";
import { listPublicKb } from "@/lib/kb.functions";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Section } from "@/components/marketing/section";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const kbQuery = queryOptions({ queryKey: ["kb-public"], queryFn: () => listPublicKb() });

export const Route = createFileRoute("/_marketing/help")({
  loader: ({ context }) => context.queryClient.ensureQueryData(kbQuery),
  head: () => ({
    meta: [
      { title: "Help Center — Guides & Support" },
      { name: "description", content: "Browse guides, tutorials and answers to common questions." },
      { property: "og:title", content: "Help Center" },
      { property: "og:description", content: "Browse guides, tutorials and answers to common questions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HelpIndex,
});

function HelpIndex() {
  const { data } = useSuspenseQuery(kbQuery);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data.articles;
    return data.articles.filter((a: any) =>
      (a.title ?? "").toLowerCase().includes(term) ||
      (a.excerpt ?? "").toLowerCase().includes(term));
  }, [q, data.articles]);

  const byCategory = (id: string | null) => filtered.filter((a: any) => a.category_id === id);

  return (
    <Section>
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold sm:text-4xl">Help Center</h1>
          <p className="text-muted-foreground">Guides, tutorials, and answers to common questions.</p>
          <div className="relative mx-auto max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search articles…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {data.categories.map((c: any) => {
            const arts = byCategory(c.id);
            if (arts.length === 0 && q) return null;
            return (
              <Card key={c.id}>
                <CardHeader>
                  <CardTitle>{c.name}</CardTitle>
                  {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                </CardHeader>
                <CardContent>
                  {arts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No articles yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {arts.map((a: any) => (
                        <li key={a.id}>
                          <Link to="/help/$slug" params={{ slug: a.slug }} className="text-sm hover:underline">
                            {a.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {byCategory(null).length > 0 && (
            <Card>
              <CardHeader><CardTitle>Uncategorized</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {byCategory(null).map((a: any) => (
                    <li key={a.id}>
                      <Link to="/help/$slug" params={{ slug: a.slug }} className="text-sm hover:underline">{a.title}</Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {data.articles.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No articles published yet. Check back soon.</p>
        )}
      </div>
    </Section>
  );
}
