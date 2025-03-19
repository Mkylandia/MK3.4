// script.js
document.addEventListener("DOMContentLoaded", () => {
  // Hinweis: Das direkte Einbinden des API-Schlüssels im Frontend ist unsicher!
  const API_KEY = "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";
  
  // Grundkonfiguration
  const displayNames = {MKR: "MKR", MKB: "MKB", "MKB+": "MKB+", "MK+": "MK+", MK: "MK"};
  const themes = {
    "MKR": {primary: "#43A047", background: "linear-gradient(135deg, #E8F5E9, #C8E6C9)"},
    "MKB": {primary: "#8E24AA", background: "linear-gradient(135deg, #F3E5F5, #E1BEE7)"},
    "MKB+": {primary: "#E53935", background: "linear-gradient(135deg, #FFCDD2, #EF9A9A)"},
    "MK+": {primary: "#FB8C00", background: "linear-gradient(135deg, #FFE0B2, #FFCC80)"},
    "MK": {primary: "#0288D1", background: "linear-gradient(135deg, #E1F5FE, #B3E5FC)"}
  };
  // Modellzuordnung – ggf. auch vom Backend abhängig
  const modelMapping = {
    "MKR": "deepseek/deepseek-r1:free",
    "MK": "nvidia/llama-3.1-nemotron-70b-instruct:free",
    "MK+": "deepseek/deepseek-chat:free"
  };

  let conversation = [];
  let currentModel = "MK+";

  // DOM-Elemente
  const els = {
    kiSlider: document.getElementById("ki-slider"),
    headerTitle: document.getElementById("header-title"),
    kiName: document.getElementById("kiName"),
    chatContainer: document.getElementById("chat-container"),
    chatArea: document.getElementById("chat-area"),
    btnKISlider: document.getElementById("btn-ki-slider"),
    newConvButton: document.getElementById("new-conversation"),
    userInput: document.getElementById("user-input"),
    sendButton: document.getElementById("send-button"),
    exportButton: document.getElementById("export-chat")
  };

  // Funktionen zur Größenanpassung und Theme-Aktualisierung
  const updateChatHeight = () => {
    const headerHeight = document.querySelector("header").offsetHeight;
    const inputHeight = document.querySelector(".input-area").offsetHeight;
    const margin = window.innerWidth <= 480 ? 2 : 10;
    els.chatArea.style.height = (window.innerHeight - headerHeight - inputHeight - margin) + "px";
  };

  const updateTheme = model => {
    const theme = themes[model];
    if (!theme) return;
    document.body.style.background = theme.background;
    els.headerTitle.style.color = theme.primary;
    els.btnKISlider.style.backgroundColor = theme.primary;
    document.querySelectorAll(".input-area button").forEach(btn => {
      btn.style.backgroundColor = theme.primary;
    });
  };

  // KI-Slider umschalten
  const toggleKISlider = () => {
    els.kiSlider.classList.toggle("open");
    document.body.classList.toggle("slider-open");
    els.btnKISlider.innerHTML = els.kiSlider.classList.contains("open")
      ? '<i class="fa-solid fa-xmark"></i> Schließen'
      : '<i class="fa-solid fa-bars"></i> KI Auswahl';
  };

  // KI-Modell auswählen
  const selectKI = ki => {
    currentModel = ki;
    els.kiName.textContent = displayNames[ki] || ki;
    document.querySelectorAll("#ki-slider button").forEach(btn => btn.classList.remove("active-ki"));
    document.getElementById(`btn-${ki.toLowerCase().replace(/\+/g, "plus")}`).classList.add("active-ki");
    updateTheme(ki);
    toggleKISlider();
  };

  // Nachrichten anzeigen
  const appendMessage = (sender, content) => {
    const msg = document.createElement("div");
    msg.classList.add("chat-message", sender === "user" ? "user-message" : "ai-message");
    msg.innerHTML = marked.parse(content);
    els.chatContainer.appendChild(msg);
    els.chatContainer.scrollTop = els.chatContainer.scrollHeight;
  };

  // "Thinking"-Animation anzeigen
  const showThinking = () => {
    const think = document.createElement("div");
    think.id = "thinking-message";
    think.classList.add("chat-message", "ai-message", "thinking");
    think.innerHTML = 'KI denkt <span class="ki-think"><span></span><span></span><span></span></span>';
    els.chatContainer.appendChild(think);
    els.chatContainer.scrollTop = els.chatContainer.scrollHeight;
  };

  // "Thinking"-Animation entfernen
  const removeThinking = () => {
    const think = document.getElementById("thinking-message");
    if (think) think.remove();
  };

  // API-Aufruf an OpenRouter direkt mit dem API-Key
  const callOpenRouterAPI = async (conv, model) => {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          max_tokens: 40000,
          messages: conv.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { error: err.toString() };
    }
  };

  // Nachricht senden
  const sendMessage = async () => {
    const text = els.userInput.value.trim();
    if (!text) {
      alert("Bitte gib eine Nachricht ein!");
      return;
    }
    appendMessage("user", text);
    conversation.push({ role: "user", content: text });
    els.userInput.value = "";
    if (conversation.length > 6) conversation.shift();

    showThinking();
    const result = await callOpenRouterAPI(conversation, modelMapping[currentModel] || currentModel);
    removeThinking();

    if (result?.choices?.[0]?.message?.content) {
      const reply = result.choices[0].message.content.trim();
      appendMessage("ai", `<p>${reply}</p>`);
      conversation.push({ role: "assistant", content: reply });
    } else {
      appendMessage("ai", `<p>Fehler: ${result.error || "Keine Antwort erhalten"}</p>`);
    }
    if (conversation.length > 6) conversation.shift();
  };

  // Neue Konversation starten
  const newConversation = () => {
    els.chatContainer.innerHTML = "";
    conversation = [];
  };

  // Chat exportieren
  const exportChat = () => {
    const plainText = conversation.map(msg =>
      `${msg.role}: ${msg.content.replace(/<\/?[^>]+(>|$)/g, "")}`
    ).join("\n\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([plainText], { type: "text/plain" }));
    link.download = "chat_verlauf.txt";
    link.click();
  };

  // Event-Listener
  window.addEventListener("resize", updateChatHeight);
  els.btnKISlider.addEventListener("click", e => {
    e.stopPropagation();
    toggleKISlider();
  });
  els.newConvButton.addEventListener("click", newConversation);
  els.sendButton.addEventListener("click", sendMessage);
  els.userInput.addEventListener("keyup", e => { if (e.key === "Enter") sendMessage(); });
  document.getElementById("btn-mkr").addEventListener("click", () => selectKI("MKR"));
  document.getElementById("btn-mkb").addEventListener("click", () => selectKI("MKB"));
  document.getElementById("btn-mkbplus").addEventListener("click", () => selectKI("MKB+"));
  document.getElementById("btn-mkplus").addEventListener("click", () => selectKI("MK+"));
  document.getElementById("btn-mk").addEventListener("click", () => selectKI("MK"));
  els.exportButton.addEventListener("click", exportChat);

  // Klick außerhalb des Sliders schließt diesen
  document.body.addEventListener('click', e => {
    if (document.body.classList.contains('slider-open') &&
        !els.kiSlider.contains(e.target) &&
        e.target !== els.btnKISlider) {
      toggleKISlider();
    }
  });

  // Initialisierung
  updateChatHeight();
  newConversation();
  selectKI("MK+");
});
