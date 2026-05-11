import { ThemeProvider } from "@/hooks/useTheme";
import FloatingParticles from "./FloatingParticles";
import { Toaster } from "@/components/ui/sonner";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div className="relative min-h-screen" dir="rtl">
        <FloatingParticles />
        <div className="relative z-10">{children}</div>
        <Toaster position="top-center" />
      </div>
    </ThemeProvider>
  );
}
