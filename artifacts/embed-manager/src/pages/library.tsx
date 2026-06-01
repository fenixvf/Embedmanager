import { useState } from "react";
import {
  useListEmbeds,
  useBulkDeleteEmbeds,
  useBulkMoveEmbeds,
  useListFolders,
  getListEmbedsQueryKey,
  getGetStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Video, Search, CheckSquare, Folder as FolderIcon, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CaptureFromUrlDialog } from "@/components/capture-from-url-dialog";
import { EmbedCard } from "@/components/embed-card";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function Library() {
  const { data: embeds, isLoading } = useListEmbeds({ unorganized: true });
  const [search, setSearch] = useState("");

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const bulkDeleteMutation = useBulkDeleteEmbeds();
  const bulkMoveMutation = useBulkMoveEmbeds();
  const { data: folders } = useListFolders();

  const filtered = embeds?.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    setSelectedIds(new Set());
  };

  const handleSelectAll = () => {
    if (!filtered) return;
    setSelectedIds(
      selectedIds.size === filtered.length
        ? new Set()
        : new Set(filtered.map((e) => e.id))
    );
  };

  const toggleItem = (id: number) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const handleBulkMove = async (folderId: number | null) => {
    try {
      await bulkMoveMutation.mutateAsync({ data: { ids: Array.from(selectedIds), folderId } });
      toast({ title: "Movidos com sucesso", description: `${selectedIds.size} embed(s) movido(s).` });
      queryClient.invalidateQueries({ queryKey: getListEmbedsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      setIsMoveDialogOpen(false);
      setSelectionMode(false);
      setSelectedIds(new Set());
    } catch {
      toast({ title: "Erro", description: "Não foi possível mover.", variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteMutation.mutateAsync({ data: { ids: Array.from(selectedIds) } });
      toast({ title: "Excluídos com sucesso", description: `${selectedIds.size} embed(s) excluído(s).` });
      queryClient.invalidateQueries({ queryKey: getListEmbedsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      setIsDeleteDialogOpen(false);
      setSelectionMode(false);
      setSelectedIds(new Set());
    } catch {
      toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b flex flex-col sm:flex-row sm:items-center px-4 md:px-6 py-3 md:py-0 md:h-16 gap-2 sm:gap-4 shrink-0 bg-card">
        <h1 className="text-lg md:text-xl font-bold flex-1">Sem pasta</h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-9 h-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search"
            />
          </div>
          {!selectionMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectionMode}
                data-testid="button-toggle-select"
                className="shrink-0"
              >
                <CheckSquare className="w-4 h-4 mr-1.5" />
                Selecionar
              </Button>
              <CaptureFromUrlDialog />
            </>
          ) : null}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectionMode && (
        <div className="border-b bg-muted/50 px-4 md:px-6 py-2 flex flex-wrap items-center gap-2 shrink-0">
          <span className="text-sm font-medium mr-auto">
            {selectedIds.size} selecionado(s)
          </span>
          <Button variant="outline" size="sm" onClick={handleSelectAll} data-testid="button-select-all">
            {selectedIds.size === filtered?.length && filtered?.length > 0 ? "Desmarcar tudo" : "Selecionar tudo"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMoveDialogOpen(true)}
            disabled={selectedIds.size === 0}
            data-testid="button-bulk-move"
          >
            <FolderIcon className="w-4 h-4 mr-1.5" />
            Mover
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={selectedIds.size === 0}
            data-testid="button-bulk-delete"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Excluir
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleSelectionMode} data-testid="button-cancel-select">
            Cancelar
          </Button>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-auto p-3 md:p-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-lg bg-muted animate-pulse aspect-video" />
            ))}
          </div>
        ) : filtered && filtered.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {filtered.map((embed) => (
              <EmbedCard
                key={embed.id}
                embed={embed}
                selectionMode={selectionMode}
                selected={selectedIds.has(embed.id)}
                showFolder
                onToggleSelect={toggleItem}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Video className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-base md:text-lg font-medium">Tudo organizado!</h3>
            <p className="text-muted-foreground text-sm max-w-xs mt-1">
              Nenhum embed sem pasta. Adicione novos ou mova os existentes para cá.
            </p>
          </div>
        )}
      </div>

      {/* Move dialog */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Mover {selectedIds.size} embed(s) para pasta</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-4 max-h-[60vh] overflow-y-auto">
            <Button
              variant="outline"
              className="justify-start font-normal"
              onClick={() => handleBulkMove(null)}
            >
              <FolderIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              Remover da pasta (Sem pasta)
            </Button>
            {folders?.map((folder) => (
              <Button
                key={folder.id}
                variant="outline"
                className="justify-start font-normal"
                onClick={() => handleBulkMove(folder.id)}
              >
                <FolderIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                {folder.name}
                <span className="ml-auto text-xs text-muted-foreground">{folder.embedCount}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Excluir {selectedIds.size} embed(s)?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
