import Header from "@/components/header.component";
import Hero from "@/components/hero.component";
import PredictionCards from "@/components/prediction-cards.component";
import Head from "next/head";

export default function Home() {
  return (
    <>
    <Head>
    <title>Prediction | FORTUVA</title>
    </Head>

      <Header />
      <Hero />
      <PredictionCards />
    </>
  );
}
