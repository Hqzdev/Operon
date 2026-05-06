import Image from "next/image";
import operonIcon from "./operonicon.png";

export default function Loading() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[#f3f3f3] text-[#171717]">
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex size-24 items-center justify-center rounded-2xl bg-[#111111] shadow-[0_18px_50px_rgba(0,0,0,0.14)]">
          <div className="absolute inset-0 rounded-2xl border border-white/10" />
          <Image
            src={operonIcon}
            alt="Operon"
            width={58}
            height={58}
            priority
            className="animate-[spin_1.35s_linear_infinite]"
          />
        </div>
        <div className="flex items-center gap-1.5 text-[22px] font-medium tracking-tight">
          <span>Loading</span>
          <span className="animate-pulse">.</span>
          <span className="animate-pulse [animation-delay:150ms]">.</span>
          <span className="animate-pulse [animation-delay:300ms]">.</span>
        </div>
      </div>
    </main>
  );
}
