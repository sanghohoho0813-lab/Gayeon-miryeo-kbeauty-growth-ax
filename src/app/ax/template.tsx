import { PracticeBanner } from "@/components/ax/PracticeKit";
import { DemoRecoveryBanner } from "@/components/ax/DemoRecovery";

export default function AxTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="route-fade">
      <DemoRecoveryBanner />
      <PracticeBanner />
      {children}
    </div>
  );
}
