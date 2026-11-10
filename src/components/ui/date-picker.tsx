"use strict";

import * as React from "react";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
    date?: Date;
    setDate: (date?: Date) => void;
    className?: string;
    placeholder?: string;
}

export function DatePicker({ date, setDate, className, placeholder = "Selecione uma data" }: DatePickerProps) {
    // Fecha ao escolher o dia: aberto, o calendário ficava por cima do campo seguinte e parecia ser dele
    // (renegociação da Luz Solar, 05/11/2026).
    const [aberto, setAberto] = React.useState(false);
    // Esc com o calendário aberto fecha só o calendário. Dentro de uma janela (Dialog), a janela é que pegava o Esc
    // e fechava inteira, perdendo o que estava preenchido. Captura na janela do navegador, antes do Radix.
    React.useEffect(() => {
        if (!aberto) return;
        const aoTeclar = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            e.stopPropagation();
            setAberto(false);
        };
        window.addEventListener("keydown", aoTeclar, true);
        return () => window.removeEventListener("keydown", aoTeclar, true);
    }, [aberto]);
    return (
        <Popover open={aberto} onOpenChange={setAberto}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant={"outline"}
                    className={cn(
                        // data-[state=open] sobrescreve pra não pegar o bg-accent
                        // cinza que o variant="outline" aplica quando o popover
                        // abre — o botão deve ficar igual, aberto ou fechado.
                        "w-full justify-start text-left font-medium bg-white/[0.03] border-white/[0.05] text-white/70 hover:bg-white/[0.06] hover:border-white/[0.1] hover:text-white data-[state=open]:bg-white/[0.03] data-[state=open]:text-white/70 transition-all rounded-xl h-11 px-4",
                        !date && "text-white/40",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary opacity-60" />
                    {date && isValid(date) ? format(date, "PPP", { locale: ptBR }) : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="surface-modal !bg-[#2F2D2E] w-auto p-0 z-[9999999] pointer-events-auto"
                align="center"
                side="bottom"
            >
                <Calendar
                    mode="single"
                    selected={date}
                    defaultMonth={date && isValid(date) ? date : undefined}
                    onSelect={(d) => { setDate(d); if (d) setAberto(false); }}
                    initialFocus
                    locale={ptBR}
                    className="text-white rounded-xl w-full flex justify-center"
                />
            </PopoverContent>
        </Popover>
    );
}
