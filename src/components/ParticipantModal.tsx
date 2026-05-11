import { motion } from "framer-motion";
import { X, User, CreditCard, XCircle, AlertCircle, TrendingDown, CheckCircle2 } from "lucide-react";
import type { Participant } from "@db/schema";

interface Props {
  participant: Participant;
  onClose: () => void;
}

function getStatus(missed: number, unpaid: number) {
  if (missed === 0) return { label: "ملتزم بالفجر", color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/20", icon: CheckCircle2 };
  if (unpaid > 0) return { label: "يوجد مبلغ مستحق", color: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/20", icon: AlertCircle };
  return { label: "تم السداد", color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/20", icon: TrendingDown };
}

export default function ParticipantModal({ participant, onClose }: Props) {
  const status = getStatus(participant.missedCount, participant.unpaidAmount);
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
        animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
        exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
        className="absolute inset-0 bg-black/60"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 50 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg glass-strong rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Top Gradient */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-amber-500/10 to-transparent" />

        {/* Close Button */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="absolute top-4 left-4 z-20 p-2 rounded-full glass hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </motion.button>

        {/* Content */}
        <div className="relative z-10 p-6 md:p-8">
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15, delay: 0.1 }}
            className="mx-auto mb-5"
          >
            <div className="w-28 h-28 md:w-32 md:h-32 mx-auto rounded-full overflow-hidden border-3 border-amber-500/30 shadow-2xl">
              {participant.image ? (
                <img
                  src={participant.image}
                  alt={participant.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <User className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>
          </motion.div>

          {/* Name */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl md:text-3xl font-bold text-center mb-2 text-gradient"
          >
            {participant.name}
          </motion.h2>

          {/* Status Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center mb-6"
          >
            <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium ${status.bg} ${status.color} border ${status.border}`}>
              <StatusIcon className="w-4 h-4" />
              {status.label}
            </span>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-3 gap-3 md:gap-4 mb-6"
          >
            <div className="glass rounded-xl p-3 md:p-4 text-center">
              <XCircle className="w-5 h-5 text-red-400 mx-auto mb-2" />
              <div className="text-xl md:text-2xl font-bold text-foreground">{participant.missedCount}</div>
              <div className="text-xs text-muted-foreground mt-1">مرات التغيب</div>
            </div>
            <div className="glass rounded-xl p-3 md:p-4 text-center">
              <CreditCard className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <div className="text-xl md:text-2xl font-bold text-emerald-400">{participant.paidAmount}</div>
              <div className="text-xs text-muted-foreground mt-1">المسدد (جنيه)</div>
            </div>
            <div className="glass rounded-xl p-3 md:p-4 text-center">
              <AlertCircle className="w-5 h-5 text-amber-400 mx-auto mb-2" />
              <div className="text-xl md:text-2xl font-bold text-amber-400">{participant.unpaidAmount}</div>
              <div className="text-xs text-muted-foreground mt-1">المستحق (جنيه)</div>
            </div>
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass rounded-xl p-4 text-center"
          >
            <p className="text-sm text-muted-foreground">
              {participant.missedCount === 0 ? (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ماشاء الله! ملتزم بصلاة الفجر حتى الآن
                </span>
              ) : participant.unpaidAmount > 0 ? (
                <span className="flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  يجب سداد مبلغ {participant.unpaidAmount} جنيه عن {participant.unpaidAmount / 10} صلوات فجر
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  تم سداد جميع المبالغ المستحقة - جزاك الله خيراً
                </span>
              )}
            </p>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
