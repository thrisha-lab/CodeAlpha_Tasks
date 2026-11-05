/**
 * Connectify — end-to-end API test suite.
 * Covers: auth, profiles, posts CRUD, likes, comments, follows, search,
 * notifications, uploads, authorization and validation rules.
 *
 * Run:  node scripts/api-test.mjs
 * Requires the server running on http://localhost:3000
 */
const BASE = process.env.API_URL || 'http://localhost:3000/api';

let passed = 0;
let failed = 0;
const failures = [];

const ok = (name, condition, extra = '') => {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  FAIL  ${name} ${extra}`);
  }
};

const req = async (method, path, { token, body, formData } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !formData) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: formData ?? (body ? JSON.stringify(body) : undefined),
  });
  let data = null;
  try {
    data = await res.json();
  } catch (_) { /* no body */ }
  return { status: res.status, data };
};

const registerUser = async (suffix) => {
  const creds = {
    name: `Test User ${suffix}`,
    username: `test_${suffix}`,
    email: `test_${suffix}@demo.com`,
    password: 'Password123',
  };
  const r = await req('POST', '/auth/register', { body: creds });
  return { ...creds, id: r.data?.data?.user?._id, token: r.data?.data?.token };
};

/** 1x1 transparent PNG */
const pngBlob = () =>
  new Blob(
    [Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')],
    { type: 'image/png' }
  );

// ---------------------------------------------------------------- tests
const main = async () => {
  const stamp = Date.now().toString().slice(-8);
  console.log('\n=== 1. AUTH ===');

  let r = await req('POST', '/auth/register', { body: { name: 'x', username: 'BAD NAME!', email: 'not-an-email', password: '123' } });
  ok('register rejects invalid input (400)', r.status === 400);

  r = await req('POST', '/auth/register', { body: { name: 'Short Pw', username: `shortpw_${stamp}`, email: `shortpw_${stamp}@demo.com`, password: '123' } });
  ok('register rejects short password (400)', r.status === 400);

  const A = await registerUser(`a${stamp}`);
  ok('register creates account (201 + token + user)', !!A.token && !!A.id);

  r = await req('POST', '/auth/register', { body: { ...A, username: `other_${stamp}` } });
  ok('register rejects duplicate email (409)', r.status === 409);

  const B = await registerUser(`b${stamp}`);
  r = await req('POST', '/auth/register', { body: { ...B, email: `unique_${stamp}@demo.com` } });
  ok('register rejects duplicate username (409)', r.status === 409);

  r = await req('POST', '/auth/login', { body: { email: A.email, password: 'WrongPass1' } });
  ok('login rejects wrong password (401)', r.status === 401);

  r = await req('POST', '/auth/login', { body: { email: `ghost_${stamp}@demo.com`, password: 'Whatever1' } });
  ok('login rejects unknown user (401)', r.status === 401);

  r = await req('POST', '/auth/login', { body: { email: A.email, password: A.password } });
  ok('login with email works (200 + token)', r.status === 200 && !!r.data?.data?.token);

  r = await req('POST', '/auth/login', { body: { email: A.username, password: A.password } });
  ok('login with username works (200)', r.status === 200 && !!r.data?.data?.user?.email);

  r = await req('POST', '/auth/login', { body: { email: A.email } });
  ok('login requires password (400)', r.status === 400);

  r = await req('GET', '/auth/me');
  ok('auth/me without token (401)', r.status === 401);
  r = await req('GET', '/auth/me', { token: 'garbage.token.here' });
  ok('auth/me with invalid token (401)', r.status === 401);
  r = await req('GET', '/auth/me', { token: A.token });
  ok('auth/me returns current user', r.status === 200 && r.data?.data?.user?.username === A.username);
  ok('password never leaked in responses', r.data?.data?.user?.password === undefined);

  console.log('\n=== 2. USERS / PROFILE ===');

  r = await req('GET', '/users/username/does_not_exist_xyz', { token: A.token });
  ok('unknown profile (404)', r.status === 404);

  r = await req('GET', `/users/username/${B.username}`, { token: A.token });
  ok('get profile by username (user + isFollowing + isSelf)',
    r.status === 200 && r.data.data.user.username === B.username && r.data.data.isFollowing === false && r.data.data.isSelf === false);

  r = await req('PUT', '/users/me', { token: A.token, body: { name: 'Alex A. Test', bio: 'QA engineer in test mode' } });
  ok('update own profile (200, persisted)', r.status === 200 && r.data.data.user.name === 'Alex A. Test');

  r = await req('PUT', '/users/me', { token: A.token, body: { username: B.username } });
  ok('update to taken username (409)', r.status === 409);

  r = await req('PUT', '/users/me', { token: A.token, body: { username: 'HAS SPACE' } });
  ok('update to invalid username (400)', r.status === 400);

  const fdAvatar = new FormData();
  fdAvatar.append('name', 'Alex A. Test');
  fdAvatar.append('bio', 'QA engineer in test mode');
  fdAvatar.append('email', A.email);
  fdAvatar.append('avatar', pngBlob(), 'avatar.png');
  r = await req('PUT', '/users/me', { token: A.token, formData: fdAvatar });
  ok('avatar upload works (200, /uploads path)', r.status === 200 && r.data.data.user.avatar.startsWith('/uploads/'));
  const avatarPath = r.data?.data?.user?.avatar;
  if (avatarPath) {
    const imgRes = await fetch(`http://localhost:3000${avatarPath}`);
    ok('uploaded avatar is served statically (200 + image)', imgRes.status === 200 && (imgRes.headers.get('content-type') || '').includes('image'));
  }

  const fdBad = new FormData();
  fdBad.append('avatar', new Blob([Buffer.from('plain text, not an image')], { type: 'text/plain' }), 'x.txt');
  r = await req('PUT', '/users/me', { token: A.token, formData: fdBad });
  ok('non-image upload rejected (400)', r.status === 400);

  r = await req('GET', '/users/search?q=test_', { token: A.token });
  ok('user search finds by username prefix', r.status === 200 && r.data.data.users.length >= 1);
  r = await req('GET', '/users/search?q=', { token: A.token });
  ok('empty search query returns empty list', r.status === 200 && r.data.data.users.length === 0);

  console.log('\n=== 3. POSTS ===');

  r = await req('POST', '/posts', { token: A.token, body: { content: '' } });
  ok('create post rejects empty content (400)', r.status === 400);

  r = await req('POST', '/posts', { token: A.token, body: { content: 'x'.repeat(1001) } });
  ok('create post rejects >1000 chars (400)', r.status === 400);

  r = await req('POST', '/posts', { token: A.token, body: { content: `Post A1 by ${A.username}` } });
  const postA1 = r.data?.data?.post;
  ok('create text post (201 + populated author)', r.status === 201 && postA1?.author?.username === A.username && postA1.likedByMe === false);

  r = await req('GET', `/auth/me`, { token: A.token });
  ok('postsCount incremented after create', r.data.data.user.postsCount === 1);

  const fdPost = new FormData();
  fdPost.append('content', 'Post A2 with an image attachment');
  fdPost.append('image', pngBlob(), 'pic.png');
  r = await req('POST', '/posts', { token: A.token, formData: fdPost });
  const postA2 = r.data?.data?.post;
  ok('create post with image upload (201, /uploads path)', r.status === 201 && postA2?.image?.startsWith('/uploads/'));

  r = await req('POST', '/posts', { token: B.token, body: { content: `Post B1 by ${B.username}` } });
  const postB1 = r.data?.data?.post;
  ok('user B can create own post', r.status === 201);

  r = await req('PUT', `/posts/${postA1._id}`, { token: B.token, body: { content: 'hijacked!' } });
  ok('user B cannot edit user A post (403)', r.status === 403);

  r = await req('PUT', `/posts/${postA1._id}`, { token: A.token, body: { content: 'Post A1 edited content' } });
  ok('author can edit own post (200, content updated)', r.status === 200 && r.data.data.post.content === 'Post A1 edited content');

  r = await req('GET', `/posts/${postA1._id}`, { token: B.token });
  ok('get single post (200)', r.status === 200 && r.data.data.post._id === postA1._id);

  r = await req('GET', '/posts?page=1&limit=2', { token: A.token });
  ok('feed paginated with likedByMe flags', r.status === 200 && r.data.data.posts.length === 2 && r.data.data.posts.every((p) => typeof p.likedByMe === 'boolean') && 'hasMore' in r.data.data);
  r = await req('GET', '/posts?page=99&limit=10', { token: A.token });
  ok('feed beyond last page returns empty', r.status === 200 && r.data.data.posts.length === 0);

  console.log('\n=== 4. LIKES ===');

  r = await req('POST', `/posts/${postB1._id}/like`, { token: A.token });
  const likeCount1 = r.data?.data?.likeCount;
  ok('like a post (liked: true, count 1)', r.status === 200 && r.data.data.liked === true && likeCount1 === 1);

  r = await req('POST', `/posts/${postB1._id}/like`, { token: A.token });
  ok('duplicate like prevented (count stays 1)', r.status === 200 && r.data.data.likeCount === 1);

  r = await req('GET', '/notifications', { token: B.token });
  const likeNotif = r.data.data.notifications.find((n) => n.type === 'like' && n.post?._id === postB1._id && n.sender?._id === A.id);
  ok('like created a notification for the author', !!likeNotif);

  r = await req('POST', `/posts/${postA1._id}/like`, { token: A.token });
  ok('self-like works but must not self-notify', r.status === 200);
  r = await req('GET', '/notifications', { token: A.token });
  ok('no self-like notification', !r.data.data.notifications.some((n) => n.type === 'like' && n.sender?._id === A.id));

  r = await req('GET', `/posts/${postB1._id}/likes`, { token: B.token });
  ok('likes list shows the user', r.status === 200 && r.data.data.users.some((u) => u._id === A.id));

  r = await req('DELETE', `/posts/${postB1._id}/like`, { token: A.token });
  ok('unlike works (count back to 0)', r.status === 200 && r.data.data.likeCount === 0);

  r = await req('DELETE', `/posts/${postB1._id}/like`, { token: A.token });
  ok('unlike is idempotent (count stays 0)', r.status === 200 && r.data.data.likeCount === 0);

  r = await req('GET', '/notifications', { token: B.token });
  ok('unlike removed the like notification', !r.data.data.notifications.some((n) => n.type === 'like' && n.post?._id === postB1._id && n.sender?._id === A.id));

  r = await req('POST', '/posts/000000000000000000000000/like', { token: A.token });
  ok('like nonexistent post (404)', r.status === 404);

  console.log('\n=== 5. COMMENTS ===');

  r = await req('POST', '/comments', { token: B.token, body: { postId: postA1._id, text: 'Nice post, Alex!' } });
  const commentB = r.data?.data?.comment;
  ok('add comment (201 + author populated)', r.status === 201 && commentB?.author?.username === B.username);

  r = await req('POST', '/comments', { token: A.token, body: { postId: postA1._id, text: 'My own comment on my post' } });
  const commentA = r.data?.data?.comment;
  ok('comment on own post works', r.status === 201);

  r = await req('POST', '/comments', { token: A.token, body: { postId: postA1._id, text: '' } });
  ok('empty comment rejected (400)', r.status === 400);

  r = await req('POST', '/comments', { token: A.token, body: { text: 'no postId' } });
  ok('comment without postId rejected (400)', r.status === 400);

  r = await req('GET', `/posts/${postA1._id}/comments`, { token: A.token });
  ok('list post comments (2, oldest first)', r.status === 200 && r.data.data.comments.length === 2);

  r = await req('GET', `/auth/me`, { token: A.token });
  r = await req('GET', `/posts/${postA1._id}`, { token: A.token });
  ok('commentCount incremented to 2', r.data.data.post.commentCount === 2);

  r = await req('GET', '/notifications', { token: A.token });
  ok('comment notification created for post author', r.data.data.notifications.some((n) => n.type === 'comment' && n.post?._id === postA1._id && n.sender?._id === B.id));

  r = await req('DELETE', `/comments/${commentB._id}`, { token: A.token });
  ok('cannot delete someone else comment (403)', r.status === 403);

  r = await req('DELETE', `/comments/${commentB._id}`, { token: B.token });
  ok('delete own comment (200)', r.status === 200);

  r = await req('GET', `/posts/${postA1._id}`, { token: A.token });
  ok('commentCount decremented after delete', r.data.data.post.commentCount === 1);

  console.log('\n=== 6. FOLLOWS ===');

  r = await req('POST', `/follows/${A.id}`, { token: A.token });
  ok('self-follow rejected (400)', r.status === 400);

  r = await req('POST', `/follows/${B.id}`, { token: A.token });
  ok('follow user (200, counts updated)', r.status === 200 && r.data.data.following === true && r.data.data.followersCount === 1);

  r = await req('POST', `/follows/${B.id}`, { token: A.token });
  ok('duplicate follow rejected (409)', r.status === 409);

  r = await req('GET', `/users/username/${B.username}`, { token: A.token });
  ok('profile isFollowing flag true after follow', r.data.data.isFollowing === true && r.data.data.user.followersCount === 1);

  r = await req('GET', `/users/username/${B.username}/followers`, { token: A.token });
  ok('followers list contains follower with flags', r.status === 200 && r.data.data.users.some((u) => u._id === A.id && u.isSelf === true));

  r = await req('GET', `/users/username/${A.username}/following`, { token: A.token });
  ok('following list contains target', r.status === 200 && r.data.data.users.some((u) => u._id === B.id));

  r = await req('GET', '/notifications', { token: B.token });
  ok('follow notification created', r.data.data.notifications.some((n) => n.type === 'follow' && n.sender?._id === A.id));

  r = await req('POST', `/follows/not-an-object-id`, { token: A.token });
  ok('follow invalid id rejected (400)', r.status === 400);

  r = await req('DELETE', `/follows/${B.id}`, { token: A.token });
  ok('unfollow (200, counts restored)', r.status === 200 && r.data.data.following === false && r.data.data.followersCount === 0);

  r = await req('DELETE', `/follows/${B.id}`, { token: A.token });
  ok('unfollow again (404 not following)', r.status === 404);

  console.log('\n=== 7. NOTIFICATIONS ===');

  await req('POST', `/posts/${postB1._id}/like`, { token: A.token });
  await req('POST', '/comments', { token: A.token, body: { postId: postB1._id, text: 'Commenting again to notify' } });
  await req('POST', `/follows/${B.id}`, { token: A.token });

  r = await req('GET', '/notifications', { token: B.token });
  const unreadBefore = r.data.data.unreadCount;
  ok('notifications list with unreadCount > 0', r.status === 200 && unreadBefore > 0 && r.data.data.notifications.every((n) => n.sender?.name));

  r = await req('GET', '/notifications/unread-count', { token: B.token });
  ok('unread-count endpoint matches', r.data.data.count === unreadBefore);

  r = await req('PUT', '/notifications/read-all', { token: B.token });
  ok('mark all read (200)', r.status === 200);
  r = await req('GET', '/notifications/unread-count', { token: B.token });
  ok('unread count is 0 after read-all', r.data.data.count === 0);

  r = await req('PUT', '/notifications/000000000000000000000000/read', { token: B.token });
  ok('mark unknown notification read (404)', r.status === 404);

  console.log('\n=== 8. SECURITY / AUTHORIZATION ===');

  r = await req('GET', '/posts');
  ok('protected route without token (401)', r.status === 401);
  r = await req('GET', '/posts', { token: 'forged.token' });
  ok('forged token rejected (401)', r.status === 401);

  r = await req('DELETE', `/posts/${postA1._id}`, { token: B.token });
  ok('user B cannot delete user A post (403)', r.status === 403);

  r = await req('PUT', '/users/me', { token: B.token, body: { name: '<script>alert(1)</script>' } });
  ok('input stored as plain data (React-escaped later)', r.status === 200);
  await req('PUT', '/users/me', { token: B.token, body: { name: B.name } });

  console.log('\n=== 9. POST DELETION CASCADE ===');

  // B likes+comments on A1; then A deletes A1; notification for B about that post must disappear
  await req('POST', `/posts/${postA1._id}/like`, { token: B.token });
  await req('POST', '/comments', { token: B.token, body: { postId: postA1._id, text: 'Will vanish with the post' } });

  r = await req('DELETE', `/posts/${postA1._id}`, { token: A.token });
  ok('author deletes own post (200)', r.status === 200);

  r = await req('GET', `/posts/${postA1._id}`, { token: A.token });
  ok('deleted post returns 404', r.status === 404);

  r = await req('GET', `/posts/${postA1._id}/comments`, { token: A.token });
  ok('deleted post comments return 404 (post gone)', r.status === 404);

  r = await req('GET', '/notifications', { token: B.token });
  ok('notifications about deleted post removed', !r.data.data.notifications.some((n) => n.post?._id === postA1._id));

  r = await req('GET', '/auth/me', { token: A.token });
  ok('postsCount decremented after delete', r.data.data.user.postsCount === 1);

  // cleanup: delete remaining test posts (keeps demo feed tidy)
  await req('DELETE', `/posts/${postA2._id}`, { token: A.token });
  await req('DELETE', `/posts/${postB1._id}`, { token: B.token });

  console.log('\n=== 10. ROUTE ERRORS ===');
  r = await req('GET', '/definitely/not/a/route', { token: A.token });
  ok('unknown API route (404 JSON)', r.status === 404 && r.data?.success === false);

  // ---------------------------------------------------------------- summary
  console.log('\n=============================================');
  console.log(`  RESULT: ${passed} passed, ${failed} failed`);
  if (failures.length) console.log('  Failed tests:\n   - ' + failures.join('\n   - '));
  console.log('=============================================\n');
  process.exit(failed ? 1 : 0);
};

main().catch((e) => {
  console.error('Test runner crashed:', e);
  process.exit(1);
});
