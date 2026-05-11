import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Coins, Users, XCircle, AlertTriangle } from "lucide-react";
import AnimatedCounter from "@/components/AnimatedCounter";
import { trpc } from "@/providers/trpc";

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  suffix?: string;
  prefix?: string;
  delay: number;
  isInView: boolean;
  accent?: string;
}

function StatCard({ icon, value, label, suffix = "", prefix = "", delay, isInView, accent = "gold" }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      className="glass-strong rounded-2xl p-6 md:p-8 text-center card-hover group"
    >
      <motion.div
        className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 ${
          accent === "gold"
            ? "bg-amber-500/10 text-amber-400"
            : accent === "blue"
            ? "bg-blue-500/10 text-blue-400"
            : accent === "red"
            ? "bg-red-500/10 text-red-400"
            : "bg-emerald-500/10 text-emerald-400"
        }`}
        whileHover={{ rotate: [0, -5, 5, 0] }}
        transition={{ duration: 0.5 }}
      >
        {icon}
      </motion.div>
      <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">
        <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
      </div>
      <p className="text-sm md:text-base text-muted-foreground">{label}</p>
    </motion.div>
  );
}

export default function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const { data: stats } = trpc.participant.stats.useQuery();

  const totalCollected = stats?.totalCollected ?? 140;
  const totalParticipants = stats?.totalParticipants ?? 10;
  const totalMissed = stats?.totalMissed ?? 14;
  const totalUnpaid = stats?.totalUnpaid ?? 0;

  return (
    <section id="stats" className="py-20 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gradient mb-4">
            إحصائيات المبادرة
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto">
            نتائج التزامنا بصلاة الفجر والتبرعات المجموعة للصدقة الجارية
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard
            icon={<Coins className="w-7 h-7" />}
            value={totalCollected}
            label="إجمالي المبالغ المجمعة"
            suffix=" جنيه"
            delay={0}
            isInView={isInView}
            accent="gold"
          />
          <StatCard
            icon={<Users className="w-7 h-7" />}
            value={totalParticipants}
            label="عدد المشاركين"
            suffix=" مشارك"
            delay={0.15}
            isInView={isInView}
            accent="blue"
          />
          <StatCard
            icon={<XCircle className="w-7 h-7" />}
            value={totalMissed}
            label="إجمالي مرات التغيب"
            suffix=" مرة"
            delay={0.3}
            isInView={isInView}
            accent="red"
          />
          <StatCard
            icon={<AlertTriangle className="w-7 h-7" />}
            value={totalUnpaid}
            label="المبالغ غير المسددة"
            suffix=" جنيه"
            delay={0.45}
            isInView={isInView}
            accent="emerald"
          />
        </div>
      </div>
    </section>
  );
}
