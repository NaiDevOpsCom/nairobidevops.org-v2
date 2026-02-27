export type CloudinaryFolder = "ndcCampusTour" | "ndcPartners" | "community";

export interface CloudinaryResource {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  createdAt: string;
}

export interface CloudinaryResponse {
  resources: CloudinaryResource[];
  nextCursor?: string;
  totalCount: number;
}
