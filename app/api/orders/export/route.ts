import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ExportOrder = {
  order_date: string;
  order_type: "real" | "dummy";
  platform: string;
  amount: number;
  buyer_paid: number;
  seller_receives: number;
  profit_loss: number;
  status: string;
  account: { name: string } | null;
  manager: { name: string } | null;
};

function csvCell(value: string | number) {
  let safe = String(value);
  if (typeof value === "string" && /^[=+@\-]/.test(safe)) safe = `'${safe}`;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).maybeSingle();
  if (profile?.status !== "active") return NextResponse.json({ error: "Active workspace access required" }, { status: 403 });

  const { data, error } = await supabase.from("orders")
    .select("order_date, order_type, platform, amount, buyer_paid, seller_receives, profit_loss, status, account:accounts(name), manager:sales_managers(name)")
    .order("order_date", { ascending: false });
  if (error) return NextResponse.json({ error: "Orders could not be exported. Apply the dashboard migration first." }, { status: 503 });

  const rows = (data ?? []) as unknown as ExportOrder[];
  const headers = ["Date", "Account", "Platform", "Type", "Order", "Buyer Paid", "Seller Receives", "Profit/Loss", "Manager", "Status"];
  const body = rows.map((order) => [
    csvCell(order.order_date),
    csvCell(order.account?.name ?? ""),
    csvCell(order.platform),
    csvCell(order.order_type),
    csvCell(Number(order.amount).toFixed(2)),
    csvCell(Number(order.buyer_paid).toFixed(2)),
    csvCell(order.order_type === "dummy" ? "PRIVATE" : Number(order.seller_receives).toFixed(2)),
    csvCell(order.order_type === "dummy" ? "PRIVATE" : Number(order.profit_loss).toFixed(2)),
    csvCell(order.manager?.name ?? ""),
    csvCell(order.status),
  ].join(","));
  const csv = [headers.map(csvCell).join(","), ...body].join("\r\n");
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="nextrack-orders.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
