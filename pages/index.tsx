import Hero from "@/components/hero.component";
import PredictionCards from "@/components/prediction-cards.component";
import PredictionCard from "@/components/PredictionCard";
import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>Prediction | FORTUVA</title>
      </Head>

      <Hero />
      <PredictionCards />

      {/* <PredictionCard /> */}
    </>
  );
}
