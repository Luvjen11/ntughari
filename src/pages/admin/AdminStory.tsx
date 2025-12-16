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
import { Plus, Pencil, Trash2, Play, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useTTS } from "@/hooks/useTTS";

interface StoryScene {
  id: string;
  title: string;
  narration_text: string;
  order_index: number;
  language_code: string;
  is_active: boolean;
}

export default function AdminStory() {
  const queryClient = useQueryClient();
  const { speak, stop, isSpeaking } = useTTS();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScene, setEditingScene] = useState<StoryScene | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    narration_text: "",
    order_index: 0,
    is_active: true,
  });

  const { data: scenes, isLoading } = useQuery({
    queryKey: ["admin-story-scenes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("story_scenes")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as StoryScene[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<StoryScene, "id">) => {
      const { error } = await supabase.from("story_scenes").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-story-scenes"] });
      toast.success("Scene created");
      closeDialog();
    },
    onError: () => toast.error("Failed to create scene"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: StoryScene) => {
      const { error } = await supabase
        .from("story_scenes")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-story-scenes"] });
      toast.success("Scene updated");
      closeDialog();
    },
    onError: () => toast.error("Failed to update scene"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("story_scenes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-story-scenes"] });
      toast.success("Scene deleted");
    },
    onError: () => toast.error("Failed to delete scene"),
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingScene(null);
    setFormData({ title: "", narration_text: "", order_index: 0, is_active: true });
  };

  const openEditDialog = (scene: StoryScene) => {
    setEditingScene(scene);
    setFormData({
      title: scene.title,
      narration_text: scene.narration_text,
      order_index: scene.order_index,
      is_active: scene.is_active,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    const nextIndex = scenes ? Math.max(...scenes.map((s) => s.order_index), 0) + 1 : 1;
    setFormData({ title: "", narration_text: "", order_index: nextIndex, is_active: true });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingScene) {
      updateMutation.mutate({ ...editingScene, ...formData });
    } else {
      createMutation.mutate({ ...formData, language_code: "ig" });
    }
  };

  const handlePreview = (text: string) => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text, { rate: 0.85 });
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
        <h1 className="text-3xl font-bold">Story Scenes</h1>
      </div>

      <div className="flex justify-end mb-6">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="border-2">
              <Plus className="h-4 w-4 mr-2" />
              Add Scene
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingScene ? "Edit Scene" : "Create Scene"}
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
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="narration_text">Narration Text</Label>
                <Textarea
                  id="narration_text"
                  value={formData.narration_text}
                  onChange={(e) =>
                    setFormData({ ...formData, narration_text: e.target.value })
                  }
                  rows={12}
                  required
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
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handlePreview(formData.narration_text)}
                  disabled={!formData.narration_text}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isSpeaking ? "Stop" : "Preview"}
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingScene ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Loading...</div>
      ) : scenes?.length === 0 ? (
        <Card className="border-2">
          <CardContent className="py-8 text-center text-muted-foreground">
            No scenes yet. Create your first scene.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {scenes?.map((scene) => (
            <Card key={scene.id} className="border-2">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                      #{scene.order_index}
                    </span>
                    <CardTitle className="text-lg">{scene.title}</CardTitle>
                    {!scene.is_active && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePreview(scene.narration_text)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(scene)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Delete this scene?")) {
                          deleteMutation.mutate(scene.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {scene.narration_text}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
