export type CloudinaryFolder = "ndcCampusTour" | "ndcPartners";

export interface CloudinaryResource {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  createdAt: string;
}

export interface CloudinaryResponse {
  folder: CloudinaryFolder;
  images: CloudinaryResource[];
  nextCursor?: string;
  hasMore: boolean;
  total: number;
}
