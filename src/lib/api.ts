const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface User {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
}

export interface Comment {
  id: string;
  content: string;
  selectedText: string;
  userId: string;
  userName: string;
  userImage?: string;
  resolved: boolean;
  createdAt: string;
  replies: Reply[];
}

export interface Reply {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userImage?: string;
  createdAt: string;
}

export interface CreateCommentData {
  content: string;
  selectedText: string;
}

export interface CreateReplyData {
  content: string;
}

function getToken(): string | null {
  return localStorage.getItem('gh_token');
}

function getUser(): User | null {
  const userStr = localStorage.getItem('gh_user');
  return userStr ? JSON.parse(userStr) : null;
}

export const auth = {
  async login(name: string): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    localStorage.setItem('gh_token', data.token);
    localStorage.setItem('gh_user', JSON.stringify(data.user));
    return data;
  },

  async session(): Promise<User | null> {
    const token = getToken();
    if (!token) return null;
    return getUser();
  },

  logout(): void {
    localStorage.removeItem('gh_token');
    localStorage.removeItem('gh_user');
  },

  getUser(): User | null {
    return getUser();
  },

  onGitHubCallback(): void {
    const token = localStorage.getItem('gh_token');
    const userStr = localStorage.getItem('gh_user');
    if (token && userStr) {
      window.location.reload();
    }
  },
};

export const api = {
  async getComments(): Promise<Comment[]> {
    const res = await fetch(`${API_BASE}/api/comments`);
    if (!res.ok) throw new Error('Failed to fetch comments');
    return res.json();
  },

  async createComment(data: CreateCommentData): Promise<Comment> {
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create comment');
    return res.json();
  },

  async resolveComment(id: string, resolved: boolean): Promise<Comment> {
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/comments/${id}/resolve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ resolved }),
    });
    if (!res.ok) throw new Error('Failed to resolve comment');
    return res.json();
  },

  async deleteComment(id: string): Promise<void> {
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/comments/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete comment');
  },

  async createReply(commentId: string, data: CreateReplyData): Promise<Reply> {
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/comments/${commentId}/replies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create reply');
    return res.json();
  },

  async deleteReply(id: string): Promise<void> {
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/replies/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete reply');
  },
};
