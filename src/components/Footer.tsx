import { Heart } from "lucide-react";
import { motion } from "framer-motion";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative py-10" dir="rtl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="text-center"
        >
          <div className="mb-3 flex items-center justify-center gap-3">
            <img src="/assets/logo.png" alt="" className="h-8 w-8 object-contain" />
            <span className="text-lg font-bold text-gradient">صحصح للفجر</span>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            مجتمع خاص للالتزام بصلاة الفجر والصدقة الجارية
          </p>
          <div className="mb-3 flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
            <Heart className="h-3 w-3 text-red-400" />
            <span>صدقة جارية عن روح والدينا وجميع موتى المسلمين</span>
          </div>
          <p className="text-xs text-muted-foreground/70">© {currentYear} محمد عصام</p>
        </motion.div>
      </div>
    </footer>
  );
}
