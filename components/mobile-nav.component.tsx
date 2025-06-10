import React from "react";
import SVG, { IconType } from "./svg.component";
import Link from "next/link";
import routes from "@/helpers/routes";
import { useRouter } from "next/router";

const MOBILE_NAV_LINKS: { icon: IconType; url: string }[] = [
  { icon: "home", url: routes.home() },
  { icon: "chart", url: "/" },
  { icon: "medal", url: "/leaderboard" }, // should be "/leaderboard"
  { icon: "bag", url: "/" },
];

export default function MobileNav() {
  const { pathname, asPath } = useRouter();

const isNavActive = (url: string) => pathname === url;
  return (
    <nav className="glass w-full fixed bottom-0 pt-[9px] pb-[20px] px-[30px] rounded-[20px] z-[100] flex md:hidden justify-around items-end">
    {MOBILE_NAV_LINKS.map((el, key) => (
        <Link
          href={el.url}
          key={key}
          className="flex flex-col gap-3 items-center"
        >
          {isNavActive(el.url) && !["chart", "bag"].includes(el.icon) && (
            <div className="size-[8px] rounded-full bg-white"></div>
          )}
          <SVG
            color={
              isNavActive(el.url) && !["chart", "bag"].includes(el.icon)
                ? "#ffffff"
                : "#BAC2CC"
            }
            width={24}
            height={24}
            iconName={el.icon}
          />
        </Link>
      ))}
    </nav>
  );
}
