import Navbar from "@/components/Navbar";
import { trpc } from "@/providers/trpc";
import { formatDate, formatMoney } from "@/lib/format";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, HandHeart } from "lucide-react";
import { useNavigate } from "react-router";

export default function DonationsPage() {
  const navigate = useNavigate();
  const { data: donations, isLoading } = trpc.donation.list.useQuery();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="relative pt-28 pb-16">
        <div className="absolute inset-0 sunrise-gradient" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <p className="text-sm text-amber-300 mb-2">أثر الصدقات</p>
            <h1 className="text-3xl md:text-5xl font-extrabold text-gradient mb-3">التبرعات</h1>
            <p className="text-muted-foreground max-w-2xl">
              هنا بنوثق أوجه الخير التي خرجت من الفلوس المتجمعة، بالصور والفيديوهات والتفاصيل.
            </p>
          </div>

          {isLoading ? (
            <div className="glass-strong rounded-2xl p-8 text-center text-muted-foreground">جاري تحميل التبرعات...</div>
          ) : !donations?.length ? (
            <div className="glass-strong rounded-2xl p-10 text-center">
              <HandHeart className="w-12 h-12 mx-auto mb-4 text-amber-300" />
              <h2 className="text-xl font-bold mb-2">لا توجد تبرعات منشورة بعد</h2>
              <p className="text-muted-foreground">أول تبرع سيتم توثيقه هنا فور إضافته.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {donations.map((donation, index) => (
                <motion.button
                  key={donation.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  onClick={() => navigate(`/donations/${donation.id}`)}
                  className="group overflow-hidden rounded-2xl glass-strong text-right transition hover:-translate-y-1 hover:bg-white/15"
                >
                  <div className="aspect-[16/10] bg-muted/20 overflow-hidden">
                    {donation.cover?.type === "video" ? (
                      <video src={donation.cover.url} className="w-full h-full object-cover" muted />
                    ) : donation.cover ? (
                      <img src={donation.cover.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-amber-500/10">
                        <HandHeart className="w-12 h-12 text-amber-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <span className="text-lg font-bold text-foreground line-clamp-1">{donation.title}</span>
                      <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-200">
                        {formatMoney(donation.amount)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-10">
                      {donation.summary || donation.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(donation.donatedAt)}
                      </span>
                      <span className="flex items-center gap-1 text-amber-200">
                        التفاصيل
                        <ArrowLeft className="w-4 h-4 transition group-hover:-translate-x-1" />
                      </span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
