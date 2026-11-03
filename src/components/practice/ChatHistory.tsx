import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Loader2, MessageSquare, Plus, Trash2 } from "lucide-react";
import type { TutorChat } from "@/hooks/useTutorChats";

interface ChatHistoryProps {
  signedIn: boolean;
  chats: TutorChat[];
  loading: boolean;
  activeChatId: string | null;
  onNewChat: () => void;
  onOpenChat: (chat: TutorChat) => void;
  onDeleteChat: (chat: TutorChat) => void;
}

/** "New chat" plus the learner's past conversations, newest first. */
export function ChatHistory({
  signedIn,
  chats,
  loading,
  activeChatId,
  onNewChat,
  onOpenChat,
  onDeleteChat,
}: ChatHistoryProps) {
  // Deleting takes two taps: the bin, then "Delete".
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <button
          type="button"
          onClick={onNewChat}
          className="w-full flex items-center gap-2 rounded-xl border border-foreground/10 bg-card/70 px-3 py-2.5 text-sm font-semibold hover:border-primary/60 hover:shadow-[0_0_24px_-10px_hsl(var(--primary))] transition-all"
        >
          <Plus size={16} /> New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        <p className="px-2 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Your chats
        </p>

        {!signedIn ? (
          <p className="px-2 text-sm text-muted-foreground">
            <Link to="/auth" className="underline font-medium text-foreground">
              Sign in
            </Link>{" "}
            to keep your conversations and come back to them.
          </p>
        ) : loading ? (
          <p className="px-2 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" /> Loading chats…
          </p>
        ) : chats.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">
            Your conversations will appear here, so you can reread them later.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {chats.map((chat) => {
              const active = chat.id === activeChatId;
              const confirming = confirmingId === chat.id;
              return (
                <li key={chat.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onOpenChat(chat)}
                    className={`w-full text-left rounded-lg px-2 py-2 pr-9 transition-colors ${
                      active ? "bg-primary/15" : "hover:bg-muted/70"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <MessageSquare size={14} className="shrink-0 text-muted-foreground" />
                      <span className="truncate">{chat.title}</span>
                    </span>
                    <span className="block pl-[22px] text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true })} · {chat.level}
                    </span>
                  </button>
                  {confirming ? (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingId(null);
                        onDeleteChat(chat);
                      }}
                      onBlur={() => setConfirmingId(null)}
                      autoFocus
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md bg-destructive px-2 py-1 text-xs font-semibold text-destructive-foreground"
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(chat.id)}
                      aria-label={`Delete chat: ${chat.title}`}
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-destructive hover:bg-muted"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
