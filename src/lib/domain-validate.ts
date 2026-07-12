// Strict domain validation — bare domain only, no protocol/path/port.
export function validateDomain(input: string): { ok: true; value: string } | { ok: false; error: string } {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: false, error: "ডোমেইন লিখুন (যেমন: example.com)" };
  if (/\s/.test(raw)) return { ok: false, error: "ডোমেইনে কোনো স্পেস থাকা যাবে না" };
  if (/^https?:\/\//i.test(raw) || raw.includes("://")) return { ok: false, error: "http:// বা https:// ছাড়া শুধু ডোমেইন লিখুন" };
  if (/[\/?#@:]/.test(raw)) return { ok: false, error: "কোনো path/port/query দেওয়া যাবে না — শুধু ডোমেইন" };
  const value = raw.toLowerCase();
  if (value.startsWith("www.")) return { ok: false, error: "'www.' ছাড়া মূল ডোমেইন লিখুন (যেমন: example.com)" };
  if (value.length > 253) return { ok: false, error: "ডোমেইন খুব লম্বা (২৫৩ অক্ষরের বেশি)" };
  if (!value.includes(".")) return { ok: false, error: "TLD সহ পুরো ডোমেইন দিন (যেমন: example.com)" };
  const labels = value.split(".");
  if (labels.length < 2) return { ok: false, error: "অন্তত একটি ডট (.) সহ ডোমেইন দিন" };
  const tld = labels[labels.length - 1]!;
  if (!/^[a-z]{2,}$/.test(tld)) return { ok: false, error: "TLD অন্তত ২ অক্ষরের এবং শুধু a-z হতে হবে" };
  for (const label of labels) {
    if (label.length < 1 || label.length > 63) return { ok: false, error: "প্রতিটি অংশ ১-৬৩ অক্ষরের মধ্যে হতে হবে" };
    if (!/^[a-z0-9-]+$/.test(label)) return { ok: false, error: "শুধু a-z, 0-9 এবং হাইফেন (-) ব্যবহার করা যাবে" };
    if (label.startsWith("-") || label.endsWith("-")) return { ok: false, error: "ডোমেইনের অংশ হাইফেন দিয়ে শুরু বা শেষ হতে পারবে না" };
  }
  return { ok: true, value };
}

export function isValidDomain(input: string | null | undefined): boolean {
  return validateDomain(input ?? "").ok === true;
}
