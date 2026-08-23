export interface ExtractedStream {
  streamUrl: string;
  headers: Record<string, string>;
  mirrorId: string;
  mirrorName: string;
  channelId: string;
}

export interface ExtractionOptions {
  timeoutMs?: number;
  mirrorId?: string; // If specified, only extract from this mirror
  signal?: AbortSignal;
}
