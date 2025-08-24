import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface BottomSheetProps {
  children: ReactNode;
  className?: string;
  isActive?: boolean;
}

export function BottomSheet({ children, className, isActive = true }: BottomSheetProps) {
  return (
    <div className={cn(
      "absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-xl transition-all duration-300",
      isActive ? "slide-up active" : "slide-up",
      className
    )} data-testid="bottom-sheet">
      <div className="flex items-center justify-center pt-4 pb-2">
        <div className="w-12 h-1 bg-gray-300 rounded-full" data-testid="bottom-sheet-handle"></div>
      </div>
      {children}
    </div>
  );
}
