"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  size?: number;
  showValue?: boolean;
  count?: number;
  className?: string;
}

export function RatingStars({
  rating,
  size = 14,
  showValue = true,
  count,
  className,
}: RatingStarsProps) {
  const rounded = Math.round(rating * 2) / 2; // nearest 0.5
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i + 1 <= Math.floor(rounded);
          const half = !filled && i + 0.5 <= rounded;
          return (
            <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
              <Star
                size={size}
                className="text-muted-foreground/40"
                strokeWidth={1.5}
              />
              {(filled || half) && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: half ? size / 2 : size }}
                >
                  <Star
                    size={size}
                    className="fill-warm text-warm"
                    strokeWidth={1.5}
                  />
                </span>
              )}
            </span>
          );
        })}
      </div>
      {showValue && (
        <span className="text-xs font-medium text-muted-foreground">
          {rating.toFixed(1)}
        </span>
      )}
      {count !== undefined && (
        <span className="text-xs text-muted-foreground/80">({count})</span>
      )}
    </div>
  );
}
