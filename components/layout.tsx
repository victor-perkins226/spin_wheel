import React, { ReactNode } from "react";
import Header from "./header.component";
import MobileNav from "./mobile-nav.component";
import { useRouter } from "next/router";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  
  return (
    <>
      <Header />
      {children}
      {router.pathname !== "/leaderboard" && <MobileNav />}
    </>
  );
}
