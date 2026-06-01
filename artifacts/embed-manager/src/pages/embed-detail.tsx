import { useParams, useLocation } from "wouter";
import {
  useGetEmbed,
  useDeleteEmbed,
  getListEmbedsQueryKey,
  getGetStatsQueryKey,
  getGetEmbedQueryKey,
} from "@workspace/api-client-react";
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
    query: { enabled: !!embedId, queryKey: getGetEmbedQueryKey(embedId) },
  });

  const deleteMutation = useDeleteEmbed({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEmbedsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        setLocation("/library");
      },
    },
  });

  if (isLoading || !embed) {
    return (
      <div className="flex-1 p-4 md:p-6 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="aspect-video bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b flex items-center px-3 md:px-6 py-2 md:py-0 md:h-16 gap-2 md:gap-4 shrink-0 bg-card">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
          data-testid="button-back"
          className="shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-sm md:text-xl font-bold flex-1 truncate min-w-0">{embed.title}</h1>
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          {embed.url && (
            <Button variant="outline" size="sm" asChild className="hidden sm:flex">
              <a
                href={embed.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
                data-testid="link-original"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden md:inline">Original</span>
              </a>
            </Button>
          )}
          {embed.url && (
            <Button variant="outline" size="icon" asChild className="sm:hidden">
              <a
                href={embed.url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-original-mobile"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteMutation.mutate({ id: embedId })}
            disabled={deleteMutation.isPending}
            data-testid="button-delete"
            className="h-8 md:h-9"
          >
            <Trash2 className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Delete</span>
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-3 md:p-6 flex flex-col lg:flex-row gap-4 md:gap-6">
        {/* Player + Code */}
        <div className="flex-1 min-w-0 space-y-4 md:space-y-6">
          <div className="w-full aspect-video bg-black rounded-lg overflow-hidden shadow-lg border border-border flex items-center justify-center">
            <div
              className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full"
              dangerouslySetInnerHTML={{ __html: embed.embedCode }}
              data-testid="embed-player"
            />
          </div>

          <div className="bg-card border rounded-lg p-4 md:p-6">
            <h2 className="text-base md:text-lg font-bold mb-3">Raw Code</h2>
            <pre className="bg-muted p-3 md:p-4 rounded text-xs md:text-sm text-muted-foreground overflow-x-auto">
              <code>{embed.embedCode}</code>
            </pre>
          </div>
        </div>

        {/* Details sidebar */}
        <div className="w-full lg:w-80 shrink-0 space-y-4 md:space-y-6">
          <div className="bg-card border rounded-lg p-4 md:p-5 space-y-4">
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
                  {format(new Date(embed.createdAt), "PPP")}
                </div>
              </div>

              {embed.source && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Source</div>
                  <div className="text-sm font-medium capitalize">{embed.source}</div>
                </div>
              )}

              {embed.url && (
                <div className="sm:hidden pt-1">
                  <a
                    href={embed.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline underline-offset-2 break-all"
                    data-testid="link-original-details"
                  >
                    {embed.url}
                  </a>
                </div>
              )}
            </div>
          </div>

          {embed.description && (
            <div className="bg-card border rounded-lg p-4 md:p-5">
              <h3 className="font-semibold border-b pb-2 mb-3">Description</h3>
              <p className="text-sm text-muted-foreground">{embed.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
