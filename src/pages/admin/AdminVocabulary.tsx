import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
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

type VocabWord = {
  id: string;
  igbo_word: string;
  english_translation: string;
  category_id: string;
  example_sentence_igbo: string | null;
  example_sentence_english: string | null;
  cultural_note: string | null;
};

type Category = {
  id: string;
  name: string;
};

export default function AdminVocabulary() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<VocabWord | null>(null);
  const [formData, setFormData] = useState({
    igbo_word: "",
    english_translation: "",
    category_id: "",
    example_sentence_igbo: "",
    example_sentence_english: "",
    cultural_note: "",
  });

  const { data: words, isLoading } = useQuery({
    queryKey: ["adminVocabulary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vocabulary").select("*");
      if (error) throw error;
      return data as VocabWord[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["adminCategories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vocab_categories").select("id, name").order("order_index");
      if (error) throw error;
      return data as Category[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("vocabulary").insert({
        igbo_word: data.igbo_word,
        english_translation: data.english_translation,
        category_id: data.category_id,
        example_sentence_igbo: data.example_sentence_igbo || null,
        example_sentence_english: data.example_sentence_english || null,
        cultural_note: data.cultural_note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminVocabulary"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Word created successfully" });
    },
    onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from("vocabulary").update({
        igbo_word: data.igbo_word,
        english_translation: data.english_translation,
        category_id: data.category_id,
        example_sentence_igbo: data.example_sentence_igbo || null,
        example_sentence_english: data.example_sentence_english || null,
        cultural_note: data.cultural_note || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminVocabulary"] });
      setIsDialogOpen(false);
      setEditingWord(null);
      resetForm();
      toast({ title: "Word updated successfully" });
    },
    onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vocabulary").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminVocabulary"] });
      toast({ title: "Word deleted successfully" });
    },
    onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const resetForm = () => setFormData({ igbo_word: "", english_translation: "", category_id: "", example_sentence_igbo: "", example_sentence_english: "", cultural_note: "" });

  const handleEdit = (word: VocabWord) => {
    setEditingWord(word);
    setFormData({
      igbo_word: word.igbo_word,
      english_translation: word.english_translation,
      category_id: word.category_id,
      example_sentence_igbo: word.example_sentence_igbo || "",
      example_sentence_english: word.example_sentence_english || "",
      cultural_note: word.cultural_note || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingWord) {
      updateMutation.mutate({ id: editingWord.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getCategoryName = (id: string) => categories?.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/admin" className="brutal-button bg-card p-2">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold">Manage Vocabulary</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingWord(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button className="brutal-button bg-secondary"><Plus size={18} className="mr-2" /> Add Word</Button>
          </DialogTrigger>
          <DialogContent className="border-3 border-foreground max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">{editingWord ? "Edit Word" : "Add Word"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="igbo_word">Igbo Word</Label>
                <Input id="igbo_word" value={formData.igbo_word} onChange={(e) => setFormData({ ...formData, igbo_word: e.target.value })} required className="border-2 border-foreground" />
              </div>
              <div>
                <Label htmlFor="english_translation">English Translation</Label>
                <Input id="english_translation" value={formData.english_translation} onChange={(e) => setFormData({ ...formData, english_translation: e.target.value })} required className="border-2 border-foreground" />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                  <SelectTrigger className="border-2 border-foreground">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="example_igbo">Example (Igbo)</Label>
                <Input id="example_igbo" value={formData.example_sentence_igbo} onChange={(e) => setFormData({ ...formData, example_sentence_igbo: e.target.value })} className="border-2 border-foreground" />
              </div>
              <div>
                <Label htmlFor="example_english">Example (English)</Label>
                <Input id="example_english" value={formData.example_sentence_english} onChange={(e) => setFormData({ ...formData, example_sentence_english: e.target.value })} className="border-2 border-foreground" />
              </div>
              <div>
                <Label htmlFor="cultural_note">Culture Note (optional)</Label>
                <Input id="cultural_note" value={formData.cultural_note} onChange={(e) => setFormData({ ...formData, cultural_note: e.target.value })} className="border-2 border-foreground" placeholder="e.g., Often used in informal settings..." />
              </div>
              <Button type="submit" className="brutal-button bg-secondary w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingWord ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="brutal-card overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-muted border-b-3 border-foreground">
              <tr>
                <th className="text-left p-4 font-display">Igbo</th>
                <th className="text-left p-4 font-display">English</th>
                <th className="text-left p-4 font-display">Category</th>
                <th className="text-right p-4 font-display">Actions</th>
              </tr>
            </thead>
            <tbody>
              {words?.map((word) => (
                <tr key={word.id} className="border-b border-muted last:border-0">
                  <td className="p-4 font-display font-semibold">{word.igbo_word}</td>
                  <td className="p-4 text-muted-foreground">{word.english_translation}</td>
                  <td className="p-4">{getCategoryName(word.category_id)}</td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(word)}><Pencil size={16} /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive"><Trash2 size={16} /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-3 border-foreground">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{word.igbo_word}"?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(word.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
