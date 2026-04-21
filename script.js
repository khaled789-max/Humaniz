import { useState, useRef, useCallback } from "react";

const STYLES = {
  doctor: {
    label: "Doctor / Physician",
    icon: "🩺",
    color: "#1a6b5a",
    accent: "#2eb89a",
    desc: "Clinical, professional, precise — like a senior physician writing patient notes or medical reports.",
    prompt: `You are an expert text humanizer. Rewrite the following AI-generated text to sound exactly like a real doctor or physician wrote it. Use:
- Professional but warm medical tone
- Natural clinical phrasing (not robotic)
- Occasional first-person perspective ("In my experience...", "I've found that...")
- Real doctor habits: slight hedging ("typically", "in most cases"), proper medical terminology used naturally, not over-explained
- Vary sentence length — mix short punchy sentences with longer explanations
- Add minor imperfections: light informality in transitions, natural connectors like "Now,", "That said,", "Here's the thing —"
- Do NOT sound like an AI. Do NOT use bullet-pointed summaries unless asked.
Only return the rewritten text, nothing else.`
  },
  student: {
    label: "College Student",
    icon: "🎓",
    color: "#4a3fa0",
    accent: "#7c6ff7",
    desc: "Casual, slightly informal, authentic — like a smart undergrad writing an essay or email.",
    prompt: `You are an expert text humanizer. Rewrite the following AI-generated text to sound exactly like a real college student wrote it. Use:
- Conversational, slightly informal academic tone
- Natural filler transitions: "Basically,", "So,", "The thing is,", "Honestly,", "To be fair,"
- Mix of confident claims and mild uncertainty ("I think", "it seems like", "probably")
- Contractions everywhere (it's, doesn't, I've, they're)
- Occasional mild enthusiasm or emphasis ("which is actually really interesting", "kind of wild when you think about it")
- Vary sentence length dramatically — short punchy ones mixed with run-ons
- Imperfect but smart: shows the student knows the material but isn't trying too hard
- Do NOT sound like an AI. Do NOT use overly structured bullet lists.
Only return the rewritten text, nothing else.`
  }
};

