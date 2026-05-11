import Navbar from "@/components/Navbar";
import { trpc } from "@/providers/trpc";
import { formatDate, formatMoney } from "@/lib/format";
import { ArrowLeft, Coins, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

export default function MoneyFlowPage() {
  const navigate = useNavigate();
  const { data, isLoading } = trpc.moneyFlow.publicLedger.useQuery();
  const [cycleId, setCycleId] = useState<number | "all">("all");

  const activeCycle = data?.cycles.find((cycle) => cycle.status === "active") ?? data?.cycles[0];
  const selectedCycleId = cycleId === "all" ? activeCycle?.id : cycleId;
  const selectedCycle = data?.cycles.find((cycle) => cycle.id === selectedCycleId);
  const entries = useMemo(
    () => data?.entries.filter((entry) => !selectedCycleId || entry.cycleId === selectedCycleId) ?? [],
    [data?.entries, selectedCycleId],
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="relative pt-28 pb-16">
        <div className="absolute inset-0 sunrise-gradient" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-sm text-amber-300 mb-2">شفافية الحركة المالية</p>
              <h1 className="text-3xl md:text-5xl font-extrabold text-gradient mb-3">سجل الفلوس</h1>
              <p className="text-muted-foreground max-w-2xl">
                كل دخول وخروج للفلوس حسب الدورة، مع ربط التبرعات بتفاصيلها.
              </p>
            </div>
            <select
              value={selectedCycleId ?? ""}
              onChange={(event) => setCycleId(Number(event.target.value))}
              className="rounded-xl glass border border-border/50 px-4 py-3 text-sm text-foreground outline-none"
            >
              {data?.cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.title} - {cycle.status === "active" ? "نشطة" : "مغلقة"}
                </option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="glass-strong rounded-2xl p-8 text-center text-muted-foreground">جاري تحميل السجل...</div>
          ) : !data?.cycles.length ? (
            <div className="glass-strong rounded-2xl p-10 text-center text-muted-foreground">لا توجد حركات مالية بعد.</div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3 mb-8">
                {[
                  { label: "الرصيد الحالي", value: selectedCycle?.balance ?? 0, icon: Wallet, color: "text-amber-200" },
                  { label: "إجمالي الداخل", value: selectedCycle?.totalIn ?? 0, icon: TrendingUp, color: "text-emerald-300" },
                  { label: "إجمالي الخارج", value: selectedCycle?.totalOut ?? 0, icon: TrendingDown, color: "text-red-300" },
                ].map((item) => (
                  <div key={item.label} className="glass-strong rounded-2xl p-5">
                    <item.icon className={`w-6 h-6 ${item.color} mb-4`} />
                    <div className="text-sm text-muted-foreground">{item.label}</div>
                    <div className="text-2xl font-extrabold mt-1">{formatMoney(item.value)}</div>
                  </div>
                ))}
              </div>

              <div className="glass-strong rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-border/50 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-300" />
                  <h2 className="font-bold">الحركات</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/30 text-xs text-muted-foreground">
                        <th className="px-4 py-3 text-right">التاريخ</th>
                        <th className="px-4 py-3 text-right">الحركة</th>
                        <th className="px-4 py-3 text-center">النوع</th>
                        <th className="px-4 py-3 text-center">المبلغ</th>
                        <th className="px-4 py-3 text-center">التفاصيل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => {
                        const isOut = entry.type.includes("out");
                        return (
                          <tr key={entry.id} className="border-b border-border/20 hover:bg-white/5">
                            <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(entry.occurredAt)}</td>
                            <td className="px-4 py-3">
                              <div className="font-medium">{entry.title}</div>
                              {entry.description && (
                                <div className="text-xs text-muted-foreground line-clamp-1">{entry.description}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`rounded-full px-2 py-1 text-xs ${isOut ? "bg-red-500/15 text-red-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                                {isOut ? "خروج" : "دخول"}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-center font-bold ${isOut ? "text-red-300" : "text-emerald-300"}`}>
                              {isOut ? "-" : "+"}
                              {formatMoney(entry.amount)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {entry.donationId ? (
                                <button
                                  onClick={() => navigate(`/donations/${entry.donationId}`)}
                                  className="inline-flex items-center gap-1 text-sm text-amber-200 hover:text-amber-100"
                                >
                                  فتح التبرع
                                  <ArrowLeft className="w-4 h-4" />
                                </button>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
