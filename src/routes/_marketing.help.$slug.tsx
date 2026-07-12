import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getPublicArticle } from "@/lib/kb.functions";
import { Section } from "@/components/marketing/section";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_marketing/help/$slug")({
  loader: async ({ params }) => {
    const res = await getPublicArticle({ data: { slug: params.slug } });
    if (!res.article) throw notFound();
    return res;
  },
  head: ({ loaderData }) => {
    const a: any = loaderData?.article;
    const title = a?.title ? `${a.title} — Help` : "Article — Help";
    const desc = a?.excerpt ?? "Read this article in the help center.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: () => (
    <Section>
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-2xl font-semibold">Article not found</h1>
        <Link to="/help" className="mt-4 inline-block text-sm text-primary hover:underline">← Back to Help</Link>
      </div>
    </Section>
  ),
  errorComponent: ({ error }) => (
    <Section>
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{(error as Error).message}</p>
        <Link to="/help" className="mt-4 inline-block text-sm text-primary hover:underline">← Back to Help</Link>
      </div>
    </Section>
  ),
  component: ArticlePage,
});

function ArticlePage() {
  const { article } = Route.useLoaderData() as any;
  return (
    <Section>
      <article className="mx-auto max-w-3xl">
        <Link to="/help" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Help center
        </Link>
        <h1 className="text-3xl font-bold sm:text-4xl">{article.title}</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Updated {new Date(article.updated_at).toLocaleDateString()}
        </p>
        {article.excerpt && <p className="mt-4 text-lg text-muted-foreground">{article.excerpt}</p>}
        <div className="prose prose-neutral mt-8 max-w-none whitespace-pre-wrap dark:prose-invert">
          {article.content}
        </div>
      </article>
    </Section>
  );
}
