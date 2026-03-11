import { useEffect } from 'react';

let lockCount = 0;

export const useScrollLock = (lock: boolean) => {
  useEffect(() => {
    if (lock) {
      lockCount++;
      document.body.style.overflow = 'hidden';
      
      return () => {
        lockCount--;
        if (lockCount <= 0) {
          document.body.style.overflow = '';
          lockCount = 0;
        }
      };
    }
  }, [lock]);
};
