import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, ChevronUp, ChevronDown, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  order_index: number;
  word_count?: number;
}

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", icon: "" });

  // Fetch categories with word counts
  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data: cats, error } = await supabase
        .from("vocab_categories")
        .select("*")
        .order("order_index");
      if (error) throw error;

      // Get word counts for each category
      const { data: vocab } = await supabase
        .from("vocabulary")
        .select("category_id");
      
      const wordCounts: Record<string, number> = {};
      vocab?.forEach((v) => {
        wordCounts[v.category_id] = (wordCounts[v.category_id] || 0) + 1;
      });

      return (cats as Category[]).map((cat) => ({
        ...cat,
        word_count: wordCounts[cat.id] || 0,
      }));
    },
  });

  // Create category
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; icon: string }) => {
      const maxIndex = categories?.length ? Math.max(...categories.map((c) => c.order_index)) : -1;
      const { error } = await supabase.from("vocab_categories").insert({
        name: data.name,
        description: data.description || null,
        icon: data.icon || null,
        order_index: maxIndex + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category created");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("Failed to create category"),
  });

  // Update category
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; description: string; icon: string } }) => {
      const { error } = await supabase.from("vocab_categories").update({
        name: data.name,
        description: data.description || null,
        icon: data.icon || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category updated");
      setIsDialogOpen(false);
      setEditingCategory(null);
      resetForm();
    },
    onError: () => toast.error("Failed to update category"),
  });

  // Delete category
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vocab_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category deleted");
    },
    onError: () => toast.error("Failed to delete category"),
  });

  // Reorder category
  const reorderMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "up" | "down" }) => {
      if (!categories) return;
      const index = categories.findIndex((c) => c.id === id);
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= categories.length) return;

      const current = categories[index];
      const swap = categories[swapIndex];

      await Promise.all([
        supabase.from("vocab_categories").update({ order_index: swap.order_index }).eq("id", current.id),
        supabase.from("vocab_categories").update({ order_index: current.order_index }).eq("id", swap.id),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", icon: "" });
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      icon: category.icon || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="brutal-card bg-primary p-8 animate-pulse">
          <p className="font-display text-xl font-bold">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link to="/admin" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft size={20} />
          <span className="font-display font-semibold">Back to Admin</span>
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold mb-2">Vocabulary Categories</h1>
            <p className="text-muted-foreground">Manage categories for vocabulary words</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingCategory(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus size={18} />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? "Edit Category" : "New Category"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="font-display font-semibold text-sm">Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Daily Life"
                  />
                </div>
                <div>
                  <label className="font-display font-semibold text-sm">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this category"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="font-display font-semibold text-sm">Icon (emoji or text)</label>
                  <Input
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="e.g., 🏠"
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingCategory ? "Update Category" : "Create Category"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Categories List */}
        <div className="space-y-3">
          {categories?.map((category, index) => (
            <div
              key={category.id}
              className="brutal-card bg-card p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => reorderMutation.mutate({ id: category.id, direction: "up" })}
                    disabled={index === 0}
                    className="p-1 hover:bg-muted rounded disabled:opacity-30"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    onClick={() => reorderMutation.mutate({ id: category.id, direction: "down" })}
                    disabled={index === categories.length - 1}
                    className="p-1 hover:bg-muted rounded disabled:opacity-30"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-lg border-2 border-foreground">
                  {category.icon ? (
                    <span className="text-xl">{category.icon}</span>
                  ) : (
                    <FolderOpen size={20} />
                  )}
                </div>
                <div>
                  <h3 className="font-display font-bold">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {category.word_count} word{category.word_count !== 1 ? "s" : ""}
                    {category.description && ` • ${category.description}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => openEditDialog(category)}>
                  <Pencil size={16} />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 size={16} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete "{category.name}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {category.word_count && category.word_count > 0 ? (
                          <span className="text-destructive font-semibold">
                            Warning: This category has {category.word_count} word{category.word_count !== 1 ? "s" : ""}. 
                            You must move or delete these words first.
                          </span>
                        ) : (
                          "This action cannot be undone."
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate(category.id)}
                        disabled={category.word_count ? category.word_count > 0 : false}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}

          {categories?.length === 0 && (
            <div className="brutal-card bg-muted p-8 text-center">
              <p className="text-muted-foreground">No categories yet. Create your first one!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}