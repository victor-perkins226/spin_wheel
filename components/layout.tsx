import React, { ReactNode, useEffect, useState } from "react";
import MobileNav from "./mobile-nav.component";
import Header from "./header.component";
import { useTheme } from "next-themes";
import Footer from "./Footer";

interface IProps {
  children: ReactNode;
}

export default function Layout({ children }: IProps) {
  const {theme, systemTheme} = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by showing a consistent state until mounted
  if (!mounted) {
    return (
      <div className="bg-background min-h-screen">
        {children}
      </div>
    );
  }
  const currentTheme = theme === 'system' ? systemTheme : theme;

  return (
    <>
    <div 
    className={`min-h-screen ${
        currentTheme === 'dark' 
          ? 'bg-background' 
          : 'bg-gradient-to-b from-[#fefefe] via-pink-100 to-violet-50'
      }`}>
      <Header />
      <div className="pb-[80px]">{children}</div>
      <MobileNav />
      <Footer/>
    </div>
    </>
  );
}