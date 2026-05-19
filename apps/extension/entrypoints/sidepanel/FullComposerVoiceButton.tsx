import { Loader2, Mic } from "lucide-react";
import useVoiceInput from "@dmwork/base/src/Components/MessageInput/useVoiceInput";

interface FullComposerVoiceButtonProps {
  getCurrentText: () => string;
  onTranscribed: (text: string) => void;
}

export default function FullComposerVoiceButton({
  getCurrentText,
  onTranscribed,
}: FullComposerVoiceButtonProps) {
  const {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecordingAndTranscribe,
    isVoiceEnabled,
  } = useVoiceInput({
    onTranscribed,
    mode: "append_only",
  });

  if (!isVoiceEnabled) return null;

  const stop = () => stopRecordingAndTranscribe(getCurrentText());

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.repeat) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      startRecording();
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (isRecording) stop();
    }
  };

  return (
    <>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <button
        type="button"
        onPointerDown={() => startRecording()}
        onPointerUp={stop}
        onPointerLeave={() => { if (isRecording) stop(); }}
        onPointerCancel={() => { if (isRecording) stop(); }}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        aria-pressed={isRecording}
        className={`octo-fullcomp-voice-btn${isRecording ? " is-recording" : ""}`}
        disabled={isTranscribing}
        title={isTranscribing ? "转写中…" : isRecording ? "松开结束录音" : "按住录音"}
      >
        {isTranscribing ? (
          <Loader2 size={16} className="octo-fullcomp-voice-spinner" style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <Mic size={16} />
        )}
      </button>
    </>
  );
}
