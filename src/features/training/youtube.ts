export function getYoutubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace(/^\//, '').split('/')[0] || null;
    }
    if (
      parsed.hostname.includes('youtube.com') ||
      parsed.hostname.includes('youtube-nocookie.com')
    ) {
      const fromQuery = parsed.searchParams.get('v');
      if (fromQuery) {
        return fromQuery;
      }
      const parts = parsed.pathname.split('/').filter(Boolean);
      const embedIndex = parts.indexOf('embed');
      if (embedIndex >= 0 && parts[embedIndex + 1]) {
        return parts[embedIndex + 1];
      }
      const shortsIndex = parts.indexOf('shorts');
      if (shortsIndex >= 0 && parts[shortsIndex + 1]) {
        return parts[shortsIndex + 1];
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function getYoutubeThumbnail(url: string): string {
  const id = getYoutubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
}

export function getYoutubeEmbedUrl(url: string): string | null {
  const id = getYoutubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}