export default function Humanizer() {
  const [mode, setMode] = useState("doctor");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [pdfData, setPdfData] = useState(null);
  const [tab, setTab] = useState("text");
  const fileInputRef = useRef(null);

  const style = STYLES[mode];

  async function handleFile(file) {
    if (!file) return;
    setError("");
    setOutput("");
    setUploadedFile(null);
    setPdfData(null);
    setInput("");

    const name = file.name.toLowerCase();
    const allowed = [".txt", ".md", ".pdf", ".docx"];
    if (!allowed.some(ext => name.endsWith(ext))) {
      setError("Unsupported file type. Please upload a .txt, .md, .pdf, or .docx file.");
      return;
    }

    try {
      if (name.endsWith(".pdf")) {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        bytes.forEach(b => (binary += String.fromCharCode(b)));
        setPdfData(btoa(binary));
        setUploadedFile(file);
      } else if (name.endsWith(".docx")) {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setInput(result.value);
        setUploadedFile(file);
      } else {
        const text = await file.text();
        setInput(text);
        setUploadedFile(file);
      }
    } catch (e) {
      setError("Could not read file. Try copying the text manually.");
    }
  }

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) { setTab("file"); handleFile(file); }
  }, []);

  async function humanize() {
    const isPdf = pdfData !== null;
    if (!isPdf && !input.trim()) return;

    setLoading(true);
    setOutput("");
    setError("");

    try {
      let messages;
      if (isPdf) {
        messages = [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfData } },
            { type: "text", text: "Humanize all the text content in this document. Return only the humanized text." }
          ]
        }];
      } else {
        messages = [{ role: "user", content: input.trim() }];
      }

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: style.prompt,
          messages
        })
      });

      const data = await res.json();
      const text = data.content?.find(b => b.type === "text")?.text || "";
      if (!text) throw new Error("Empty response");
      setOutput(text);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  function copy() {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function clear() {
    setInput(""); setOutput(""); setError("");
    setUploadedFile(null); setPdfData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const wordCount = t => (t.trim() ? t.trim().split(/\s+/).length : 0);
  const canHumanize = pdfData || input.trim();

  const fileIcon = name => {
    if (!name) return "📄";
    if (name.endsWith(".pdf")) return "📕";
    if (name.endsWith(".docx")) return "📘";
    return "📄";
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0e0e14",
      fontFamily: "'Georgia','Times New Roman',serif",
      color: "#e8e6f0", display: "flex", flexDirection: "column", alignItems: "center"
    }}>
      {/* ── Header ── */}
      <header style={{
        width: "100%", padding: "2rem 2rem 1.2rem", textAlign: "center",
        borderBottom: "1px solid #1e1e2e",
        background: "linear-gradient(180deg,#12121a 0%,#0e0e14 100%)"
      }}>
        <div style={{ fontSize: "0.72rem", letterSpacing: "0.25em", color: "#555", textTransform: "uppercase", marginBottom: "0.4rem" }}>
          AI Text Transformer
        </div>
        <h1 style={{
          margin: 0, fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 400, fontStyle: "italic",
          background: "linear-gradient(135deg,#e8e6f0 30%,#9f9bbf)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em"
        }}>Humanize</h1>
        <p style={{ margin: "0.4rem 0 0", color: "#555", fontSize: "0.88rem", fontStyle: "italic" }}>
          Make AI text sound like a real person wrote it
        </p>
      </header>

      <main style={{ width: "100%", maxWidth: "980px", padding: "2rem 1.5rem", flex: 1 }}>

        {/* ── Mode Selector ── */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.4rem", justifyContent: "center" }}>
          {Object.entries(STYLES).map(([key, s]) => (
            <button key={key} onClick={() => { setMode(key); setOutput(""); setError(""); }}
              style={{
                padding: "0.85rem 1.8rem", borderRadius: "12px",
                border: mode === key ? `2px solid ${s.accent}` : "2px solid #2a2a3a",
                background: mode === key ? `linear-gradient(135deg,${s.color}22,${s.accent}15)` : "#141420",
                color: mode === key ? s.accent : "#666",
                cursor: "pointer", fontFamily: "Georgia,serif", fontSize: "0.95rem",
                transition: "all 0.25s", display: "flex", alignItems: "center", gap: "0.5rem",
                boxShadow: mode === key ? `0 0 20px ${s.accent}22` : "none"
              }}>
              <span style={{ fontSize: "1.1rem" }}>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        <p style={{ textAlign: "center", color: "#666", fontSize: "0.83rem", marginBottom: "1.8rem", fontStyle: "italic" }}>
          {style.desc}
        </p>

        {/* ── Input Tabs ── */}
        <div style={{ display: "flex", marginBottom: 0, width: "fit-content" }}>
          {[["text", "✏️  Paste Text"], ["file", "📎  Upload File"]].map(([t, label]) => (
            <button key={t} onClick={() => { setTab(t); setError(""); }}
              style={{
                padding: "0.6rem 1.3rem",
                border: "1px solid #2a2a3a",
                borderBottom: tab === t ? "1px solid #1a1a28" : "1px solid #2a2a3a",
                borderRadius: t === "text" ? "10px 0 0 0" : "0 10px 0 0",
                background: tab === t ? "#1a1a28" : "#111118",
                color: tab === t ? style.accent : "#555",
                cursor: "pointer", fontFamily: "Georgia,serif", fontSize: "0.83rem",
                transition: "all 0.2s", outline: "none"
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Two-column layout ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>

          {/* LEFT */}
          <div>
            {tab === "text" ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.7rem 0 0.45rem", borderTop: `2px solid ${style.accent}` }}>
                  <label style={{ fontSize: "0.7rem", letterSpacing: "0.1em", color: "#777", textTransform: "uppercase" }}>
                    AI-Generated Text
                  </label>
                  <span style={{ fontSize: "0.68rem", color: "#555" }}>{wordCount(input)} words</span>
                </div>
                <textarea value={input} onChange={e => setInput(e.target.value)}
                  placeholder="Paste your AI-generated text here..."
                  style={{
                    width: "100%", height: "330px", background: "#141420",
                    border: "1px solid #2a2a3a", borderRadius: "0 12px 12px 12px",
                    padding: "1.2rem", color: "#ccc", fontSize: "0.88rem", lineHeight: "1.75",
                    fontFamily: "Georgia,serif", resize: "vertical", outline: "none",
                    boxSizing: "border-box", transition: "border-color 0.2s"
                  }}
                  onFocus={e => (e.target.style.borderColor = style.accent)}
                  onBlur={e => (e.target.style.borderColor = "#2a2a3a")}
                />
              </>
            ) : (
              <>
                <div style={{ padding: "0.7rem 0 0.45rem", borderTop: `2px solid ${style.accent}` }}>
                  <label style={{ fontSize: "0.7rem", letterSpacing: "0.1em", color: "#777", textTransform: "uppercase" }}>
                    Upload File
                  </label>
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    height: "330px", borderRadius: "0 12px 12px 12px",
                    border: `2px dashed ${dragOver ? style.accent : uploadedFile ? style.accent + "88" : "#2a2a3a"}`,
                    background: dragOver ? `${style.accent}08` : uploadedFile ? `${style.color}0a` : "#141420",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", transition: "all 0.25s", gap: "0.8rem", boxSizing: "border-box"
                  }}>
                  <input ref={fileInputRef} type="file" accept=".txt,.md,.pdf,.docx"
                    style={{ display: "none" }}
                    onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />

                  {uploadedFile ? (
                    <>
                      <div style={{ fontSize: "2.8rem" }}>{fileIcon(uploadedFile.name)}</div>
                      <div style={{ color: style.accent, fontSize: "0.92rem", textAlign: "center", padding: "0 1.2rem", wordBreak: "break-all" }}>
                        {uploadedFile.name}
                      </div>
                      <div style={{ fontSize: "0.73rem", color: "#666", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <span>{(uploadedFile.size / 1024).toFixed(1)} KB</span>
                        {pdfData && <span style={{ color: style.accent + "aa" }}>• PDF ready</span>}
                        {!pdfData && input && <span style={{ color: style.accent + "aa" }}>• {wordCount(input)} words extracted</span>}
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); clear(); }}
                        style={{
                          marginTop: "0.3rem", padding: "0.38rem 1rem", borderRadius: "8px",
                          border: "1px solid #3a3a4a", background: "transparent",
                          color: "#777", fontSize: "0.75rem", cursor: "pointer", fontFamily: "Georgia,serif"
                        }}>
                        ✕ Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: "2.8rem", opacity: 0.35 }}>📂</div>
                      <div style={{ color: "#777", fontSize: "0.9rem", fontStyle: "italic", textAlign: "center", lineHeight: 1.6 }}>
                        Drag & drop a file here<br />
                        <span style={{ fontSize: "0.78rem", color: "#555" }}>or click to browse</span>
                      </div>
                      <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.2rem" }}>
                        {[".txt", ".md", ".pdf", ".docx"].map(ext => (
                          <span key={ext} style={{
                            padding: "0.18rem 0.55rem", borderRadius: "6px",
                            border: "1px solid #2a2a3a", color: "#555",
                            fontSize: "0.7rem", fontFamily: "monospace"
                          }}>{ext}</span>
                        ))}
                      </div>
                      <p style={{ margin: 0, fontSize: "0.7rem", color: "#444", fontStyle: "italic", textAlign: "center", padding: "0 1.5rem" }}>
                        PDFs are sent directly · .docx & .txt text is extracted
                      </p>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* RIGHT: Output */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.7rem 0 0.45rem", borderTop: `2px solid ${style.accent}44` }}>
              <label style={{ fontSize: "0.7rem", letterSpacing: "0.1em", color: style.accent, textTransform: "uppercase" }}>
                Humanized Result
              </label>
              {output && <span style={{ fontSize: "0.68rem", color: "#555" }}>{wordCount(output)} words</span>}
            </div>
            <div style={{
              width: "100%", height: "330px",
              background: output ? "#141420" : "#0f0f1a",
              border: `1px solid ${output ? style.accent + "55" : "#2a2a3a"}`,
              borderRadius: "12px", padding: "1.2rem",
              color: output ? "#e0ddf0" : "#444",
              fontSize: "0.88rem", lineHeight: "1.75",
              fontFamily: "Georgia,serif", overflowY: "auto",
              boxSizing: "border-box", whiteSpace: "pre-wrap"
            }}>
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "1rem" }}>
                  <div style={{
                    width: "34px", height: "34px",
                    border: `3px solid ${style.accent}33`,
                    borderTop: `3px solid ${style.accent}`,
                    borderRadius: "50%", animation: "spin 0.8s linear infinite"
                  }} />
                  <span style={{ color: "#666", fontSize: "0.82rem", fontStyle: "italic" }}>Humanizing…</span>
                </div>
              ) : error ? (
                <span style={{ color: "#e07070", fontStyle: "italic" }}>{error}</span>
              ) : output || (
                <span style={{ fontStyle: "italic" }}>Your humanized text will appear here…</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={humanize} disabled={loading || !canHumanize}
            style={{
              padding: "0.9rem 2.5rem", borderRadius: "10px", border: "none",
              background: loading || !canHumanize
                ? "#2a2a3a"
                : `linear-gradient(135deg,${style.color},${style.accent})`,
              color: loading || !canHumanize ? "#555" : "#fff",
              fontSize: "1rem", cursor: loading || !canHumanize ? "not-allowed" : "pointer",
              fontFamily: "Georgia,serif", letterSpacing: "0.03em", transition: "all 0.2s",
              boxShadow: loading || !canHumanize ? "none" : `0 4px 24px ${style.accent}44`
            }}>
            {style.icon} Humanize
          </button>

          {output && (
            <button onClick={copy}
              style={{
                padding: "0.9rem 2rem", borderRadius: "10px",
                border: `1px solid ${style.accent}66`, background: "transparent",
                color: style.accent, fontSize: "0.95rem", cursor: "pointer",
                fontFamily: "Georgia,serif", transition: "all 0.2s"
              }}>
              {copied ? "✓ Copied!" : "Copy Text"}
            </button>
          )}

          {(input || output || uploadedFile) && (
            <button onClick={clear}
              style={{
                padding: "0.9rem 1.5rem", borderRadius: "10px",
                border: "1px solid #2a2a3a", background: "transparent",
                color: "#666", fontSize: "0.95rem", cursor: "pointer",
                fontFamily: "Georgia,serif", transition: "all 0.2s"
              }}>
              Clear
            </button>
          )}
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        textarea::placeholder { color: #444; font-style: italic; }
        @media (max-width: 660px) {
          main > div:nth-child(4) { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
