import React, { useState, useRef, useEffect } from "react";
import { DashboardApi } from "../../api/DashboardApi";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CloseIcon from "@mui/icons-material/Close";
import ReactMarkdown from "react-markdown";
import "./AiChat.css";

export default function AiChat({ selectedFile, selectedSheet }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! Ask me anything!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await DashboardApi.askAiAboutSheet(
        selectedFile,
        selectedSheet,
        input
      );

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.answer }
      ]);
    } catch (err) {
      console.log("Error: ", err)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error talking to AI." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (!selectedFile || !selectedSheet) return null;

  return (
    <>
      {/* Floating Button */}
      <button className="ai-fab" onClick={() => setOpen(!open)}>
        <ChatBubbleOutlineIcon />
      </button>

      {/* Chat Window */}
      <div className={`ai-chat-window ${open ? "open" : "closed"}`}>
          <div className="ai-chat-header">
            AI Data Assistant
            <span onClick={() => setOpen(false)}>
              <CloseIcon fontSize="small" />
            </span>
          </div>

          <div className="ai-chat-messages" ref={messagesEndRef}>
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                {m.role === "assistant" ? (
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                ) : (
                  m.content
                )}
              </div>
            ))}
            {loading && <div className="msg assistant">Thinking...</div>}
          </div>

          <div className="ai-chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this dataset..."
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
        
    </>
  );
}
