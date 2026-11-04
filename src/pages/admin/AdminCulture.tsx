import { useState } from "react";
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
import { CULTURE_TYPES, TYPE_LABELS, parseSongs, parseTags, typeLabel, type CultureItem } from "@/lib/culture";

const EMPTY_FORM = {
  type: "film",
  title: "",
  creator: "",
  year: "",
  description: "",
  igbo_language: false,
  where_to_watch_or_listen: "",
  tags: "",
  top_songs: "",
  region_slug: "",
  source: "",
  reviewed: false,
  is_published: true,
  order_index: 0,
};

type FormData = typeof EMPTY_FORM;

function toRow(data: FormData) {
  const year = parseInt(data.year);
  return {
    type: data.type,
    title: data.title.trim(),
    creator: data.creator.trim() || null,
    year: Number.isFinite(year) ? year : null,
    description: data.description.trim(),
    igbo_language: data.igbo_language,
    where_to_watch_or_listen: data.where_to_watch_or_listen.trim() || null,
    tags: parseTags(data.tags),
    top_songs: data.type === "music" ? parseSongs(data.top_songs) : [],
    region_slug: data.region_slug || null,
    source: data.source.trim() || null,
    reviewed: data.reviewed,
    is_published: data.is_published,
    order_index: data.order_index,
  };
}

