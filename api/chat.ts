import { desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { chatMessages } from '../db/schema.js';
import { handleChatWithGemini } from '../server/geminiService.js';

const topics = [
  ['Quyền riêng tư dữ liệu', ['riêng tư', 'dữ liệu', 'thông tin cá nhân', 'privacy']],
  ['Bản quyền', ['bản quyền', 'đạo văn', 'trích dẫn', 'copyright']],
  ['AI trong giáo dục', ['học', 'sinh viên', 'giáo dục', 'bài tập', 'giảng viên']],
  ['AI trong doanh nghiệp', ['doanh nghiệp', 'nhân sự', 'tuyển dụng', 'khách hàng']],
  ['AI tạo nội dung', ['tạo nội dung', 'hình ảnh', 'video', 'deepfake']],
  ['Rủi ro và trách nhiệm', ['rủi ro', 'trách nhiệm', 'an toàn', 'thiên vị', 'công bằng']],
] as const;

function classifyTopic(content: string) {
  const normalized = content.toLocaleLowerCase('vi');
  return topics.find(([, keywords]) => keywords.some((word) => normalized.includes(word)))?.[0] ?? 'Đạo đức AI tổng quát';
}

function validSessionId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

    try {
      const body = await req.json() as { sessionId?: unknown; message?: unknown };
      if (!validSessionId(body.sessionId) || typeof body.message !== 'string') {
        return Response.json({ error: 'Dữ liệu trò chuyện không hợp lệ.' }, { status: 400 });
      }

      const content = body.message.trim().slice(0, 4000);
      if (!content) return Response.json({ error: 'Tin nhắn đang trống.' }, { status: 400 });

      const topic = classifyTopic(content);
      const history = await db.select({ role: chatMessages.role, content: chatMessages.content })
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, body.sessionId))
        .orderBy(desc(chatMessages.createdAt))
        .limit(23);

      const recentHistory = history.reverse();
      const reply = await handleChatWithGemini([...recentHistory, { role: 'user', content }].map((item) => ({
        role: item.role === 'assistant' ? 'model' : 'user',
        content: item.content,
      })));
      await db.insert(chatMessages).values({ sessionId: body.sessionId, role: 'user', content, topic });
      await db.insert(chatMessages).values({ sessionId: body.sessionId, role: 'assistant', content: reply, topic });

      return Response.json({ reply, topic });
    } catch (error) {
      console.error('AI ethics chat failed', error instanceof Error ? error.name : 'Unknown error');
      return Response.json({ error: 'Trợ lý đang tạm gián đoạn. Vui lòng thử lại sau.' }, { status: 500 });
    }
  },
};