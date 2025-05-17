import axios from "axios";

export const TIME_BUTTONS = [
  {
    id: "live",
    label: "LIVE",
    cgDays:   null,      // “null” means “don’t call market_chart, use simple-price”
    pythRange: null,     // similarly, use the latest quote
  },
  { id: "1d", label: "1 DAY",   cgDays: 1,   pythRange: "1D"  },
  { id: "1w", label: "1 WEEK",  cgDays: 7,   pythRange: "1W"  },
  { id: "1m", label: "1 MONTH", cgDays: 30,  pythRange: "1M"  },
];

const COINGECKO_SIMPLE_PRICE = 
  "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";
const COINGECKO_MARKETCHART = 
  "https://api.coingecko.com/api/v3/coins/solana/market_chart";

const PYTH_LATEST = 
  "https://web-api.pyth.network/latest_price?symbol=Crypto.SOL/USD";
const PYTH_HISTORY =
  "https://web-api.pyth.network/history?symbol=Crypto.SOL/USD";

export const getCoinGeckoHistoricalPrice = async (buttonIndex: number) => {
  const btn = TIME_BUTTONS[buttonIndex];
  try {
    if (btn.cgDays == null) {
      // LIVE
      const { data } = await axios.get(COINGECKO_SIMPLE_PRICE);
      return [[Date.now(), data.solana.usd]];
    } else {
      const { data } = await axios.get(COINGECKO_MARKETCHART, {
        params: { vs_currency: "usd", days: btn.cgDays }
      });
      return data.prices;  // [ [timestamp, price], … ]
    }
  } catch {
    return null;
  }
};

export const getPythHistoricalPrice = async (buttonIndex: number) => {
  const btn = TIME_BUTTONS[buttonIndex];
  try {
    if (btn.pythRange == null) {
      // LIVE
      const { data } = await axios.get(PYTH_LATEST);
      // normalize to same shape
      return [{ timestamp: data.price_update_time, open_price: data.price }];
    } else {
      const { data } = await axios.get(PYTH_HISTORY, {
        params: { range: btn.pythRange, cluster: "pythnet" }
      });
      return data;  // depends on the shape Pyth returns
    }
  } catch {
    return null;
  }
};
