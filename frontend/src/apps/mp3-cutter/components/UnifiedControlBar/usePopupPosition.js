// usePopupPosition.js
import { useEffect, useState } from 'react';

const SIDE_PADDING = 20; // Số pixel cách mép trái/phải màn hình

export default function usePopupPosition(
  isVisible,
  buttonRef,
  popupRef,
  popupWidth = 300,
  popupHeight = 140,
  offset = 10
) {
  const [position, setPosition] = useState({ top: 0, left: 0, width: popupWidth });
  const [isPositioned, setIsPositioned] = useState(false);

  useEffect(() => {
    function updatePosition() {
      if (isVisible && buttonRef?.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect();
        let width = popupRef.current?.offsetWidth || popupWidth;
        let height = popupRef.current?.offsetHeight || popupHeight;

        // Nếu popup rộng hơn màn hình trừ padding 2 bên thì thu lại
        if (width > window.innerWidth - SIDE_PADDING * 2) {
          width = window.innerWidth - SIDE_PADDING * 2;
        }

        let top = buttonRect.bottom + offset;
        let left = buttonRect.left + (buttonRect.width / 2) - (width / 2);

        // Cách mép trái/phải tối thiểu SIDE_PADDING px
        if (left < SIDE_PADDING) left = SIDE_PADDING;
        if (left + width > window.innerWidth - SIDE_PADDING) {
          left = window.innerWidth - width - SIDE_PADDING;
        }

        // Nếu không đủ chỗ dưới thì hiển thị trên
        if (top + height > window.innerHeight - SIDE_PADDING) {
          top = buttonRect.top - height - offset;
        }

        setPosition({ top, left, width });
        setIsPositioned(true);
      }
    }

    if (isVisible) {
      setIsPositioned(false);
      updatePosition();
    }

    if (isVisible) {
      let resizeTimeout;
      const debouncedUpdate = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(updatePosition, 16);
      };
      window.addEventListener('resize', debouncedUpdate);
      window.addEventListener('scroll', updatePosition, { passive: true });

      return () => {
        clearTimeout(resizeTimeout);
        window.removeEventListener('resize', debouncedUpdate);
        window.removeEventListener('scroll', updatePosition);
      };
    }
  }, [isVisible, buttonRef, popupWidth, popupHeight, offset]);

  return { position, isPositioned };
}
