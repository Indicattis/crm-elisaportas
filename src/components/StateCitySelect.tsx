import { useState } from "react";
import { BRAZILIAN_STATES, CITIES_BY_STATE } from "@/data/brazilian-cities";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem, CommandGroup } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StateCitySelectProps {
  state: string;
  city: string;
  onStateChange: (value: string) => void;
  onCityChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function StateCitySelect({ state, city, onStateChange, onCityChange, disabled, compact }: StateCitySelectProps) {
  const [cityOpen, setCityOpen] = useState(false);

  const cities = state ? (CITIES_BY_STATE[state] || []) : [];

  const handleStateChange = (value: string) => {
    onStateChange(value === "__clear__" ? "" : value);
    onCityChange("");
  };

  const triggerClass = compact ? "h-7 text-xs" : "";

  return (
    <div className={cn("grid grid-cols-2 gap-3", compact && "gap-2")}>
      <div className="space-y-1.5">
        {!compact && <label className="text-sm font-medium">Estado</label>}
        <Select value={state || undefined} onValueChange={handleStateChange} disabled={disabled}>
          <SelectTrigger className={triggerClass}>
            <SelectValue placeholder="UF" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__clear__">Limpar</SelectItem>
            {BRAZILIAN_STATES.map((s) => (
              <SelectItem key={s.uf} value={s.uf}>{s.uf} - {s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        {!compact && <label className="text-sm font-medium">Cidade</label>}
        <Popover open={cityOpen} onOpenChange={setCityOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={cityOpen}
              disabled={disabled || !state}
              className={cn("w-full justify-between font-normal", triggerClass, !city && "text-muted-foreground")}
            >
              <span className="truncate">{city || "Selecionar cidade"}</span>
              <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0" align="start">
            <Command filter={(value, search) => {
              const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
              return normalize(value).includes(normalize(search)) ? 1 : 0;
            }}>
              <CommandInput placeholder="Buscar cidade..." />
              <CommandList>
                <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                <CommandGroup>
                  {cities.map((c) => (
                    <CommandItem
                      key={c}
                      value={c}
                      onSelect={() => {
                        onCityChange(c);
                        setCityOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", city === c ? "opacity-100" : "opacity-0")} />
                      {c}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
