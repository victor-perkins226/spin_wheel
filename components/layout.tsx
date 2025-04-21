import React, { ReactNode } from "react";
import MobileNav from "./mobile-nav.component";
import Header from "./header.component";

interface IProps {
  children: ReactNode;
}

export default function Layout({ children }: IProps) {
  return (
    <>
      <Header />
      <div className="mb-[80px]">{children}</div>
      <MobileNav />
    </>
  );
}
