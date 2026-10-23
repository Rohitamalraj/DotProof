import { Hero } from "@/components/home/Hero";
import { Stats } from "@/components/home/Stats";
import { Newsletter } from "@/components/home/Newsletter";
import { AgentsDark } from "@/components/home/AgentsDark";
import { MarketsDark } from "@/components/home/MarketsDark";
import { Build } from "@/components/home/Build";
import { ChartSection } from "@/components/home/ChartSection";
import { Incident } from "@/components/home/Incident";

export default function Home() {
  return (
    <>
      <Hero />
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
