const express = require("express");
const fetch = require("node-fetch"); // Oder den eingebauten fetch bei Node 18+
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/chat", async (req, res) => {
  const { model, messages } = req.body;
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: "Serverfehler: Kein API-Key konfiguriert." });
  }
  try {
    const apiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + OPENROUTER_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        max_tokens: 40000,
        messages
      })
    });
    const data = await apiResponse.json();
    if (data?.choices?.[0]?.message?.content) {
      res.json({ text: data.choices[0].message.content.trim() });
    } else {
      res.status(500).json({ error: "Keine Antwort erhalten." });
    }
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
