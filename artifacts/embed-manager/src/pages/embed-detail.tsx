import { useParams, useLocation } from "wouter";
import { useGetEmbed, useDeleteEmbed, getListEmbedsQueryKey, getGetStatsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, ExternalLink, Calendar, Folder as FolderIcon } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

export function EmbedDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const embedId = parseInt(id || "0", 10);
  const queryClient = useQueryClient();

  const { data: embed, isLoading } = useGetEmbed(embedId, {
    query: { enabled: !!embedId }
  });

  const deleteMutation = useDeleteEmbed({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEmbedsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        setLocation("/library");
      }
    }
  });

  if (isLoading || !embed) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="h-16 border-b flex items-center px-6 gap-4 shrink-0 bg-card">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-bold flex-1 truncate">{embed.title}</h1>
        <div className="flex items-center gap-2">
          {embed.url && (
            <Button variant="outline" size="sm" asChild>
              <a href={embed.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Original
              </a>
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate({ id: embedId })} disabled={deleteMutation.isPending}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-6 flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <div className="w-full aspect-video bg-black rounded-lg overflow-hidden shadow-lg border border-border flex items-center justify-center">
            {/* Using a wrapper div to contain the raw HTML safely in a real app, here we dangerouslySetInnerHTML */}
            <div 
              className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" 
              dangerouslySetInnerHTML={{ __html: embed.embedCode }} 
            />
          </div>
          
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4">Raw Code</h2>
            <pre className="bg-muted p-4 rounded text-sm text-muted-foreground overflow-x-auto">
              <code>{embed.embedCode}</code>
            </pre>
          </div>
        </div>

        <div className="w-full lg:w-80 shrink-0 space-y-6">
          <div className="bg-card border rounded-lg p-5 space-y-4">
            <h3 className="font-semibold border-b pb-2">Details</h3>
            
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                  <FolderIcon className="w-3 h-3" /> Folder
                </div>
                <div className="text-sm font-medium">
                  {embed.folderName || "Unorganized"}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3 h-3" /> Added
                </div>
                <div className="text-sm font-medium">
                  {format(new Date(embed.createdAt), 'PPP')}
                </div>
              </div>

              {embed.source && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Source</div>
                  <div className="text-sm font-medium capitalize">{embed.source}</div>
                </div>
              )}
            </div>
          </div>

          {embed.description && (
            <div className="bg-card border rounded-lg p-5">
              <h3 className="font-semibold border-b pb-2 mb-3">Description</h3>
              <p className="text-sm text-muted-foreground">{embed.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
