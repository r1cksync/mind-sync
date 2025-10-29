import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import Sentiment from 'sentiment';

const sentiment = new Sentiment();

const client = jwksClient({
  jwksUri: 'https://intimate-jaguar-48.clerk.accounts.dev/.well-known/jwks.json',
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000,
});

const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
    } else {
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    }
  });
};

export async function POST(req) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let userId;
  try {
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(token, getKey, { issuer: 'https://intimate-jaguar-48.clerk.accounts.dev' }, (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded);
        }
      });
    });
    userId = decoded.sub;
  } catch (error) {
    console.log('Token verification failed:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch YouTube access token from Flask backend
  const tokenResponse = await fetch('http://localhost:5000/api/get-youtube-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    return NextResponse.json({ error: 'No YouTube access token found' }, { status: 404 });
  }
  const accessToken = tokenData.access_token;

  // Fetch liked videos (last 60 days)
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  let likedVideos = [];
  let nextPageToken = '';
  do {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&myRating=like&maxResults=50&pageToken=${nextPageToken}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const data = await response.json();
    if (data.error) {
      console.error('Error fetching liked videos:', data.error);
      return NextResponse.json({ error: 'Failed to fetch liked videos' }, { status: 500 });
    }
    const recentVideos = data.items.filter((item) => new Date(item.snippet.publishedAt) >= new Date(sixtyDaysAgo));
    likedVideos = likedVideos.concat(recentVideos);
    nextPageToken = data.nextPageToken || '';
  } while (nextPageToken && likedVideos.length < 50); // Limit to 50 videos for analysis

  // Fetch video details and comments
  const videoDetails = [];
  for (const video of likedVideos) {
    const videoId = video.id;
    const title = video.snippet.title;
    const description = video.snippet.description || '';
    const categoryId = video.snippet.categoryId;

    // Fetch comments
    const commentsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=20`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const commentsData = await commentsResponse.json();
    const comments = commentsData.items?.map((item) => item.snippet.topLevelComment.snippet.textDisplay) || [];

    // Perform sentiment analysis on title, description, and comments
    const textToAnalyze = `${title} ${description} ${comments.join(' ')}`;
    const sentimentResult = sentiment.analyze(textToAnalyze);
    const sentimentScore = sentimentResult.score;

    // Categorize the video based on sentiment and category
    let emotionalCategory;
    if (sentimentScore < -2) {
      emotionalCategory = 'sad'; // Negative sentiment
    } else if (sentimentScore > 2) {
      emotionalCategory = 'happy'; // Positive sentiment
    } else if (['1', '17', '20', '23', '24'].includes(categoryId)) {
      emotionalCategory = 'energetic'; // Film, Sports, Gaming, Comedy, Entertainment
    } else if (['10', '15', '19', '27'].includes(categoryId)) {
      emotionalCategory = 'calm'; // Music, Pets, Travel, Education
    } else {
      emotionalCategory = sentimentScore >= 0 ? 'happy' : 'sad'; // Default based on sentiment
    }

    videoDetails.push({
      videoId,
      title,
      sentimentScore,
      emotionalCategory,
    });
  }

  // Calculate metrics
  const sadCount = videoDetails.filter((v) => v.emotionalCategory === 'sad').length;
  const happyCount = videoDetails.filter((v) => v.emotionalCategory === 'happy').length;
  const energeticCount = videoDetails.filter((v) => v.emotionalCategory === 'energetic').length;
  const calmCount = videoDetails.filter((v) => v.emotionalCategory === 'calm').length;
  const totalVideos = videoDetails.length;
  const metrics = {
    sadCount,
    happyCount,
    energeticCount,
    calmCount,
    totalVideos,
    videos: videoDetails,
  };

  // Generate report using Open Router
  const reportPrompt = `
    You are a mental health analyst. Based on the following analysis of a user's YouTube liked videos over the last 60 days, generate a detailed mental health report. The videos have been categorized into emotional categories: sad (0), happy (1), energetic (2), and calm (3). Here are the metrics:
    - Total videos liked: ${totalVideos}
    - Sad videos: ${sadCount}
    - Happy videos: ${happyCount}
    - Energetic videos: ${energeticCount}
    - Calm videos: ${calmCount}
    Provide an analysis of the user's emotional stability and overall mental health based on these metrics. Highlight any potential concerns (e.g., high number of sad videos might indicate emotional distress) and offer suggestions for improving mental well-being. Keep the tone empathetic and supportive, and emphasize that this is not a professional diagnosis but a reflection of their social media activity.
  `;
  const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPEN_ROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.1-8b-instruct',
      messages: [{ role: 'user', content: reportPrompt }],
    }),
  });
  const openRouterData = await openRouterResponse.json();
  const report = openRouterData.choices[0].message.content;

  // Save the report to Flask backend
  await fetch('http://localhost:5000/api/save-youtube-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      metrics,
      report,
    }),
  });

  return NextResponse.json({ metrics, report });
}