import Image from "next/image";
import React, { useEffect, useState } from "react";
import darkLogo from "@/public/assets/logo.svg";
import lightLogo from "@/public/assets/lightLogo.png";
import Link from "next/link";
import routes from "@/helpers/routes";
import SVG from "./svg.component";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useTheme } from "next-themes";
import { ThemeToggle } from "./Themetoggle";
import LanguageDropdown from "./LanguageDropdown";

export default function Header() {
  const { theme } = useTheme();

  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by checking if component has mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="container">
      <header className="hidden glass mt-[58px] rounded-[20px] md:flex justify-between items-center p-[20px] max-w-[1290] mx-auto">
        <Link href={routes.home()}>
          {mounted && (
            <Image
              className="w-[140px]"
              src={theme === "dark" ? darkLogo : lightLogo}
              alt="fortuva logo"
            />
          )}
        </Link>

        {/* <nav className="flex gap-[16px] xl:gap-[70px]">
          {NAVLINKS.map((navLink, key) => (
            <Link
              className="font-semibold text-lg"
              key={key}
              href={navLink.link}
            >
              {navLink.label}
            </Link>
          ))}
        </nav> */}
        <div className="flex gap-6 items-center">
          <LanguageDropdown />
          <ThemeToggle />
          {/* {renderWalletButton()} */}

          <WalletMultiButton />
        </div>
        {/* <WalletDisconnectButton/> */}
      </header>

      <header className="flex md:hidden justify-between p-[20px] mt-[58px]">
        <SVG iconName="profile" width={52} height={52} />

 <WalletMultiButton />
        <div className="glass p-[15px] rounded-[20px]">
          <SVG iconName="live" width={21.5} height={18.49} />
        </div>
      </header>
    </div>
  );
}
