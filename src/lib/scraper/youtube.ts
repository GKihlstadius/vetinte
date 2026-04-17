export interface TranscriptResult {
  videoId: string;
  text: string;
}

export async function fetchTranscript(_videoId: string): Promise<TranscriptResult> {
  throw new Error(
    'YouTube transcript fetching is not implemented. Providers break frequently — revisit with a robust client or supply transcripts manually.'
  );
}
