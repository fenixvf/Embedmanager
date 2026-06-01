import { useState } from "react";
import { useListEmbeds } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Video, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function Library() {
  const { data: embeds, isLoading } = useListEmbeds();
  const [search, setSearch] = useState("");

  const filtered = embeds?.filter(e => e.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="h-16 border-b flex items-center px-6 gap-4 shrink-0 bg-card">
        <h1 className="text-xl font-bold flex-1">All Embeds</h1>
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search..." 
            className="pl-9 h-9 bg-background"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div>Loading...</div>
        ) : filtered && filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(embed => (
              <Link key={embed.id} href={`/embed/${embed.id}`}>
                <Card className="cursor-pointer hover:border-primary transition-colors overflow-hidden flex flex-col group h-full">
                  <div className="aspect-video bg-muted relative">
                    {embed.thumbnail ? (
                      <img src={embed.thumbnail} alt={embed.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Video className="w-8 h-8 opacity-50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-primary text-primary-foreground px-3 py-1 rounded text-xs font-semibold">View</span>
                    </div>
                  </div>
                  <CardContent className="p-3 flex-1 flex flex-col">
                    <h3 className="font-semibold text-sm line-clamp-2 flex-1" title={embed.title}>{embed.title}</h3>
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <span className="bg-secondary px-1.5 py-0.5 rounded text-[10px] truncate max-w-[100px]">
                        {embed.folderName || "Unorganized"}
                      </span>
                      <span>{format(new Date(embed.createdAt), 'MMM d')}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Video className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No embeds found</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1">Try adjusting your search or add some new embeds to your library.</p>
          </div>
        )}
      </div>
    </div>
  );
}
