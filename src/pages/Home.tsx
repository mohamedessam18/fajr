import Navbar from "@/components/Navbar";
import HeroSection from "@/sections/HeroSection";
import StatsSection from "@/sections/StatsSection";
import ParticipantsSection from "@/sections/ParticipantsSection";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <ParticipantsSection />

      {/* Footer */}
      <footer className="py-12 relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src="/assets/logo.png" alt="" className="w-8 h-8 object-contain" />
              <span className="text-lg font-bold text-gradient">صحصح للفجر</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              مجتمع خاص للالتزام بصلاة الفجر والصدقة الجارية
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
              <Heart className="w-3 h-3 text-red-400" />
              <span>صدقة جارية عن روح والدينا وجميع موتى المسلمين</span>
            </div>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
