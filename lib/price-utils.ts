import { PriceServiceConnection } from "@pythnetwork/price-service-client";

const priceIds = [
    "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d"
];

// Cache for price data
let priceCache: { price: number; timestamp: number } | null = null;
const CACHE_DURATION = 5000; // 5 seconds cache
let pendingRequest: Promise<number | undefined> | null = null;

export async function fetchLivePrice(): Promise<number | undefined> {
    // Return cached price if it's still fresh
    if (priceCache && Date.now() - priceCache.timestamp < CACHE_DURATION) {
        return priceCache.price;
    }

    // If there's already a pending request, wait for it
    if (pendingRequest) {
        return pendingRequest;
    }

    // Create new request
    pendingRequest = fetchPriceFromAPI();
    
    try {
        const price = await pendingRequest;
        pendingRequest = null;
        
        // Cache the result
        if (price !== undefined) {
            priceCache = { price, timestamp: Date.now() };
        }
        
        return price;
    } catch (error) {
        pendingRequest = null;
        throw error;
    }
}

async function fetchPriceFromAPI(): Promise<number | undefined> {
    const connection = new PriceServiceConnection("https://hermes.pyth.network", {
        priceFeedRequestConfig: {
            binary: false,
        },
    });

    try {
        const priceFeeds = await connection.getLatestPriceFeeds(priceIds);
        
        if (!priceFeeds || priceFeeds.length === 0) {
            return undefined;
        }
        
        const priceObj = priceFeeds[0].getPriceNoOlderThan(60);

        if (priceObj) {
            const price = Number(priceObj.price) * Math.pow(10, priceObj.expo);
            return price;
        }
        return undefined;
    } catch (error) {
        console.error("Error fetching price:", error);
        return undefined;
    }
}

// Clear cache function for manual invalidation
export function clearPriceCache(): void {
    priceCache = null;
    pendingRequest = null;
}

