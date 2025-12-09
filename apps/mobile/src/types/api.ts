export type apiError = {
  message: string;
  statusCode?: number;
  details?: unknown;
};

export type apiResponse<T> = {
  data: T;
  error?: apiError;
};