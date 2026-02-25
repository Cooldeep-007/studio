import { LandingHeader } from '@/components/landing/header';
import { HeroSection } from '@/components/landing/hero';
import { FeaturesSection } from '@/components/landing/features';
import { DashboardPreviewSection } from '@/components/landing/dashboard-preview';
import { WhoItsForSection } from '@/components/landing/who-its-for';
import { SecuritySection } from '@/components/landing/security';
import { TestimonialsSection } from '@/components/landing/testimonials';
import { PricingSection } from '@/components/landing/pricing';
import { FinalCTASection } from '@/components/landing/final-cta';
import { LandingFooter } from '@/components/landing/footer';

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground">
      <LandingHeader />
      <main>
        <HeroSection />
        <FeaturesSection />
        <DashboardPreviewSection />
        <WhoItsForSection />
        <SecuritySection />
        <TestimonialsSection />
        <PricingSection />
        <FinalCTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
