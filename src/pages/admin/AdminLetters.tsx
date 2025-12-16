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

type Letter = {
  id: string;
  character: string;
  pronunciation_tip: string | null;
  order_index: number;
};

export default function AdminLetters() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLetter, setEditingLetter] = useState<Letter | null>(null);
  const [formData, setFormData] = useState({ character: "", pronunciation_tip: "", order_index: 0 });

  const { data: letters, isLoading } = useQuery({
    queryKey: ["adminLetters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("letters")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data as Letter[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("letters").insert({
        character: data.character,
        pronunciation_tip: data.pronunciation_tip || null,
        order_index: data.order_index,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminLetters"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Letter created successfully" });
    },
    onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from("letters").update({
        character: data.character,
        pronunciation_tip: data.pronunciation_tip || null,
        order_index: data.order_index,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminLetters"] });
      setIsDialogOpen(false);
      setEditingLetter(null);
      resetForm();
      toast({ title: "Letter updated successfully" });
    },
    onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("letters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminLetters"] });
      toast({ title: "Letter deleted successfully" });
    },
    onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const resetForm = () => setFormData({ character: "", pronunciation_tip: "", order_index: 0 });

  const handleEdit = (letter: Letter) => {
    setEditingLetter(letter);
    setFormData({
      character: letter.character,
      pronunciation_tip: letter.pronunciation_tip || "",
      order_index: letter.order_index,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLetter) {
      updateMutation.mutate({ id: editingLetter.id, data: formData });
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
          <h1 className="font-display text-3xl font-bold">Manage Letters</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingLetter(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button className="brutal-button bg-primary"><Plus size={18} className="mr-2" /> Add Letter</Button>
          </DialogTrigger>
          <DialogContent className="border-3 border-foreground">
            <DialogHeader>
              <DialogTitle className="font-display">{editingLetter ? "Edit Letter" : "Add Letter"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="character">Character</Label>
                <Input id="character" value={formData.character} onChange={(e) => setFormData({ ...formData, character: e.target.value })} required className="border-2 border-foreground" />
              </div>
              <div>
                <Label htmlFor="pronunciation_tip">Pronunciation Tip</Label>
                <Input id="pronunciation_tip" value={formData.pronunciation_tip} onChange={(e) => setFormData({ ...formData, pronunciation_tip: e.target.value })} className="border-2 border-foreground" />
              </div>
              <div>
                <Label htmlFor="order_index">Order</Label>
                <Input id="order_index" type="number" value={formData.order_index} onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })} className="border-2 border-foreground" />
              </div>
              <Button type="submit" className="brutal-button bg-primary w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingLetter ? "Update" : "Create"}
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
                <th className="text-left p-4 font-display">Character</th>
                <th className="text-left p-4 font-display">Pronunciation Tip</th>
                <th className="text-left p-4 font-display">Order</th>
                <th className="text-right p-4 font-display">Actions</th>
              </tr>
            </thead>
            <tbody>
              {letters?.map((letter) => (
                <tr key={letter.id} className="border-b border-muted last:border-0">
                  <td className="p-4 font-display text-2xl font-bold">{letter.character}</td>
                  <td className="p-4 text-muted-foreground">{letter.pronunciation_tip || "—"}</td>
                  <td className="p-4">{letter.order_index}</td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(letter)}><Pencil size={16} /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive"><Trash2 size={16} /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-3 border-foreground">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete letter "{letter.character}"?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(letter.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
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
