import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useListFolders, useGetStats } from "@workspace/api-client-react";
import { LayoutDashboard, Library, Folder, Video, Settings, Plus, FolderPlus, FolderOpen } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { data: folders } = useListFolders();
  const { data: stats } = useGetStats();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-64 border-r bg-sidebar flex flex-col">
        <div className="p-4 border-b h-16 flex items-center shrink-0">
          <div className="flex items-center gap-2 text-primary font-bold text-lg tracking-tight">
            <Video className="w-6 h-6" />
            <span>Embed.Manager</span>
          </div>
        </div>
        
        <ScrollArea className="flex-1 px-3 py-4">
          <div className="space-y-1 mb-8">
            <Link href="/">
              <div className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${location === "/" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}>
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </div>
            </Link>
            <Link href="/library">
              <div className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${location === "/library" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}>
                <Library className="w-4 h-4" />
                Library
                {stats?.unorganizedCount ? (
                  <span className="ml-auto bg-muted px-1.5 py-0.5 rounded text-[10px] text-muted-foreground">{stats.unorganizedCount} new</span>
                ) : null}
              </div>
            </Link>
          </div>

          <div className="mb-2 px-3 flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Folders</span>
          </div>
          <div className="space-y-0.5">
            {folders?.map((folder) => (
              <Link key={folder.id} href={`/folder/${folder.id}`}>
                <div className={`group flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors cursor-pointer ${location === `/folder/${folder.id}` ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}>
                  <Folder className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="truncate">{folder.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{folder.embedCount}</span>
                </div>
              </Link>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t shrink-0">
          <div className="bg-card border rounded-lg p-3 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground mb-1">Library Stats</p>
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold">{stats?.totalEmbeds || 0}</span>
              <span className="text-xs text-muted-foreground">Total Embeds</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
