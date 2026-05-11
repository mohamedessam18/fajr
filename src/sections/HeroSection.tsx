import { motion } from "framer-motion";
import { Sunrise, Heart, Users } from "lucide-react";

export default function HeroSection() {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 sunrise-gradient" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(234,179,8,0.08)_0%,_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(234,179,8,0.05)_0%,_transparent_50%)]" />

      {/* Floating Orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(234,179,8,0.15) 0%, transparent 70%)",
        }}
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -20, 30, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(234,179,8,0.08) 0%, transparent 70%)",
        }}
        animate={{
          x: [0, -40, 20, 0],
          y: [0, 30, -40, 0],
          scale: [1, 0.95, 1.1, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-8"
        >
          <motion.img
            src="/assets/logo.png"
            alt="صحصح للفجر"
            className="w-32 h-32 md:w-48 md:h-48 mx-auto object-contain drop-shadow-2xl"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight"
        >
          <span className="text-gradient">صحصح للفجر</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-lg md:text-2xl text-muted-foreground mb-4 font-light"
        >
          مجتمع خاص للالتزام بصلاة الفجر والصدقة الجارية
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="text-sm md:text-base text-muted-foreground/70 mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          نحن مجموعة من الأصدقاء نلتزم بصلاة الفجر، ومن يتغيب يتصدق بـ 10 جنيهات
          يتم جمعها وإخراجها للفقراء والمحتاجين
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="flex flex-wrap gap-4 justify-center mb-12"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => scrollToSection("stats")}
            className="px-8 py-3 rounded-full gold-gradient text-[#0a0e1a] font-bold text-sm md:text-base flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow"
          >
            <Sunrise className="w-5 h-5" />
            عرض الإحصائيات
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => scrollToSection("participants")}
            className="px-8 py-3 rounded-full glass text-foreground font-bold text-sm md:text-base flex items-center gap-2 hover:bg-white/10 transition-colors"
          >
            <Users className="w-5 h-5" />
            المشاركون
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="flex items-center justify-center gap-2 text-muted-foreground/50 text-sm"
        >
          <Heart className="w-4 h-4 text-red-400" />
          <span>صدقة جارية عن روح والدينا وجميع موتى المسلمين</span>
        </motion.div>
      </div>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
