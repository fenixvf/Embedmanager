import { useGetStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Video, FolderOpen, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export function Dashboard() {
  const { data: stats, isLoading } = useGetStats();

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex-1 overflow-auto bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">Your embed library at a glance.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Embeds</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalEmbeds || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Folders</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalFolders || 0}</div>
            </CardContent>
          </Card>
          <Card>
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
          <h2 className="text-xl font-bold tracking-tight mb-4">Recent Additions</h2>
          {stats?.recentEmbeds && stats.recentEmbeds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.recentEmbeds.map(embed => (
                <Link key={embed.id} href={`/embed/${embed.id}`}>
                  <Card className="cursor-pointer hover:border-primary transition-colors overflow-hidden flex flex-col">
                    <div className="aspect-video bg-muted relative">
                      {embed.thumbnail ? (
                        <img src={embed.thumbnail} alt={embed.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Video className="w-8 h-8 opacity-50" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm truncate" title={embed.title}>{embed.title}</h3>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span className="truncate">{embed.source || "Unknown Source"}</span>
                        <span>•</span>
                        <span>{format(new Date(embed.createdAt), 'MMM d')}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 border border-dashed rounded-lg">
              <p className="text-muted-foreground">No recent embeds found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
