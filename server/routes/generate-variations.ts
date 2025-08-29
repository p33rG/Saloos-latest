import { RequestHandler } from "express";
import multer from "multer";
import { OpenAI } from "openai";

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// OpenAI will be instantiated only when needed to avoid startup errors

export const uploadMiddleware = upload.fields([
  { name: 'dress', maxCount: 1 },
  { name: 'person', maxCount: 1 }
]);

export const handleGenerateVariations: RequestHandler = async (req, res) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files?.dress?.[0] || !files?.person?.[0]) {
      return res.status(400).json({ 
        error: 'Both dress and person images are required' 
      });
    }

    const dressFile = files.dress[0];
    const personFile = files.person[0];

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured, returning placeholder results');

      // Return placeholder results for demo purposes
      const placeholderImages = Array.from({ length: 5 }, (_, i) => ({
        id: `placeholder-${i + 1}`,
        url: '/fashion-placeholder.svg',
      }));

      return res.json({
        images: placeholderImages,
        message: 'Demo mode - OpenAI API key not configured'
      });
    }

    // Initialize OpenAI client only when API key is available
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Convert images to base64 for OpenAI Vision API
    const dressBase64 = dressFile.buffer.toString('base64');
    const personBase64 = personFile.buffer.toString('base64');

    // First, use GPT-4 Vision to analyze the uploaded images
    console.log('Analyzing uploaded images with GPT-4 Vision...');

    let imageAnalysis = '';

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

      imageAnalysis = analysisResponse.choices[0]?.message?.content || 'Could not analyze images';
      console.log('Image analysis complete:', imageAnalysis);

    } catch (visionError) {
      console.error('Vision API error:', visionError);
      imageAnalysis = 'Image analysis failed - will use basic generation';
    }

    const poses = [
      "standing straight with arms at sides, front-facing view",
      "three-quarter turn pose with one hand on hip",
      "walking pose with natural arm swing",
      "sitting elegantly on a minimalist stool",
      "side profile pose with arms gracefully positioned"
    ];

    const generatedImages = [];

    // Generate 5 variations with different poses using the analyzed image descriptions
    for (let i = 0; i < 5; i++) {
      try {
        let prompt = '';

        if (imageAnalysis && imageAnalysis !== 'Image analysis failed - will use basic generation') {
          // Use detailed analysis from vision API
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
          // Fallback prompt when vision analysis fails
          prompt = `Create a professional fashion photograph of a model wearing a dress in this pose: ${poses[i]}.

Professional fashion photography style, studio lighting, clean neutral background, high quality, detailed dress design, elegant pose.`;
        }

        console.log(`Generating variation ${i + 1} with pose: ${poses[i]}`);

        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: prompt,
          n: 1,
          size: "1024x1024",
          quality: "hd",
        });

        if (response.data?.[0]?.url) {
          generatedImages.push({
            id: `generated-${i + 1}`,
            url: response.data[0].url,
          });
          console.log(`✅ Successfully generated variation ${i + 1}`);
        } else {
          console.log(`⚠️ No image data received for variation ${i + 1}`);
          generatedImages.push({
            id: `fallback-${i + 1}`,
            url: '/fashion-placeholder.svg',
          });
        }
      } catch (error) {
        console.error(`❌ Error generating image ${i + 1}:`, error);
        // Add placeholder if generation fails
        generatedImages.push({
          id: `fallback-${i + 1}`,
          url: '/fashion-placeholder.svg',
        });
      }
    }

    res.json({ 
      images: generatedImages,
      message: 'Images generated successfully'
    });

  } catch (error) {
    console.error('Error in generate-variations:', error);
    
    // Return placeholder results on error
    const placeholderImages = Array.from({ length: 5 }, (_, i) => ({
      id: `error-placeholder-${i + 1}`,
      url: '/fashion-placeholder.svg',
    }));

    res.status(500).json({ 
      images: placeholderImages,
      error: 'Failed to generate images, showing placeholders',
      message: 'Error occurred during generation'
    });
  }
};
