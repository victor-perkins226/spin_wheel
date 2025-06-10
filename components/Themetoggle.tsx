import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Prevent mismatch during hydration

  const isDark = theme === "dark";

  return (
    <div
      className="relative w-[100px] h-[40px] rounded-full cursor-pointer"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      style={{
        backgroundImage: `url(${
          isDark ? "/assets/switch-elements.png" : "/assets/darkToggle.png"
        })`,
        backgroundSize: "cover",
      }}
    >
      <div
        className={`absolute top-1/2 transform -translate-y-1/2  rounded-full transition-all duration-100 ${
          !isDark ? " shadow-md right-[59px] bg-white w-[40px] h-[40px]" : "w-[60px] h-[60px] left-[39px]"
        }`}
      >
        {" "}
        <img src={isDark ? "/assets/round-button.png" : ""} alt="" />
      </div>
    </div>
  );
}
