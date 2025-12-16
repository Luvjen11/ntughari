import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type Skeleton = {
  id: string;
  name: string;
  structure: string;
  explanation: string | null;
  example_igbo: string;
  example_english: string;
  order_index: number;
};

export default function AdminSkeletons() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSkeleton, setEditingSkeleton] = useState<Skeleton | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    structure: "",
    explanation: "",
    example_igbo: "",
    example_english: "",
    order_index: 0,
  });

  const { data: skeletons, isLoading } = useQuery({
    queryKey: ["adminSkeletons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sentence_skeletons").select("*").order("order_index");
      if (error) throw error;
      return data as Skeleton[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("sentence_skeletons").insert({
        name: data.name,
        structure: data.structure,
        explanation: data.explanation || null,
        example_igbo: data.example_igbo,
        example_english: data.example_english,
        order_index: data.order_index,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminSkeletons"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Skeleton created successfully" });
    },
    onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from("sentence_skeletons").update({
        name: data.name,
        structure: data.structure,
        explanation: data.explanation || null,
        example_igbo: data.example_igbo,
        example_english: data.example_english,
        order_index: data.order_index,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminSkeletons"] });
      setIsDialogOpen(false);
      setEditingSkeleton(null);
      resetForm();
      toast({ title: "Skeleton updated successfully" });
    },
    onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sentence_skeletons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminSkeletons"] });
      toast({ title: "Skeleton deleted successfully" });
    },
    onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const resetForm = () => setFormData({ name: "", structure: "", explanation: "", example_igbo: "", example_english: "", order_index: 0 });

  const handleEdit = (skeleton: Skeleton) => {
    setEditingSkeleton(skeleton);
    setFormData({
      name: skeleton.name,
      structure: skeleton.structure,
      explanation: skeleton.explanation || "",
      example_igbo: skeleton.example_igbo,
      example_english: skeleton.example_english,
      order_index: skeleton.order_index,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSkeleton) {
      updateMutation.mutate({ id: editingSkeleton.id, data: formData });
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
          <h1 className="font-display text-3xl font-bold">Manage Skeletons</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingSkeleton(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button className="brutal-button bg-primary"><Plus size={18} className="mr-2" /> Add Skeleton</Button>
          </DialogTrigger>
          <DialogContent className="border-3 border-foreground max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">{editingSkeleton ? "Edit Skeleton" : "Add Skeleton"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="border-2 border-foreground" />
              </div>
              <div>
                <Label htmlFor="structure">Structure</Label>
                <Input id="structure" value={formData.structure} onChange={(e) => setFormData({ ...formData, structure: e.target.value })} required className="border-2 border-foreground" placeholder="e.g., Subject + Verb + Object" />
              </div>
              <div>
                <Label htmlFor="explanation">Explanation</Label>
                <Textarea id="explanation" value={formData.explanation} onChange={(e) => setFormData({ ...formData, explanation: e.target.value })} className="border-2 border-foreground" />
              </div>
              <div>
                <Label htmlFor="example_igbo">Example (Igbo)</Label>
                <Input id="example_igbo" value={formData.example_igbo} onChange={(e) => setFormData({ ...formData, example_igbo: e.target.value })} required className="border-2 border-foreground" />
              </div>
              <div>
                <Label htmlFor="example_english">Example (English)</Label>
                <Input id="example_english" value={formData.example_english} onChange={(e) => setFormData({ ...formData, example_english: e.target.value })} required className="border-2 border-foreground" />
              </div>
              <div>
                <Label htmlFor="order_index">Order</Label>
                <Input id="order_index" type="number" value={formData.order_index} onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })} className="border-2 border-foreground" />
              </div>
              <Button type="submit" className="brutal-button bg-primary w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingSkeleton ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="grid gap-4">
          {skeletons?.map((skeleton) => (
            <div key={skeleton.id} className="brutal-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-display font-bold text-lg">{skeleton.name}</h3>
                  <p className="text-sm text-muted-foreground font-mono">{skeleton.structure}</p>
                  {skeleton.explanation && <p className="text-sm mt-2">{skeleton.explanation}</p>}
                  <div className="mt-3 p-3 bg-muted rounded-lg">
                    <p className="font-display font-semibold">{skeleton.example_igbo}</p>
                    <p className="text-sm text-muted-foreground">{skeleton.example_english}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(skeleton)}><Pencil size={16} /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive"><Trash2 size={16} /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="border-3 border-foreground">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{skeleton.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(skeleton.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
