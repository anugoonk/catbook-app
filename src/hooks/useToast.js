import { useState, useCallback } from 'react';

const useToast = (duration = 2000) => {
  const [message, setMessage] = useState(null);
  const show = useCallback((msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), duration);
  }, [duration]);
  return [message, show];
};

export default useToast;
