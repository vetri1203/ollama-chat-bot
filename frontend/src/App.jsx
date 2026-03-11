import { useMemo, useState } from "react";

const MAX_PROMPT_LENGTH = 4000;

function createMessage(role, text) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })
  };
}

const starterMessages = [
  createMessage(
    "assistant",
    "Connected to your local Ollama backend. Ask for summaries, code help, drafts, or quick analysis."
  )
];

export function App() {
  const [messages, setMessages] = useState(starterMessages);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const trimmedDraft = draft.trim();
  const remainingCharacters = MAX_PROMPT_LENGTH - draft.length;

  const validationMessage = useMemo(() => {
    if (!draft.length) {
      return "";
    }

    if (!trimmedDraft) {
      return "Message cannot be only spaces.";
    }

    if (draft.length > MAX_PROMPT_LENGTH) {
      return `Message must be ${MAX_PROMPT_LENGTH} characters or less.`;
    }

    return "";
  }, [draft, trimmedDraft]);

  const canSend = !isSending && Boolean(trimmedDraft) && !validationMessage;

  async function handleSubmit(event) {
    event?.preventDefault();

    if (!canSend) {
      if (!trimmedDraft) {
        setError("Enter a message before sending.");
      } else if (validationMessage) {
        setError(validationMessage);
      }
      return;
    }

    const prompt = trimmedDraft;
    const userMessage = createMessage("user", prompt);

    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setError("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to get a response from the server.");
      }

      setMessages((current) => [
        ...current,
        createMessage("assistant", data.reply || "No response received.")
      ]);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unknown error while contacting the backend.";

      setError(message);
      setMessages((current) => [
        ...current,
        createMessage("assistant", `Request failed: ${message}`)
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <main className="shell">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">React Chat Workspace</p>
          <h1>Ollama Console</h1>
          <p className="lede">
            A polished local chat surface wired to your Node backend and Ollama.
            Press Enter to send. Use Shift+Enter for a new line.
          </p>
        </div>

        <div className="hero-metrics" aria-label="Session details">
          <div className="metric">
            <span className="metric-label">Model route</span>
            <strong>/api/chat</strong>
          </div>
          <div className="metric">
            <span className="metric-label">State</span>
            <strong>{isSending ? "Waiting for reply" : "Ready"}</strong>
          </div>
        </div>
      </section>

      <section className="workspace">
        <aside className="sidebar-card">
          <p className="sidebar-title">Interaction Rules</p>
          <ul className="rule-list">
            <li>Empty messages are blocked.</li>
            <li>Only one request can be active at a time.</li>
            <li>Enter sends the message instantly.</li>
            <li>Shift+Enter inserts a new line.</li>
            <li>Long prompts are capped at 4000 characters.</li>
          </ul>
        </aside>

        <section className="chat-card">
          <header className="chat-header">
            <div>
              <p className="chat-kicker">Conversation</p>
              <h2>Local assistant</h2>
            </div>
            <span className={`status-pill ${isSending ? "busy" : "idle"}`}>
              {isSending ? "Generating" : "Ready"}
            </span>
          </header>

          <div className="message-list" aria-live="polite">
            {messages.map((message) => (
              <article key={message.id} className={`message-card ${message.role}`}>
                <div className="message-meta">
                  <span>{message.role === "user" ? "You" : "Ollama"}</span>
                  <time>{message.time}</time>
                </div>
                <p>{message.text}</p>
              </article>
            ))}
          </div>

          <form className="composer" onSubmit={handleSubmit}>
            <label className="composer-label" htmlFor="prompt">
              Message
            </label>
            <textarea
              id="prompt"
              name="prompt"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                if (error) {
                  setError("");
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask your local model anything..."
              disabled={isSending}
              maxLength={MAX_PROMPT_LENGTH + 50}
              rows={4}
            />

            <div className="composer-footer">
              <div className="composer-hints">
                <span className={remainingCharacters < 200 ? "warn" : ""}>
                  {remainingCharacters} characters left
                </span>
                {validationMessage ? (
                  <span className="error-text">{validationMessage}</span>
                ) : (
                  <span>{isSending ? "Waiting for Ollama to respond..." : "Enter to send"}</span>
                )}
                {error ? <span className="error-text">{error}</span> : null}
              </div>

              <button type="submit" disabled={!canSend}>
                {isSending ? "Generating..." : "Send message"}
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}
