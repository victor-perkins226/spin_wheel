import Layout from "@/components/layout";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Poppins } from "next/font/google";
import Head from "next/head";
import { WalletContextProvider } from "@/components/wallet.provider.component";
import { Toaster } from "react-hot-toast";


export const poppins = Poppins({
  variable: "--font-poppins-sans",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export default function App({ Component, pageProps }: AppProps) {
  
  return (
    <>
       <Toaster />
      <Head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/favicon/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon/favicon-16x16.png"
        />
        <link rel="manifest" href="/favicon/site.webmanifest" />
      </Head>
      <style jsx global>{`
        html {
          font-family: ${poppins.style.fontFamily};

          ::placeholder {
            font-family: ${poppins.style.fontFamily};
          }
        }
      `}</style>


      <WalletContextProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </WalletContextProvider>
    </>
  );
}
