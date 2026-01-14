import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

// ============================================================================
// CONFIGURAÇÃO BASE
// ============================================================================

const api = axios.create({
  baseURL: "/api",
  timeout: 30000, // 30 segundos
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================================
// TIPOS
// ============================================================================

interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition?: (error: AxiosError) => boolean;
}

// ============================================================================
// REQUEST INTERCEPTOR
// ============================================================================

api.interceptors.request.use(
  (config) => {
    // Log da requisição em desenvolvimento
    if (process.env.NODE_ENV === "development") {
      console.log(`🚀 [API] ${config.method?.toUpperCase()} ${config.url}`);
    }

    // Aqui você pode adicionar token de autenticação se necessário
    // const token = getAuthToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }

    return config;
  },
  (error) => {
    console.error("❌ [API] Erro na requisição:", error);
    return Promise.reject(error);
  }
);

// ============================================================================
// RESPONSE INTERCEPTOR
// ============================================================================

api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log da resposta em desenvolvimento
    if (process.env.NODE_ENV === "development") {
      console.log(
        `✅ [API] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`
      );
    }

    return response;
  },
  async (error: AxiosError) => {
    // Extrair informações do erro
    const status = error.response?.status || 0;
    const url = error.config?.url || "unknown";
    const method = error.config?.method?.toUpperCase() || "UNKNOWN";

    // Log do erro
    console.error(`❌ [API] ${method} ${url} - ${status}`, {
      message: error.message,
      data: error.response?.data,
    });

    // Tratamento específico por código de status
    switch (status) {
      case 401:
        // Não autorizado - poderia redirecionar para login
        console.warn("⚠️ [API] Sessão expirada ou não autorizada");
        // window.location.href = '/login'; // Descomente se necessário
        break;

      case 403:
        console.warn("⚠️ [API] Acesso negado");
        break;

      case 404:
        console.warn("⚠️ [API] Recurso não encontrado");
        break;

      case 422:
        console.warn("⚠️ [API] Erro de validação", error.response?.data);
        break;

      case 429:
        console.warn("⚠️ [API] Muitas requisições - aguarde um momento");
        break;

      case 500:
      case 502:
      case 503:
        console.error("❌ [API] Erro no servidor");
        break;

      default:
        if (status === 0) {
          console.error("❌ [API] Erro de rede - verifique sua conexão");
        }
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// HELPER: RETRY LOGIC
// ============================================================================

const defaultRetryConfig: RetryConfig = {
  retries: 3,
  retryDelay: 1000,
  retryCondition: (error: AxiosError) => {
    // Retry apenas em erros de rede ou 5xx
    const status = error.response?.status || 0;
    return status === 0 || status >= 500;
  },
};

export async function apiWithRetry<T = any>(
  config: AxiosRequestConfig,
  retryConfig: Partial<RetryConfig> = {}
): Promise<AxiosResponse<T>> {
  const { retries, retryDelay, retryCondition } = {
    ...defaultRetryConfig,
    ...retryConfig,
  };

  let lastError: AxiosError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await api.request<T>(config);
    } catch (error) {
      lastError = error as AxiosError;

      // Não retry se não atender a condição
      if (retryCondition && !retryCondition(lastError)) {
        throw error;
      }

      // Última tentativa - lançar erro
      if (attempt === retries) {
        throw error;
      }

      // Aguardar antes de tentar novamente
      const delay = retryDelay * (attempt + 1); // Exponential backoff
      console.warn(
        `⚠️ [API] Tentativa ${attempt + 1}/${retries} falhou. Tentando novamente em ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// ============================================================================
// HELPER: ERROR HANDLER
// ============================================================================

export function handleApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;

    return {
      message:
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Erro desconhecido",
      status: axiosError.response?.status || 0,
      errors: axiosError.response?.data?.errors,
    };
  }

  return {
    message: error instanceof Error ? error.message : "Erro desconhecido",
    status: 0,
  };
}

// ============================================================================
// HELPER: TYPED REQUESTS
// ============================================================================

export async function apiGet<T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await api.get<T>(url, config);
  return response.data;
}

export async function apiPost<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await api.post<T>(url, data, config);
  return response.data;
}

export async function apiPut<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await api.put<T>(url, data, config);
  return response.data;
}

export async function apiPatch<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await api.patch<T>(url, data, config);
  return response.data;
}

export async function apiDelete<T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await api.delete<T>(url, config);
  return response.data;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default api;
export type { ApiError, RetryConfig };