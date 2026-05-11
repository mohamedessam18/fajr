import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface ThemedLogoProps {
  alt?: string;
  className?: string;
}

export default function ThemedLogo({ alt = "صحصح للفجر", className }: ThemedLogoProps) {
  const { theme } = useTheme();
  const src = theme === "light" ? "/assets/logo-light.png" : "/assets/logo.png";

  return <img src={src} alt={alt} className={cn("object-contain", className)} />;
}
