import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Request, Response } from 'express';

const PORT = 3000;
const app = express();

app.use(express.json({ limit: '15mb' }));

const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(
  '/uploads',
  express.static(uploadsDir, {
    maxAge: '365d',
    immutable: true,
  }),
);

interface FirebaseConfigFile {
  apiKey?: string;
}

function getFirebaseApiKey(): string {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    return '';
  }
  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw) as FirebaseConfigFile;
  return parsed.apiKey || '';
}

const ADMIN_EMAILS = new Set(['evoljaat@gmail.com']);

async function verifyAdminToken(authHeader: string | undefined): Promise<{ ok: boolean; email?: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false };
  }
  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) {
    return { ok: false };
  }
  const apiKey = getFirebaseApiKey();
  if (!apiKey) {
    return { ok: false };
  }

  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      },
    );
    if (!resp.ok) {
      return { ok: false };
    }
    const data = (await resp.json()) as {
      users?: Array<{ email?: string; emailVerified?: boolean }>;
    };
    const user = data.users?.[0];
    if (!user || !user.email || !user.emailVerified) {
      return { ok: false };
    }
    if (!ADMIN_EMAILS.has(user.email.toLowerCase())) {
      return { ok: false };
    }
    return { ok: true, email: user.email };
  } catch {
    return { ok: false };
  }
}

const ALLOWED_MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

app.post('/api/upload', async (req: Request, res: Response) => {
  const authResult = await verifyAdminToken(req.headers.authorization);
  if (!authResult.ok) {
    res.status(403).json({ error: 'केवल अधिकृत एडमिन ही फ़ोटो अपलोड कर सकते हैं।' });
    return;
  }

  const body = req.body as { dataUrl?: string; filename?: string };
  if (!body || typeof body.dataUrl !== 'string') {
    res.status(400).json({ error: 'अमान्य इमेज डेटा।' });
    return;
  }

  const match = /^data:(image\/[a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(body.dataUrl);
  if (!match) {
    res.status(400).json({ error: 'कृपया वैध JPG, PNG या WEBP इमेज चुनें।' });
    return;
  }

  const mimeType = match[1].toLowerCase();
  const ext = ALLOWED_MIME_EXT[mimeType];
  if (!ext) {
    res.status(400).json({ error: 'केवल JPG, PNG, WEBP और GIF फ़ोटो समर्थित हैं।' });
    return;
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 8 * 1024 * 1024) {
    res.status(413).json({ error: 'फ़ोटो का आकार 8MB से कम होना चाहिए।' });
    return;
  }

  const uniqueName = `img_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
  const targetPath = path.join(uploadsDir, uniqueName);
  fs.writeFileSync(targetPath, buffer);

  const relativeUrl = `/uploads/${uniqueName}`;
  res.json({
    url: relativeUrl,
    filename: uniqueName,
    size: buffer.length,
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
