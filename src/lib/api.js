const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
function getToken() {
    return localStorage.getItem('gh_token');
}
function getUser() {
    const userStr = localStorage.getItem('gh_user');
    return userStr ? JSON.parse(userStr) : null;
}
export const auth = {
    async login(name) {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        if (!res.ok)
            throw new Error('Login failed');
        const data = await res.json();
        localStorage.setItem('gh_token', data.token);
        localStorage.setItem('gh_user', JSON.stringify(data.user));
        return data;
    },
    async getGitHubAuthUrl() {
        const res = await fetch(`${API_BASE}/api/auth/github`);
        if (!res.ok)
            throw new Error('Failed to get GitHub auth URL');
        const data = await res.json();
        return data.url;
    },
    async session() {
        const token = getToken();
        if (!token)
            return null;
        const res = await fetch(`${API_BASE}/api/auth/session`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok)
            return null;
        const data = await res.json();
        return data.user;
    },
    logout() {
        localStorage.removeItem('gh_token');
        localStorage.removeItem('gh_user');
    },
    getUser() {
        return getUser();
    },
    onGitHubCallback() {
        const token = localStorage.getItem('gh_token');
        const userStr = localStorage.getItem('gh_user');
        if (token && userStr) {
            window.location.reload();
        }
    },
};
export const api = {
    async getComments() {
        const res = await fetch(`${API_BASE}/api/comments`);
        if (!res.ok)
            throw new Error('Failed to fetch comments');
        return res.json();
    },
    async createComment(data) {
        const token = getToken();
        const res = await fetch(`${API_BASE}/api/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        if (!res.ok)
            throw new Error('Failed to create comment');
        return res.json();
    },
    async resolveComment(id, resolved) {
        const token = getToken();
        const res = await fetch(`${API_BASE}/api/comments/${id}/resolve`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ resolved }),
        });
        if (!res.ok)
            throw new Error('Failed to resolve comment');
        return res.json();
    },
    async deleteComment(id) {
        const token = getToken();
        const res = await fetch(`${API_BASE}/api/comments/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok)
            throw new Error('Failed to delete comment');
    },
    async createReply(commentId, data) {
        const token = getToken();
        const res = await fetch(`${API_BASE}/api/comments/${commentId}/replies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        if (!res.ok)
            throw new Error('Failed to create reply');
        return res.json();
    },
    async deleteReply(id) {
        const token = getToken();
        const res = await fetch(`${API_BASE}/api/replies/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok)
            throw new Error('Failed to delete reply');
    },
};
