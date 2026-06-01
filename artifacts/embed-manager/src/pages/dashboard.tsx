import { useGetStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Video, FolderOpen, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export function Dashboard() {
  const { data: stats, isLoading } = useGetStats();

  if (isLoading) {
    return (
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-8 w-40 bg-muted animate-pulse rounded" />
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm">Your embed library at a glance.</p>
        </div>

        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-3">
          <Card data-testid="stat-total-embeds">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Embeds</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalEmbeds || 0}</div>
            </CardContent>
          </Card>
          <Card data-testid="stat-total-folders">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Folders</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalFolders || 0}</div>
            </CardContent>
          </Card>
          <Card data-testid="stat-unorganized">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unorganized</CardTitle>
              <AlertCircle className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats?.unorganizedCount || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-lg md:text-xl font-bold tracking-tight mb-4">Recent Additions</h2>
          {stats?.recentEmbeds && stats.recentEmbeds.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {stats.recentEmbeds.map((embed) => (
                <Link key={embed.id} href={`/embed/${embed.id}`}>
                  <Card
                    className="cursor-pointer hover:border-primary transition-colors overflow-hidden flex flex-col"
                    data-testid={`card-embed-${embed.id}`}
                  >
                    <div className="aspect-video bg-muted relative">
                      {embed.thumbnail ? (
                        <img
                          src={embed.thumbnail}
                          alt={embed.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Video className="w-6 h-6 md:w-8 md:h-8 opacity-50" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-2 md:p-4">
                      <h3
                        className="font-semibold text-xs md:text-sm truncate"
                        title={embed.title}
                      >
                        {embed.title}
                      </h3>
                      <div className="flex items-center gap-1 md:gap-2 mt-1 md:mt-2 text-xs text-muted-foreground">
                        <span className="truncate">{embed.source || "Unknown"}</span>
                        <span>•</span>
                        <span className="shrink-0">{format(new Date(embed.createdAt), "MMM d")}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 border border-dashed rounded-lg">
              <p className="text-muted-foreground text-sm">No recent embeds found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
