import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";

interface StoryCardProps {
  title: string;
  narrationText: string;
}

export function StoryCard({ title, narrationText }: StoryCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showText, setShowText] = useState(true);
  const { speak, stop, isSpeaking } = useTTS();

  // Sync playing state with TTS
  useEffect(() => {
    setIsPlaying(isSpeaking);
  }, [isSpeaking]);

  // Stop narration when scene changes
  useEffect(() => {
    return () => {
      stop();
    };
  }, [title, stop]);

  const handlePlayPause = () => {
    if (isPlaying) {
      stop();
      setIsPlaying(false);
    } else {
      speak(narrationText, { rate: 0.85 });
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!isMuted) {
      stop();
      setIsPlaying(false);
    }
    setIsMuted(!isMuted);
  };

  // Format text with proper paragraphs
  const paragraphs = narrationText.split("\n\n").filter(Boolean);

  return (
    <Card className="border-2 border-border shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-2xl font-bold text-foreground">
            {title}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePlayPause}
              disabled={isMuted}
              className="border-2 h-10 w-10"
              aria-label={isPlaying ? "Pause narration" : "Play narration"}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleMute}
              className="border-2 h-10 w-10"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Read instead toggle */}
        <button
          onClick={() => setShowText(!showText)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showText ? "Hide text" : "Read instead"}
        </button>

        {/* Narration text */}
        {showText && (
          <div className="space-y-4 text-foreground/90 leading-relaxed">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="text-base">
                {paragraph}
              </p>
            ))}
          </div>
        )}

        {/* Playing indicator */}
        {isPlaying && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse" />
            Playing...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
