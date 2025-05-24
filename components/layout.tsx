import React, { ReactNode } from "react";
import MobileNav from "./mobile-nav.component";
import Header from "./header.component";
import { useTheme } from "next-themes";

interface IProps {
  children: ReactNode;
}

export default function Layout({ children }: IProps) {
  const {theme} = useTheme();
  return (
    <>
    <div className={`${theme === "dark" ?"bg-background" :"bg-gradient-to-b from-[#fefefe] via-pink-100 to-violet-50"}`}>
      <Header />
      <div className="pb-[80px]">{children}</div>
      <MobileNav />
    </div>
    </>
  );
}
