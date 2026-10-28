import { Layers3 } from "lucide-react";

export function PageLoader() {
    return (
        <main className="grid min-h-screen place-items-center bg-[#f4f6fb] text-[#171a2a]">
            <div className="flex flex-col items-center gap-4">
                <span className="grid h-12 w-12 animate-pulse place-items-center rounded-2xl bg-[#7057ed] text-white shadow-lg shadow-[#7057ed]/20">
                    <Layers3 size={22} />
                </span>
                <p className="text-xs font-medium text-[#85899d]">
                    Loading your workspace…
                </p>
            </div>
        </main>
    );
}
