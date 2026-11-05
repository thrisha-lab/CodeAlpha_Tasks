"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SlidersHorizontal,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  PackageX,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/storefront/product-card";
import { EmptyState } from "@/components/storefront/empty-state";
import { useProducts, useCategories } from "@/hooks/use-products";
import { useUIStore } from "@/store/ui-store";
import { SORT_OPTIONS, PRODUCT_PAGE_SIZE } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CategoryDTO, ProductsQuery } from "@/types";

/* ──────────────────────────────────────────────────────────────
 * Local defaults for filters (route.params is the source for
 * initial state + external navigations; local state drives the
 * live query so typing/searching doesn't trigger scroll-to-top).
 * ────────────────────────────────────────────────────────────── */
const DEFAULTS = {
  q: "",
  category: "",
  sort: "featured",
  minPrice: "",
  maxPrice: "",
  page: "1",
} as const;

const PRICE_MIN = 0;
const PRICE_MAX = 1500;
const PRICE_STEP = 10;
const SKELETON_COUNT = 8;

type CategoryLite = Pick<CategoryDTO, "id" | "name" | "slug">;

interface FiltersProps {
  q: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  categories: CategoryLite[];
  onQChange: (v: string) => void;
  onCategoryChange: (slug: string) => void;
  onMinPriceChange: (v: string) => void;
  onMaxPriceChange: (v: string) => void;
  onPriceRangeChange: (range: [number, number]) => void;
  onClear: () => void;
}

/**
 * Shared filter UI — rendered both in the desktop sidebar and the
 * mobile Sheet so the JSX stays single-source.
 */
function Filters({
  q,
  category,
  minPrice,
  maxPrice,
  categories,
  onQChange,
  onCategoryChange,
  onMinPriceChange,
  onMaxPriceChange,
  onPriceRangeChange,
  onClear,
}: FiltersProps) {
  const rangeValue: [number, number] = [
    minPrice ? Number(minPrice) : PRICE_MIN,
    maxPrice ? Number(maxPrice) : PRICE_MAX,
  ];

  const isAll = !category || category === "all";

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Search
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => onQChange(e.target.value)}
            placeholder="Search products…"
            className="pl-9"
            aria-label="Search products"
          />
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Category
        </Label>
        <div className="nice-scroll max-h-64 space-y-1 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => onCategoryChange("")}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
              isAll
                ? "bg-primary/10 text-primary font-medium"
                : "text-foreground/80",
            )}
          >
            All products
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onCategoryChange(c.slug)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                category === c.slug
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground/80",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Price range
        </Label>
        <Slider
          value={rangeValue}
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={PRICE_STEP}
          onValueChange={(v) =>
            onPriceRangeChange([v[0] ?? PRICE_MIN, v[1] ?? PRICE_MAX])
          }
          aria-label="Price range"
        />
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>{formatCurrency(rangeValue[0])}</span>
          <span>{formatCurrency(rangeValue[1])}</span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={1500}
            value={minPrice}
            onChange={(e) => onMinPriceChange(e.target.value)}
            placeholder="0"
            aria-label="Minimum price"
            className="h-8 text-xs"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            min={0}
            max={1500}
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(e.target.value)}
            placeholder="1500"
            aria-label="Maximum price"
            className="h-8 text-xs"
          />
        </div>
      </div>

      <Button
        variant="ghost"
        className="w-full justify-center"
        onClick={onClear}
      >
        <X size={16} /> Clear filters
      </Button>
    </div>
  );
}

/**
 * Windowed numeric pagination with ellipsis + prev/next.
 */
