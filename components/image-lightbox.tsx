"use client";

import { useEffect } from "react";

type ImageLightboxProps = {
  alt: string;
  imageSrc: string;
  title: string;
  subtitle?: string | null;
  onClose: () => void;
};

export function ImageLightbox({
  alt,
  imageSrc,
  title,
  subtitle,
  onClose,
}: ImageLightboxProps) {
  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [onClose]);

  return (
    <div
      className="image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} 이미지 미리보기`}
      onClick={onClose}
    >
      <div className="image-lightbox-content" onClick={(event) => event.stopPropagation()}>
        <div className="image-lightbox-header">
          <div>
            <strong>{title}</strong>
            {subtitle ? <span>{subtitle}</span> : null}
          </div>
          <button className="btn btn-secondary" type="button" onClick={onClose}>
            닫기
          </button>
        </div>

        <div className="image-lightbox-body">
          {/* External master images can come from multiple hosts. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc} alt={alt} />
        </div>
      </div>
    </div>
  );
}
