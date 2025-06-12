import LogRocket from 'logrocket';

export const initLogRocket = () => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    LogRocket.init('ydb4xc/fortuva'); // Replace with your actual LogRocket app ID
  }
};