import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * true once the container has been scrolled down past a small threshold
 * and the most recent movement was further down; flips back to false as
 * soon as the user scrolls back up. Used to collapse the top bar out of
 * the way while browsing a long product list, without needing it gone
 * the instant scrolling starts (small jitters near the top are ignored).
 */
export const useScrollDirection = (ref: RefObject<HTMLElement | null>) => {
  const [hidden, setHidden] = useState(false);
  const lastScrollTop = useRef(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const handleScroll = () => {
      const scrollTop = element.scrollTop;
      const delta = scrollTop - lastScrollTop.current;

      if (Math.abs(delta) > 6) {
        setHidden(scrollTop > 80 && delta > 0);
        lastScrollTop.current = scrollTop;
      }
    };

    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, [ref]);

  return hidden;
};
