import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // API Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "LifeMap", timestamp: new Date().toISOString() });
  });

  // AI Daily Recap Generator using Gemini
  app.post("/api/ai-recap", async (req, res) => {
    try {
      const {
        date,
        places = [],
        totalDistanceKm = 0,
        steps = 0,
        language = "ko",
        userNotes = ""
      } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Fallback local algorithmic recap if API key is not configured
        const fallbackText = language === "ko"
          ? `${places.length}곳의 장소를 방문하고 약 ${totalDistanceKm.toFixed(1)}km(${steps.toLocaleString()}걸음)를 이동한 하루였습니다. ${places[0]?.name || "새로운 곳"}에서 시작해 하루의 발자취가 지도 위에 따뜻하게 남았습니다.`
          : `A vibrant day exploring ${places.length} places across ${totalDistanceKm.toFixed(1)} km (${steps.toLocaleString()} steps). Beginning from ${places[0]?.name || "your start point"}, today's journey is mapped with mindful moments.`;
        return res.json({
          recap: fallbackText,
          mood: language === "ko" ? "차분하고 알찬 하루" : "Mindful & Productive",
          highlight: places[0]?.name || (language === "ko" ? "특별한 순간" : "Special Moment"),
          source: "local"
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      const placesDescription = places.map((p: any, idx: number) => {
        return `${idx + 1}. [${p.time || ""}] ${p.name} (${p.category || "장소"}) - ${p.note || "방문"}`;
      }).join("\n");

      const prompt = language === "ko"
        ? `당신은 미니멀 라이프로그 앱 'LifeMap(라이프맵)'의 감성적이고 통찰력 있는 하루 회고 어시스턴트입니다.
사용자의 하루 이동 경로와 방문 장소, 통계를 바탕으로 2~3문장의 담백하고 시적인 '하루 회고(Daily Reflection)'를 작성해주세요.

[오늘의 기록]
- 날짜: ${date}
- 총 이동 거리: ${totalDistanceKm.toFixed(1)} km
- 걸음 수: ${steps.toLocaleString()} 보
- 방문 장소들:
${placesDescription || "특별한 등록 장소 없음"}
${userNotes ? `- 사용자의 메모: ${userNotes}` : ""}

[요구사항]
- 과장되거나 상투적인 SaaS 홍보 어투를 절대 피하고, 사용자의 발자취를 돌아보며 하루를 정리할 수 있는 차분하고 정갈한 한국어 문장 2~3문장.
- 반드시 아래 JSON 포맷으로만 응답:
{
  "recap": "2~3문장의 회고 문장",
  "mood": "오늘의 무드 키워드 (예: 여유로운 산책, 성취감 있는 날 등 2~4단어)",
  "highlight": "오늘 가장 인상적인 장소 또는 순간 한마디"
}`
        : `You are the thoughtful daily reflection assistant for 'LifeMap', a minimalist lifelog and timeline app inspired by RONDO.
Based on the user's places visited and path metrics, generate a poetic, warm, and grounded 2-3 sentence daily recap.

[Today's Log]
- Date: ${date}
- Total Distance: ${totalDistanceKm.toFixed(1)} km
- Steps: ${steps.toLocaleString()}
- Places visited:
${placesDescription || "No specific places tagged"}
${userNotes ? `- User's personal notes: ${userNotes}` : ""}

[Requirements]
- Avoid generic robotic clichés. Provide a calm, introspective 2-3 sentence reflection capturing the rhythm of the day.
- Respond strictly in valid JSON format:
{
  "recap": "2-3 sentence reflection",
  "mood": "Mood phrase (e.g., Mindful Discovery, Gentle Stroll, Cozy Afternoon)",
  "highlight": "Memorable spot or sentiment"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      });

      const responseText = response.text || "";
      let parsed;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        parsed = {
          recap: responseText.trim(),
          mood: language === "ko" ? "기분 좋은 하루" : "A Meaningful Day",
          highlight: places[0]?.name || (language === "ko" ? "발자취" : "Footsteps")
        };
      }

      return res.json({
        recap: parsed.recap,
        mood: parsed.mood,
        highlight: parsed.highlight,
        source: "gemini"
      });
    } catch (err: any) {
      console.error("AI Recap generation error:", err);
      return res.json({
        recap: req.body.language === "ko"
          ? "오늘 하루 지나온 길과 장소들이 지도 위에 소중하게 기록되었습니다."
          : "Every step and location from today has been gently preserved on your map.",
        mood: req.body.language === "ko" ? "일상의 소중함" : "Mindful Presence",
        highlight: req.body.places?.[0]?.name || "Today",
        source: "fallback"
      });
    }
  });

  // Vite middleware in dev, static files in prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LifeMap server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
