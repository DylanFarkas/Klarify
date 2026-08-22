import { LandingFooter } from "@/components/landing/LandingFooter";
import { HeroLanding } from "@/components/landing/HeroLanding";
import { Navbar } from "@/components/landing/Navbar/Navbar";
import { FaqSection } from "@/components/landing/FaqSection";
import { ImpactBento } from "@/components/landing/ImpactBento";
import { PricingPlans } from "@/components/landing/PricingPlans";
import { ProductDemoVideo } from "@/components/landing/ProductDemoVideo";

export default function Home() {
  return (
    <div className="bg-[#000000]">
      <Navbar />
      <HeroLanding />
      <ProductDemoVideo />
      <PricingPlans />
      <ImpactBento />
      <FaqSection />
      <LandingFooter />
    </div>
  );
}