import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useListFolders, useGetStats } from "@workspace/api-client-react";
import { LayoutDashboard, Library, Folder, Video, Menu, X } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: folders } = useListFolders();
  const { data: stats } = useGetStats();

  const navLinkClass = (path: string) =>
    `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
      location === path
        ? "bg-sidebar-accent text-sidebar-accent-foreground"
        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    }`;

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b h-16 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-primary font-bold text-lg tracking-tight">
          <Video className="w-6 h-6" />
          <span>Embed.Manager</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="button-close-sidebar"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1 mb-8">
          <Link href="/">
            <div
              className={navLinkClass("/")}
              onClick={() => setSidebarOpen(false)}
              data-testid="link-dashboard"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </div>
          </Link>
          <Link href="/library">
            <div
              className={navLinkClass("/library")}
              onClick={() => setSidebarOpen(false)}
              data-testid="link-library"
            >
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

        <div className="mb-2 px-3 flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Folders</span>
        </div>
        <div className="space-y-0.5">
          {folders?.map((folder) => (
            <Link key={folder.id} href={`/folder/${folder.id}`}>
              <div
                className={`group flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors cursor-pointer ${
                  location === `/folder/${folder.id}`
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
                onClick={() => setSidebarOpen(false)}
                data-testid={`link-folder-${folder.id}`}
              >
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
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 border-r bg-sidebar flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r flex flex-col transition-transform duration-300 lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
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
    </div>
  );
}
