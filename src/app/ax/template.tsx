import { PracticeBanner } from "@/components/ax/PracticeKit";

export default function AxTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="route-fade">
      <PracticeBanner />
      {children}
    </div>
  );
}
