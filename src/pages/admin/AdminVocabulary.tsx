import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getWords, type IgboApiWord } from "@/lib/igboApi";

/** API may return definitions as string[] or as object[] (e.g. { wordClass, definitions, nsibidi }). Return a single string for display/import. */
function firstDefinitionString(definitions: unknown): string {
  if (!Array.isArray(definitions) || definitions.length === 0) return "";
  const first = definitions[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && Array.isArray((first as { definitions?: string[] }).definitions))
    return (first as { definitions: string[] }).definitions[0] ?? "";
  if (first && typeof first === "object" && typeof (first as { definition?: string }).definition === "string")
    return (first as { definition: string }).definition;
  return "";
}
import { Checkbox } from "@/components/ui/checkbox";
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
  dialect: string | null;
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
    dialect: "",
  });

  // Import from Igbo API
  const [importKeyword, setImportKeyword] = useState("");
  const [importResults, setImportResults] = useState<IgboApiWord[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [selectedApiWordIds, setSelectedApiWordIds] = useState<Set<string>>(new Set());
  const [importCategoryId, setImportCategoryId] = useState("");

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
        dialect: data.dialect || null,
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
        dialect: data.dialect || null,
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

  const resetForm = () => setFormData({ igbo_word: "", english_translation: "", category_id: "", example_sentence_igbo: "", example_sentence_english: "", cultural_note: "", dialect: "" });

  const handleEdit = (word: VocabWord) => {
    setEditingWord(word);
    setFormData({
      igbo_word: word.igbo_word,
      english_translation: word.english_translation,
      category_id: word.category_id,
      example_sentence_igbo: word.example_sentence_igbo || "",
      example_sentence_english: word.example_sentence_english || "",
      cultural_note: word.cultural_note || "",
      dialect: word.dialect || "",
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

  const handleImportSearch = async () => {
    const kw = importKeyword.trim();
    if (!kw) return;
    setImportLoading(true);
    setImportError(null);
    const { words: results, error } = await getWords({ keyword: kw, examples: "true" });
    setImportLoading(false);
    if (error) {
      setImportError(error);
      setImportResults([]);
    } else {
      setImportResults(results ?? []);
      setSelectedApiWordIds(new Set());
    }
  };

  const toggleApiWordSelection = (id: string) => {
    setSelectedApiWordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!importCategoryId || selectedApiWordIds.size === 0) throw new Error("Select a category and at least one word");
      const toInsert = importResults
        .filter((w) => selectedApiWordIds.has(w.id))
        .map((w) => {
          const firstExample = w.examples?.[0];
          const dialectStr = Array.isArray(w.dialects) && w.dialects[0]?.dialects?.length
            ? w.dialects[0].dialects.join(", ")
            : null;
          return {
            igbo_word: w.word,
            english_translation: firstDefinitionString(w.definitions),
            category_id: importCategoryId,
            example_sentence_igbo: firstExample?.igbo ?? null,
            example_sentence_english: firstExample?.english ?? null,
            cultural_note: null,
            dialect: dialectStr,
          };
        });
      const { error } = await supabase.from("vocabulary").insert(toInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminVocabulary"] });
      setSelectedApiWordIds(new Set());
      setImportResults([]);
      toast({ title: "Words imported successfully" });
    },
    onError: (e) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });

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
              <div>
                <Label htmlFor="dialect">Dialect (optional)</Label>
                <Input id="dialect" value={formData.dialect} onChange={(e) => setFormData({ ...formData, dialect: e.target.value })} className="border-2 border-foreground" placeholder="e.g., Standard Igbo" />
              </div>
              <Button type="submit" className="brutal-button bg-secondary w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingWord ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Import from Igbo API */}
      <div className="brutal-card bg-card p-6 mb-8 max-w-3xl">
        <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
          <Download size={20} />
          Import from Igbo API
        </h2>
        <p className="text-muted-foreground text-sm mb-4">
          Search the Igbo API and add words to your vocabulary with a category. They will appear in By category and in practice.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <Input
            placeholder="Search (e.g. ụlọ, house)"
            value={importKeyword}
            onChange={(e) => setImportKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleImportSearch()}
            className="flex-1 min-w-[200px] border-2 border-foreground"
          />
          <Button onClick={handleImportSearch} disabled={importLoading} className="border-2 border-foreground shadow-brutal-sm">
            <Search size={18} className="mr-2" />
            Search
          </Button>
        </div>
        {importError && (
          <p className="text-destructive text-sm mb-4">{importError}</p>
        )}
        {importResults.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <Label className="text-sm">Category for import:</Label>
              <Select value={importCategoryId} onValueChange={setImportCategoryId}>
                <SelectTrigger className="w-[200px] border-2 border-foreground">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => importMutation.mutate()}
                disabled={!importCategoryId || selectedApiWordIds.size === 0 || importMutation.isPending}
                className="brutal-button bg-secondary"
              >
                Import {selectedApiWordIds.size} selected
              </Button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 border-2 border-foreground/20 rounded-lg p-3">
              {importResults.map((w) => (
                <label key={w.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer">
                  <Checkbox
                    checked={selectedApiWordIds.has(w.id)}
                    onCheckedChange={() => toggleApiWordSelection(w.id)}
                  />
                  <span className="font-display font-semibold">{w.word}</span>
                  <span className="text-muted-foreground text-sm truncate flex-1">
                    {firstDefinitionString(w.definitions)}
                  </span>
                </label>
              ))}
            </div>
          </>
        )}
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
                <th className="text-left p-4 font-display">Dialect</th>
                <th className="text-right p-4 font-display">Actions</th>
              </tr>
            </thead>
            <tbody>
              {words?.map((word) => (
                <tr key={word.id} className="border-b border-muted last:border-0">
                  <td className="p-4 font-display font-semibold">{word.igbo_word}</td>
                  <td className="p-4 text-muted-foreground">{word.english_translation}</td>
                  <td className="p-4">{getCategoryName(word.category_id)}</td>
                  <td className="p-4 text-muted-foreground text-sm">{word.dialect ?? "—"}</td>
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
