import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type Phrase = {
  id: string;
  igbo_phrase: string;
  english_translation: string;
  order_index: number;
  cultural_note: string | null;
};

export default function AdminPhrases() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPhrase, setEditingPhrase] = useState<Phrase | null>(null);
  const [formData, setFormData] = useState({
    igbo_phrase: "",
    english_translation: "",
    order_index: 0,
    cultural_note: "",
  });

  const { data: phrases, isLoading } = useQuery({
    queryKey: ["adminPhrases"],
    queryFn: async () => {
      const { data, error } = await supabase.from("phrases").select("*").order("order_index");
      if (error) throw error;
      return data as Phrase[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("phrases").insert({
        igbo_phrase: data.igbo_phrase,
        english_translation: data.english_translation,
        order_index: data.order_index,
        cultural_note: data.cultural_note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPhrases"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Phrase created successfully" });
    },
    onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from("phrases").update({
        igbo_phrase: data.igbo_phrase,
        english_translation: data.english_translation,
        order_index: data.order_index,
        cultural_note: data.cultural_note || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPhrases"] });
      setIsDialogOpen(false);
      setEditingPhrase(null);
      resetForm();
      toast({ title: "Phrase updated successfully" });
    },
    onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("phrases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPhrases"] });
      toast({ title: "Phrase deleted successfully" });
    },
    onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const resetForm = () => setFormData({ igbo_phrase: "", english_translation: "", order_index: 0, cultural_note: "" });

  const handleEdit = (phrase: Phrase) => {
    setEditingPhrase(phrase);
    setFormData({
      igbo_phrase: phrase.igbo_phrase,
      english_translation: phrase.english_translation,
      order_index: phrase.order_index,
      cultural_note: phrase.cultural_note || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPhrase) {
      updateMutation.mutate({ id: editingPhrase.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/admin" className="brutal-button bg-card p-2">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold">Manage Phrases</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingPhrase(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button className="brutal-button bg-secondary"><Plus size={18} className="mr-2" /> Add Phrase</Button>
          </DialogTrigger>
          <DialogContent className="border-3 border-foreground">
            <DialogHeader>
              <DialogTitle className="font-display">{editingPhrase ? "Edit Phrase" : "Add Phrase"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="igbo_phrase">Igbo Phrase</Label>
                <Input id="igbo_phrase" value={formData.igbo_phrase} onChange={(e) => setFormData({ ...formData, igbo_phrase: e.target.value })} required className="border-2 border-foreground" />
              </div>
              <div>
                <Label htmlFor="english_translation">English Translation</Label>
                <Input id="english_translation" value={formData.english_translation} onChange={(e) => setFormData({ ...formData, english_translation: e.target.value })} required className="border-2 border-foreground" />
              </div>
              <div>
                <Label htmlFor="order_index">Order</Label>
                <Input id="order_index" type="number" value={formData.order_index} onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })} className="border-2 border-foreground" />
              </div>
              <div>
                <Label htmlFor="cultural_note">Culture Note (optional)</Label>
                <Input id="cultural_note" value={formData.cultural_note} onChange={(e) => setFormData({ ...formData, cultural_note: e.target.value })} className="border-2 border-foreground" placeholder="e.g., Used when greeting elders..." />
              </div>
              <Button type="submit" className="brutal-button bg-secondary w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingPhrase ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="brutal-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted border-b-3 border-foreground">
              <tr>
                <th className="text-left p-4 font-display">Igbo</th>
                <th className="text-left p-4 font-display">English</th>
                <th className="text-left p-4 font-display">Order</th>
                <th className="text-right p-4 font-display">Actions</th>
              </tr>
            </thead>
            <tbody>
              {phrases?.map((phrase) => (
                <tr key={phrase.id} className="border-b border-muted last:border-0">
                  <td className="p-4 font-display font-semibold">{phrase.igbo_phrase}</td>
                  <td className="p-4 text-muted-foreground">{phrase.english_translation}</td>
                  <td className="p-4">{phrase.order_index}</td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(phrase)}><Pencil size={16} /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive"><Trash2 size={16} /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-3 border-foreground">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this phrase?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(phrase.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
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
