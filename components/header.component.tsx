import Image from "next/image";
import React, { useState, useEffect } from "react";
import Logo from "@/public/assets/logo.svg";
import Link from "next/link";
import Button from "./button.component";
import routes from "@/helpers/routes";
import SVG from "./svg.component";
import { WalletDisconnectButton, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

const NAVLINKS = [
  { link: routes.home(), label: "Home" },
  { link: routes.leaderboard(), label: "Leaderboard" },
  { link: "", label: "Trade" },
  { link: "", label: "Whitepaper" },
];

export default function Header() {
  const { publicKey, connected, disconnect } = useWallet();

  return (
    <div className="container">
      <header className="hidden glass mt-[58px] rounded-[20px] md:flex justify-between items-center p-[20px] max-w-[1290] mx-auto">
        <Link href={routes.home()}>
          <Image className="w-[140px]" src={Logo} alt="fortuva logo" />
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

        {/* {renderWalletButton()} */}

        <WalletMultiButton />
        {/* <WalletDisconnectButton/> */}
      </header>

      <header className="flex md:hidden justify-between p-[20px] mt-[58px]">
        <SVG iconName="profile" width={52} height={52} />

        <div className="glass p-[15px] rounded-[20px]">
          <SVG iconName="live" width={21.5} height={18.49} />
        </div>
      </header>
    </div>
  );
}
