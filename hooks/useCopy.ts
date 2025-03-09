import copy from 'copy-to-clipboard';
import { useState, useCallback } from 'react';

export const useCopy = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback((text: string) => {
    try {
      copy(text);
      setCopied(true);
      // 2秒后重置状态
      setTimeout(() => {
        setCopied(false);
      }, 2000);
      return true;
    } catch (err) {
      console.error('copy fail:', err);
      return false;
    }
  }, []);

  return { copied, handleCopy };
};
