import { useRef, useState } from "react";
import { IgboFocusPad } from "@/components/IgboFocusPad";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, CheckCircle2, CircleDashed } from "lucide-react";
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
import { PROVERB_THEMES, THEME_LABELS, proverbText, themeLabel, type Proverb } from "@/lib/proverbs";
import { AudioControls } from "@/components/admin/AudioControls";

const EMPTY_FORM = {
  igbo_first: "",
  igbo_second: "",
  literal_translation: "",
  meaning: "",
  usage_note: "",
  theme: "wisdom",
  dialect: "",
  audio_url: "",
  source: "",
  reviewed: false,
  is_published: true,
  order_index: 0,
};

type FormData = typeof EMPTY_FORM;

function toRow(data: FormData) {
  return {
    igbo_first: data.igbo_first.trim(),
    igbo_second: data.igbo_second.trim(),
    literal_translation: data.literal_translation.trim(),
    meaning: data.meaning.trim(),
    usage_note: data.usage_note.trim() || null,
    theme: data.theme,
    dialect: data.dialect.trim() || null,
    audio_url: data.audio_url.trim() || null,
    source: data.source.trim() || null,
    reviewed: data.reviewed,
    is_published: data.is_published,
    order_index: data.order_index,
  };
}

export default function AdminProverbs() {
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Proverb | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  const { data: proverbs, isLoading } = useQuery({
    queryKey: ["adminProverbs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("proverbs").select("*").order("order_index");
      if (error) throw error;
      return data as Proverb[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["adminProverbs"] });
    queryClient.invalidateQueries({ queryKey: ["proverbs"] });
  };

  const saveMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: FormData }) => {
      const { error } = id
        ? await supabase.from("proverbs").update(toRow(data)).eq("id", id)
        : await supabase.from("proverbs").insert(toRow(data));
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      invalidate();
      setIsDialogOpen(false);
      setEditing(null);
      setFormData(EMPTY_FORM);
      toast({ title: id ? "Proverb updated" : "Proverb added" });
    },
    onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("proverbs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Proverb deleted" });
    },
    onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const handleEdit = (p: Proverb) => {
    setEditing(p);
    setFormData({
      igbo_first: p.igbo_first,
      igbo_second: p.igbo_second,
      literal_translation: p.literal_translation,
      meaning: p.meaning,
      usage_note: p.usage_note ?? "",
      theme: p.theme,
      dialect: p.dialect ?? "",
      audio_url: p.audio_url ?? "",
      source: p.source ?? "",
      reviewed: p.reviewed,
      is_published: p.is_published,
      order_index: p.order_index,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({ id: editing?.id, data: formData });
  };

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const unreviewed = proverbs?.filter((p) => !p.reviewed).length ?? 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-4">
        <Link to="/admin" className="brutal-button bg-card p-2">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold">Manage Proverbs</h1>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditing(null);
              setFormData(EMPTY_FORM);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="brutal-button bg-secondary">
              <Plus size={18} className="mr-2" /> Add Proverb
            </Button>
          </DialogTrigger>
          <DialogContent className="border-3 border-foreground max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">{editing ? "Edit Proverb" : "Add Proverb"}</DialogTitle>
            </DialogHeader>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              <IgboFocusPad containerRef={formRef} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="igbo_first">Opening (Igbo)</Label>
                  <Input id="igbo_first" value={formData.igbo_first} onChange={(e) => set("igbo_first", e.target.value)} required className="border-2 border-foreground" placeholder="Egbe bere, ugo bere;" />
                </div>
                <div>
                  <Label htmlFor="igbo_second">Ending (Igbo)</Label>
                  <Input id="igbo_second" value={formData.igbo_second} onChange={(e) => set("igbo_second", e.target.value)} required className="border-2 border-foreground" placeholder="nke sị ibe ya ebela, nku kwaa ya." />
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Split where a learner could guess the rest. Finish-the-proverb practice shows the opening and asks for the ending.
              </p>
              <div>
                <Label htmlFor="literal_translation">Literal translation</Label>
                <Input id="literal_translation" value={formData.literal_translation} onChange={(e) => set("literal_translation", e.target.value)} required className="border-2 border-foreground" />
              </div>
              <div>
                <Label htmlFor="meaning">What it means</Label>
                <Textarea id="meaning" value={formData.meaning} onChange={(e) => set("meaning", e.target.value)} required className="border-2 border-foreground" rows={2} />
              </div>
              <div>
                <Label htmlFor="usage_note">When it's used (optional)</Label>
                <Textarea id="usage_note" value={formData.usage_note} onChange={(e) => set("usage_note", e.target.value)} className="border-2 border-foreground" rows={2} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <select id="theme" value={formData.theme} onChange={(e) => set("theme", e.target.value)} className="w-full h-10 rounded-md border-2 border-foreground bg-background px-3">
                    {PROVERB_THEMES.map((t) => (
                      <option key={t} value={t}>{THEME_LABELS[t].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="dialect">Dialect (optional)</Label>
                  <Input id="dialect" value={formData.dialect} onChange={(e) => set("dialect", e.target.value)} className="border-2 border-foreground" placeholder="Standard" />
                </div>
                <div>
                  <Label htmlFor="order_index">Order</Label>
                  <Input id="order_index" type="number" value={formData.order_index} onChange={(e) => set("order_index", parseInt(e.target.value) || 0)} className="border-2 border-foreground" />
                </div>
              </div>
              <div>
                <Label htmlFor="audio_url">Recording URL (optional)</Label>
                <Input id="audio_url" value={formData.audio_url} onChange={(e) => set("audio_url", e.target.value)} className="border-2 border-foreground" placeholder="A native speaker's recording, used instead of generated audio" />
              </div>
              <div>
                <Label htmlFor="source">Source (optional)</Label>
                <Input id="source" value={formData.source} onChange={(e) => set("source", e.target.value)} className="border-2 border-foreground" placeholder="Book, collection or the person who shared it" />
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input id="reviewed" type="checkbox" checked={formData.reviewed} onChange={(e) => set("reviewed", e.target.checked)} className="h-4 w-4" />
                  Checked by a fluent speaker
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input id="is_published" type="checkbox" checked={formData.is_published} onChange={(e) => set("is_published", e.target.checked)} className="h-4 w-4" />
                  Published
                </label>
              </div>
              <Button type="submit" className="brutal-button bg-secondary w-full" disabled={saveMutation.isPending}>
                {editing ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {unreviewed > 0 && (
        <p className="mb-6 text-sm px-3 py-2 rounded-lg border-2 border-amber-500/60 bg-amber-500/10">
          {unreviewed} proverb{unreviewed === 1 ? " is" : "s are"} waiting for a fluent speaker to check spelling, tone marks and meaning.
        </p>
      )}

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="brutal-card overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-muted border-b-3 border-foreground">
              <tr>
                <th className="text-left p-4 font-display">Proverb</th>
                <th className="text-left p-4 font-display">Theme</th>
                <th className="text-left p-4 font-display">Status</th>
                <th className="text-left p-4 font-display">Audio</th>
                <th className="text-right p-4 font-display">Actions</th>
              </tr>
            </thead>
            <tbody>
              {proverbs?.map((p) => (
                <tr key={p.id} className="border-b border-muted last:border-0 align-top">
                  <td className="p-4">
                    <p className="font-display font-semibold">{p.igbo_first} {p.igbo_second}</p>
                    <p className="text-sm text-muted-foreground">{p.literal_translation}</p>
                  </td>
                  <td className="p-4">{themeLabel(p.theme)}</td>
                  <td className="p-4 text-sm space-y-1">
                    <span className="flex items-center gap-1">
                      {p.reviewed ? <CheckCircle2 size={14} className="text-green-600" /> : <CircleDashed size={14} className="text-amber-600" />}
                      {p.reviewed ? "Reviewed" : "Needs review"}
                    </span>
                    {!p.is_published && <span className="block text-muted-foreground">Hidden</span>}
                  </td>
                  <td className="p-2">
                    <AudioControls
                      text={proverbText(p)}
                      kind="sentence"
                      recordingUrl={p.audio_url}
                      folder="proverbs"
                      itemId={p.id}
                      onRecordingChange={async (url) => {
                        const { error } = await supabase.from("proverbs").update({ audio_url: url }).eq("id", p.id);
                        if (error) throw error;
                        invalidate();
                      }}
                    />
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(p)} aria-label="Edit proverb"><Pencil size={16} /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive" aria-label="Delete proverb"><Trash2 size={16} /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-3 border-foreground">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this proverb?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(p.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
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
