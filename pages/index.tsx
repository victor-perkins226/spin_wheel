import Hero from "@/components/hero.component";
import PredictionCards from "@/components/prediction-cards.component";
import { ThemeToggle } from "@/components/Themetoggle";
// import PredictionCard from "@/components/PredictionCard";
import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>Prediction | FORTUVA</title>
      </Head>
      <Hero />
        <div className="mt-10 flex justify-end me-8">
        <ThemeToggle />
      </div>
      <PredictionCards />

      {/* <PredictionCard /> */}
    </>
  );
}
