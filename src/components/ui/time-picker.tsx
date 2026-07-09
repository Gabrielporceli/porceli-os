import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimePickerProps {
  value?: string; // Format "HH:mm"
  onChange: (time: string) => void;
  className?: string;
  placeholder?: string;
}

export function TimePicker({ value, onChange, className, placeholder = "00:00" }: TimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  const selectedHour = value?.split(":")[0] || "00";
  const selectedMinute = value?.split(":")[1] || "00";

  const handleHourSelect = (hour: string) => {
    onChange(`${hour}:${selectedMinute}`);
  };

  const handleMinuteSelect = (minute: string) => {
    onChange(`${selectedHour}:${minute}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            // data-[state=open] sobrescreve pra não pegar o bg-accent cinza
            // que o variant="outline" aplica por padrão quando o popover abre
            // — o botão deve ficar igual, aberto ou fechado.
            "w-full justify-start text-left font-medium bg-white/[0.03] border-white/[0.05] text-white/70 hover:bg-white/[0.06] hover:border-white/[0.1] hover:text-white data-[state=open]:bg-white/[0.03] data-[state=open]:text-white/70 transition-all rounded-xl h-11 px-4",
            !value && "text-white/30",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4 text-primary opacity-60" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-52 p-0 liquid-glass border-white/[0.1] z-[9999999] shadow-2xl backdrop-blur-3xl overflow-hidden pointer-events-auto"
        align="start"
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="flex h-72 divide-x divide-white/[0.05]">
          <div 
            className="flex-1 overflow-y-auto custom-time-scrollbar"
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col p-3 gap-1">
              <div className="text-[10px] uppercase tracking-wider text-white/30 font-bold mb-3 px-2 text-center">Hora</div>
              {hours.map((hour) => (
                <Button
                  key={hour}
                  variant="ghost"
                  className={cn(
                    "h-10 px-2 text-sm font-medium hover:bg-white/5 text-white/60 transition-all rounded-lg",
                    selectedHour === hour && "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(104,41,192,0.2)]"
                  )}
                  onClick={() => handleHourSelect(hour)}
                >
                  {hour}
                </Button>
              ))}
            </div>
          </div>
          <div 
            className="flex-1 overflow-y-auto custom-time-scrollbar"
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col p-3 gap-1">
              <div className="text-[10px] uppercase tracking-wider text-white/30 font-bold mb-3 px-2 text-center">Minutos</div>
              {minutes.filter(m => parseInt(m) % 5 === 0).map((minute) => (
                <Button
                  key={minute}
                  variant="ghost"
                  className={cn(
                    "h-10 px-2 text-sm font-medium hover:bg-white/5 text-white/60 transition-all rounded-lg",
                    selectedMinute === minute && "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(104,41,192,0.2)]"
                  )}
                  onClick={() => handleMinuteSelect(minute)}
                >
                  {minute}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <style>{`
          .custom-time-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-time-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-time-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(104, 41, 192, 0.3);
            border-radius: 10px;
          }
          .custom-time-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(104, 41, 192, 0.5);
          }
          .custom-time-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(104, 41, 192, 0.3) transparent;
          }
        `}</style>
      </PopoverContent>
    </Popover>
  );
}
