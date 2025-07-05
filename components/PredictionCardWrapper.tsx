import { MarketPausedToast } from "./toasts";

export default function PredictionCardWrapper({
  isPaused,
  theme,
  children,
}: {
  isPaused: boolean;
  theme: "light" | "dark";
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {children}

      {isPaused && (
        <>
          <div className="absolute inset-0 bg-black/50 z-10" />
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="pointer-events-auto">
              <MarketPausedToast theme={theme} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
