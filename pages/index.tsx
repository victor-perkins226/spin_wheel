// pages/index.tsx  (or wherever your home page lives)

import { GetServerSideProps } from "next";
import geoip from "geoip-lite";
import { BANNED_COUNTRY_CODES } from "@/lib/bannedCountries";
import Head from "next/head";
import Hero from "@/components/hero.component";
import PredictionCards from "@/components/prediction-cards.component";
import { useTheme } from "next-themes";

import Lock from "@/public/assets/lock.png";
import Image from "next/image";
// export const getServerSideProps: GetServerSideProps = async ({ req }) => {
//   const xffHeader = req.headers["x-forwarded-for"];
//   const rawIp =
//     typeof xffHeader === "string"
//       ? xffHeader.split(",")[0].trim()
//       : req.socket.remoteAddress || "";

//   console.log("Raw IP header/socket:", rawIp);

//   let ip = rawIp;
//   if (ip.startsWith("::ffff:")) {
//     ip = ip.split(":").pop()!;
//   }

//   // ip = '5.62.45.0'     // some German IP
//   ip = "185.185.185.185"; // pretend this is from IR

//   const geo = geoip.lookup(ip);
//   const country = geo?.country ?? "??";
//   if (BANNED_COUNTRY_CODES.includes(country)) {
//     return {
//       props: {
//         isBanned: true,
//       },
//     };
//   }

//   return {
//     props: {
//       isBanned: false,
//     },
//   };
// };
export default function Home() {
  const { theme } = useTheme();
  
  return (
    <>
      {/* {/* {isBanned ? (
        <>
          <Head>
            <title>Access Restricted</title>
          </Head>
          <main className="flex items-center justify-center">
            <div
              className={`
               w-full  text-center animate-toast-bounce h-[600px] max-w-[1000px]  rounded-2xl
               overflow-hidden justify-space-between
              flex flex-col items-center p-4 pb-8 mt-16
           
            `}
            >
              <div className="w-full  h-full relative mb-4">
                <Image
                  src={Lock}
                  alt="lock"
                  fill
                  className="object-contain rounded-xl"
                />
              </div>

              <h3 className="font-bold text-4xl text-center animate-toast-pulse   mb-2">
                Access is restricted in your region.
              </h3>

              <p className=" text-xl max-w-4xl mx-auto text-center mt-6">
                We can't provide service in your area because of local rules.
                Please try from another location or check your settings
              </p>
            </div>
          </main>
        </>
      ) : ( */}
        <> 
          <Head>
            <title>Prediction | FORTUVA</title>
          </Head>
          <Hero />
          <PredictionCards />
        </>
      
    </>
  );
}
