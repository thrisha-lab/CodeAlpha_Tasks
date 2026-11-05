# Connectify API Reference

Base URL: `http://localhost:3000/api` (single-origin) or `http://localhost:5000/api` (dev).

All responses use a consistent envelope:

```json
{ "success": true,  "message": "...", "data": { ... } }   // success
{ "success": false, "message": "why it failed" }          // error
```

**Authentication:** send `Authorization: Bearer <token>` on every private endpoint. Tokens are returned by register/login and expire in 7 days (`JWT_EXPIRES_IN`).

Status codes: `200` OK · `201` Created · `400` Validation error · `401` Unauthenticated · `403` Forbidden (not your resource) · `404` Not found · `409` Conflict (duplicate) · `500` Server error.

---

## /api/auth

| Method | Endpoint | Auth | Body / Params | Returns |
|--------|----------|------|---------------|---------|
| POST | `/auth/register` | — | `{ name, username, email, password }` | `{ user, token }` (201) |
| POST | `/auth/login` | — | `{ email, password }` — email **or** username | `{ user, token }` |
| GET | `/auth/me` | ✅ | — | `{ user }` with live counters |
| POST | `/auth/logout` | ✅ | — | confirmation (stateless JWT — client discards token) |

Validation: name 2-50 chars; username 3-20 `[a-z0-9_]` (unique); valid unique email; password ≥ 6 chars.

---

## /api/users

| Method | Endpoint | Auth | Description | Returns |
|--------|----------|------|-------------|---------|
| PUT | `/users/me` | ✅ | Update profile — `multipart/form-data`: `name`, `username`, `bio`, `email`, optional `avatar` file | `{ user }` |
| GET | `/users/search?q=` | ✅ | Case-insensitive search by name/username (max 10, sorted by followers) | `{ users: [{ ...user, isFollowing, isSelf }] }` |
| GET | `/users/username/:username` | ✅ | Public profile + counters | `{ user, isFollowing, isSelf }` |
| GET | `/users/username/:username/posts` | ✅ | All posts by that user (newest first, with `likedByMe`) | `{ posts, total }` |
| GET | `/users/username/:username/followers` | ✅ | Followers of that user | `{ users, total }` |
| GET | `/users/username/:username/following` | ✅ | Who that user follows | `{ users, total }` |

Every returned user object includes `isFollowing` (relative to the requester) and `isSelf`, so the UI can render the right button state immediately.

---

## /api/posts

| Method | Endpoint | Auth | Description | Returns |
|--------|----------|------|-------------|---------|
| GET | `/posts?page=&limit=` | ✅ | Global feed, newest first (limit ≤ 50, default 10) | `{ posts, page, totalPages, total, hasMore }` |
| POST | `/posts` | ✅ | Create — `multipart/form-data`: `content` (≤1000 chars, required), optional `image` file (or `https://…` URL) | `{ post }` (201) |
| GET | `/posts/:id` | ✅ | Single post with author + `likedByMe` | `{ post }` |
| PUT | `/posts/:id` | ✅ author | Edit content `{ content }` | `{ post }` |
| DELETE | `/posts/:id` | ✅ author | Delete post **+ cascades** likes, comments, notifications, image file | confirmation |
| POST | `/posts/:id/like` | ✅ | Like (idempotent — duplicate returns current state, 200) | `{ liked: true, likeCount }` |
| DELETE | `/posts/:id/like` | ✅ | Unlike (idempotent) | `{ liked: false, likeCount }` |
| GET | `/posts/:id/likes` | ✅ | Users who liked the post | `{ users, total }` |
| GET | `/posts/:postId/comments` | ✅ | Comments oldest-first | `{ comments, total }` |

Feed post objects carry `likedByMe` (batched query — no N+1) and a populated `author { name, username, avatar }`.

---

## /api/comments

| Method | Endpoint | Auth | Description | Returns |
|--------|----------|------|-------------|---------|
| POST | `/comments` | ✅ | `{ postId, text }` (≤300 chars) — notifies the post author | `{ comment }` (201) |
| DELETE | `/comments/:id` | ✅ author | Delete own comment, decrement counter, remove related notifications | confirmation |

---

## /api/follows

| Method | Endpoint | Auth | Description | Returns |
|--------|----------|------|-------------|---------|
| POST | `/follows/:userId` | ✅ | Follow — rejects self-follow (400), duplicates (409); notifies the target | `{ following: true, followersCount }` |
| DELETE | `/follows/:userId` | ✅ | Unfollow — 404 if the relationship doesn't exist; removes the follow notification | `{ following: false, followersCount }` |

---

## /api/notifications

| Method | Endpoint | Auth | Description | Returns |
|--------|----------|------|-------------|---------|
| GET | `/notifications?page=&limit=` | ✅ | Own notifications, newest first; sender/post/comment populated | `{ notifications, unreadCount, page, total, hasMore }` |
| GET | `/notifications/unread-count` | ✅ | Badge count (polled by the navbar every 25s) | `{ count }` |
| PUT | `/notifications/read-all` | ✅ | Mark all read | `{ updated }` |
| PUT | `/notifications/:id/read` | ✅ owner | Mark one read (404 if not yours) | confirmation |

Notification shape:

```json
{
  "_id": "...", "type": "like | comment | follow", "read": false,
  "sender": { "_id": "...", "name": "...", "username": "...", "avatar": "..." },
  "post":   { "_id": "...", "content": "...", "image": "..." },
  "comment":{ "_id": "...", "text": "..." },
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

Self-actions never create notifications; unliking/unfollowing removes the corresponding one.

---

## Static assets

| Path | Description |
|------|-------------|
| `GET /uploads/<file>` | Uploaded images (avatars, post images) — served with long cache headers |
| `GET /*` (non-API) | The built React SPA (single-origin production mode) |

## Error reference

| Scenario | Status | Example message |
|----------|--------|-----------------|
| Missing/short fields | 400 | "Password must be at least 6 characters long" |
| Bad image type | 400 | "Invalid file type. Only JPEG, PNG, GIF and WebP images are allowed" |
| File > 5MB | 400 | "File is too large. Maximum size is 5MB" |
| No/expired/garbage token | 401 | "Authentication required. Please log in" |
| Editing someone's post | 403 | "You are not allowed to edit this post" |
| Unknown user/post/comment | 404 | "Post not found" |
| Duplicate email/username/follow | 409 | "Username \"alex\" is already taken" |
| Unknown route | 404 | "Route not found: GET /api/nope" |
