import { PracticeBanner } from "@/components/ax/PracticeKit";
import { DemoRecoveryBanner } from "@/components/ax/DemoRecovery";
import { ConnectionBanner } from "@/components/ax/ConnectionBanner";

export default function AxTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="route-fade">
      <ConnectionBanner />
      <DemoRecoveryBanner />
      <PracticeBanner />
      {children}
    </div>
  );
}
