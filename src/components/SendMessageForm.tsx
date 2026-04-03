import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSendMessage } from "@/hooks/useSendMessage";

interface SendMessageFormProps {
  numero?: string;
  nome_contato?: string;
  onSuccess?: () => void;
}

export const SendMessageForm = ({ numero = "", nome_contato = "", onSuccess }: SendMessageFormProps) => {
  const [phone, setPhone] = useState(numero);
  const [contactName, setContactName] = useState(nome_contato);
  const [message, setMessage] = useState("");
  
  const sendMessage = useSendMessage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone.trim() || !message.trim()) {
      return;
    }

    sendMessage.mutate({
      numero: phone,
      mensagem: message,
      nome_contato: contactName || undefined
    }, {
      onSuccess: () => {
        setMessage("");
        onSuccess?.();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="phone" className="block text-sm font-medium mb-1">
          Número de Telefone
        </label>
        <Input
          id="phone"
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Ex: +5511999999999"
          required
        />
      </div>
      
      <div>
        <label htmlFor="contactName" className="block text-sm font-medium mb-1">
          Nome do Contato (opcional)
        </label>
        <Input
          id="contactName"
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="Nome do contato"
        />
      </div>
      
      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-1">
          Mensagem
        </label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Digite sua mensagem..."
          rows={4}
          required
        />
      </div>
      
      <Button 
        type="submit" 
        disabled={sendMessage.isPending || !phone.trim() || !message.trim()}
        className="w-full"
      >
        {sendMessage.isPending ? "Enviando..." : "Enviar Mensagem"}
      </Button>
    </form>
  );
};