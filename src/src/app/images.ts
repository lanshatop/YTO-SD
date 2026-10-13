import { authFetch } from "./auth";
import { translate } from "./strings";

export interface HostedImage {
  id: string;
  name: string;
  size: number;
  uploaded: string;
  contentType: string;
  url: string | null;
  markdown: string;
}

export interface ImagesResponse {
  sitesHost: string | null;
  images: HostedImage[];
}

export async function listImages(): Promise<ImagesResponse> {
  const response = await authFetch("/api/images");
  if (!response.ok) throw new Error((await response.text()) || translate("loadImagesFailed"));
  return response.json();
}

export async function uploadImage(file: File): Promise<HostedImage> {
  // Header 值必须是 Latin-1 可编码字符串；中文文件名需 encodeURIComponent，
  // 否则浏览器抛 "Failed to construct 'Headers': String contains non ISO-8859-1 code point"
  const response = await authFetch("/api/images", {
    method: "POST",
    headers: { "X-File-Name": encodeURIComponent(file.name) },
    body: file,
  });
  if (!response.ok) {
    throw new Error((await response.text()) || translate("uploadImageFailed"));
  }
  return response.json();
}

export async function deleteImage(id: string): Promise<void> {
  const response = await authFetch(`/api/images?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error((await response.text()) || translate("deleteImageFailed"));
  }
}
