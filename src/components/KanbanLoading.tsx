import { Loader2 } from "lucide-react";

export function KanbanLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] w-full">
      <div className="glass-strong rounded-2xl px-10 py-12 flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
          <Loader2 className="h-10 w-10 text-primary animate-spin relative" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-lg font-medium text-foreground">Carregando negociações</p>
          <p className="text-sm text-muted-foreground">Organizando seu funil...</p>
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-primary/60 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
