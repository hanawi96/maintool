import { useEffect, useState } from 'react';

const SIDE_PADDING = 20;
const MOBILE_BREAKPOINT = 480;
const TABLET_BREAKPOINT = 768;
const DESKTOP_SMALL_BREAKPOINT = 1024;

function getResponsiveSize() {
  const width = window.innerWidth;
  if (width < MOBILE_BREAKPOINT) {
    return { screenSize: 'mobile', maxWidth: Math.min(340, width - 20) };
  } else if (width < TABLET_BREAKPOINT) {
    return { screenSize: 'tablet', maxWidth: 420 };
  } else if (width < DESKTOP_SMALL_BREAKPOINT) {
    return { screenSize: 'desktop-small', maxWidth: 480 };
  } else {
    return { screenSize: 'desktop', maxWidth: 520 };
  }
}

export default function usePopupPosition(isVisible, buttonRef, popupRef, offset = 5) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [responsive, setResponsive] = useState(getResponsiveSize());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setReady(false);
      return;
    }

    let lastCall = 0;
    let frame = null;

    function updatePosition() {
      if (!isVisible || !buttonRef?.current || !popupRef?.current) return;
      const { maxWidth, screenSize } = getResponsiveSize();
      setResponsive({ maxWidth, screenSize });

      const buttonRect = buttonRef.current.getBoundingClientRect();
      const popupWidth = Math.min(maxWidth, window.innerWidth - SIDE_PADDING * 2);
      const height = popupRef.current.offsetHeight || 200;

      let top = buttonRect.bottom + offset;
      let left = buttonRect.left + (buttonRect.width / 2) - (popupWidth / 2);

      if (left < SIDE_PADDING) left = SIDE_PADDING;
      if (left + popupWidth > window.innerWidth - SIDE_PADDING) {
        left = window.innerWidth - popupWidth - SIDE_PADDING;
      }
      if (top + height > window.innerHeight - SIDE_PADDING) {
        top = buttonRect.top - height - offset;
        if (screenSize === 'mobile' && top < SIDE_PADDING) {
          top = (window.innerHeight - height) / 2;
        }
      }
      setPosition({ top, left });
      setReady(true);
    }

    function throttledUpdate() {
      const now = Date.now();
      if (now - lastCall > 33) { // ~30fps
        updatePosition();
        lastCall = now;
      } else {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          updatePosition();
          lastCall = Date.now();
        });
      }
    }

    setReady(false);
    // Đợi nội dung render xong rồi mới đo (đảm bảo offsetHeight đã đúng)
    setTimeout(updatePosition, 0);

    window.addEventListener('resize', throttledUpdate);
    window.addEventListener('scroll', throttledUpdate, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', throttledUpdate);
      window.removeEventListener('scroll', throttledUpdate);
    };
  }, [isVisible, buttonRef, popupRef, offset]);

  return { position, responsive, ready };
}
