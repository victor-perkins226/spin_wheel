import LogRocket from 'logrocket';

export const initLogRocket = () => {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'production') {
    return;
  }

  const path = window.location.pathname;

  const options = path === '/leaderboard'
    ? {
        network: { isEnabled: false },
        console: { isEnabled: false },
        dom:     { isEnabled: false },
      }
    : undefined;

  LogRocket.init('udpyby/fortuva-sol-prediction', options);
};

