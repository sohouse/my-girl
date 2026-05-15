export type StorageScene = "custom-character-avatar" | "ai-generated-image";

export type StorageProvider = "local-public" | "r2";

export type SavedFile = {
  key: string;
  url: string;
  provider: StorageProvider;
  contentType: string;
  size: number;
};

export type SaveGeneratedImageInput = {
  userId: string;
  scene: "ai-generated-image";
  bytes: Uint8Array;
  contentType: string;
};

export type SaveGeneratedImage = (input: SaveGeneratedImageInput) => Promise<SavedFile>;
