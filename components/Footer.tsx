// components/Footer.tsx
import React from "react";
import Image from "next/image";
import {
  FaFacebookF,
  FaTwitter,
  FaRedditAlien,
  FaTelegramPlane,
  FaDiscord,
} from "react-icons/fa";
import { GiBurningMeteor } from "react-icons/gi";

export default function Footer() {
  const sections = [
    {
      title: "HOME",
      links: [
        "What is Fortuva?",
        "How it Works",
        "Our Roadmap",
        "Why Fortuva?",
      ],
    },
    { title: "PREDICTIONS", links: ["Expired", "Live", "Next", "Later"] },
    {
      title: "ADMIN",
      links: ["Login", "Role Management", "Bot Management", "Multi Sig"],
    },
  ];

  const socials = [
    { icon: <FaFacebookF />, href: "/" },
    { icon: <FaTwitter />, href: "/" },
    { icon: <FaRedditAlien />, href: "/" },
    { icon: <FaTelegramPlane />, href: "/" },
    { icon: <FaDiscord />, href: "/" },
  ];

  return (
    <footer className="bg-gradient-to-tr glass text-gray-200 py-6 pb-14 md:py-12">
      <div className="container mx-auto px-4">
        {/* top links */}
        <div className="justify-between flex flex-col-reverse gap-8 md:flex-row items-start">
          <div className="grid grid-cols-2 md:w-2/3 sm:grid-cols-3 gap-8 mb-10">
            {sections.map(({ title, links }) => (
              <div key={title}>
                <h4 className="font-semibold text-sm text-gray-500 uppercase mb-6">
                  {title}
                </h4>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link}>
                      <a href="/" className="hover:text-white transition">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <GiBurningMeteor size={48} />
            <h3 className="text-3xl font-bold">FORTUVA</h3>
          </div>
        </div>

        {/* social icons + logo */}
        <div className="flex flex-col md:flex-row items-center justify-between mt-12 mb-8">
          <div className="flex gap-8 mb-6 md:mb-0">
            {socials.map(({ icon, href }, i) => (
              <a
                key={i}
                href={href}
                className="w-10 h-10 flex items-center justify-center  rounded-full border border-white/50 hover:bg-purple-700/50 transition"
              >
                <span className="text-xl">{icon}</span>
              </a>
            ))}
          </div>

          <a href="mailto:info@fortuva.xyz" className="hover:text-white text-gray-500 transition">
            info@fortuva.xyz
          </a>
          <p className="mt-4 md:mt-0 hover:text-white text-gray-500 transition">
            &copy; 2025 — Fortuva Inc.
            <br /> All Rights Reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
