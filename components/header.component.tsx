import Image from "next/image";
import React from "react";
import Logo from "@/public/assets/logo.svg";
import Link from "next/link";
import Button from "./button.component";

const NAVLINKS = [
  { link: "", label: "Home" },
  { link: "", label: "Trade" },
  { link: "", label: "Tools" },
  { link: "", label: "Leaderboard" },
  { link: "", label: "Whitepaper" },
];

export default function Header() {
  return (
    <div className="container">
      <header className="glass mt-[58px] rounded-[20px] flex justify-between items-center p-[20px] max-w-[1290] mx-auto">
        <Image className="w-[140px]" src={Logo} alt="fortuva logo" />

        <nav className="hidden xl:flex gap-[70px]">
          {NAVLINKS.map((navLink, key) => (
            <Link
              className="font-semibold text-lg"
              key={key}
              href={navLink.link}
            >
              {navLink.label}
            </Link>
          ))}
        </nav>

        <Button>Connect Wallet</Button>
      </header>
    </div>
  );
}
