"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "./product-image";
import { RatingStars } from "./rating-stars";
import { useUIStore } from "@/store/ui-store";
import { useCartStore } from "@/store/cart-store";
import { formatCurrency } from "@/lib/format";
import type { ProductDTO } from "@/types";
import { toast } from "sonner";

interface ProductCardProps {
  product: ProductDTO;
}

export function ProductCard({ product }: ProductCardProps) {
  const navigate = useUIStore((s) => s.navigate);
  const addItem = useCartStore((s) => s.addItem);

  const outOfStock = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock <= 5;

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    if (outOfStock) return;
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image: product.image,
      stock: product.stock,
    });
    toast.success(`${product.name} added to cart`);
  }

  function open() {
    navigate("product", { id: product.id });
  }

  return (
    <Card
      onClick={open}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") open();
      }}
      className="card-lift group cursor-pointer gap-0 overflow-hidden py-0 hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <ProductImage
          src={product.image}
          alt={product.name}
          fallbackSeed={product.slug}
          className="h-full w-full transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.isNew && (
            <Badge className="border border-primary/20 bg-primary/10 text-primary shadow-sm backdrop-blur-sm">New</Badge>
          )}
          {product.featured && (
            <Badge className="border border-warm/30 bg-warm/15 text-warm-foreground shadow-sm backdrop-blur-sm">Featured</Badge>
          )}
        </div>
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Badge variant="secondary" className="text-sm">Out of stock</Badge>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {product.brand}
          </span>
          <span className="text-xs text-muted-foreground">{product.category.name}</span>
        </div>
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug">
          {product.name}
        </h3>
        <RatingStars rating={product.rating} count={product.numReviews} />
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-lg font-bold text-foreground">
            {formatCurrency(product.price)}
          </span>
          {lowStock && (
            <span className="text-xs font-medium text-warm">
              Only {product.stock} left
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={outOfStock}
          className="mt-1 w-full"
        >
          <ShoppingCart size={16} />
          {outOfStock ? "Out of stock" : "Add to cart"}
        </Button>
      </div>
    </Card>
  );
}

export function ProductCardSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="aspect-square animate-pulse bg-muted" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-6 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-8 w-full animate-pulse rounded bg-muted" />
      </div>
    </Card>
  );
}
