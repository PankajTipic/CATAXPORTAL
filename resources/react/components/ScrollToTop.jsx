import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Force the scroll to the top of the document
    try {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant' // Immediate scroll without animation
      });
      document.documentElement.scrollTo(0, 0);
      document.body.scrollTo(0, 0);
    } catch (error) {
      // Fallback for older browsers
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
};

export default ScrollToTop;
