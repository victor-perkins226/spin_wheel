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

// export const fetchLivePrice = async (): Promise<number> => {
//     try {
//         // Option 1: Try backend API
//         try {
//             const response = await axios.get(BACKEND_PRICE_URL);
//             const price = Number(response.data?.price);
//             if (!isNaN(price) && price > 0) {
//                 console.log('Live price from backend:', price);
//                 return price;
//             }
//             console.warn('Invalid backend price, falling back to Pyth');
//         } catch (error) {
//             console.warn('Backend price fetch failed:', error);
//         }

//         // Option 2: Try Pyth Oracle
//         try {
//             const pythClient = new PythHttpClient(connection, getPythProgramKeyForCluster('devnet'));
//             const data = await pythClient.getData();
//             // console.log("Available price feed keys:", Array.from(data.productPrice.keys()));
//             const priceFeed =  data.productPrice.get(PYTH_SOL_USD_PRICE_FEED1 );
//             const price = priceFeed?.price;
//             console.log('pyth price :',price);
//             if (price && !isNaN(price) && price > 0) {
//                 console.log('Live price from Pyth:', price);
//                 return price;
//             }
//             console.log('pyth price :',price);
            

//         } catch (error) {
//             console.warn('Invalid Pyth price, falling back to CoinGecko', error);
//         }

//         // Option 3: Fallback to CoinGecko
//         const response = await axios.get(COINGECKO_API);
//         const price = Number(response.data?.solana?.usd);
//         if (!isNaN(price) && price > 0) {
//             console.log('Live price from CoinGecko:', price);
//             return price;
//         }

//         throw new Error('Failed to fetch valid live price from all sources');
//     } catch (error) {
//         console.error('Live price fetch error:', error);
//         return 50.5; // Fallback to default
//     }
// };
