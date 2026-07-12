import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200];

export function usePagination<T>(items: T[], initialPageSize = 10) {
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [page, setPage] = useState(1);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );
  return {
    paged,
    page: safePage,
    setPage,
    pageSize,
    setPageSize: (n: number) => { setPageSize(n); setPage(1); },
    pageCount,
    total,
  };
}

export type PaginationState = {
  page: number;
  setPage: (n: number) => void;
  pageSize: number;
  setPageSize: (n: number) => void;
  pageCount: number;
  total: number;
};

export function PaginationControls({
  page, setPage, pageSize, setPageSize, pageCount, total,
}: PaginationState) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t bg-slate-50/60 dark:bg-slate-900/40">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Rows per page</span>
        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
          <SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="ml-2 hidden sm:inline">{from}–{to} of {total}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" onClick={() => setPage(1)} disabled={page <= 1}><ChevronsLeft className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" onClick={() => setPage(page - 1)} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-sm px-2">Page {page} / {pageCount}</span>
        <Button size="icon" variant="ghost" onClick={() => setPage(page + 1)} disabled={page >= pageCount}><ChevronRight className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" onClick={() => setPage(pageCount)} disabled={page >= pageCount}><ChevronsRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
