
import { Song, PlaybackStats, ServerStatus, VibeTag, User, ActiveListener } from './types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

/**
 * Fetch wrapper for the Wavy Radio API.
 * Ensures credentials (session cookies) are always included.
 */
async function wavyFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (options.body instanceof FormData) {
        // @ts-ignore
        delete headers['Content-Type'];
    }

    const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(errorBody || response.statusText);
    }

    // Handle cases where the response might be empty (like 200 OK without body)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T;
    }

    return response.json();
}

export const api = {
    // Auth
    auth: {
        me: () => wavyFetch<User>('/auth/me'),
        login: (body: any) => wavyFetch<User>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
        register: (body: any) => wavyFetch<User>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
        logout: () => wavyFetch('/auth/logout', { method: 'POST' }),
    },

    // Users
    users: {
        leaderboard: () => wavyFetch<User[]>('/users/leaderboard'),
    },

    // Songs
    songs: {
        list: () => wavyFetch<Song[]>('/songs'),
        get: (id: number) => wavyFetch<Song>(`/songs/${id}`),
        search: (query: string) => wavyFetch<Song[]>(`/songs?q=${encodeURIComponent(query)}`),
        upload: (formData: FormData) => wavyFetch('/songs/upload', {
            method: 'POST',
            body: formData,
        }),
        getImageUrl: (id: number) => `${API_BASE_URL}/songs/${id}/image`,
        update: (id: number, data: any) => wavyFetch(`/songs/${id}`, { method: 'POST', body: JSON.stringify(data) }),
        delete: (id: number) => wavyFetch(`/songs/${id}`, { method: 'DELETE' }),
        getTags: (id: number) => wavyFetch<{ tag_id: number, score: number, name: string }[]>(`/songs/${id}/tags`),
        addTag: (id: number, tagId: number, score: number) => wavyFetch(`/songs/${id}/tags`, { method: 'POST', body: JSON.stringify({ tag_id: tagId, score }) }),
        removeTag: (id: number, tagId: number) => wavyFetch(`/songs/${id}/tags/${tagId}`, { method: 'DELETE' }),
    },

    // Albums
    albums: {
        list: () => wavyFetch<{ id: number, title: string }[]>('/albums'),
        create: (title: string) => wavyFetch('/albums', { method: 'POST', body: JSON.stringify({ title }) }),
        update: (id: number, title: string) => wavyFetch(`/albums/${id}`, { method: 'POST', body: JSON.stringify({ title }) }),
        delete: (id: number) => wavyFetch(`/albums/${id}`, { method: 'DELETE' }),
    },

    // Artists
    artists: {
        list: () => wavyFetch<{ id: number, name: string }[]>('/artists'),
        create: (name: string) => wavyFetch('/artists', { method: 'POST', body: JSON.stringify({ name }) }),
        update: (id: number, name: string) => wavyFetch(`/artists/${id}`, { method: 'POST', body: JSON.stringify({ name }) }),
        delete: (id: number) => wavyFetch(`/artists/${id}`, { method: 'DELETE' }),
    },

    // Tags & Search
    tags: {
        list: () => wavyFetch<{ id: number, name: string }[]>('/tags'),
        create: (name: string) => wavyFetch('/tags', { method: 'POST', body: JSON.stringify({ name }) }),
        update: (id: number, name: string) => wavyFetch(`/tags/${id}`, { method: 'POST', body: JSON.stringify({ name }) }),
        delete: (id: number) => wavyFetch(`/tags/${id}`, { method: 'DELETE' }),
        search: (tags: VibeTag[]) => wavyFetch<Song[]>('/tags/search', { method: 'POST', body: JSON.stringify(tags) }),
    },

    // Status
    status: {
        get: () => wavyFetch<ServerStatus>('/status'),
        heartbeat: (client_position_ms: number) =>
            wavyFetch<{ desync_ms: number }>('/heartbeat', { method: 'POST', body: JSON.stringify({ client_position_ms }) }),
    },

    // Listeners
    listeners: {
        list: () => wavyFetch<ActiveListener[]>('/listeners'),
    },

    // Audio Stream URL
    streamUrl: `${API_BASE_URL}/stream`,
};
