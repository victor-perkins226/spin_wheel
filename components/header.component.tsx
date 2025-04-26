import Image from "next/image";
import React, { useState, useEffect } from "react";
import Logo from "@/public/assets/logo.svg";
import Link from "next/link";
import Button from "./button.component";
import routes from "@/helpers/routes";
import SVG from "./svg.component";

const NAVLINKS = [
  { link: routes.home(), label: "Home" },
  { link: routes.leaderboard(), label: "Leaderboard" },
  { link: "", label: "Trade" },
  { link: "", label: "Whitepaper" },
];

// Helper function to truncate wallet addresses
const truncateAddress = (address) => {
  if (!address) return "";
  const firstPart = address.slice(0, 4);
  const lastPart = address.slice(-4);
  return `${firstPart}...${lastPart}`;
};

export default function Header() {
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [mounted, setMounted] = useState(false);

  // This effect handles hydration issues with Next.js
  useEffect(() => {
    setMounted(true);
    
    // Check if wallet was previously connected
    const checkWalletConnection = async () => {
      try {
        // Check if Phantom wallet exists in window
        const { solana } = window;
        
        if (solana?.isPhantom) {
          // Try to restore connection
          const response = await solana.connect({ onlyIfTrusted: true });
          const address = response.publicKey.toString();
          setWalletAddress(address);
          setConnected(true);
          console.log('Connected with:', address);
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }
    };

    if (typeof window !== 'undefined') {
      checkWalletConnection();
    }
  }, []);

  const connectWallet = async () => {
    try {
      const { solana } = window;
      
      if (!solana) {
        alert("Phantom wallet not found! Please install it from https://phantom.app/");
        return;
      }

      // Connect to wallet
      const response = await solana.connect();
      const address = response.publicKey.toString();
      setWalletAddress(address);
      setConnected(true);
      console.log('Connected with:', address);
    } catch (error) {
      console.error("Error connecting to wallet:", error);
    }
  };

  const disconnectWallet = () => {
    try {
      const { solana } = window;
      
      if (solana) {
        solana.disconnect();
        setConnected(false);
        setWalletAddress("");
        console.log('Disconnected from wallet');
      }
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    }
  };

  const renderWalletButton = () => {
    if (!mounted) return <Button className="cursor-pointer">Connect Wallet</Button>;
    
    if (connected && walletAddress) {
      return (
        <div className="flex items-center gap-2">
          <div className="glass py-2 px-4 rounded-full text-sm">
            {truncateAddress(walletAddress)}
          </div>
          <Button className="cursor-pointer" onClick={disconnectWallet}>Disconnect</Button>
        </div>
      );
    }
    
    return (
      <Button className="cursor-pointer" onClick={connectWallet}>Connect Wallet</Button>
    );
  };

  return (
    <div className="container">
      <header className="hidden glass mt-[58px] rounded-[20px] md:flex justify-between items-center p-[20px] max-w-[1290] mx-auto">
        <Link href={routes.home()}>
          <Image className="w-[140px]" src={Logo} alt="fortuva logo" />
        </Link>

        <nav className="flex gap-[16px] xl:gap-[70px]">
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

        {renderWalletButton()}
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