function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (n: number) => void;
}) {
  const pages: (number | "ellipsis")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    if (start > 2) pages.push("ellipsis");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("ellipsis");
    pages.push(totalPages);
  }

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
      <Button
        variant="outline"
        size="icon"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </Button>
      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span
            key={`ellipsis-${i}`}
            className="px-1 text-sm text-muted-foreground"
            aria-hidden
          >
            …
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="icon"
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Page ${p}`}
          >
            {p}
          </Button>
        ),
      )}
      <Button
        variant="outline"
        size="icon"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}

export default function ProductsView() {
  const navigate = useUIStore((s) => s.navigate);
  const route = useUIStore((s) => s.route);
  const params = route.params ?? {};

  /* Local state mirrors route.params; query is derived from these. */
  const [q, setQ] = useState(params.q ?? DEFAULTS.q);
  const [category, setCategory] = useState(params.category ?? DEFAULTS.category);
  const [sort, setSort] = useState(params.sort ?? DEFAULTS.sort);
  const [minPrice, setMinPrice] = useState(params.minPrice ?? DEFAULTS.minPrice);
  const [maxPrice, setMaxPrice] = useState(params.maxPrice ?? DEFAULTS.maxPrice);
  const [page, setPage] = useState(params.page ?? DEFAULTS.page);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const paramsKey = JSON.stringify(params);

  // Re-sync local state when route.params changes (e.g. header category link).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setQ(params.q ?? DEFAULTS.q);
    setCategory(params.category ?? DEFAULTS.category);
    setSort(params.sort ?? DEFAULTS.sort);
    setMinPrice(params.minPrice ?? DEFAULTS.minPrice);
    setMaxPrice(params.maxPrice ?? DEFAULTS.maxPrice);
    setPage(params.page ?? DEFAULTS.page);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [paramsKey]);

  const featured = params.featured;
  const isNew = params.isNew;

  // Build the ProductsQuery object from local state.
  const query = useMemo<ProductsQuery>(
    () => ({
      q,
      category: category === "all" ? undefined : category,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sort: sort as ProductsQuery["sort"],
      page: Number(page) || 1,
      pageSize: PRODUCT_PAGE_SIZE,
      featured: featured === "true" || undefined,
      isNew: isNew === "true" || undefined,
    }),
    [q, category, sort, minPrice, maxPrice, page, featured, isNew],
  );

  const { data, isLoading, isError } = useProducts(query);
  const { data: catData } = useCategories();
  const categories: CategoryLite[] = catData?.data ?? [];

  /* ── Filter handlers ─────────────────────────────────────── */
  function updateFilter(
    patch: Partial<{
      q: string;
      category: string;
      sort: string;
      minPrice: string;
      maxPrice: string;
    }>,
  ) {
    if (patch.q !== undefined) setQ(patch.q);
    if (patch.category !== undefined) setCategory(patch.category);
    if (patch.sort !== undefined) setSort(patch.sort);
    if (patch.minPrice !== undefined) setMinPrice(patch.minPrice);
    if (patch.maxPrice !== undefined) setMaxPrice(patch.maxPrice);
    // Reset to page 1 whenever any filter other than page changes.
    setPage(DEFAULTS.page);
  }

  function handlePriceRangeChange(range: [number, number]) {
    setMinPrice(String(range[0]));
    setMaxPrice(String(range[1]));
    setPage(DEFAULTS.page);
  }

  function clearFilters() {
    setQ(DEFAULTS.q);
    setCategory(DEFAULTS.category);
    setSort(DEFAULTS.sort);
    setMinPrice(DEFAULTS.minPrice);
    setMaxPrice(DEFAULTS.maxPrice);
    setPage(DEFAULTS.page);
    // Keep header-driven flags (isNew / featured) intact on clear.
    const next: Record<string, string> = {};
    if (isNew) next.isNew = isNew;
    if (featured) next.featured = featured;
    navigate("products", next);
    setMobileFiltersOpen(false);
  }

  function handlePageChange(n: number) {
    setPage(String(n));
    // Keep route.params.page consistent with the store.
    const next: Record<string, string> = {
      q,
      category,
      sort,
      minPrice,
      maxPrice,
      page: String(n),
    };
    if (isNew) next.isNew = isNew;
    if (featured) next.featured = featured;
    navigate("products", next);
  }

  /* ── Derived UI bits ──────────────────────────────────────── */
  const activeCategory =
    category && category !== "all"
      ? categories.find((c) => c.slug === category)
      : undefined;

  const title = activeCategory
    ? activeCategory.name
    : q
      ? `Results for "${q}"`
      : isNew === "true"
        ? "New Arrivals"
        : featured === "true"
          ? "Featured products"
          : "All products";

  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const currentPage = Math.max(1, Math.min(Number(page) || 1, totalPages || 1));

  const hasActiveFilters =
    !!q ||
    (!!category && category !== "all") ||
    !!minPrice ||
    !!maxPrice ||
    sort !== DEFAULTS.sort;

  const filtersProps: FiltersProps = {
    q,
    category,
    minPrice,
    maxPrice,
    categories,
    onQChange: (v) => updateFilter({ q: v }),
    onCategoryChange: (slug) => updateFilter({ category: slug }),
    onMinPriceChange: (v) => updateFilter({ minPrice: v }),
    onMaxPriceChange: (v) => updateFilter({ maxPrice: v }),
    onPriceRangeChange: handlePriceRangeChange,
    onClear: clearFilters,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header row */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {featured === "true" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warm/15 px-2.5 py-0.5 text-xs font-medium text-warm">
                <Star size={12} className="fill-warm" /> Featured
              </span>
            )}
            {isNew === "true" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                New
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">
            ({total} {total === 1 ? "product" : "products"})
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-6 rounded-xl border bg-card p-5">
            <Filters {...filtersProps} />
          </div>
        </aside>

        {/* Results */}
        <section>
          {/* Top bar */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {isLoading
                ? "Loading products…"
                : isError
                  ? "Couldn't load products."
                  : `${total} ${total === 1 ? "product" : "products"}`}
            </p>
            <div className="flex items-center gap-2">
              <Select
                value={sort}
                onValueChange={(v) => updateFilter({ sort: v })}
              >
                <SelectTrigger
                  size="sm"
                  className="w-[180px]"
                  aria-label="Sort products"
                >
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="lg:hidden"
                    aria-label="Open filters"
                  >
                    <SlidersHorizontal size={16} /> Filters
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-80 max-w-[85vw] overflow-y-auto p-0"
                >
                  <SheetHeader className="border-b px-5 py-4">
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="p-5">
                    <Filters {...filtersProps} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              icon={PackageX}
              title="Couldn't load products"
              description="Something went wrong while fetching products. Please try again in a moment."
              action={
                <Button variant="outline" onClick={clearFilters}>
                  <X size={16} /> Clear filters
                </Button>
              }
            />
          ) : !data || data.data.length === 0 ? (
            <EmptyState
              icon={PackageX}
              title="No products found"
              description={
                hasActiveFilters
                  ? "We couldn't find any products matching your current filters. Try adjusting or clearing them."
                  : "There are no products available right now. Please check back soon."
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    <X size={16} /> Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
                {data.data.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {totalPages > 1 && (
                <Pagination
                  page={currentPage}
                  totalPages={totalPages}
                  onChange={handlePageChange}
                />
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
