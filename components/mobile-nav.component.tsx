import React from "react";
import SVG, { IconType } from "./svg.component";
import Link from "next/link";
import routes from "@/helpers/routes";

const MOBILE_NAV_LINKS: { icon: IconType; url: string }[] = [
  { icon: "home", url: routes.home() },
  { icon: "chart", url: "/" },
  { icon: "medal", url: routes.leaderboard() },
  { icon: "bag", url: "/" },
];

export default function MobileNav() {
  return (
    <nav className="glass w-full fixed bottom-0 pt-[9px] pb-[20px] px-[30px] rounded-[20px] flex md:hidden justify-around items-end">
      {MOBILE_NAV_LINKS.map((el, key) => (
        <Link
          href={el.url}
          key={key}
          className="flex flex-col gap-3 items-center"
        >
          {key === 0 && (
            <div className="size-[8px] rounded-full bg-white"></div>
          )}
          <SVG
            color={key === 0 ? "#ffffff" : "#BAC2CC"}
            width={24}
            height={24}
            iconName={el.icon}
          />
        </Link>
      ))}
    </nav>
  );
}
