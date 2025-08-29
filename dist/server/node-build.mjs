import path from "path";
import "dotenv/config";
import * as express from "express";
import express__default from "express";
import cors from "cors";
import multer from "multer";
import { OpenAI } from "openai";
const handleDemo = (req, res) => {
  const response = {
    message: "Hello from Express server"
  };
  res.status(200).json(response);
};
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  }
});
const uploadMiddleware = upload.fields([
  { name: "dress", maxCount: 1 },
  { name: "person", maxCount: 1 }
]);
const handleGenerateVariations = async (req, res) => {
  try {
    const files = req.files;
    if (!files?.dress?.[0] || !files?.person?.[0]) {
      return res.status(400).json({
        error: "Both dress and person images are required"
      });
    }
    const dressFile = files.dress[0];
    const personFile = files.person[0];
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key not configured, returning placeholder results");
      const placeholderImages = Array.from({ length: 5 }, (_, i) => ({
        id: `placeholder-${i + 1}`,
        url: "/fashion-placeholder.svg"
      }));
      return res.json({
        images: placeholderImages,
        message: "Demo mode - OpenAI API key not configured"
      });
    }
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    const dressBase64 = dressFile.buffer.toString("base64");
    const personBase64 = personFile.buffer.toString("base64");
    console.log("Analyzing uploaded images with GPT-4 Vision...");
    let imageAnalysis = "";
    try {
      const analysisResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze these two images carefully: 1) A dress/outfit, 2) A person/model. Provide a detailed description that will be used for AI image generation. Focus on:\n\nFor the DRESS:\n- Exact color, style, length, cut\n- Fabric type and texture\n- Sleeves, neckline, silhouette\n- Any patterns, prints, or details\n- Overall design characteristics\n\nFor the PERSON:\n- Body type, height, build\n- Skin tone, hair color and style\n- Facial features (if visible)\n- Any distinctive characteristics\n\nProvide a comprehensive description that will help generate images of this exact person wearing this exact dress in different poses."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${dressFile.mimetype};base64,${dressBase64}`
                }
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${personFile.mimetype};base64,${personBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      });
      imageAnalysis = analysisResponse.choices[0]?.message?.content || "Could not analyze images";
      console.log("Image analysis complete:", imageAnalysis);
    } catch (visionError) {
      console.error("Vision API error:", visionError);
      imageAnalysis = "Image analysis failed - will use basic generation";
    }
    const poses = [
      "standing straight with arms at sides, front-facing view",
      "three-quarter turn pose with one hand on hip",
      "walking pose with natural arm swing",
      "sitting elegantly on a minimalist stool",
      "side profile pose with arms gracefully positioned"
    ];
    const generatedImages = [];
    for (let i = 0; i < 5; i++) {
      try {
        let prompt = "";
        if (imageAnalysis && imageAnalysis !== "Image analysis failed - will use basic generation") {
          prompt = `Create a professional fashion photograph based on these specifications:

PERSON & DRESS ANALYSIS:
${imageAnalysis}

POSE REQUIREMENT: ${poses[i]}

GENERATION INSTRUCTIONS:
- Use the EXACT person described above wearing the EXACT dress described above
- The person's appearance must match the analysis (body type, skin tone, hair, facial features)
- The dress must be identical in every detail (color, pattern, fabric, cut, style, length)
- Only change the pose/positioning as specified
- Maintain high-quality fashion photography standards
- Use professional studio lighting with clean, neutral background
- Ensure the dress fits the person naturally and realistically
- Keep consistent lighting and background across all variations

Style: Professional fashion photography, studio quality, clean composition`;
        } else {
          prompt = `Create a professional fashion photograph of a model wearing a dress in this pose: ${poses[i]}.

Professional fashion photography style, studio lighting, clean neutral background, high quality, detailed dress design, elegant pose.`;
        }
        console.log(`Generating variation ${i + 1} with pose: ${poses[i]}`);
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt,
          n: 1,
          size: "1024x1024",
          quality: "hd"
        });
        if (response.data?.[0]?.url) {
          generatedImages.push({
            id: `generated-${i + 1}`,
            url: response.data[0].url
          });
          console.log(`✅ Successfully generated variation ${i + 1}`);
        } else {
          console.log(`⚠️ No image data received for variation ${i + 1}`);
          generatedImages.push({
            id: `fallback-${i + 1}`,
            url: "/fashion-placeholder.svg"
          });
        }
      } catch (error) {
        console.error(`❌ Error generating image ${i + 1}:`, error);
        generatedImages.push({
          id: `fallback-${i + 1}`,
          url: "/fashion-placeholder.svg"
        });
      }
    }
    res.json({
      images: generatedImages,
      message: "Images generated successfully"
    });
  } catch (error) {
    console.error("Error in generate-variations:", error);
    const placeholderImages = Array.from({ length: 5 }, (_, i) => ({
      id: `error-placeholder-${i + 1}`,
      url: "/fashion-placeholder.svg"
    }));
    res.status(500).json({
      images: placeholderImages,
      error: "Failed to generate images, showing placeholders",
      message: "Error occurred during generation"
    });
  }
};
const handleImageDownload = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Image URL is required" });
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const imageBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);
    res.setHeader("Content-Type", response.headers.get("content-type") || "image/jpeg");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Content-Disposition", 'attachment; filename="fashion-variation.jpg"');
    res.send(buffer);
  } catch (error) {
    console.error("Download proxy error:", error);
    res.status(500).json({ error: "Failed to download image" });
  }
};
function createServer() {
  const app2 = express__default();
  app2.use(cors());
  app2.use(express__default.json());
  app2.use(express__default.urlencoded({ extended: true }));
  app2.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });
  app2.get("/api/demo", handleDemo);
  app2.post("/api/generate-variations", uploadMiddleware, handleGenerateVariations);
  app2.get("/api/download-image", handleImageDownload);
  return app2;
}
const app = createServer();
const port = process.env.PORT || 3e3;
const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../spa");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  res.sendFile(path.join(distPath, "index.html"));
});
app.listen(port, () => {
  console.log(`🚀 Fusion Starter server running on port ${port}`);
  console.log(`📱 Frontend: http://localhost:${port}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
});
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
//# sourceMappingURL=node-build.mjs.map
