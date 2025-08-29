import { Alert, AlertDescription } from "@/components/ui/alert";

const InfoIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export function ApiKeyNotice() {
  return (
    <Alert className="mb-8 border-blue-200 bg-blue-50">
      <InfoIcon className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-800">
        <strong>Demo Mode:</strong> To enable real AI image generation, add your OpenAI API key to the environment variables. 
        Currently showing placeholder results for demonstration purposes.
      </AlertDescription>
    </Alert>
  );
}
