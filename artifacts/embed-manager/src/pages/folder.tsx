import { useState } from "react";
import { 
  useListEmbeds, 
  useGetFolder,
  useBulkDeleteEmbeds,
  useBulkMoveEmbeds,
  useListFolders,
  getListEmbedsQueryKey,
  getGetStatsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Video, Search, CheckSquare, Folder as FolderIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CaptureFromUrlDialog } from "@/components/capture-from-url-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function FolderView() {
  const { id } = useParams();
  const folderId = parseInt(id || "0", 10);

  const { data: folder } = useGetFolder(folderId, {
    query: { enabled: !!folderId },
  });

  const { data: embeds, isLoading } = useListEmbeds(
    { folderId },
    { query: { enabled: !!folderId } }
  );

  const [search, setSearch] = useState("");
  const filtered = embeds?.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  // Bulk action dialogs
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const bulkDeleteMutation = useBulkDeleteEmbeds();
  const bulkMoveMutation = useBulkMoveEmbeds();
  const { data: folders } = useListFolders();

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedIds(new Set());
    }
  };

  const handleSelectAll = () => {
    if (!filtered) return;
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(e => e.id)));
    }
  };

  const toggleItemSelection = (itemId: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedIds(newSelected);
  };

  const handleCardClick = (e: React.MouseEvent, itemId: number) => {
    if (selectionMode) {
      e.preventDefault();
      toggleItemSelection(itemId);
    }
  };

  const handleBulkMove = async (targetFolderId: number | null) => {
    try {
      await bulkMoveMutation.mutateAsync({
        data: {
          ids: Array.from(selectedIds),
          folderId: targetFolderId
        }
      });
      toast({
        title: "Success",
        description: `Moved ${selectedIds.size} embed(s) successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: getListEmbedsQueryKey() });
      setIsMoveDialogOpen(false);
      setSelectionMode(false);
      setSelectedIds(new Set());
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to move embeds.",
        variant: "destructive"
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteMutation.mutateAsync({
        data: {
          ids: Array.from(selectedIds)
        }
      });
      toast({
        title: "Success",
        description: `Deleted ${selectedIds.size} embed(s) successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: getListEmbedsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      setIsDeleteDialogOpen(false);
      setSelectionMode(false);
      setSelectedIds(new Set());
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete embeds.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      <div className="border-b flex flex-col sm:flex-row sm:items-center px-4 md:px-6 py-3 md:py-0 md:h-16 gap-2 sm:gap-4 shrink-0 bg-card">
        <h1 className="text-lg md:text-xl font-bold flex-1 truncate">
          {folder?.name || "Folder"}
        </h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search folder..."
              className="pl-9 h-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-folder"
            />
          </div>
          {!selectionMode && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleSelectionMode}
                data-testid="button-toggle-select"
                className="shrink-0"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Select
              </Button>
              <CaptureFromUrlDialog />
            </>
          )}
        </div>
      </div>

      {selectionMode && (
        <div className="border-b bg-muted/50 px-4 md:px-6 py-2 flex items-center justify-between sticky top-0 z-10">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll} data-testid="button-select-all">
              {selectedIds.size === filtered?.length && filtered?.length > 0 ? "Deselect All" : "Select All"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsMoveDialogOpen(true)}
              disabled={selectedIds.size === 0}
              data-testid="button-bulk-move"
            >
              <FolderIcon className="w-4 h-4 mr-2" />
              Move
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={selectedIds.size === 0}
              data-testid="button-bulk-delete"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <div className="w-px h-6 bg-border mx-2" />
            <Button variant="ghost" size="sm" onClick={toggleSelectionMode} data-testid="button-cancel-select">
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-3 md:p-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg bg-muted animate-pulse aspect-video" />
            ))}
          </div>
        ) : filtered && filtered.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {filtered.map((embed) => (
              <Link 
                key={embed.id} 
                href={selectionMode ? "#" : `/embed/${embed.id}`}
                onClick={(e) => handleCardClick(e, embed.id)}
              >
                <Card
                  className={`cursor-pointer transition-colors overflow-hidden flex flex-col group h-full ${
                    selectionMode && selectedIds.has(embed.id) ? 'ring-2 ring-primary border-primary' : 'hover:border-primary'
                  }`}
                  data-testid={`card-embed-${embed.id}`}
                >
                  <div className="aspect-video bg-muted relative">
                    {embed.thumbnail ? (
                      <img
                        src={embed.thumbnail}
                        alt={embed.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Video className="w-6 h-6 md:w-8 md:h-8 opacity-50" />
                      </div>
                    )}
                    
                    {!selectionMode && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-primary text-primary-foreground px-3 py-1 rounded text-xs font-semibold">
                          View
                        </span>
                      </div>
                    )}

                    {selectionMode && (
                      <div className="absolute top-2 left-2 z-10 bg-background/80 rounded backdrop-blur-sm p-1">
                        <Checkbox 
                          checked={selectedIds.has(embed.id)}
                          readOnly
                        />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-2 md:p-3 flex-1 flex flex-col">
                    <h3
                      className="font-semibold text-xs md:text-sm line-clamp-2 flex-1"
                      title={embed.title}
                    >
                      {embed.title}
                    </h3>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span className="shrink-0">{format(new Date(embed.createdAt), "MMM d")}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <h3 className="text-base md:text-lg font-medium">Empty Folder</h3>
            <p className="text-muted-foreground text-sm max-w-xs mt-1">
              This folder doesn't contain any embeds yet.
            </p>
          </div>
        )}
      </div>

      {/* Move Dialog */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Move {selectedIds.size} embed(s) to folder</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-4 max-h-[60vh] overflow-y-auto">
            <Button 
              variant="outline" 
              className="justify-start font-normal" 
              onClick={() => handleBulkMove(null)}
            >
              <FolderIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              Remove from folder (Unorganized)
            </Button>
            {folders?.map((f) => (
              <Button 
                key={f.id}
                variant="outline" 
                className="justify-start font-normal" 
                onClick={() => handleBulkMove(f.id)}
              >
                <FolderIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                {f.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} embed(s)?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete the selected embeds? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleteMutation.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
