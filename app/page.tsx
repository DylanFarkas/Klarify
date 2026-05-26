import { AutomatedWorkflow } from "@/components/landing/AutomatedWorkflow";
import { HeroLanding } from "@/components/landing/HeroLanding";
import { IdeaToBacklog } from "@/components/landing/IdeaToBacklog";
import { Navbar } from "@/components/landing/Navbar/Navbar";

export default function Home() {
  return (
    <>
      <Navbar />
      <HeroLanding />
      <IdeaToBacklog />
      <AutomatedWorkflow />
    </>
  );
}