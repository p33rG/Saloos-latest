import { RequestHandler } from "express";

export const handleImageDownload: RequestHandler = async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Fetch the image from the external URL
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);

    // Set appropriate headers for download
    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', 'attachment; filename="fashion-variation.jpg"');
    
    // Send the image data
    res.send(buffer);

  } catch (error) {
    console.error('Download proxy error:', error);
    res.status(500).json({ error: 'Failed to download image' });
  }
};
