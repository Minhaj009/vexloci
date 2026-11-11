import { staticFile } from 'remotion';

export function resolveMediaSrc(mediaPath: string): string {
  if (mediaPath.startsWith('http') || mediaPath.startsWith('data:')) {
    return mediaPath;
  }
  return staticFile(mediaPath.replace(/^\/?public\//, ''));
}

export function inferMediaType(
  mediaPath: string,
  declaredType?: 'video' | 'image'
): 'video' | 'image' {
  const lower = mediaPath.toLowerCase();
  if (/\.(mp4|webm|mov|m4v)(\?|$)/.test(lower)) {
    return 'video';
  }
  if (/\.(png|jpe?g|webp|gif|svg)(\?|$)/.test(lower)) {
    return 'image';
  }
  return declaredType ?? 'image';
}
