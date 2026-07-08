import { AutomatedWorkflow } from "@/components/landing/AutomatedWorkflow";
import { BacklogCta } from "@/components/landing/BacklogCta";
import { HeroLanding } from "@/components/landing/HeroLanding";
import { IdeaToBacklog } from "@/components/landing/IdeaToBacklog";
import { Navbar } from "@/components/landing/Navbar/Navbar";
import { PricingPlans } from "@/components/landing/PricingPlans";
import { ProductDemoVideo } from "@/components/landing/ProductDemoVideo";

export default function Home() {
  return (
    <>
      <Navbar />
      <HeroLanding />
      <ProductDemoVideo />
      <PricingPlans />
      <BacklogCta />
    </>
  );
}