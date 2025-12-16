import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowLeft, BookOpen, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Story {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_published: boolean;
  sceneCount?: number;
}

export default function AdminStories() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    order_index: 0,
    is_published: true,
  });

  const { data: stories, isLoading } = useQuery({
    queryKey: ["admin-stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;

      // Get scene counts
      const storiesWithCounts = await Promise.all(
        (data || []).map(async (story) => {
          const { count } = await supabase
            .from("story_scenes")
            .select("*", { count: "exact", head: true })
            .eq("story_id", story.id);

          return { ...story, sceneCount: count || 0 };
        })
      );

      return storiesWithCounts as Story[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Story, "id" | "sceneCount">) => {
      const { error } = await supabase.from("stories").insert({
        ...data,
        language_code: "ig",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stories"] });
      toast.success("Story created");
      closeDialog();
    },
    onError: () => toast.error("Failed to create story"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Omit<Story, "sceneCount">) => {
      const { error } = await supabase
        .from("stories")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stories"] });
      toast.success("Story updated");
      closeDialog();
    },
    onError: () => toast.error("Failed to update story"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stories"] });
      toast.success("Story deleted");
    },
    onError: () => toast.error("Failed to delete story"),
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingStory(null);
    setFormData({ title: "", description: "", order_index: 0, is_published: true });
  };

  const openEditDialog = (story: Story) => {
    setEditingStory(story);
    setFormData({
      title: story.title,
      description: story.description || "",
      order_index: story.order_index,
      is_published: story.is_published,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    const nextIndex = stories ? Math.max(...stories.map((s) => s.order_index), 0) + 1 : 1;
    setFormData({ title: "", description: "", order_index: nextIndex, is_published: true });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStory) {
      updateMutation.mutate({ ...editingStory, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Stories</h1>
      </div>

      <div className="flex justify-end mb-6">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="border-2">
              <Plus className="h-4 w-4 mr-2" />
              Add Story
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingStory ? "Edit Story" : "Create Story"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g., Finding Your Voice"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="A brief description of this story's theme..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order_index">Order</Label>
                <Input
                  id="order_index"
                  type="number"
                  value={formData.order_index}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      order_index: parseInt(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_published: checked })
                  }
                />
                <Label htmlFor="is_published">Published</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingStory ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Loading...</div>
      ) : stories?.length === 0 ? (
        <Card className="border-2">
          <CardContent className="py-8 text-center text-muted-foreground">
            No stories yet. Create your first story.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {stories?.map((story) => (
            <Card key={story.id} className="border-2">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                      #{story.order_index}
                    </span>
                    <div>
                      <CardTitle className="text-lg">{story.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {story.sceneCount} {story.sceneCount === 1 ? "scene" : "scenes"}
                      </p>
                    </div>
                    {!story.is_published && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                        Draft
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link to={`/admin/stories/${story.id}/scenes`}>
                        <BookOpen className="h-4 w-4 mr-1" />
                        Scenes
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(story)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Delete this story and all its scenes?")) {
                          deleteMutation.mutate(story.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {story.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {story.description}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
