import { useState } from "react";
import { 
  useExtractEmbeds, 
  useCreateEmbed, 
  useListFolders,
  getListEmbedsQueryKey,
  getGetStatsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link2, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CaptureFromUrlDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [extractResult, setExtractResult] = useState<any>(null);
  
  // State for step 2
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [editedTitles, setEditedTitles] = useState<Record<number, string>>({});
  const [selectedFolders, setSelectedFolders] = useState<Record<number, number | null>>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: folders } = useListFolders();
  
  const extractMutation = useExtractEmbeds();
  const createMutation = useCreateEmbed();

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setTimeout(() => {
        setStep(1);
        setUrl("");
        setError(null);
        setExtractResult(null);
        setSelectedIndices(new Set());
        setEditedTitles({});
        setSelectedFolders({});
      }, 200);
    }
  };

  const handleFetch = async () => {
    if (!url) return;
    setError(null);
    try {
      const result = await extractMutation.mutateAsync({ data: { url } });
      setExtractResult(result);
      
      const newSelected = new Set<number>();
      const newTitles: Record<number, string> = {};
      if (result.embeds && result.embeds.length > 0) {
        result.embeds.forEach((embed: any, index: number) => {
          newSelected.add(index);
          newTitles[index] = embed.title || `Embed ${index + 1}`;
        });
      }
      setSelectedIndices(newSelected);
      setEditedTitles(newTitles);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Failed to extract embeds. Please check the URL and try again.");
    }
  };

  const handleSave = async () => {
    if (!extractResult?.embeds) return;
    
    let successCount = 0;
    
    for (const index of Array.from(selectedIndices)) {
      const embed = extractResult.embeds[index];
      try {
        await createMutation.mutateAsync({
          data: {
            title: editedTitles[index],
            url: embed.url,
            embedCode: embed.embedCode,
            folderId: selectedFolders[index] || null,
          }
        });
        successCount++;
      } catch (err) {
        console.error("Failed to save embed", err);
      }
    }
    
    if (successCount > 0) {
      toast({
        title: "Success",
        description: `Saved ${successCount} embed(s) successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: getListEmbedsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      setOpen(false);
    } else {
      toast({
        title: "Error",
        description: "Failed to save selected embeds.",
        variant: "destructive"
      });
    }
  };

  const toggleSelection = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Link2 className="w-4 h-4" />
          Capture from URL
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Capture Embeds from URL" : `Found ${extractResult?.embeds?.length || 0} embed(s) on ${extractResult?.pageTitle || extractResult?.url || url}`}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="url">Webpage URL</Label>
              <Input
                id="url"
                placeholder="https://example.com/page-with-embeds"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                data-testid="input-capture-url"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleFetch();
                }}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="flex justify-end mt-4">
              <Button 
                onClick={handleFetch} 
                disabled={!url || extractMutation.isPending}
                data-testid="button-fetch-url"
              >
                {extractMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  "Fetch"
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4 py-2 flex-1 overflow-hidden">
            {(!extractResult?.embeds || extractResult.embeds.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
                <p className="text-muted-foreground">No embeds found on this page.</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Try another URL
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                  {extractResult.embeds.map((embed: any, index: number) => (
                    <div key={index} className="flex gap-3 p-3 border rounded-lg bg-card relative">
                      <div className="pt-1">
                        <Checkbox 
                          checked={selectedIndices.has(index)}
                          onCheckedChange={() => toggleSelection(index)}
                          data-testid={`checkbox-embed-${index}`}
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-2 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <Input 
                            value={editedTitles[index] || ""}
                            onChange={(e) => setEditedTitles({ ...editedTitles, [index]: e.target.value })}
                            className="h-8 text-sm font-medium"
                            data-testid={`input-embed-title-${index}`}
                          />
                          <Badge variant="secondary" className="shrink-0">{embed.source || "Embed"}</Badge>
                        </div>
                        <div className="bg-muted p-1.5 rounded text-xs font-mono text-muted-foreground truncate">
                          {embed.embedCode}
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground shrink-0">Folder:</Label>
                          <select 
                            className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedFolders[index] || ""}
                            onChange={(e) => setSelectedFolders({ ...selectedFolders, [index]: e.target.value ? parseInt(e.target.value, 10) : null })}
                          >
                            <option value="">No folder</option>
                            {folders?.map(f => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t mt-auto">
                  <Button variant="ghost" onClick={() => setStep(1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={selectedIndices.size === 0 || createMutation.isPending}
                    data-testid="button-save-embeds"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      `Save Selected (${selectedIndices.size})`
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
