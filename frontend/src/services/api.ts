import {
  IUser,
  IWorkflow,
  IExecution,
  IDashboardStats,
  IActivityChartPoint,
  IAppDefinition,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  private isRefreshing = false;

  private getToken(): string | null {
    return localStorage.getItem('worksync_token');
  }

  private setToken(token: string | null): void {
    if (token) {
      localStorage.setItem('worksync_token', token);
    } else {
      localStorage.removeItem('worksync_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const response = await fetch(url, {
      credentials: 'include',
      ...options,
      headers,
    });

    // Attempt token refresh on 401 for non-auth requests
    if (response.status === 401 && !isRetry && !endpoint.includes('/auth/')) {
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        try {
          const refreshRes = await this.refresh();
          if (refreshRes.success && refreshRes.token) {
            this.setToken(refreshRes.token);
            this.isRefreshing = false;
            return this.request<T>(endpoint, options, true);
          }
        } catch {
          this.setToken(null);
        } finally {
          this.isRefreshing = false;
        }
      }
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'An unexpected error occurred');
    }

    return data;
  }

  // Auth APIs
  async register(body: { name: string; email: string; password: string; confirmPassword?: string }) {
    return this.request<{ success: boolean; token: string; user: IUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async login(body: { email: string; password: string }) {
    return this.request<{ success: boolean; token: string; user: IUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async demoLogin() {
    return this.request<{ success: boolean; token: string; user: IUser }>('/auth/demo', {
      method: 'POST',
    });
  }

  async refresh() {
    return this.request<{ success: boolean; token: string }>('/auth/refresh', {
      method: 'POST',
    });
  }

  async logout() {
    return this.request<{ success: boolean; message: string }>('/auth/logout', {
      method: 'POST',
    });
  }

  async getMe() {
    return this.request<{ success: boolean; user: IUser }>('/auth/me');
  }

  async updateProfile(body: { name: string }) {
    return this.request<{ success: boolean; user: IUser }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async changePassword(body: { currentPassword: string; newPassword: string }) {
    return this.request<{ success: boolean; message: string }>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async updatePreferences(body: {
    emailNotifications: boolean;
    workflowNotifications: boolean;
    autoRetryFailed: boolean;
  }) {
    return this.request<{ success: boolean; user: IUser }>('/auth/preferences', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  // Workflow APIs
  async getWorkflows(params?: { status?: string; search?: string; sort?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.sort) query.append('sort', params.sort);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ success: boolean; count: number; workflows: IWorkflow[] }>(
      `/workflows${queryString}`
    );
  }

  async getWorkflow(id: string) {
    return this.request<{ success: boolean; workflow: IWorkflow }>(`/workflows/${id}`);
  }

  async createWorkflow(workflow: Partial<IWorkflow>) {
    return this.request<{ success: boolean; workflow: IWorkflow }>('/workflows', {
      method: 'POST',
      body: JSON.stringify(workflow),
    });
  }

  async updateWorkflow(id: string, workflow: Partial<IWorkflow>) {
    return this.request<{ success: boolean; workflow: IWorkflow }>(`/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(workflow),
    });
  }

  async deleteWorkflow(id: string) {
    return this.request<{ success: boolean; message: string }>(`/workflows/${id}`, {
      method: 'DELETE',
    });
  }

  async toggleWorkflow(id: string) {
    return this.request<{ success: boolean; enabled: boolean; workflow: IWorkflow }>(
      `/workflows/${id}/toggle`,
      { method: 'PATCH' }
    );
  }

  async duplicateWorkflow(id: string) {
    return this.request<{ success: boolean; workflow: IWorkflow }>(
      `/workflows/${id}/duplicate`,
      { method: 'POST' }
    );
  }

  async testWorkflow(id: string, triggerData?: Record<string, any>) {
    return this.request<{ success: boolean; execution: IExecution }>(
      `/workflows/${id}/test`,
      {
        method: 'POST',
        body: JSON.stringify({ triggerData }),
      }
    );
  }

  async getWorkflowHistory(id: string) {
    return this.request<{ success: boolean; count: number; executions: IExecution[] }>(
      `/workflows/${id}/history`
    );
  }

  // Execution History APIs
  async getHistory(params?: { status?: string; workflowId?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.workflowId) query.append('workflowId', params.workflowId);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<{
      success: boolean;
      total: number;
      page: number;
      totalPages: number;
      executions: IExecution[];
    }>(`/history${queryString}`);
  }

  async getExecution(id: string) {
    return this.request<{ success: boolean; execution: IExecution }>(`/history/${id}`);
  }

  async clearHistory() {
    return this.request<{ success: boolean; message: string }>('/history', {
      method: 'DELETE',
    });
  }

  // Analytics APIs
  async getDashboardStats() {
    return this.request<{
      success: boolean;
      stats: IDashboardStats;
      recentWorkflows: IWorkflow[];
      recentExecutions: IExecution[];
      activityChart: IActivityChartPoint[];
    }>('/analytics/stats');
  }

  // Apps APIs
  async getApps() {
    return this.request<{ success: boolean; apps: IAppDefinition[] }>('/apps');
  }

  async connectApp(appId: string, authData?: any) {
    return this.request<{ success: boolean; message: string }>(`/apps/${appId}/connect`, {
      method: 'POST',
      body: JSON.stringify({ authData }),
    });
  }

  async disconnectApp(appId: string) {
    return this.request<{ success: boolean; message: string }>(`/apps/${appId}/disconnect`, {
      method: 'POST',
    });
  }
}

export const api = new ApiService();
