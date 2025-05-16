import axios from "axios";

const COINGECKO_PRICE_CHART_API = 'https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days='
const PYTH_PRICE_CHART_API = 'https://web-api.pyth.network/history?symbol=Crypto.SOL%2FUSD'

export const TIME_BUTTONS = [
    { id: "live", label: "LIVE" },
    { id: "1d", label: "1 DAY" },
    { id: "1w", label: "1 WEEK" },
    { id: "1m", label: "1 MONTH" },
];

export const getCoinGeckoHistoricalPrice = async (id: number) => {
  try {
    let range = '';
    switch (id) {
      case 0:
        range = 'live'
        break;
      case 1:
        range = '1'
        break;
      case 2:
        range = '7'
        break;
      case 3:
        range = '30'
        break;
    }

    const uri = `${COINGECKO_PRICE_CHART_API}${range}`;

    const { data } = await axios.get(uri);
    return data.prices; 
  }
  catch (error) {
    return null;
  }
}

export const getPythHistoricalPrice = async (id: number) => {
  try {
    let range = '';
    switch (id) {
      case 0:
        range = 'live'
        break;
      case 1:
        range = '1D'
        break;
      case 2:
        range = '1W'
        break;
      case 3:
        range = '1M'
        break;
    }
  
    const uri = `${PYTH_PRICE_CHART_API}&range=${range}&cluster=pythnet`;
  
    const { data } = await axios.get(uri);
    return data; 
  }
  catch (error) {
    return null;
  }
}