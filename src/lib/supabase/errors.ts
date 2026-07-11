type SupabaseErrorLike = {
  code?: string;
  message?: string;
};

export function getErrorMessage(caught: unknown, fallback: string): string {
  if (caught instanceof Error) {
    return caught.message;
  }

  if (typeof caught === 'object' && caught !== null && 'message' in caught) {
    const message = (caught as SupabaseErrorLike).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
}

export function isMissingTableError(
  error: SupabaseErrorLike,
  tableName: string,
) {
  const message = error.message?.toLowerCase() ?? '';
  return (
    error.code === 'PGRST205' ||
    message.includes(`'public.${tableName}'`) ||
    message.includes(`public.${tableName}`)
  );
}

export function toServiceError(
  error: SupabaseErrorLike | null,
  fallback: string,
): Error {
  if (!error) {
    return new Error(fallback);
  }

  return new Error(error.message?.trim() || fallback);
}
