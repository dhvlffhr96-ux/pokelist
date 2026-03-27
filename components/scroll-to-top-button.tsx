"use client";

import { useEffect, useState } from "react";

const VISIBILITY_OFFSET = 320;

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    function syncVisibility() {
      setIsVisible(window.scrollY > VISIBILITY_OFFSET);
    }

    syncVisibility();
    window.addEventListener("scroll", syncVisibility, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", syncVisibility);
    };
  }, []);

  return (
    <button
      className={`scroll-top-button ${isVisible ? "scroll-top-button-visible" : ""}`}
      type="button"
      aria-label="맨 위로 이동"
      onClick={() => {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }}
    >
      맨 위
    </button>
  );
}
