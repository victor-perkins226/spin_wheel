import { PriceServiceConnection } from "@pythnetwork/price-service-client";



//const PYTH_SOL_USD_PRICE_FEED1 = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d"

const priceIds = [
    "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d"
  ];



  export async function fetchLivePrice(): Promise<number | undefined> {
    
    const connection = new PriceServiceConnection("https://hermes.pyth.network", {
        priceFeedRequestConfig: {
          // Set binary: true if you need signed updates for on-chain use.
          binary: false,
        },
      });
    // Fetch latest prices
    const priceFeeds = await connection.getLatestPriceFeeds(priceIds);
    
    if (!priceFeeds || priceFeeds.length === 0) {
      return undefined;
    }
    
    const priceObj = priceFeeds[0].getPriceNoOlderThan(60);

    // priceObj may be undefined if the price is too old or unavailable
  if (priceObj) {
    // The price is in priceObj.price, and the exponent is priceObj.expo
    // To get the decimal value:
    const price = Number(priceObj.price) * Math.pow(10, priceObj.expo);
    return price;
  }
  return undefined;
  }

