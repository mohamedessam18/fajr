import Navbar from "@/components/Navbar";
import { trpc } from "@/providers/trpc";
import { formatDate, formatMoney } from "@/lib/format";
import { ArrowRight, Calendar, HandHeart } from "lucide-react";
import { useNavigate, useParams } from "react-router";

export default function DonationDetailsPage() {
  const navigate = useNavigate();
  const params = useParams();
  const id = Number(params.id);
  const { data: donation, isLoading } = trpc.donation.byId.useQuery(
    { id },
    { enabled: Number.isFinite(id) },
  );

  const hero = donation?.media[0] ?? null;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="relative pt-24 pb-16">
        <div className="absolute inset-0 sunrise-gradient" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate("/donations")}
            className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="w-4 h-4" />
            رجوع للتبرعات
          </button>

          {isLoading ? (
            <div className="glass-strong rounded-2xl p-8 text-center text-muted-foreground">جاري تحميل التفاصيل...</div>
          ) : !donation ? (
            <div className="glass-strong rounded-2xl p-10 text-center">
              <HandHeart className="w-12 h-12 mx-auto mb-4 text-amber-300" />
              <h1 className="text-xl font-bold">التبرع غير موجود</h1>
            </div>
          ) : (
            <article>
              <div className="overflow-hidden rounded-2xl glass-strong">
                <div className="aspect-[16/8] bg-muted/20">
                  {hero?.type === "video" ? (
                    <video src={hero.url} controls className="w-full h-full object-cover" />
                  ) : hero ? (
                    <img src={hero.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-amber-500/10">
                      <HandHeart className="w-16 h-16 text-amber-300" />
                    </div>
                  )}
                </div>
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
                    <div>
                      <p className="text-sm text-amber-300 mb-2">تفاصيل التبرع</p>
                      <h1 className="text-3xl md:text-5xl font-extrabold text-gradient">{donation.title}</h1>
                    </div>
                    <div className="rounded-2xl bg-amber-500/15 px-5 py-3 text-center">
                      <div className="text-xs text-muted-foreground mb-1">المبلغ</div>
                      <div className="text-2xl font-extrabold text-amber-200">{formatMoney(donation.amount)}</div>
                    </div>
                  </div>
                  <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {formatDate(donation.donatedAt)}
                  </div>
                  <p className="whitespace-pre-line leading-8 text-foreground/85">{donation.description}</p>
                </div>
              </div>

              {donation.media.length > 1 && (
                <div className="mt-8">
                  <h2 className="mb-4 text-xl font-bold">الصور والفيديوهات</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {donation.media.slice(1).map((media) => (
                      <div key={media.id} className="overflow-hidden rounded-xl glass-strong">
                        {media.type === "video" ? (
                          <video src={media.url} controls className="aspect-video w-full object-cover" />
                        ) : (
                          <img src={media.url} alt="" className="aspect-video w-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          )}
        </div>
      </main>
    </div>
  );
}
