import { useState } from "react";
import { Link } from "wouter";
import { Video, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface EmbedCardItem {
  id: number;
  title: string;
  embedCode: string;
  thumbnail?: string | null;
  folderName?: string | null;
  createdAt: string;
  source?: string | null;
}

interface EmbedCardProps {
  embed: EmbedCardItem;
  selectionMode?: boolean;
  selected?: boolean;
  showFolder?: boolean;
  onToggleSelect?: (id: number) => void;
}

export function EmbedCard({
  embed,
  selectionMode = false,
  selected = false,
  showFolder = true,
  onToggleSelect,
}: EmbedCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(embed.embedCode).then(() => {
      setCopied(true);
      toast({ title: "Copiado!", description: "Código de incorporação copiado." });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (selectionMode) {
      e.preventDefault();
      onToggleSelect?.(embed.id);
    }
  };

  return (
    <Link
      href={selectionMode ? "#" : `/embed/${embed.id}`}
      onClick={handleCardClick}
      data-testid={`card-embed-${embed.id}`}
    >
      <Card
        className={`cursor-pointer transition-colors overflow-hidden flex flex-col group h-full ${
          selectionMode && selected
            ? "ring-2 ring-primary border-primary"
            : "hover:border-primary"
        }`}
      >
        {/* Thumbnail */}
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

          {/* Hover overlay (normal mode) */}
          {!selectionMode && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded text-xs font-semibold">
                Ver
              </span>
            </div>
          )}

          {/* Copy button — always visible on hover in normal mode, hidden in select mode */}
          {!selectionMode && (
            <button
              onClick={handleCopy}
              data-testid={`button-copy-${embed.id}`}
              className="absolute bottom-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 hover:bg-background border border-border rounded p-1.5 shadow-sm"
              title="Copiar código de incorporação"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-foreground" />
              )}
            </button>
          )}

          {/* Selection checkbox */}
          {selectionMode && (
            <div className="absolute top-2 left-2 z-10 bg-background/80 rounded backdrop-blur-sm p-1">
              <Checkbox checked={selected} readOnly />
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className="p-2 md:p-3 flex-1 flex flex-col">
          <h3
            className="font-semibold text-xs md:text-sm line-clamp-2 flex-1"
            title={embed.title}
          >
            {embed.title}
          </h3>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            {showFolder ? (
              <span className="bg-secondary px-1.5 py-0.5 rounded text-[10px] truncate max-w-[80px] md:max-w-[100px]">
                {embed.folderName || "Sem pasta"}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">
                {embed.source || ""}
              </span>
            )}
            <span className="shrink-0">{format(new Date(embed.createdAt), "dd/MM")}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
