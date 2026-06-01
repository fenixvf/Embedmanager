import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  useListFolders,
  useGetStats,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
  getListFoldersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Library,
  Folder,
  Video,
  Menu,
  X,
  Plus,
  Pencil,
  Trash2,
  Check,
} from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { useToast } from "@/hooks/use-toast";

// ─── Sidebar ────────────────────────────────────────────────────────────────
// Defined OUTSIDE Layout so it is never re-created on parent re-renders,
// which would unmount inputs and close the mobile keyboard mid-typing.

interface SidebarContentProps {
  onClose: () => void;
  deletingId: number | null;
  setDeletingId: (id: number | null) => void;
}

function SidebarContent({ onClose, deletingId, setDeletingId }: SidebarContentProps) {
  const [location] = useLocation();
  const { data: folders } = useListFolders();
  const { data: stats } = useGetStats();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const createRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  const createMutation = useCreateFolder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFoldersQueryKey() });
        setIsCreating(false);
        setNewName("");
        toast({ title: "Pasta criada" });
      },
    },
  });

  const updateMutation = useUpdateFolder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFoldersQueryKey() });
        setEditingId(null);
        setEditName("");
        toast({ title: "Pasta renomeada" });
      },
    },
  });

  useEffect(() => {
    if (isCreating) {
      // Delay so the element has time to mount before focusing
      const t = setTimeout(() => createRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [isCreating]);

  useEffect(() => {
    if (editingId !== null) {
      const t = setTimeout(() => editRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [editingId]);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    createMutation.mutate({ data: { name } });
  };

  const handleRename = (id: number) => {
    const name = editName.trim();
    if (!name) return;
    updateMutation.mutate({ id, data: { name } });
  };

  const startEdit = (id: number, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const navLinkClass = (path: string) =>
    `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
      location === path
        ? "bg-sidebar-accent text-sidebar-accent-foreground"
        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    }`;

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b h-16 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-primary font-bold text-lg tracking-tight">
          <Video className="w-6 h-6" />
          <span>Embed.Manager</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onClose}
          data-testid="button-close-sidebar"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        {/* Nav links */}
        <div className="space-y-1 mb-6">
          <Link href="/">
            <div className={navLinkClass("/")} onClick={onClose} data-testid="link-dashboard">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </div>
          </Link>
          <Link href="/library">
            <div className={navLinkClass("/library")} onClick={onClose} data-testid="link-library">
              <Library className="w-4 h-4" />
              Library
              {stats?.unorganizedCount ? (
                <span className="ml-auto bg-muted px-1.5 py-0.5 rounded text-[10px] text-muted-foreground">
                  {stats.unorganizedCount} new
                </span>
              ) : null}
            </div>
          </Link>
        </div>

        {/* Folders heading */}
        <div className="mb-2 px-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Pastas
          </span>
          <button
            onClick={() => { setIsCreating(true); setNewName(""); }}
            className="p-1 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-primary transition-colors"
            title="Nova pasta"
            data-testid="button-new-folder"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-0.5">
          {/* New folder inline input */}
          {isCreating && (
            <div className="flex items-center gap-1 px-2 py-1">
              <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input
                ref={createRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setIsCreating(false);
                }}
                placeholder="Nome da pasta"
                className="h-8 text-sm px-2 bg-background"
                data-testid="input-new-folder"
                autoComplete="off"
                inputMode="text"
              />
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="p-1.5 rounded hover:bg-primary/20 text-primary shrink-0"
                data-testid="button-confirm-create"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className="p-1.5 rounded hover:bg-muted text-muted-foreground shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Folder rows */}
          {folders?.map((folder) => (
            <div
              key={folder.id}
              className={`group flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                location === `/folder/${folder.id}`
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              {editingId === folder.id ? (
                <>
                  <Folder className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <Input
                    ref={editRef}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(folder.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="h-8 text-sm px-2 bg-background flex-1 min-w-0"
                    data-testid={`input-rename-${folder.id}`}
                    autoComplete="off"
                    inputMode="text"
                  />
                  <button
                    onClick={() => handleRename(folder.id)}
                    disabled={updateMutation.isPending}
                    className="p-1.5 rounded hover:bg-primary/20 text-primary shrink-0"
                    data-testid={`button-confirm-rename-${folder.id}`}
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href={`/folder/${folder.id}`}
                    className="flex items-center gap-2 flex-1 min-w-0"
                    onClick={onClose}
                    data-testid={`link-folder-${folder.id}`}
                  >
                    <Folder className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    <span className="truncate">{folder.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">
                      {folder.embedCount}
                    </span>
                  </Link>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                    <button
                      onClick={(e) => { e.preventDefault(); startEdit(folder.id, folder.name); }}
                      className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary"
                      title="Renomear"
                      data-testid={`button-rename-${folder.id}`}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); setDeletingId(folder.id); }}
                      className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                      title="Excluir"
                      data-testid={`button-delete-folder-${folder.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {folders?.length === 0 && !isCreating && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Nenhuma pasta. Clique em + para criar.
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Stats footer */}
      <div className="p-4 border-t shrink-0">
        <div className="bg-card border rounded-lg p-3 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground mb-1">Biblioteca</p>
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-bold">{stats?.totalEmbeds || 0}</span>
            <span className="text-xs text-muted-foreground">embeds no total</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Layout ─────────────────────────────────────────────────────────────────

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: folders } = useListFolders();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deletingFolder = folders?.find((f) => f.id === deletingId);

  const deleteMutation = useDeleteFolder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFoldersQueryKey() });
        setDeletingId(null);
        toast({ title: "Pasta excluída" });
      },
    },
  });

  const handleDelete = () => {
    if (deletingId == null) return;
    deleteMutation.mutate({ id: deletingId });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 border-r bg-sidebar flex-col shrink-0">
        <SidebarContent
          onClose={() => setSidebarOpen(false)}
          deletingId={deletingId}
          setDeletingId={setDeletingId}
        />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r flex flex-col transition-transform duration-300 lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent
          onClose={() => setSidebarOpen(false)}
          deletingId={deletingId}
          setDeletingId={setDeletingId}
        />
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden h-14 border-b bg-card flex items-center px-4 gap-3 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            data-testid="button-open-sidebar"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 text-primary font-bold text-base tracking-tight">
            <Video className="w-5 h-5" />
            <span>Embed.Manager</span>
          </div>
        </div>

        {children}
      </main>

      {/* Delete folder confirm dialog */}
      <Dialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Excluir pasta "{deletingFolder?.name}"?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Os vídeos dentro da pasta não serão excluídos — eles passarão para "Sem pasta".
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-folder"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
