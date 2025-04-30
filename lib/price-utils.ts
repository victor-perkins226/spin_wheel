// Mock API for price feeds - in production this would connect to an oracle
export const getPriceData = async (): Promise<number> => {
    try {
      // In production, you would use a price oracle like Pyth or Switchboard
      const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd")
  
  
      if (!response.ok) {
        throw new Error("Failed to fetch price data")
      }
  
      const data = await response.json();
      console.log('====================================');
      console.log(data,"data");
      console.log('====================================');
      return data.solana.usd
    } catch (error) {
      console.error("Error fetching price:", error)
      // Return a random price if API fails
      return 50 + Math.random() * 10
    }
  }
  