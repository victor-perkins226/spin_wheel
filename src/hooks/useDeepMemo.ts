import { useMemo } from 'react';
import isEqual from 'lodash/isEqual';

/**
 * A hook that memoizes a value using deep comparison
 * @param {any} value - The value to memoize
 * @returns {any} - The memoized value
 */
export const useDeepMemo = <T>(value: T): T => {
  return useMemo(() => value, [JSON.stringify(value)]);
};

/**
 * A hook that performs deep comparison for dependencies
 * @param {Function} callback - The function to memoize
 * @param {Array} dependencies - The dependencies array
 * @returns {any} - The memoized result
 */
export const useDeepCallback = <T extends (...args: any[]) => any>(
  callback: T,
  dependencies: any[]
): T => {
  return useMemo(
    () => callback,
    [callback, ...dependencies.map(dep => JSON.stringify(dep))]
  );
};
