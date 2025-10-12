import ChatMessage from "../model/chatMessage.model.js";
import ChatSession from "../model/chatSession.model.js";
import ChatHandoff from "../model/chatHandoff.model.js";
import { sendEmail } from "../utils/email.js";

export const saveMessage = async (req, res) => {
  try {
    const { sessionId, userId, role, text, ts, meta } = req.body;
    if (!sessionId || !role || !text) {
      return res.status(400).json({ success: false, message: "sessionId, role and text are required" });
    }
    const when = ts ? new Date(ts) : new Date();
    const doc = await ChatMessage.create({ sessionId, userId: userId || req.user?.id, role, text, ts: when, meta });

    // Upsert/update session
    const inc = role === 'bot' ? { unreadForUser: 1 } : role === 'user' ? { unreadForAgent: 1 } : {};
    await ChatSession.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          sessionId,
          userId: userId || req.user?.id || undefined,
          lastMessageAt: when,
          lastMessageRole: role,
          status: 'open',
        },
        $inc: inc,
      },
      { upsert: true, new: true }
    );
    return res.json({ success: true, data: doc });
  } catch (err) {
    console.error("saveMessage error", err);
    return res.status(500).json({ success: false, message: "Failed to save message" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { sessionId, limit = 200 } = req.query;
    if (!sessionId) return res.status(400).json({ success: false, message: "sessionId is required" });
    const docs = await ChatMessage.find({ sessionId }).sort({ ts: 1 }).limit(Number(limit));
    // Reset unread for user if they are fetching (assume frontend fetch indicates user viewing)
    await ChatSession.updateOne({ sessionId }, { $set: { unreadForUser: 0 } });
    return res.json({ success: true, data: docs });
  } catch (err) {
    console.error("getMessages error", err);
    return res.status(500).json({ success: false, message: "Failed to fetch messages" });
  }
};

export const endSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, message: "sessionId is required" });
    // Optional: could mark session in a separate collection. For now, append a system message.
    const now = new Date();
    const sys = await ChatMessage.create({ sessionId, role: 'system', text: 'Chat ended by user', ts: now });
    await ChatSession.findOneAndUpdate(
      { sessionId },
      { $set: { status: 'closed', closedAt: now, lastMessageAt: now, lastMessageRole: 'system', unreadForUser: 0 } },
      { upsert: true }
    );
    return res.json({ success: true, data: sys });
  } catch (err) {
    console.error("endSession error", err);
    return res.status(500).json({ success: false, message: "Failed to end session" });
  }
};

export const listSessions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const cursor = ChatSession.find(filter).sort({ lastMessageAt: -1 });
    const docs = await cursor.skip((Number(page) - 1) * Number(limit)).limit(Number(limit));
    const total = await ChatSession.countDocuments(filter);
    return res.json({ success: true, data: docs, total });
  } catch (err) {
    console.error('listSessions error', err);
    return res.status(500).json({ success: false, message: 'Failed to list sessions' });
  }
};

export const createHandoff = async (req, res) => {
  try {
    const { sessionId, reason } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, message: 'sessionId is required' });
    const handoff = await ChatHandoff.create({ sessionId, userId: req.user?.id, reason, status: 'open' });

    // Fire-and-forget admin email notification (do not block response on email failure)
    (async () => {
      try {
        const adminTo = process.env.ADMIN_EMAIL;
        if (!adminTo) {
          console.warn('No ADMIN_EMAIL/SMTP_USER configured; skipping handoff email notification');
          return;
        }

        // Try to gather a bit more context about the session/user
        let session = await ChatSession.findOne({ sessionId }).lean().exec();
        const subject = `New Callback Request (Handoff) - Session ${sessionId}`;
        const userEmail = req.user?.email || session?.userEmail || 'unknown';
        const userId = (req.user?.id || session?.userId || '').toString();
        const html = `
          <div style="font-family: Arial, sans-serif; line-height:1.6;">
            <h2>New Callback Request</h2>
            <p>A user has requested a callback from the LMS chat widget.</p>
            <h3>Details</h3>
            <ul>
              <li><strong>Session ID:</strong> ${sessionId}</li>
              <li><strong>User ID:</strong> ${userId || 'N/A'}</li>
              <li><strong>User Email:</strong> ${userEmail}</li>
              <li><strong>Reason:</strong> ${reason || 'Not provided'}</li>
              <li><strong>Status:</strong> open</li>
              <li><strong>Created At:</strong> ${new Date().toLocaleString()}</li>
            </ul>
            <p>Please review and reach out to the user.</p>
          </div>
        `;
        await sendEmail({ to: adminTo, subject, html });
      } catch (notifyErr) {
        console.error('Failed to send admin handoff email:', notifyErr);
      }
    })();

    return res.json({ success: true, data: handoff });
  } catch (err) {
    console.error('createHandoff error', err);
    return res.status(500).json({ success: false, message: 'Failed to create handoff' });
  }
};

export const listHandoffs = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const docs = await ChatHandoff.find(filter).sort({ createdAt: -1 }).populate('claimedBy', 'email role');
    return res.json({ success: true, data: docs });
  } catch (err) {
    console.error('listHandoffs error', err);
    return res.status(500).json({ success: false, message: 'Failed to list handoffs' });
  }
};

export const claimHandoff = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await ChatHandoff.findByIdAndUpdate(
      id,
      { $set: { status: 'claimed', claimedBy: req.user?._id } },
      { new: true }
    );
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('claimHandoff error', err);
    return res.status(500).json({ success: false, message: 'Failed to claim handoff' });
  }
};

export const closeHandoff = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await ChatHandoff.findByIdAndUpdate(
      id,
      { $set: { status: 'closed' } },
      { new: true }
    );
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('closeHandoff error', err);
    return res.status(500).json({ success: false, message: 'Failed to close handoff' });
  }
};
