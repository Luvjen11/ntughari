import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Play, ArrowLeft } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";

interface StoryScene {
  id: string;
  title: string;
  narration_text: string;
  order_index: number;
  is_active: boolean;
  cultural_note: string | null;
  story_id: string;
}

interface Story {
  id: string;
  title: string;
}

interface Vocab {
  id: string;
  igbo_word: string;
  english_translation: string;
}

export default function AdminStoryScenes() {
  const { storyId } = useParams<{ storyId: string }>();
  const queryClient = useQueryClient();
  const { speak, stop, isSpeaking } = useTTS();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScene, setEditingScene] = useState<StoryScene | null>(null);
  const [selectedVocabIds, setSelectedVocabIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    narration_text: "",
    cultural_note: "",
    order_index: 0,
    is_active: true,
  });

  // Fetch story details
  const { data: story } = useQuery({
    queryKey: ["admin-story", storyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("id, title")
        .eq("id", storyId)
        .single();

      if (error) throw error;
      return data as Story;
    },
    enabled: !!storyId,
  });

  // Fetch scenes for this story
  const { data: scenes, isLoading } = useQuery({
    queryKey: ["admin-story-scenes", storyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("story_scenes")
        .select("*")
        .eq("story_id", storyId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as StoryScene[];
    },
    enabled: !!storyId,
  });

  // Fetch all vocabulary for selection
  const { data: allVocab } = useQuery({
    queryKey: ["all-vocabulary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vocabulary")
        .select("id, igbo_word, english_translation")
        .order("igbo_word", { ascending: true });

      if (error) throw error;
      return data as Vocab[];
    },
  });

  // Fetch linked vocab for a scene
  const fetchLinkedVocab = async (sceneId: string) => {
    const { data, error } = await supabase
      .from("story_scene_vocab")
      .select("vocab_id")
      .eq("scene_id", sceneId);

    if (error) throw error;
    return data.map((d) => d.vocab_id);
  };

  const createMutation = useMutation({
    mutationFn: async (data: Omit<StoryScene, "id">) => {
      const { data: newScene, error } = await supabase
        .from("story_scenes")
        .insert(data)
        .select()
        .single();
      if (error) throw error;

      // Link vocabulary
      if (selectedVocabIds.length > 0) {
        const vocabLinks = selectedVocabIds.map((vocabId, index) => ({
          scene_id: newScene.id,
          vocab_id: vocabId,
          order_index: index,
        }));
        const { error: linkError } = await supabase
          .from("story_scene_vocab")
          .insert(vocabLinks);
        if (linkError) throw linkError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-story-scenes", storyId] });
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

      // Update vocabulary links
      await supabase.from("story_scene_vocab").delete().eq("scene_id", id);
      if (selectedVocabIds.length > 0) {
        const vocabLinks = selectedVocabIds.map((vocabId, index) => ({
          scene_id: id,
          vocab_id: vocabId,
          order_index: index,
        }));
        const { error: linkError } = await supabase
          .from("story_scene_vocab")
          .insert(vocabLinks);
        if (linkError) throw linkError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-story-scenes", storyId] });
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
      queryClient.invalidateQueries({ queryKey: ["admin-story-scenes", storyId] });
      toast.success("Scene deleted");
    },
    onError: () => toast.error("Failed to delete scene"),
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingScene(null);
    setSelectedVocabIds([]);
    setFormData({
      title: "",
      narration_text: "",
      cultural_note: "",
      order_index: 0,
      is_active: true,
    });
  };

  const openEditDialog = async (scene: StoryScene) => {
    setEditingScene(scene);
    setFormData({
      title: scene.title,
      narration_text: scene.narration_text,
      cultural_note: scene.cultural_note || "",
      order_index: scene.order_index,
      is_active: scene.is_active,
    });
    // Load linked vocabulary
    const linkedIds = await fetchLinkedVocab(scene.id);
    setSelectedVocabIds(linkedIds);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    const nextIndex = scenes ? Math.max(...scenes.map((s) => s.order_index), 0) + 1 : 1;
    setFormData({
      title: "",
      narration_text: "",
      cultural_note: "",
      order_index: nextIndex,
      is_active: true,
    });
    setSelectedVocabIds([]);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sceneData = {
      ...formData,
      cultural_note: formData.cultural_note || null,
      story_id: storyId!,
      language_code: "ig",
    };

    if (editingScene) {
      updateMutation.mutate({ ...editingScene, ...sceneData });
    } else {
      createMutation.mutate(sceneData as Omit<StoryScene, "id">);
    }
  };

  const handlePreview = (text: string) => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text, { rate: 0.85 });
    }
  };

  const toggleVocab = (vocabId: string) => {
    setSelectedVocabIds((prev) =>
      prev.includes(vocabId)
        ? prev.filter((id) => id !== vocabId)
        : [...prev, vocabId]
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/stories">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Stories
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{story?.title || "Story"}</h1>
          <p className="text-muted-foreground">Manage scenes</p>
        </div>
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
                  placeholder="e.g., Words You Know, But Don't Say"
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
                  rows={10}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cultural_note">Cultural Note (optional)</Label>
                <Textarea
                  id="cultural_note"
                  value={formData.cultural_note}
                  onChange={(e) =>
                    setFormData({ ...formData, cultural_note: e.target.value })
                  }
                  placeholder="A brief cultural insight related to this scene..."
                  rows={2}
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

              {/* Vocabulary Selection */}
              <div className="space-y-2">
                <Label>Linked Vocabulary (Words from this scene)</Label>
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {allVocab?.map((vocab) => (
                    <div key={vocab.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`vocab-${vocab.id}`}
                        checked={selectedVocabIds.includes(vocab.id)}
                        onCheckedChange={() => toggleVocab(vocab.id)}
                      />
                      <label
                        htmlFor={`vocab-${vocab.id}`}
                        className="text-sm cursor-pointer"
                      >
                        <span className="font-medium">{vocab.igbo_word}</span>
                        <span className="text-muted-foreground"> — {vocab.english_translation}</span>
                      </label>
                    </div>
                  ))}
                  {(!allVocab || allVocab.length === 0) && (
                    <p className="text-sm text-muted-foreground">
                      No vocabulary available. Add vocabulary first.
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedVocabIds.length} word{selectedVocabIds.length !== 1 ? "s" : ""} selected
                </p>
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
            No scenes yet. Create your first scene for this story.
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
                {scene.cultural_note && (
                  <p className="text-xs text-primary mt-2 italic">
                    💡 {scene.cultural_note}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
