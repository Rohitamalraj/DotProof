import { Hero } from "@/components/home/Hero";
import { Belt } from "@/components/home/Belt";
import { Stats } from "@/components/home/Stats";
import { Newsletter } from "@/components/home/Newsletter";
import { AgentsDark } from "@/components/home/AgentsDark";
import { MarketsDark } from "@/components/home/MarketsDark";
import { Build } from "@/components/home/Build";
import { ChartSection } from "@/components/home/ChartSection";
import { Incident } from "@/components/home/Incident";

// The "live" numbers now sit in the hero's backing card, so the separate live strip was dropped to avoid repeating them.
export default function Home() {
  return (
    <>
      <Hero />
      <Belt />
      <Stats />
      <Newsletter />
      <AgentsDark />
      <MarketsDark />
      <Build />
      <ChartSection />
      <Incident />
    </>
  );
}
