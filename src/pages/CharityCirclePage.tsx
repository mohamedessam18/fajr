import Navbar from "@/components/Navbar";
import { formatDate, formatMoney } from "@/lib/format";
import { trpc } from "@/providers/trpc";
import { CheckCircle2, CircleDollarSign, Clock3, User, Users } from "lucide-react";

export default function CharityCirclePage() {
  const { data, isLoading } = trpc.charity.publicSummary.useQuery();
  const active = data?.active;
  const paidCount = active?.payments.filter((payment) => payment.paid).length ?? 0;
  const progress = data?.memberCount ? Math.round((paidCount / data.memberCount) * 100) : 0;
  const completedAmount = paidCount * (data?.contributionAmount ?? 50);

  return (
    <div className="min-h-screen" dir="rtl">
      <Navbar />
      <main className="relative pt-28 pb-16">
        <div className="absolute inset-0 sunrise-gradient" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <p className="mb-2 text-sm text-amber-300">دور الخير الشهري</p>
            <h1 className="mb-3 text-3xl font-extrabold text-gradient md:text-5xl">الجمعية الخيرية</h1>
            <p className="max-w-2xl text-muted-foreground">
              كل شهر هجري يتجمع اشتراك الأعضاء الحاليين، وعند اكتماله يسجل دخل واحد باسم صاحب الدور داخل سجل الفلوس.
            </p>
          </div>

          {isLoading ? (
            <div className="glass-strong rounded-2xl p-8 text-center text-muted-foreground">جاري تحميل الجمعية...</div>
          ) : !active ? (
            <div className="glass-strong rounded-2xl p-10 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-amber-300" />
              <h2 className="mb-2 text-xl font-bold">لا يوجد مشاركون حالياً</h2>
              <p className="text-muted-foreground">أضف المشاركين من لوحة التحكم لبدء الجمعية.</p>
            </div>
          ) : active ? (
            <>
              <section className="glass-strong mb-8 overflow-hidden rounded-2xl p-5 md:p-7">
                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                  <div>
                    <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="rounded-full bg-amber-500/15 px-3 py-1 font-bold text-amber-200">
                        {active.hijriMonthName} {active.hijriYear}
                      </span>
                      <span>{active.status === "closed" ? "مكتمل" : "الشهر الحالي"}</span>
                    </div>
                    <h2 className="mb-4 text-2xl font-extrabold md:text-4xl">
                      الدور على {active.rotationParticipant?.name ?? "صاحب الدور"}
                    </h2>
                    <div className="mb-4 h-3 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full gold-gradient transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <MetricCard icon={CircleDollarSign} label="المكتمل" value={formatMoney(completedAmount)} />
                      <MetricCard icon={Users} label="الدافعين" value={`${paidCount} / ${data.memberCount}`} />
                      <MetricCard icon={CheckCircle2} label="المستهدف" value={formatMoney(data.expectedAmount)} />
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/5 p-5 text-center">
                    <div className="mx-auto mb-4 h-28 w-28 overflow-hidden rounded-full border border-amber-300/30 bg-muted/30">
                      {active.rotationParticipant?.image ? (
                        <img src={active.rotationParticipant.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <User className="h-10 w-10 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">صاحب الدور</div>
                    <div className="text-xl font-bold">{active.rotationParticipant?.name ?? "-"}</div>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <div className="mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-300" />
                  <h2 className="text-xl font-bold">حالة دفع المشاركين</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {active.payments.map((payment) => (
                    <div key={payment.id} className="glass-strong rounded-2xl p-4">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="h-11 w-11 overflow-hidden rounded-full bg-muted/30">
                          {payment.participant.image ? (
                            <img src={payment.participant.image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-bold">
                              {payment.participant.name.slice(0, 1)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-bold">{payment.participant.name}</div>
                          <div className="text-xs text-muted-foreground">{formatMoney(payment.amount)}</div>
                        </div>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          payment.paid ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-200"
                        }`}
                      >
                        {payment.paid ? "مدفوع" : "لم يدفع"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="glass-strong rounded-2xl p-5">
                <div className="mb-5 flex items-center gap-2">
                  <Clock3 className="h-5 w-5 text-amber-300" />
                  <h2 className="text-xl font-bold">سجل الشهور السابقة</h2>
                </div>
                {!data.history.length ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">لا توجد شهور مكتملة بعد.</p>
                ) : (
                  <div className="space-y-3">
                    {data.history.map((month) => (
                      <div key={month.id} className="rounded-xl bg-white/5 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="font-bold">
                              {month.hijriMonthName} {month.hijriYear}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              الجمعية من {month.rotationParticipant?.name ?? "صاحب الدور"}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {month.closedAt ? formatDate(month.closedAt) : "-"}
                          </div>
                          <div className="font-bold text-emerald-300">{formatMoney(month.expectedAmount)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-4">
      <Icon className="mb-3 h-5 w-5 text-amber-300" />
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}
