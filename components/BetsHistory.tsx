import React, { useState, useEffect } from 'react';
import { UserBet } from '@/types/round';
import { useTheme } from 'next-themes';

interface BetsHistoryProps {
  userBets: UserBet[];
}

export function BetsHistory({ userBets }: BetsHistoryProps) {
  const { theme } = useTheme();
  const [sortedBets, setSortedBets] = useState<UserBet[]>([]);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update sorted bets whenever userBets changes
  useEffect(() => {
    // Sort userBets by roundId in descending order (most recent first)
    const newSortedBets = [...userBets].sort((a, b) => b.roundId - a.roundId);
    setSortedBets(newSortedBets);
  }, [userBets]); // Dependency array ensures this runs when userBets changes

  if (!mounted) {
    return null;
  }

  const getStatusColor = (status: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    
    switch (status) {
      case 'PENDING':
        return `${baseClasses} ${
          theme === 'dark' 
            ? 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20' 
            : 'text-yellow-600 bg-yellow-50 border border-yellow-200'
        }`;
      case 'WON':
        return `${baseClasses} ${
          theme === 'dark'
            ? 'text-green-400 bg-green-400/10 border border-green-400/20'
            : 'text-green-600 bg-green-50 border border-green-200'
        }`;
      case 'LOST':
        return `${baseClasses} ${
          theme === 'dark'
            ? 'text-red-400 bg-red-400/10 border border-red-400/20'
            : 'text-red-600 bg-red-50 border border-red-200'
        }`;
      case 'CLAIMED':
        return `${baseClasses} ${
          theme === 'dark'
            ? 'text-blue-400 bg-blue-400/10 border border-blue-400/20'
            : 'text-blue-600 bg-blue-50 border border-blue-200'
        }`;
      default:
        return `${baseClasses} ${
          theme === 'dark'
            ? 'text-gray-400 bg-gray-400/10 border border-gray-400/20'
            : 'text-gray-600 bg-gray-50 border border-gray-200'
        }`;
    }
  };

  const getDirectionColor = (direction: string) => {
    if (direction === 'up') {
      return theme === 'dark' ? 'text-green-400' : 'text-green-600';
    }
    return theme === 'dark' ? 'text-red-400' : 'text-red-600';
  };

  const getBorderColor = () => {
    return theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
  };

  const getTextColor = () => {
    return theme === 'dark' ? 'text-gray-300' : 'text-gray-600';
  };

  return (
    <div>
      <div className="glass p-4 rounded-xl">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Your Predictions</h2>
        
        {sortedBets.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground text-sm">
              No predictions yet. Place your first bet to see your history here.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`text-left text-sm ${getTextColor()}`}>
                  <th className="pb-3 font-medium">Round</th>
                  <th className="pb-3 font-medium">Prediction</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Payout</th>
                </tr>
              </thead>
              <tbody>
                {sortedBets.map((bet, index) => (
                  <tr 
                    key={bet.id} 
                    className={`${getBorderColor()} ${
                      index !== 0 ? 'border-t' : ''
                    } hover:bg-muted/20 transition-colors`}
                  >
                    <td className="py-3 text-foreground font-mono text-sm">
                      #{bet.roundId}
                    </td>
                    <td className={`py-3 font-semibold ${getDirectionColor(bet.direction)}`}>
                      <div className="flex items-center gap-1">
                        <span className="text-xs">
                          {bet.direction === 'up' ? '↗' : '↘'}
                        </span>
                        {bet.direction.toUpperCase()}
                      </div>
                    </td>
                    <td className="py-3 text-foreground font-mono text-sm">
                      {bet.amount.toFixed(2)} SOL
                    </td>
                    <td className="py-3">
                      <span className={getStatusColor(bet.status)}>
                        {bet.status}
                      </span>
                    </td>
                    <td className="py-3 text-foreground font-mono text-sm">
                      {bet.status === 'WON' || bet.status === 'CLAIMED' ? (
                        <span className={theme === 'dark' ? 'text-green-400' : 'text-green-600'}>
                          +{bet.payout.toFixed(2)} SOL
                        </span>
                      ) : bet.status === 'LOST' ? (
                        <span className={theme === 'dark' ? 'text-red-400' : 'text-red-600'}>
                          -{bet.amount.toFixed(2)} SOL
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Summary Stats */}
        {sortedBets.length > 0 && (
          <div className={`mt-6 pt-4 border-t ${getBorderColor()}`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Total Bets</div>
                <div className="text-sm font-semibold text-foreground">
                  {sortedBets.length}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Won</div>
                <div className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-green-400' : 'text-green-600'
                }`}>
                  {sortedBets.filter(bet => bet.status === 'WON' || bet.status === 'CLAIMED').length}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Lost</div>
                <div className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-red-400' : 'text-red-600'
                }`}>
                  {sortedBets.filter(bet => bet.status === 'LOST').length}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Win Rate</div>
                <div className="text-sm font-semibold text-foreground">
                  {sortedBets.length > 0 
                    ? Math.round((sortedBets.filter(bet => bet.status === 'WON' || bet.status === 'CLAIMED').length / 
                        sortedBets.filter(bet => bet.status !== 'PENDING').length) * 100) || 0
                    : 0}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}