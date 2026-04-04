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
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-medium bg-white/[0.03] border-white/[0.05] text-white/70 hover:bg-white/[0.06] hover:border-white/[0.1] hover:text-white transition-all rounded-xl h-11 px-4",
                        !date && "text-white/30",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary opacity-60" />
                    {date && isValid(date) ? format(date, "PPP", { locale: ptBR }) : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 liquid-glass border-white/[0.1] z-[9999999] shadow-2xl backdrop-blur-3xl" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    locale={ptBR}
                    className="bg-Porceli-gray-800 text-white rounded-xl w-full flex justify-center"
                />
            </PopoverContent>
        </Popover>
    );
}
