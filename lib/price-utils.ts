import { PriceServiceConnection } from "@pythnetwork/price-service-client";



//const PYTH_SOL_USD_PRICE_FEED1 = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d"

const priceIds = [
    // Example price feed IDs for BTC/USD and ETH/USD
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


//       if (!response.ok) {
//         throw new Error("Failed to fetch price data")
//       }

//       const data = await response.json();
//       console.log('====================================');
//       console.log(data,"data");
//       console.log('====================================');
//       return data.solana.usd
//     } catch (error) {
//       console.error("Error fetching price:", error)
//       // Return a random price if API fails
//       return 50 + Math.random() * 10
//     }
//   }

import axios from 'axios';
import { Connection, PublicKey } from '@solana/web3.js';
import { PythHttpClient, getPythProgramKeyForCluster } from '@pythnetwork/client';

// Backend API endpoint (hypothetical)
const BACKEND_PRICE_URL = 'https://sol-prediction-backend.onrender.com/price';
// CoinGecko API for SOL/USDT
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';
// Pyth price feed ID for SOL/USD (devnet)
//const PYTH_SOL_USD_PRICE_FEED = new PublicKey('0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d'); // Replace with your feed ID
const PYTH_SOL_USD_PRICE_FEED1 = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d"

// Connection for Pyth (devnet)
const connection = new Connection('https://devnet.helius-rpc.com/?api-key=a4c93129-769a-49d8-bc1b-918f1f537075', {
    commitment: 'finalized',
});


const COINGECKO_SIMPLE_PRICE = 
  'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';

export async function fetchLivePrice2(): Promise<number> {
  try {
    const { data } = await axios.get(COINGECKO_SIMPLE_PRICE);
    return data.solana.usd;
  } catch {
    // fallback or default
    return 50.5;
  }
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
