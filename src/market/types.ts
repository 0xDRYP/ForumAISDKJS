export interface ChatMessage {
  role: string;
  content: string;
}

export interface HostInfo {
  url: string;
  hostAccount: string;
  price: bigint;
}
