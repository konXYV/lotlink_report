// ✅ helper — resolve image path ใช้ได้ทั้ง absolute URL และ filename
export const resolveImageSrc = (imageUrl?: string | null): string => {
  if (!imageUrl) return "";
  return imageUrl.startsWith("http") ? imageUrl : `/uploads/${imageUrl}`;
};
