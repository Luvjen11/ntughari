import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AiConversation } from "@/components/practice/AiConversation";

export default function ConversationPractice() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/practice")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Practice Hub
        </Button>

        <h1 className="text-2xl font-bold mb-1">Conversation Tutor</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Chat with your Igbo tutor in text or voice. Replies are spoken with YarnGPT when available.
        </p>

        <AiConversation level="beginner" />
      </div>
    </div>
  );
}
