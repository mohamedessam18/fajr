import Navbar from "@/components/Navbar";
import HeroSection from "@/sections/HeroSection";
import StatsSection from "@/sections/StatsSection";
import ParticipantsSection from "@/sections/ParticipantsSection";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <ParticipantsSection />
    </div>
  );
}
