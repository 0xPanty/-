// GET /api/cover?fid=<fid>
// Generates anime-style red packet cover using user's avatar via Gemini 2.5 Flash Image
// Returns base64 PNG image

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function fetchUserAvatar(fid) {
  const res = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
    headers: { accept: 'application/json', api_key: NEYNAR_API_KEY },
  });
  if (!res.ok) throw new Error('Failed to fetch user');
  const data = await res.json();
  const user = data.users?.[0];
  if (!user) throw new Error('User not found');
  return {
    pfpUrl: user.pfp_url,
    username: user.username,
    displayName: user.display_name,
  };
}

async function imageUrlToBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch avatar image');
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

async function generateCover(avatarBase64, username) {
  const prompt = `二次元手绘风格，线条简洁流畅，色彩明快柔和。图片里的人物趴在红色桌面后，一只手向前伸出，握着一个红色的红包，背景是红色菱形格纹和中国结装饰，手持的红包底部占满图片下方。人物脸部与图片人物百分百一致，衣服不改变，整体画风统一。红包上有金色圆形装饰，写着"開"字。图片底部显示 @${username}。比例 3:4。`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/png',
                  data: avatarBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: '3:4',
          },
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('Gemini error:', err);
    throw new Error('Gemini image generation failed');
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error('No parts in Gemini response');

  for (const part of parts) {
    if (part.inlineData) {
      return {
        base64: part.inlineData.data,
        mimeType: part.inlineData.mimeType || 'image/png',
      };
    }
  }

  throw new Error('No image in Gemini response');
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { fid } = req.query;
  if (!fid) return res.status(400).json({ error: 'Missing fid parameter' });

  try {
    // 1. Get user avatar from Neynar
    const user = await fetchUserAvatar(fid);

    // 2. Download avatar and convert to base64
    const avatarBase64 = await imageUrlToBase64(user.pfpUrl);

    // 3. Generate cover with Gemini
    const cover = await generateCover(avatarBase64, user.username);

    // 4. Return image
    const imageBuffer = Buffer.from(cover.base64, 'base64');
    res.setHeader('Content-Type', cover.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache 1h
    return res.status(200).send(imageBuffer);
  } catch (err) {
    console.error('Cover generation error:', err);
    return res.status(500).json({ error: err.message || 'Cover generation failed' });
  }
}