export default function AdminCulture() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CultureItem | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  const { data: items, isLoading } = useQuery({
    queryKey: ["adminCultureItems"],
    queryFn: async () => {
      const { data, error } = await supabase.from("culture_items").select("*").order("type").order("order_index");
      if (error) throw error;
      return data as CultureItem[];
    },
  });

  const { data: regions } = useQuery({
    queryKey: ["dialectRegionOptions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dialect_regions").select("slug, name, area").order("order_index");
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["adminCultureItems"] });
    queryClient.invalidateQueries({ queryKey: ["cultureItems"] });
  };

  const saveMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: FormData }) => {
      const { error } = id
        ? await supabase.from("culture_items").update(toRow(data)).eq("id", id)
        : await supabase.from("culture_items").insert(toRow(data));
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      invalidate();
      setIsDialogOpen(false);
      setEditing(null);
      setFormData(EMPTY_FORM);
      toast({ title: id ? "Entry updated" : "Entry added" });
    },
    onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("culture_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Entry deleted" });
    },
    onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const handleEdit = (item: CultureItem) => {
    setEditing(item);
    setFormData({
      type: item.type,
      title: item.title,
      creator: item.creator ?? "",
      year: item.year?.toString() ?? "",
      description: item.description,
      igbo_language: item.igbo_language,
      where_to_watch_or_listen: item.where_to_watch_or_listen ?? "",
      tags: item.tags.join(", "),
      top_songs: (item.top_songs ?? []).join("\n"),
      region_slug: item.region_slug ?? "",
      source: item.source ?? "",
      reviewed: item.reviewed,
      is_published: item.is_published,
      order_index: item.order_index,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({ id: editing?.id, data: formData });
  };

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const unreviewed = items?.filter((i) => !i.reviewed).length ?? 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-4">
        <Link to="/admin" className="brutal-button bg-card p-2">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold">Manage Films &amp; Music</h1>
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
              <Plus size={18} className="mr-2" /> Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="border-3 border-foreground max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">{editing ? "Edit Entry" : "Add Entry"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <select id="type" value={formData.type} onChange={(e) => set("type", e.target.value)} className="w-full h-10 rounded-md border-2 border-foreground bg-background px-3">
                    {CULTURE_TYPES.map((t) => (
                      <option key={t} value={t}>{TYPE_LABELS[t].label}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={formData.title} onChange={(e) => set("title", e.target.value)} required className="border-2 border-foreground" placeholder="Film title, or the artist's name for music" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Label htmlFor="creator">Director or maker (optional)</Label>
                  <Input id="creator" value={formData.creator} onChange={(e) => set("creator", e.target.value)} className="border-2 border-foreground" />
                </div>
                <div>
                  <Label htmlFor="year">Year (optional)</Label>
                  <Input id="year" type="number" min={1900} max={2100} value={formData.year} onChange={(e) => set("year", e.target.value)} className="border-2 border-foreground" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Music entries are artists: put the artist or band as the title and name their best-known work in the description.
              </p>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => set("description", e.target.value)} required className="border-2 border-foreground" rows={3} />
              </div>
              {formData.type === "music" && (
                <div>
                  <Label htmlFor="top_songs">Songs to start with (one per line, up to 5)</Label>
                  <Textarea id="top_songs" value={formData.top_songs} onChange={(e) => set("top_songs", e.target.value)} className="border-2 border-foreground" rows={5} placeholder={"Osondi Owendi\nOnuigbo"} />
                  <p className="text-xs text-muted-foreground mt-1">Song titles only. Learners get a YouTube search for the artist and each title.</p>
                </div>
              )}
              <div>
                <Label htmlFor="where_to_watch_or_listen">Where to watch or listen (optional)</Label>
                <Input id="where_to_watch_or_listen" type="url" value={formData.where_to_watch_or_listen} onChange={(e) => set("where_to_watch_or_listen", e.target.value)} className="border-2 border-foreground" placeholder="https://… official channel, streaming page or label" />
                <p className="text-xs text-muted-foreground mt-1">Link to an official or well-known listing. Never upload or embed the work itself.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input id="tags" value={formData.tags} onChange={(e) => set("tags", e.target.value)} className="border-2 border-foreground" placeholder="highlife, classic" />
                </div>
                <div>
                  <Label htmlFor="order_index">Order</Label>
                  <Input id="order_index" type="number" value={formData.order_index} onChange={(e) => set("order_index", parseInt(e.target.value) || 0)} className="border-2 border-foreground" />
                </div>
              </div>
              <div>
                <Label htmlFor="region_slug">Place on the dialect map (optional)</Label>
                <select id="region_slug" value={formData.region_slug} onChange={(e) => set("region_slug", e.target.value)} className="w-full h-10 rounded-md border-2 border-foreground bg-background px-3">
                  <option value="">None</option>
                  {regions?.map((r) => (
                    <option key={r.slug} value={r.slug}>{r.name} ({r.area})</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="source">Source</Label>
                <Input id="source" value={formData.source} onChange={(e) => set("source", e.target.value)} className="border-2 border-foreground" placeholder="URL or reference the facts were checked against" />
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input id="igbo_language" type="checkbox" checked={formData.igbo_language} onChange={(e) => set("igbo_language", e.target.checked)} className="h-4 w-4" />
                  Wholly or largely in Igbo
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input id="reviewed" type="checkbox" checked={formData.reviewed} onChange={(e) => set("reviewed", e.target.checked)} className="h-4 w-4" />
                  Facts checked
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
          {unreviewed} entr{unreviewed === 1 ? "y is" : "ies are"} waiting for someone to check the facts and wording.
        </p>
      )}

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="brutal-card overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-muted border-b-3 border-foreground">
              <tr>
                <th className="text-left p-4 font-display">Title</th>
                <th className="text-left p-4 font-display">Type</th>
                <th className="text-left p-4 font-display">Status</th>
                <th className="text-right p-4 font-display">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items?.map((item) => (
                <tr key={item.id} className="border-b border-muted last:border-0 align-top">
                  <td className="p-4">
                    <p className="font-display font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {[item.creator, item.year].filter(Boolean).join(" · ")}
                      {item.igbo_language && " · In Igbo"}
                    </p>
                  </td>
                  <td className="p-4">{typeLabel(item.type)}</td>
                  <td className="p-4 text-sm space-y-1">
                    <span className="flex items-center gap-1">
                      {item.reviewed ? <CheckCircle2 size={14} className="text-green-600" /> : <CircleDashed size={14} className="text-amber-600" />}
                      {item.reviewed ? "Reviewed" : "Needs review"}
                    </span>
                    {!item.is_published && <span className="block text-muted-foreground">Hidden</span>}
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} aria-label="Edit entry"><Pencil size={16} /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive" aria-label="Delete entry"><Trash2 size={16} /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-3 border-foreground">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(item.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
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
