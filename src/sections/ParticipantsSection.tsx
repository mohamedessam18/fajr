import { useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { User, CreditCard, XCircle, AlertCircle, TrendingDown, CheckCircle2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import ParticipantModal from "@/components/ParticipantModal";

const FALLBACK_PARTICIPANTS = [
  { id: 1, name: "محمد عصام", image: "/assets/mohamed essam.jpg", missedCount: 3, paidAmount: 30, unpaidAmount: 0, createdAt: new Date() },
  { id: 2, name: "عمار ياسر", image: "/assets/amar yasser.jpg", missedCount: 0, paidAmount: 0, unpaidAmount: 0, createdAt: new Date() },
  { id: 3, name: "محمد حامد", image: "/assets/mohamed hamed.jpg", missedCount: 2, paidAmount: 20, unpaidAmount: 0, createdAt: new Date() },
  { id: 4, name: "زياد محمد", image: "/assets/zyad mohamed.jpg", missedCount: 3, paidAmount: 30, unpaidAmount: 0, createdAt: new Date() },
  { id: 5, name: "محمد ايمن", image: "/assets/mohamed ayman.jpg", missedCount: 2, paidAmount: 20, unpaidAmount: 0, createdAt: new Date() },
  { id: 6, name: "محمود عبد العليم", image: "/assets/mahmoud abdelalem.jpg", missedCount: 1, paidAmount: 10, unpaidAmount: 0, createdAt: new Date() },
  { id: 7, name: "اسامه زغابة", image: "/assets/osama zaghaba.jpg", missedCount: 1, paidAmount: 10, unpaidAmount: 0, createdAt: new Date() },
  { id: 8, name: "وليد خالد", image: "/assets/waleed khaled.jpg", missedCount: 0, paidAmount: 0, unpaidAmount: 0, createdAt: new Date() },
  { id: 9, name: "احمد حمدان", image: "/assets/ahmed hemdan.jpg", missedCount: 2, paidAmount: 20, unpaidAmount: 0, createdAt: new Date() },
  { id: 10, name: "مصطفى عادل", image: "/assets/mostafa adel.jpg", missedCount: 0, paidAmount: 0, unpaidAmount: 0, createdAt: new Date() },
];

function StatusIndicator({ missed, unpaid }: { missed: number; unpaid: number }) {
  if (missed === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" />
        ملتزم
      </span>
    );
  }
  if (unpaid > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20">
        <AlertCircle className="w-3 h-3" />
        مديون
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
      <TrendingDown className="w-3 h-3" />
      مسدد
    </span>
  );
}

export default function ParticipantsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: apiParticipants, isLoading } = trpc.participant.list.useQuery();
  const participantsList = apiParticipants && apiParticipants.length > 0 ? apiParticipants : FALLBACK_PARTICIPANTS;

  const selectedParticipant = participantsList?.find((p) => p.id === selectedId);

  return (
    <section id="participants" className="py-20 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gradient mb-4">
            المشاركون
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto">
            أعضاء مجتمع صحصح للفجر والتزامهم بصلاة الفجر
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass-strong rounded-2xl p-6 animate-pulse">
                <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4" />
                <div className="h-5 bg-muted rounded w-2/3 mx-auto mb-3" />
                <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {participantsList?.map((participant, index) => (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.06 }}
                whileHover={{ scale: 1.03, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedId(participant.id)}
                className="glass-strong rounded-2xl p-5 md:p-6 cursor-pointer card-hover group glow-gold-soft hover:glow-gold relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="relative mx-auto mb-4">
                    <div className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-full overflow-hidden border-2 border-amber-500/20 group-hover:border-amber-500/40 transition-colors duration-300">
                      {participant.image ? (
                        <img
                          src={participant.image}
                          alt={participant.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <User className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                      <StatusIndicator
                        missed={participant.missedCount}
                        unpaid={participant.unpaidAmount}
                      />
                    </div>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-center mb-3 text-foreground group-hover:text-gradient transition-all duration-300">
                    {participant.name}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                        التغيبات
                      </span>
                      <span className="font-semibold text-foreground">
                        {participant.missedCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                        المسدد
                      </span>
                      <span className="font-semibold text-foreground">
                        {participant.paidAmount} جنيه
                      </span>
                    </div>
                    {participant.unpaidAmount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                          غير مسدد
                        </span>
                        <span className="font-semibold text-amber-400">
                          {participant.unpaidAmount} جنيه
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedId && selectedParticipant && (
          <ParticipantModal
            participant={selectedParticipant}
            onClose={() => setSelectedId(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
