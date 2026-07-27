import { supabase } from './supabase';

// Book cloud library. One row per (user, book) in `book_cloud_books`;
// `themes` is a jsonb array of theme ids (first entry = the book's cloud).
// Network first, localStorage cache as fallback — same pattern as the
// other data layers, cache-first on save.

const CACHE_KEY = 'book-cloud-library-v1';

const readCache = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(CACHE_KEY));
    return Array.isArray(stored?.books) ? stored.books : [];
  } catch {
    return [];
  }
};

const writeCache = (books) => {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ books }));
};

const toBook = (row) => ({
  id: row.id,
  title: row.title,
  author: row.author || '',
  status: row.status === 'wishlist' ? 'wishlist' : 'read',
  themes: Array.isArray(row.themes) ? row.themes : [],
  rating: Number.isInteger(row.rating) && row.rating >= 1 && row.rating <= 5 ? row.rating : null,
});

export const bookService = {
  // Synchronous cache read for instant first paint.
  getCachedBooks: readCache,

  // Returns { books, offline }. When the table is empty but the local cache
  // isn't (feature used before the schema was run), seeds the server from
  // the cache instead of wiping the local library.
  async getBooks() {
    try {
      const { data, error } = await supabase
        .from('book_cloud_books')
        .select('id, title, author, status, themes, rating')
        .order('title', { ascending: true });
      if (error) throw error;
      const books = (data || []).map(toBook);
      if (!books.length) {
        const cached = readCache();
        if (cached.length) {
          const { ok } = await this.saveBooks(cached, cached);
          return { books: cached, offline: !ok };
        }
      }
      writeCache(books);
      return { books, offline: false };
    } catch (err) {
      console.warn('[bookService] fetch failed, using cache:', err?.message ?? err);
      return { books: readCache(), offline: true };
    }
  },

  // `changed` = only the added/edited books; `allBooks` mirrors the full
  // library into the cache first so the UI survives offline.
  async saveBooks(changed, allBooks) {
    writeCache(allBooks);
    if (!changed.length) return { ok: true };
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('not authenticated');
      const now = new Date().toISOString();
      const rows = changed.map((b) => ({
        user_id: user.id,
        id: b.id,
        title: b.title,
        author: b.author,
        status: b.status,
        themes: b.themes,
        rating: b.rating ?? null,
        updated_at: now,
      }));
      const { error } = await supabase
        .from('book_cloud_books')
        .upsert(rows, { onConflict: 'user_id,id' });
      if (error) throw error;
      return { ok: true };
    } catch (err) {
      console.warn('[bookService] save failed, kept locally:', err?.message ?? err);
      return { ok: false, queued: true };
    }
  },

  async deleteBook(id, allBooks) {
    writeCache(allBooks);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('not authenticated');
      const { error } = await supabase
        .from('book_cloud_books')
        .delete()
        .eq('user_id', user.id)
        .eq('id', id);
      if (error) throw error;
      return { ok: true };
    } catch (err) {
      console.warn('[bookService] delete failed, removed locally:', err?.message ?? err);
      return { ok: false, queued: true };
    }
  },
};
