import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Custom SVG Icons to avoid lucide-react virus warning
const UploadIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l1.5 1.5L5 6l1.5 1.5L5 9l1.5 1.5L5 12l1.5 1.5L5 15l1.5 1.5L5 18l1.5 1.5L5 21M19 3l-1.5 1.5L19 6l-1.5 1.5L19 9l-1.5 1.5L19 12l-1.5 1.5L19 15l-1.5 1.5L19 18l-1.5 1.5L19 21M12 2l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2zM8 8l.5 1 1 .5-1 .5L8 11l-.5-1-1-.5 1-.5L8 8zM16 16l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5.5-1z" />
  </svg>
);

const LoaderIcon = ({ className }: { className?: string }) => (
  <svg className={cn("animate-spin", className)} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const ImageIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const DownloadIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

interface GeneratedImage {
  url: string;
  id: string;
}

export default function Index() {
  const [dressImage, setDressImage] = useState<File | null>(null);
  const [personImage, setPersonImage] = useState<File | null>(null);
  const [dressPreview, setDressPreview] = useState<string>("");
  const [personPreview, setPersonPreview] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  const downloadImage = async (imageUrl: string, filename: string, imageId?: string) => {
    if (imageId) {
      setDownloadingIds(prev => new Set(prev).add(imageId));
    }
    try {
      // For local/relative URLs, download directly
      if (imageUrl.startsWith('/') || imageUrl.startsWith(window.location.origin)) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // For external URLs, use our proxy endpoint
      const proxyUrl = `/api/download-image?url=${encodeURIComponent(imageUrl)}`;

      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Convert to blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(`✅ Downloaded: ${filename}`);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(imageUrl, '_blank');
    } finally {
      if (imageId) {
        setDownloadingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(imageId);
          return newSet;
        });
      }
    }
  };

  const downloadAllImages = async () => {
    for (let i = 0; i < generatedImages.length; i++) {
      const image = generatedImages[i];
      const filename = `fashion-variation-${i + 1}.jpg`;

      // Add slight delay between downloads to prevent browser blocking
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      await downloadImage(image.url, filename, image.id);
    }
  };

  const handleFileUpload = (file: File, type: 'dress' | 'person') => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      if (type === 'dress') {
        setDressImage(file);
        setDressPreview(preview);
      } else {
        setPersonImage(file);
        setPersonPreview(preview);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent, type: 'dress' | 'person') => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        handleFileUpload(file, type);
      }
    }
  };

  const handleGenerate = async () => {
    if (!dressImage || !personImage) return;
    
    setIsGenerating(true);
    setGeneratedImages([]);

    try {
      const formData = new FormData();
      formData.append('dress', dressImage);
      formData.append('person', personImage);

      const response = await fetch('/api/generate-variations', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to generate images');
      }

      const data = await response.json();
      setGeneratedImages(data.images);
    } catch (error) {
      console.error('Error generating images:', error);
      // For demo purposes, show placeholder results
      const placeholderImages = Array.from({ length: 5 }, (_, i) => ({
        id: `placeholder-${i}`,
        url: `/placeholder.svg`,
      }));
      setGeneratedImages(placeholderImages);
    } finally {
      setIsGenerating(false);
    }
  };

  const UploadArea = ({ 
    type, 
    preview, 
    onFileSelect 
  }: { 
    type: 'dress' | 'person'; 
    preview: string; 
    onFileSelect: (file: File) => void;
  }) => (
    <Card className="group relative overflow-hidden border-2 border-dashed border-gray-300 hover:border-purple-400 transition-all duration-300">
      <CardContent className="p-6">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div
          className="min-h-[200px] flex flex-col items-center justify-center text-center"
          onDrop={(e) => handleDrop(e, type)}
          onDragOver={(e) => e.preventDefault()}
        >
          {preview ? (
            <div className="relative w-full h-full">
              <img
                src={preview}
                alt={`${type} preview`}
                className="w-full h-48 object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 rounded-lg flex items-center justify-center">
                <UploadIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ) : (
            <>
              <ImageIcon className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="font-semibold text-gray-700 mb-2 capitalize">
                Upload {type} Image
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {type === 'dress' 
                  ? 'Upload an image of the dress you want to use' 
                  : 'Upload an image of the person/model'
                }
              </p>
              <div className="flex items-center gap-2 text-sm text-purple-600">
                <UploadIcon className="w-4 h-4" />
                Click or drag to upload
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Saloos Models
            </h1>
            <span className="text-sm text-gray-500 hidden sm:block">
              AI-Powered Fashion Generator
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Generate Fashion Variations with{" "}
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              AI Magic
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload a dress and a person image, and watch our AI create 5 stunning variations 
            with different poses and styles.
          </p>
        </div>

        {/* Upload Section */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <UploadArea
              type="dress"
              preview={dressPreview}
              onFileSelect={(file) => handleFileUpload(file, 'dress')}
            />
            <UploadArea
              type="person"
              preview={personPreview}
              onFileSelect={(file) => handleFileUpload(file, 'person')}
            />
          </div>

          {/* Generate Button */}
          <div className="text-center">
            <Button
              onClick={handleGenerate}
              disabled={!dressImage || !personImage || isGenerating}
              size="lg"
              className={cn(
                "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700",
                "text-white font-semibold px-8 py-3 text-lg min-w-[200px]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isGenerating ? (
                <>
                  <LoaderIcon className="w-5 h-5 mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5 mr-2" />
                  Generate Variations
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Results Section */}
        {(isGenerating || generatedImages.length > 0) && (
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-gray-900">
                Generated Variations
              </h3>
              {generatedImages.length > 0 && !isGenerating && (
                <Button
                  onClick={downloadAllImages}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <DownloadIcon className="w-4 h-4" />
                  Download All ({generatedImages.length})
                </Button>
              )}
            </div>
            
            {isGenerating ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="aspect-[3/4] bg-gray-200 animate-pulse flex items-center justify-center">
                        <LoaderIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {generatedImages.map((image, index) => (
                  <Card key={image.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      <div className="aspect-[3/4] relative">
                        <img
                          src={image.url}
                          alt={`Generated variation ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white text-gray-900 font-medium"
                            onClick={() => downloadImage(image.url, `fashion-variation-${index + 1}.jpg`, image.id)}
                            disabled={downloadingIds.has(image.id)}
                          >
                            {downloadingIds.has(image.id) ? (
                              <LoaderIcon className="w-4 h-4 mr-2" />
                            ) : (
                              <DownloadIcon className="w-4 h-4 mr-2" />
                            )}
                            {downloadingIds.has(image.id) ? 'Downloading...' : 'Download'}
                          </Button>
                        </div>
                      </div>
                      {/* Always visible download button at bottom */}
                      <div className="p-3 bg-white border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-sm"
                          onClick={() => downloadImage(image.url, `fashion-variation-${index + 1}.jpg`, image.id)}
                          disabled={downloadingIds.has(image.id)}
                        >
                          {downloadingIds.has(image.id) ? (
                            <LoaderIcon className="w-4 h-4 mr-2" />
                          ) : (
                            <DownloadIcon className="w-4 h-4 mr-2" />
                          )}
                          {downloadingIds.has(image.id) ? 'Downloading...' : `Download Pose ${index + 1}`}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isGenerating && generatedImages.length === 0 && (dressImage || personImage) && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SparklesIcon className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-gray-600">
              Upload both images and click generate to see the magic happen!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
