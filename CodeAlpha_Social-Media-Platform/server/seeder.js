/**
 * Database seeder — wipes all collections and inserts realistic demo data.
 *
 *   npm run seed   (from server/)  or  npm run seed (from repo root)
 *
 * Test account for every seeded user: password = Password123
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Post = require('./models/Post');
const Comment = require('./models/Comment');
const Like = require('./models/Like');
const Follow = require('./models/Follow');
const Notification = require('./models/Notification');

const minutesAgo = (m) => new Date(Date.now() - m * 60 * 1000);

const usersData = [
  { name: 'Alex Rivera', username: 'alex_rivera', email: 'alex@demo.com', password: 'Password123', bio: 'Full-stack developer | React & Node.js. Currently building Connectify as my internship project.', avatar: 'https://i.pravatar.cc/150?img=12' },
  { name: 'Priya Sharma', username: 'priya_sharma', email: 'priya@demo.com', password: 'Password123', bio: 'UI/UX designer. Making pixels pretty from Mumbai.', avatar: 'https://i.pravatar.cc/150?img=47' },
  { name: 'John Chen', username: 'john_chen', email: 'john@demo.com', password: 'Password123', bio: 'Backend engineer. MongoDB, Redis, gRPC and strong opinions about indexes.', avatar: 'https://i.pravatar.cc/150?img=15' },
  { name: 'Sara Ahmed', username: 'sara_ahmed', email: 'sara@demo.com', password: 'Password123', bio: 'CS student | Learning the MERN stack one commit at a time.', avatar: 'https://i.pravatar.cc/150?img=5' },
  { name: 'Mike Torres', username: 'mike_torres', email: 'mike@demo.com', password: 'Password123', bio: 'DevOps guy. If it moves, containerize it.', avatar: 'https://i.pravatar.cc/150?img=33' },
  { name: 'Emma Wilson', username: 'emma_wilson', email: 'emma@demo.com', password: 'Password123', bio: 'Tech blogger & open-source enthusiast.', avatar: 'https://i.pravatar.cc/150?img=44' },
];

const postsData = [
  { author: 'alex_rivera', content: 'Just shipped my internship project — a full-stack social media platform with JWT auth, image uploads, follows and notifications. Built with React, Express and MongoDB. Feedback welcome!', image: 'https://picsum.photos/seed/connectify-app/900/560', createdAt: minutesAgo(25) },
  { author: 'priya_sharma', content: 'Design tip: whitespace is not empty space — it is breathing room for your UI. If everything screams, nothing is heard.', image: '', createdAt: minutesAgo(70) },
  { author: 'john_chen', content: 'TIL: a compound unique index in MongoDB is the cleanest way to prevent duplicate likes. One line in the schema, race-condition free forever.', image: '', createdAt: minutesAgo(140) },
  { author: 'sara_ahmed', content: 'Day 42 of #100DaysOfCode: built the comment section with optimistic UI today. Small wins stack up.', image: '', createdAt: minutesAgo(220) },
  { author: 'mike_torres', content: 'Hardened the API today: helmet headers, rate limiting on auth routes, bcrypt at 12 rounds. Security is not optional, folks.', image: '', createdAt: minutesAgo(300) },
  { author: 'emma_wilson', content: 'New blog post: how I prepared for my full-stack internship — from REST fundamentals to deployment. Link in bio.', image: '', createdAt: minutesAgo(420) },
  { author: 'alex_rivera', content: 'Hot take: naming things is still the hardest problem in computer science. Spent 20 minutes deciding between "followUser" and "addFollow".', image: '', createdAt: minutesAgo(500) },
  { author: 'priya_sharma', content: 'Exploring soft gradient palettes for a social app concept. Which vibe would you pick for a daily-use product?', image: 'https://picsum.photos/seed/connectify-gradient/900/600', createdAt: minutesAgo(610) },
  { author: 'john_chen', content: 'Profiler says the feed endpoint went from 220ms to 18ms after adding two compound indexes. Index your foreign keys, people.', image: '', createdAt: minutesAgo(760) },
  { author: 'sara_ahmed', content: 'Reminder: git commit messages are read by humans. Write them kindly. Your future self is one of those humans.', image: '', createdAt: minutesAgo(900) },
  { author: 'mike_torres', content: 'Weekend rack maintenance done. Ten minutes of aesthetics before the cables betray me again.', image: 'https://picsum.photos/seed/connectify-rack/900/600', createdAt: minutesAgo(1200) },
  { author: 'emma_wilson', content: 'Weekend project idea: build a mini social platform with React, Express and MongoDB. It teaches auth, CRUD, relationships and deployment all at once.', image: '', createdAt: minutesAgo(1500) },
];

const followsGraph = [
  ['alex_rivera', 'priya_sharma'], ['alex_rivera', 'john_chen'], ['alex_rivera', 'emma_wilson'],
  ['priya_sharma', 'alex_rivera'], ['priya_sharma', 'emma_wilson'], ['priya_sharma', 'sara_ahmed'],
  ['john_chen', 'alex_rivera'], ['john_chen', 'mike_torres'],
  ['sara_ahmed', 'alex_rivera'], ['sara_ahmed', 'priya_sharma'], ['sara_ahmed', 'john_chen'], ['sara_ahmed', 'emma_wilson'],
  ['mike_torres', 'john_chen'], ['mike_torres', 'alex_rivera'], ['mike_torres', 'emma_wilson'],
  ['emma_wilson', 'alex_rivera'], ['emma_wilson', 'priya_sharma'],
];

const likesGraph = [
  ['priya_sharma', 0], ['john_chen', 0], ['sara_ahmed', 0], ['mike_torres', 0], ['emma_wilson', 0],
  ['alex_rivera', 1], ['sara_ahmed', 1], ['emma_wilson', 1],
  ['alex_rivera', 2], ['mike_torres', 2], ['sara_ahmed', 2],
  ['alex_rivera', 3], ['emma_wilson', 3],
  ['john_chen', 4], ['alex_rivera', 4],
  ['alex_rivera', 5], ['priya_sharma', 5], ['sara_ahmed', 5],
  ['sara_ahmed', 6],
  ['alex_rivera', 7], ['mike_torres', 7],
  ['alex_rivera', 8],
  ['priya_sharma', 9],
  ['john_chen', 10],
  ['alex_rivera', 11], ['priya_sharma', 11], ['sara_ahmed', 11],
];

const commentsGraph = [
  { post: 0, author: 'priya_sharma', text: 'Looks great! How did you handle the image uploads — multer on the server?' },
  { post: 0, author: 'john_chen', text: 'Nice work. Add compound indexes on the feed query before the data grows.' },
  { post: 0, author: 'sara_ahmed', text: 'This is going straight to my inspiration board.' },
  { post: 2, author: 'mike_torres', text: 'Compound indexes FTW.' },
  { post: 2, author: 'alex_rivera', text: '18ms is wild. How many docs in the collection?' },
  { post: 7, author: 'emma_wilson', text: 'The violet gradient one, no contest.' },
  { post: 7, author: 'sara_ahmed', text: 'Soft UI all the way!' },
  { post: 11, author: 'alex_rivera', text: 'This is literally my internship project stack. Great write-up!' },
  { post: 11, author: 'priya_sharma', text: 'Bookmarked for the weekend.' },
];

const seed = async () => {
  await connectDB();
  console.log('[seed] Clearing existing collections...');
  await Promise.all([
    User.deleteMany({}), Post.deleteMany({}), Comment.deleteMany({}),
    Like.deleteMany({}), Follow.deleteMany({}), Notification.deleteMany({}),
  ]);

  console.log('[seed] Creating users (password hashing runs on create)...');
  const users = {};
  for (const u of usersData) users[u.username] = await User.create(u);
  const userId = (username) => users[username]._id;

  console.log('[seed] Creating posts...');
  const posts = await Post.collection.insertMany(
    postsData.map((p) => ({
      author: userId(p.author),
      content: p.content,
      image: p.image || '',
      likeCount: 0,
      commentCount: 0,
      createdAt: p.createdAt,
      updatedAt: p.createdAt,
    }))
  );
  const postId = (i) => posts.insertedIds[i];

  console.log('[seed] Creating follow relationships + notifications...');
  let step = 0;
  for (const [follower, following] of followsGraph) {
    const follow = await Follow.create({ follower: userId(follower), following: userId(following) });
    await Notification.create({
      recipient: userId(following),
      sender: userId(follower),
      type: 'follow',
      read: step < followsGraph.length / 2, // older half already read
      createdAt: follow.createdAt,
    });
    step += 1;
  }

  console.log('[seed] Creating likes + notifications...');
  for (let i = 0; i < likesGraph.length; i++) {
    const [username, postIdx] = likesGraph[i];
    const like = await Like.create({ user: userId(username), post: postId(postIdx) });
    await Notification.create({
      recipient: postsData[postIdx].author === username ? null : userId(postsData[postIdx].author),
      sender: userId(username),
      type: 'like',
      post: postId(postIdx),
      read: i < likesGraph.length / 2,
      createdAt: like.createdAt,
    }).catch(() => {}); // self-likes are skipped (recipient null is invalid -> ignored)
  }

  console.log('[seed] Creating comments + notifications...');
  for (let i = 0; i < commentsGraph.length; i++) {
    const c = commentsGraph[i];
    const comment = await Comment.create({
      post: postId(c.post),
      author: userId(c.author),
      text: c.text,
    });
    if (postsData[c.post].author !== c.author) {
      await Notification.create({
        recipient: userId(postsData[c.post].author),
        sender: userId(c.author),
        type: 'comment',
        post: postId(c.post),
        comment: comment._id,
        read: i < commentsGraph.length / 2,
        createdAt: comment.createdAt,
      });
    }
  }

  console.log('[seed] Recomputing denormalized counters...');
  for (let i = 0; i < postsData.length; i++) {
    const likeCount = await Like.countDocuments({ post: postId(i) });
    const commentCount = await Comment.countDocuments({ post: postId(i) });
    await Post.updateOne({ _id: postId(i) }, { $set: { likeCount, commentCount } });
  }
  for (const u of usersData) {
    const [followersCount, followingCount, postsCount] = await Promise.all([
      Follow.countDocuments({ following: userId(u.username) }),
      Follow.countDocuments({ follower: userId(u.username) }),
      Post.countDocuments({ author: userId(u.username) }),
    ]);
    await User.updateOne({ _id: userId(u.username) }, { $set: { followersCount, followingCount, postsCount } });
  }

  console.log('----------------------------------------------');
  console.log('[seed] Done! Seeded data:');
  console.log(`   users: ${usersData.length} | posts: ${postsData.length} | likes: ${likesGraph.length} | comments: ${commentsGraph.length} | follows: ${followsGraph.length}`);
  console.log('----------------------------------------------');
  console.log('Test accounts (password for ALL: Password123):');
  usersData.forEach((u) => console.log(`   ${u.email.padEnd(16)} / ${u.username.padEnd(14)} -> ${u.name}`));
  console.log('----------------------------------------------');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
