import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  center = true,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && (
        <div className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
          {eyebrow}
        </div>
      )}
      <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-base text-slate-600">{subtitle}</p>}
    </div>
  );
}

export function CtaBand({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0B1220] via-[#0F172A] to-[#0B1220] py-16 text-white">
      <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_20%_30%,rgba(16,185,129,0.4),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(245,158,11,0.3),transparent_45%)]" />
      <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 text-center sm:px-6">
        <h3 className="text-3xl font-black sm:text-4xl">{title}</h3>
        {subtitle && <p className="max-w-2xl text-white/70">{subtitle}</p>}
        <div className="flex flex-wrap justify-center gap-3">{children}</div>
      </div>
    </section>
  );
}
