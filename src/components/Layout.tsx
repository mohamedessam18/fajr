import { ThemeProvider } from "@/hooks/useTheme";
import FloatingParticles from "./FloatingParticles";
import { Toaster } from "@/components/ui/sonner";
import Footer from "./Footer";
import { useLocation } from "react-router";

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const showFooter = !location.pathname.startsWith("/admin") && location.pathname !== "/admin-secret-dashboard";

  return (
    <ThemeProvider>
      <div className="relative min-h-screen" dir="rtl">
        <FloatingParticles />
        <div className="relative z-10">
          {children}
          {showFooter && <Footer />}
        </div>
        <Toaster position="top-center" />
      </div>
    </ThemeProvider>
  );
}
