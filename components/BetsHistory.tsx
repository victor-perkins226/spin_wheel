import React, { useState, useEffect, useTransition } from 'react';
import { UserBet } from '@/types/round';
import { useTheme } from 'next-themes';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatNum } from '@/lib/utils';
import { useTranslation } from 'next-i18next';

interface BetsHistoryProps {
  userBets: UserBet[];
  currentRound: number;
}

export default function BetsHistory({ userBets, currentRound }: BetsHistoryProps) {
  const { theme } = useTheme();
  const [sortedBets, setSortedBets] = useState<UserBet[]>([]);
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const betsPerPage = 10;

  const {t} = useTranslation('common');

  // Calculate pagination values
  const indexOfLastBet = currentPage * betsPerPage;
  const indexOfFirstBet = indexOfLastBet - betsPerPage;
  const currentBets = sortedBets.slice(indexOfFirstBet, indexOfLastBet);
  const totalPages = Math.ceil(sortedBets.length / betsPerPage);

  // Ensure component is mounted to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update sorted bets whenever userBets changes
  useEffect(() => {
    // Sort userBets by roundId in descending order (most recent first)
    const newSortedBets = [...userBets].sort((a, b) => b.roundId - a.roundId);
    setSortedBets(newSortedBets);
    // Reset to first page when bets change
    setCurrentPage(1);
  }, [userBets]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (!mounted) {
    return null;
  }

  const displayStatus = (bet: UserBet) => {
    if (bet.roundId >= currentRound - 1) {
      return "PENDING";
    }
    return bet.status;
  };

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

  const getBackgroundColor = () => {
    return theme === 'dark' ? 'bg-gray-900/50' : 'bg-white/50';
  };

  // Calculate stats (now based on all bets, not just current page)
  const totalBets = sortedBets.length;
  const wonBets = sortedBets.filter(bet => bet.status === 'WON' || bet.status === 'CLAIMED').length;
  const lostBets = sortedBets.filter(bet => bet.status === 'LOST').length;
  const settledBets = sortedBets.filter(bet => bet.status !== 'PENDING').length;
  const winRate = settledBets > 0 ? Math.round((wonBets / settledBets) * 100) : 0;
  const totalPayout = sortedBets
    .filter(bet => bet.status === 'WON' || bet.status === 'CLAIMED')
    .reduce((sum, bet) => sum + bet.payout, 0);
  const totalWagered = sortedBets.reduce((sum, bet) => sum + bet.amount, 0);
  const netProfit = totalPayout - totalWagered;

  return (
    <div className={`${getBackgroundColor()} backdrop-blur-sm rounded-xl p-6 shadow-sm`}>
      <h2 className="text-lg font-semibold mb-4 text-foreground">{t('betsHistory.title')}</h2>
      
      {sortedBets.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-muted-foreground text-sm">
            {t('betsHistory.none')}
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`text-left text-sm ${getTextColor()}`}>
                  <th className="pb-3 font-medium">{t('betsHistory.round')}</th>
                  <th className="pb-3 font-medium">{t('betsHistory.prediction')}</th>
                  <th className="pb-3 font-medium">{t('betsHistory.amount')}</th>
                  <th className="pb-3 font-medium">{t('betsHistory.status')}</th>
                  <th className="pb-3 font-medium">{t('betsHistory.payout')}</th>
                </tr>
              </thead>
                <tbody>
                {currentBets.map((bet, index) => {
                  const statusToShow = displayStatus(bet);
                  return (
                    <tr 
                      key={`${bet.id}-${index}`} 
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
                        {formatNum(bet.amount)} SOL
                      </td>
                      <td className="py-3">
                        <span className={getStatusColor(statusToShow)}>
                          {statusToShow}
                        </span>
                      </td>
                      <td className="py-3 text-foreground font-mono text-sm">
                        {statusToShow === 'WON' || statusToShow === 'CLAIMED' ? (
                          <span className={theme === 'dark' ? 'text-green-400' : 'text-green-600'}>
                            +{formatNum(bet.payout)} SOL
                          </span>
                        ) : statusToShow === 'LOST' ? (
                          <span className={theme === 'dark' ? 'text-red-400' : 'text-red-600'}>
                            -{formatNum(bet.amount)} SOL
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className={`flex items-center justify-between mt-4 pt-4 border-t ${getBorderColor()}`}>
            <div className="text-sm text-muted-foreground">
              {t('betsHistory.showing')} {indexOfFirstBet + 1}-{Math.min(indexOfLastBet, sortedBets.length)} of {sortedBets.length} bets
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className={`p-2 rounded-md ${
                  currentPage === 1 
                    ? 'text-muted-foreground cursor-not-allowed' 
                    : 'text-foreground hover:bg-muted/50'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <div className="text-sm text-foreground">
                {t('betsHistory.page')} {currentPage} {t('betsHistory.of')} {totalPages}
              </div>
              
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-md ${
                  currentPage === totalPages 
                    ? 'text-muted-foreground cursor-not-allowed' 
                    : 'text-foreground hover:bg-muted/50'
                }`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
      
      {sortedBets.length > 0 && (
        <div className={`mt-6 pt-4 border-t ${getBorderColor()}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t('betsHistory.total')}</div>
              <div className="text-sm font-semibold text-foreground">
                {totalBets}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t('betsHistory.won')}</div>
              <div className={`text-sm font-semibold ${
                theme === 'dark' ? 'text-green-400' : 'text-green-600'
              }`}>
                {wonBets}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t('betsHistory.lost')}</div>
              <div className={`text-sm font-semibold ${
                theme === 'dark' ? 'text-red-400' : 'text-red-600'
              }`}>
                {lostBets}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t('betsHistory.rate')}</div>
              <div className="text-sm font-semibold text-foreground">
                {winRate}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-muted">
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t('betsHistory.wagered')}</div>
              <div className="text-sm font-semibold text-foreground">
                {formatNum(totalWagered)} SOL
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t('betsHistory.payout')}</div>
              <div className={`text-sm font-semibold ${
                theme === 'dark' ? 'text-green-400' : 'text-green-600'
              }`}>
                {formatNum(totalPayout)} SOL
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t('betsHistory.profit')}</div>
              <div className={`text-sm font-semibold ${
                netProfit >= 0 
                  ? theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  : theme === 'dark' ? 'text-red-400' : 'text-red-600'
              }`}>
                {netProfit >= 0 ? '+' : ''}{formatNum(netProfit)} SOL
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}