"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import {
  useProducts,
  useCategories,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from "@/hooks/use-products";
import { formatCurrency } from "@/lib/format";
import type { ProductDTO } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductImage } from "@/components/storefront/product-image";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProductForm {
  name: string;
  description: string;
  price: string;
  image: string;
  images: string;
  categorySlug: string;
  stock: string;
  brand: string;
  featured: boolean;
  isNew: boolean;
}

const EMPTY_FORM: ProductForm = {
  name: "",
  description: "",
  price: "",
  image: "",
  images: "",
  categorySlug: "",
  stock: "0",
  brand: "",
  featured: false,
  isNew: false,
};

function formFromProduct(p: ProductDTO): ProductForm {
  return {
    name: p.name,
    description: p.description,
    price: String(p.price),
    image: p.image,
    images: (p.images ?? []).join("\n"),
    categorySlug: p.category?.slug ?? "",
    stock: String(p.stock),
    brand: p.brand ?? "",
    featured: !!p.featured,
    isNew: !!p.isNew,
  };
}

export function AdminProducts() {
  const { data, isLoading } = useProducts({ pageSize: 48 });
  const categoriesQ = useCategories();
  const categories = categoriesQ.data?.data ?? [];

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductDTO | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);

  const [deleting, setDeleting] = useState<ProductDTO | null>(null);

  // `useUpdateProduct` closes over the product id, so we pass the id of the
  // product currently being edited (empty string when creating). The hook is
  // always called unconditionally; the id simply changes between renders.
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct(editing?.id ?? "");
  const deleteProduct = useDeleteProduct();

  const products = data?.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter !== "all" && p.category?.slug !== categoryFilter)
        return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.brand ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, search, categoryFilter]);

  function update<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      categorySlug: categories[0]?.slug ?? "",
    });
    setDialogOpen(true);
  }

  function openEdit(product: ProductDTO) {
    setEditing(product);
    setForm(formFromProduct(product));
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  function validate(): string | null {
    if (form.name.trim().length < 2) return "Name must be at least 2 characters.";
    if (form.description.trim().length < 10)
      return "Description must be at least 10 characters.";
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return "Price must be a valid number.";
    if (!form.image.trim()) return "Image URL is required.";
    try {
      // Basic URL sanity check (mirrors zod .url() on the server).
      new URL(form.image.trim());
    } catch {
      return "Image must be a valid URL.";
    }
    if (!form.categorySlug) return "Category is required.";
    const stock = parseInt(form.stock, 10);
    if (!Number.isInteger(stock) || stock < 0) return "Stock must be a whole number.";
    return null;
  }

  function buildInput() {
    return {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      image: form.image.trim(),
      images: form.images
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      categorySlug: form.categorySlug,
      stock: parseInt(form.stock, 10) || 0,
      brand: form.brand.trim() || "ShopSphere",
      featured: form.featured,
      isNew: form.isNew,
    };
  }

  function onSubmit() {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    const input = buildInput();
    if (editing) {
      updateProduct.mutate(input, {
        onSuccess: () => closeDialog(),
      });
    } else {
      createProduct.mutate(input, {
        onSuccess: () => closeDialog(),
      });
    }
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteProduct.mutate(deleting.id, {
      onSuccess: () => setDeleting(null),
    });
  }

  const submitting = createProduct.isPending || updateProduct.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Products
        </h2>
        <Button onClick={openCreate}>
          <Plus />
          Add product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name or brand…"
            className="pl-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto nice-scroll">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[64px]">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No products found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <ProductImage
                        src={p.image}
                        alt={p.name}
                        fallbackSeed={p.slug}
                        className="size-10 rounded-md border object-cover"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{p.name}</div>
                      {p.brand && (
                        <div className="text-xs text-muted-foreground">
                          {p.brand}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.category?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(p.price)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        p.stock <= 5 ? "text-warm" : ""
                      }`}
                    >
                      {p.stock}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {p.featured && (
                          <Badge className="bg-warm/15 text-warm border-transparent">
                            Featured
                          </Badge>
                        )}
                        {p.isNew && (
                          <Badge className="bg-primary/10 text-primary border-transparent">
                            New
                          </Badge>
                        )}
                        {!p.featured && !p.isNew && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(p)}
                          aria-label={`Edit ${p.name}`}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleting(p)}
                          aria-label={`Delete ${p.name}`}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add / Edit dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (open) setDialogOpen(true);
          else closeDialog();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto nice-scroll sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit product" : "Add product"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the details for this product."
                : "Create a new product for your store."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="p-name">Name</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Wireless Headphones"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea
                id="p-desc"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Describe the product…"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="p-price">Price ($)</Label>
                <Input
                  id="p-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => update("price", e.target.value)}
                  placeholder="49.99"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="p-stock">Stock</Label>
                <Input
                  id="p-stock"
                  type="number"
                  min={0}
                  step={1}
                  value={form.stock}
                  onChange={(e) => update("stock", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-image">Image URL</Label>
              <Input
                id="p-image"
                value={form.image}
                onChange={(e) => update("image", e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-images">Extra images (one URL per line, optional)</Label>
              <Textarea
                id="p-images"
                value={form.images}
                onChange={(e) => update("images", e.target.value)}
                placeholder={"https://…\nhttps://…"}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={form.categorySlug}
                  onValueChange={(v) => update("categorySlug", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.slug}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="p-brand">Brand</Label>
                <Input
                  id="p-brand"
                  value={form.brand}
                  onChange={(e) => update("brand", e.target.value)}
                  placeholder="ShopSphere"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.featured}
                  onCheckedChange={(v) => update("featured", v)}
                />
                Featured
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.isNew}
                  onCheckedChange={(v) => update("isNew", v)}
                />
                New arrival
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {editing ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {deleting?.name}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProduct.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleteProduct.isPending}
              className="bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive/60"
            >
              {deleteProduct.isPending && <Loader2 className="animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
