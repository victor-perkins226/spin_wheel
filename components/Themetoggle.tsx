import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export  function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme("dark");
  }, []);

  if (!mounted) return null; // Prevent mismatch during hydration

  const isDark = theme === "dark";

  return (
    <div
      className="relative w-[100px] h-[40px] rounded-full cursor-pointer"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      style={{
        backgroundImage: `url(${
          isDark ? "/assets/lightToggle.png" : "/assets/darkToggle.png"
        })`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div
        className={`absolute top-1/2 transform -translate-y-1/2 w-[40px] h-[40px] bg-white rounded-full shadow-md transition-all duration-100 ${
          isDark ? "right-[58px]" : "left-[36px]"
        }`}
      ></div>
    </div>
  );
}
