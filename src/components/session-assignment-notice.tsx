import { UserCheck } from "lucide-react";
import type { SessionAssignmentEvent } from "@/lib/session-events";

export function SessionAssignmentNotice({ event }: { event: SessionAssignmentEvent }) {
  return (
    <div className="my-3 flex justify-center" role="note">
      <div className="flex max-w-full items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        <UserCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 break-words">
          <p>Usuário <span className="font-semibold text-foreground">{event.attendant_name}</span> assumiu a conversa</p>
          <time dateTime={event.created_at} className="mt-0.5 block text-[10px]">
            {new Date(event.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </time>
        </div>
      </div>
    </div>
  );
}