"use client";

import { useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ProductImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSeed?: string;
}

/**
 * Image with a graceful, on-brand fallback. If the primary src fails to load
 * (e.g. a generated asset is still being produced), it swaps to a clean local
 * SVG placeholder — never a broken-image icon and never a random external photo.
 */
export function ProductImage({
  src,
  alt,
  fallbackSeed,
  className,
  ...rest
}: ProductImageProps) {
  const [errored, setErrored] = useState(false);
  const finalSrc = errored ? FALLBACK_DATA_URI : src;

  return (
    <img
      src={finalSrc}
      alt={alt}
      loading="lazy"
      onError={() => setErrored(true)}
      className={cn("object-cover", className)}
      {...rest}
    />
  );
}

// Inline SVG data URI: a soft neutral gradient + a centered "ShopSphere" mark.
// Deterministic, premium-looking, and tiny. Avoids any external dependency.
const FALLBACK_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f1f5f4"/>
        <stop offset="1" stop-color="#e6ece8"/>
      </linearGradient>
    </defs>
    <rect width="600" height="600" fill="url(#g)"/>
    <g transform="translate(300 300)">
      <circle r="56" fill="none" stroke="#10b981" stroke-width="3" opacity="0.5"/>
      <circle r="36" fill="#10b981" opacity="0.12"/>
      <path d="M-18 4 L-4 18 L22 -16" fill="none" stroke="#10b981" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <text x="300" y="430" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="600" fill="#64748b" letter-spacing="0.5">ShopSphere</text>
  </svg>`,
)}`;
