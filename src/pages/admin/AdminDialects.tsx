import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Pencil, Trash2, CheckCircle2, CircleDashed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { IgboFocusPad } from "@/components/IgboFocusPad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { useDialectRegions, useDialectVariants } from "@/hooks/useDialects";
import { DIALECT_AREAS, type DialectRegion, type DialectVariant } from "@/lib/dialects";

const EMPTY_VARIANT = {
  region_id: "",
  english_gloss: "",
  standard_igbo: "",
  variant: "",
  audio_url: "",
  notes: "",
  contributor: "",
  reviewed: false,
};
type VariantForm = typeof EMPTY_VARIANT;

const EMPTY_REGION = {
  slug: "",
  name: "",
  area: "Anambra",
  description: "",
  community_note: "",
  latitude: 6,
  longitude: 7,
  order_index: 0,
};
type RegionForm = typeof EMPTY_REGION;

const fieldClass = "border-2 border-foreground";
const selectClass = "w-full h-10 rounded-md border-2 border-foreground bg-background px-3";

export default function AdminDialects() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: regions } = useDialectRegions();
  const { data: variants, isLoading } = useDialectVariants();

  const variantFormRef = useRef<HTMLFormElement>(null);
  const [variantOpen, setVariantOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<DialectVariant | null>(null);
  const [variantForm, setVariantForm] = useState<VariantForm>(EMPTY_VARIANT);

  const regionFormRef = useRef<HTMLFormElement>(null);
  const [regionOpen, setRegionOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<DialectRegion | null>(null);
  const [regionForm, setRegionForm] = useState<RegionForm>(EMPTY_REGION);

  const regionName = (id: string) => regions?.find((r) => r.id === id)?.name ?? "—";
  const onError = (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" });

  const saveVariant = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: VariantForm }) => {
      const row = {
        region_id: data.region_id,
        english_gloss: data.english_gloss.trim(),
        standard_igbo: data.standard_igbo.trim(),
        variant: data.variant.trim(),
        audio_url: data.audio_url.trim() || null,
        notes: data.notes.trim() || null,
        contributor: data.contributor.trim() || null,
        reviewed: data.reviewed,
      };
      const { error } = id
        ? await supabase.from("dialect_variants").update(row).eq("id", id)
        : await supabase.from("dialect_variants").insert(row);
      if (error) throw error;
    },
    onSuccess: (_, { id, data }) => {
      queryClient.invalidateQueries({ queryKey: ["dialect-variants"] });
      setVariantOpen(false);
      setEditingVariant(null);
      // Keep the word filled in so the next place's variant is quick to add.
      setVariantForm(id ? EMPTY_VARIANT : { ...EMPTY_VARIANT, english_gloss: data.english_gloss, standard_igbo: data.standard_igbo, contributor: data.contributor });
      toast({ title: id ? "Variant updated" : "Variant added" });
    },
    onError,
  });

  const deleteVariant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dialect_variants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dialect-variants"] });
      toast({ title: "Variant deleted" });
    },
    onError,
  });

  const saveRegion = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: RegionForm }) => {
      const row = {
        slug: data.slug.trim() || data.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: data.name.trim(),
        area: data.area,
        description: data.description.trim() || null,
        community_note: data.community_note.trim() || null,
        latitude: data.latitude,
        longitude: data.longitude,
        order_index: data.order_index,
      };
      const { error } = id
        ? await supabase.from("dialect_regions").update(row).eq("id", id)
        : await supabase.from("dialect_regions").insert(row);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["dialect-regions"] });
      setRegionOpen(false);
      setEditingRegion(null);
      setRegionForm(EMPTY_REGION);
      toast({ title: id ? "Place updated" : "Place added" });
    },
    onError,
  });

  const openVariant = (v?: DialectVariant) => {
    setEditingVariant(v ?? null);
    setVariantForm(
      v
        ? {
            region_id: v.region_id,
            english_gloss: v.english_gloss,
            standard_igbo: v.standard_igbo,
            variant: v.variant,
            audio_url: v.audio_url ?? "",
            notes: v.notes ?? "",
            contributor: v.contributor ?? "",
            reviewed: v.reviewed,
          }
        : { ...variantForm, region_id: variantForm.region_id || regions?.[0]?.id || "", variant: "", audio_url: "", notes: "" }
    );
    setVariantOpen(true);
  };

  const openRegion = (r?: DialectRegion) => {
    setEditingRegion(r ?? null);
    setRegionForm(
      r
        ? {
            slug: r.slug,
            name: r.name,
            area: r.area,
            description: r.description ?? "",
            community_note: r.community_note ?? "",
            latitude: r.latitude,
            longitude: r.longitude,
            order_index: r.order_index,
          }
        : EMPTY_REGION
    );
    setRegionOpen(true);
  };

  const setV = <K extends keyof VariantForm>(k: K, v: VariantForm[K]) => setVariantForm((p) => ({ ...p, [k]: v }));
  const setR = <K extends keyof RegionForm>(k: K, v: RegionForm[K]) => setRegionForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="container mx-auto px-4 py-8 space-y-10">
      <div className="flex items-center gap-4">
        <Link to="/admin" className="brutal-button bg-card p-2">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold">Manage Dialects</h1>
          <p className="text-muted-foreground text-sm">Word variants by place, shown on the <Link to="/dialects" className="underline">Dialect Map</Link>.</p>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-bold">Word variants</h2>
          <Button className="brutal-button bg-secondary" onClick={() => openVariant()} disabled={!regions?.length}>
            <Plus size={18} className="mr-2" /> Add Variant
          </Button>
        </div>
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : variants && variants.length > 0 ? (
          <div className="brutal-card overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-muted border-b-3 border-foreground">
                <tr>
                  <th className="text-left p-4 font-display">Word</th>
                  <th className="text-left p-4 font-display">Place</th>
                  <th className="text-left p-4 font-display">Variant</th>
                  <th className="text-left p-4 font-display">Status</th>
                  <th className="text-right p-4 font-display">Actions</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.id} className="border-b border-muted last:border-0">
                    <td className="p-4">
                      <p className="font-semibold">{v.english_gloss}</p>
                      <p className="text-sm text-muted-foreground">{v.standard_igbo}</p>
                    </td>
                    <td className="p-4">{regionName(v.region_id)}</td>
                    <td className="p-4 font-display font-semibold">{v.variant}</td>
                    <td className="p-4 text-sm">
                      <span className="flex items-center gap-1">
                        {v.reviewed ? <CheckCircle2 size={14} className="text-green-600" /> : <CircleDashed size={14} className="text-amber-600" />}
                        {v.reviewed ? "Reviewed" : "Needs review"}
                      </span>
                      <span className="block text-muted-foreground">{v.audio_url ? "Has recording" : "No recording"}</span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => openVariant(v)} aria-label="Edit variant"><Pencil size={16} /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive" aria-label="Delete variant"><Trash2 size={16} /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="border-3 border-foreground">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this variant?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteVariant.mutate(v.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="brutal-card bg-muted p-6 text-sm text-muted-foreground">
            No variants yet. Add how speakers from a place say an everyday word or greeting, ideally with a recording of them saying it.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-bold">Places on the map</h2>
          <Button className="brutal-button bg-card" onClick={() => openRegion()}>
            <Plus size={18} className="mr-2" /> Add Place
          </Button>
        </div>
        <div className="brutal-card overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-muted border-b-3 border-foreground">
              <tr>
                <th className="text-left p-4 font-display">Place</th>
                <th className="text-left p-4 font-display">Area</th>
                <th className="text-left p-4 font-display">Description</th>
                <th className="text-right p-4 font-display">Actions</th>
              </tr>
            </thead>
            <tbody>
              {regions?.map((r) => (
                <tr key={r.id} className="border-b border-muted last:border-0 align-top">
                  <td className="p-4 font-display font-semibold">{r.name}</td>
                  <td className="p-4">{r.area}</td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {r.description}
                    {r.community_note && <span className="block mt-1 text-foreground">Note: {r.community_note}</span>}
                  </td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openRegion(r)} aria-label={`Edit ${r.name}`}><Pencil size={16} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={variantOpen} onOpenChange={(open) => { setVariantOpen(open); if (!open) setEditingVariant(null); }}>
        <DialogContent className="border-3 border-foreground max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editingVariant ? "Edit Variant" : "Add Variant"}</DialogTitle>
          </DialogHeader>
          <form
            ref={variantFormRef}
            onSubmit={(e) => { e.preventDefault(); saveVariant.mutate({ id: editingVariant?.id, data: variantForm }); }}
            className="space-y-4"
          >
            <IgboFocusPad containerRef={variantFormRef} />
            <div>
              <Label htmlFor="v_region">Place</Label>
              <select id="v_region" value={variantForm.region_id} onChange={(e) => setV("region_id", e.target.value)} required className={selectClass}>
                {regions?.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.area})</option>)}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="v_gloss">English meaning</Label>
                <Input id="v_gloss" value={variantForm.english_gloss} onChange={(e) => setV("english_gloss", e.target.value)} required className={fieldClass} placeholder="How are you?" />
              </div>
              <div>
                <Label htmlFor="v_standard">Standard Igbo</Label>
                <Input id="v_standard" value={variantForm.standard_igbo} onChange={(e) => setV("standard_igbo", e.target.value)} required className={fieldClass} placeholder="Kedu?" />
              </div>
            </div>
            <div>
              <Label htmlFor="v_variant">How it's said in this place</Label>
              <Input id="v_variant" value={variantForm.variant} onChange={(e) => setV("variant", e.target.value)} required className={fieldClass} />
            </div>
            <div>
              <Label htmlFor="v_audio">Recording URL (optional)</Label>
              <Input id="v_audio" value={variantForm.audio_url} onChange={(e) => setV("audio_url", e.target.value)} className={fieldClass} placeholder="A speaker from this place saying it" />
            </div>
            <div>
              <Label htmlFor="v_notes">Notes (optional)</Label>
              <Textarea id="v_notes" value={variantForm.notes} onChange={(e) => setV("notes", e.target.value)} className={fieldClass} rows={2} />
            </div>
            <div>
              <Label htmlFor="v_contributor">Contributed by (optional)</Label>
              <Input id="v_contributor" value={variantForm.contributor} onChange={(e) => setV("contributor", e.target.value)} className={fieldClass} />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input id="v_reviewed" type="checkbox" checked={variantForm.reviewed} onChange={(e) => setV("reviewed", e.target.checked)} className="h-4 w-4" />
              Confirmed by a speaker from this place
            </label>
            <Button type="submit" className="brutal-button bg-secondary w-full" disabled={saveVariant.isPending}>
              {editingVariant ? "Update" : "Add"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={regionOpen} onOpenChange={(open) => { setRegionOpen(open); if (!open) setEditingRegion(null); }}>
        <DialogContent className="border-3 border-foreground max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editingRegion ? `Edit ${editingRegion.name}` : "Add Place"}</DialogTitle>
          </DialogHeader>
          <form
            ref={regionFormRef}
            onSubmit={(e) => { e.preventDefault(); saveRegion.mutate({ id: editingRegion?.id, data: regionForm }); }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="r_name">Name</Label>
                <Input id="r_name" value={regionForm.name} onChange={(e) => setR("name", e.target.value)} required className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="r_area">Area</Label>
                <select id="r_area" value={regionForm.area} onChange={(e) => setR("area", e.target.value)} className={selectClass}>
                  {DIALECT_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="r_description">Description</Label>
              <Textarea id="r_description" value={regionForm.description} onChange={(e) => setR("description", e.target.value)} className={fieldClass} rows={2} />
            </div>
            <div>
              <Label htmlFor="r_note">Community note (optional)</Label>
              <Textarea id="r_note" value={regionForm.community_note} onChange={(e) => setR("community_note", e.target.value)} className={fieldClass} rows={2} placeholder="e.g. how the community describes its own language and identity" />
            </div>
            <div className="grid gap-4 grid-cols-3">
              <div>
                <Label htmlFor="r_lat">Latitude</Label>
                <Input id="r_lat" type="number" step="0.0001" value={regionForm.latitude} onChange={(e) => setR("latitude", parseFloat(e.target.value) || 0)} className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="r_lng">Longitude</Label>
                <Input id="r_lng" type="number" step="0.0001" value={regionForm.longitude} onChange={(e) => setR("longitude", parseFloat(e.target.value) || 0)} className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="r_order">Order</Label>
                <Input id="r_order" type="number" value={regionForm.order_index} onChange={(e) => setR("order_index", parseInt(e.target.value) || 0)} className={fieldClass} />
              </div>
            </div>
            <Button type="submit" className="brutal-button bg-secondary w-full" disabled={saveRegion.isPending}>
              {editingRegion ? "Update" : "Add"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
