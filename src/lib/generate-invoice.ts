import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db-shim";

type Item = { description: string; quantity: number; unit_price: number; service_id?: string | null };

export async function generateInvoiceDraft(opts: {
  customer_id: string;
  project_id?: string | null;
  items: Item[];
  notes?: string | null;
}): Promise<string> {
  const subtotal = opts.items.reduce((s, it) => s + Number(it.quantity) * Number(it.unit_price), 0);
  const invoice_number = "INV-" + Date.now().toString().slice(-8);
  const { data: inv, error } = await db.from("invoices").insert({
    customer_id: opts.customer_id,
    project_id: opts.project_id ?? null,
    invoice_number,
    subtotal, tax: 0, total: subtotal, notes: opts.notes ?? null, status: "draft",
  }).select().single();
  if (error) throw error;
  if (opts.items.length) {
    const rows = opts.items.map((it) => ({
      invoice_id: inv.id,
      service_id: it.service_id ?? null,
      description: it.description,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      total: Number(it.quantity) * Number(it.unit_price),
    }));
    const { error: e2 } = await db.from("invoice_items").insert(rows);
    if (e2) throw e2;
  }
  return inv.id as string;
}
