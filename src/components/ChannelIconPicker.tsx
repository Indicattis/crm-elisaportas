import { CHANNEL_ICONS } from "@/lib/channel-icons";
import { cn } from "@/lib/utils";

interface ChannelIconPickerProps {
  value: string;
  onChange: (iconId: string) => void;
}

export function ChannelIconPicker({ value, onChange }: ChannelIconPickerProps) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {CHANNEL_ICONS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            onClick={() => onChange(item.id)}
            className={cn(
              "flex items-center justify-center rounded-md border p-2 transition-colors hover:bg-accent",
              value === item.id ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border"
            )}
          >
            <Icon className="h-5 w-5" />
          </button>
        );
      })}
    </div>
  );
}
