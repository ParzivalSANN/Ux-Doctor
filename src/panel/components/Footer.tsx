import { ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto pt-4 px-4 pb-2">
      <div className="py-2.5 px-3.5 rounded-2xl bg-background-card/60 border border-background-surface/60 flex items-center justify-center gap-2 text-center">
        <ShieldCheck className="w-4 h-4 text-pastel-mint shrink-0" strokeWidth={2.4} />
        <span className="text-[11px] font-medium text-pastel-lavender/90">
          <strong className="text-pastel-mint font-bold">%100 Yerel</strong> çalışır. Verileriniz izniniz olmadan tarayıcıdan çıkmaz.
        </span>
      </div>
    </footer>
  );
}
