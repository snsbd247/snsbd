import { TableRow } from "@/components/ui/table";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ReactNode, MouseEvent } from "react";

type NavArgs = Parameters<ReturnType<typeof useNavigate>>[0];

export function ClickableRow({
  to,
  params,
  className,
  children,
}: {
  to: any;
  params?: Record<string, any>;
  className?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const go = () =>
    navigate((params ? { to, params } : { to }) as unknown as NavArgs);
  return (
    <TableRow
      onClick={go}
      className={cn(
        "cursor-pointer transition-colors hover:bg-gradient-to-r hover:from-indigo-50/60 hover:to-fuchsia-50/60 dark:hover:from-indigo-950/30 dark:hover:to-fuchsia-950/30",
        className,
      )}
    >
      {children}
    </TableRow>
  );
}

export function StopClick({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const stop = (e: MouseEvent) => e.stopPropagation();
  return (
    <span className={className} onClick={stop}>
      {children}
    </span>
  );
}
