// Provides authenticated endpoints for sending and retrieving email data.
// Provides authenticated endpoints for sending and retrieving email data.
import express from 'express';
import authMiddleware from '../Middleware/auth.js';
import { sendMail } from '../mailer.js';
import Users from '../Models/Users.js';
import Conversation from '../Models/Conversation.js';
import Message from '../Models/Message.js';
import { getMailboxAddress } from '../mailbox.js';
import sanitizeEmailHtml, { emailHtmlToText } from '../sanitizeEmailHtml.js';

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function parseAttachments(value) {
    if (value === undefined) return [];
    if (!Array.isArray(value)) throw new Error('Attachments must be a list');

    let totalBytes = 0;
    return value.map((attachment) => {
        if (!attachment || typeof attachment.filename !== 'string' || typeof attachment.content !== 'string') {
            throw new Error('Each attachment needs a filename and file content');
        }
        if (attachment.content.length > Math.ceil(MAX_ATTACHMENT_BYTES / 3) * 4 || !BASE64_PATTERN.test(attachment.content)) {
            throw new Error('An attachment has invalid file content');
        }

        const content = Buffer.from(attachment.content, 'base64');
        totalBytes += content.length;
        if (!attachment.filename.trim() || content.length > MAX_ATTACHMENT_BYTES || totalBytes > MAX_ATTACHMENT_BYTES) {
            throw new Error('Attachments must total 8 MB or less');
        }

        const filename = attachment.filename.trim().replace(/[\\/\0-\x1f\x7f]/g, '_').slice(0, 255);
        const contentType = typeof attachment.contentType === 'string' && /^[\w.+-]+\/[\w.+-]+$/.test(attachment.contentType)
            ? attachment.contentType
            : 'application/octet-stream';
        return { filename, contentType, content };
    });
}

const router = express.Router();
export function createEmailRouter({
    sendMailMessage = sendMail,
    UsersModel = Users,
    ConversationModel = Conversation,
    MessageModel = Message,
} = {}) {
const router = express.Router();

function getRecipientState(message, phone) {
    return typeof message.recipientState?.get === 'function'
        ? message.recipientState.get(phone)
        : message.recipientState?.[phone];
}

function getUserFolder(message, phone, address) {
    if (message.to?.some((recipient) => recipient.toLowerCase() === address)) {
        return getRecipientState(message, phone)?.folder || 'inbox';
    }
    if (message.from?.toLowerCase() === address) {
        return message.senderState?.folder || 'sent';
    }
    return null;
}

function isInFolder(message, phone, address, folder) {
    const messageFolder = getUserFolder(message, phone, address);
    if (folder === 'conversations') return messageFolder === 'inbox' || messageFolder === 'sent';
    return messageFolder === folder;
}

function parseFolder(value) {
    return ['conversations', 'spam', 'trash'].includes(value) ? value : 'conversations';
}

//endpoint to send email using smtp server created.
router.post('/send-email', authMiddleware, async (req, res) => {
    const { to, subject, text, html } = req.body;
    const recipients = (Array.isArray(to) ? to : typeof to === 'string' ? to.split(',') : [])
        .map((address) => typeof address === 'string' ? address.trim() : '')
        .filter(Boolean);
    const safeHtml = typeof html === 'string' ? sanitizeEmailHtml(html) : '';
    const plainText = typeof text === 'string' ? text.trim() : '';
    if (!recipients.length || typeof subject !== 'string' || !subject.trim() || (!plainText && !safeHtml)) {
        return res.status(400).json({
            success: false,
            message: "Provide at least one recipient, a subject, and message text",
        });
    }

    const domain = (process.env.DOMAIN || 'phonemail.test').trim().toLowerCase();
    for (const recipient of recipients) {
        const separator = recipient.lastIndexOf('@');
        if (separator <= 0 || recipient.slice(separator + 1).toLowerCase() !== domain) continue;

        const recipientPhone = recipient.slice(0, separator);
        const recipientUser = await UsersModel.findOne({ phone: recipientPhone });
        if (!recipientUser?.phoneVerified) {
            return res.status(404).json({
                success: false,
                message: `The recipient address ${recipient} doesn't exist.`,
            });
        }
    }

    let attachments;
    try {
        attachments = parseAttachments(req.body.attachments);
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }

    const from = getMailboxAddress(req.user.phone);

    try {
        const safeText = plainText || emailHtmlToText(safeHtml).trim();
        await sendMailMessage({
            from,
            to: recipients,
            subject: subject.trim(),
            text: safeText,
            html: safeHtml,
            attachments,
        });
        return res.status(200).json({ success: true, message: "Email sent successfully" });
    } catch (error) {
        console.error("[email] failed to send email:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

router.get('/emails', authMiddleware, async (req, res) => {
    const address = getMailboxAddress(req.user.phone);

    try {
        const emails = await MessageModel.find({ to: address });
        return res.status(200).json({ success: true, emails });
    } catch (error) {
        console.error("[email] failed to fetch emails:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});


router.get('/conversations', authMiddleware, async (req, res) => {
    const phone = req.user.phone;
    const address = getMailboxAddress(phone).toLowerCase();
    const folder = parseFolder(req.query.folder);

    try {
        const mailboxMessages = await MessageModel.find({ $or: [{ to: address }, { from: address }] });
        const visibleMessages = mailboxMessages.filter((message) => isInFolder(message, phone, address, folder));
        const latestByConversation = new Map();
        for (const message of visibleMessages) {
            const conversationId = String(message.conversation);
            const previous = latestByConversation.get(conversationId);
            if (!previous || new Date(message.date) > new Date(previous.date)) {
                latestByConversation.set(conversationId, message);
            }
        }

        const conversationQuery = ConversationModel.find({
            _id: { $in: [...latestByConversation.keys()] },
            participants: phone,
        });
        const storedConversations = await (conversationQuery.sort
            ? conversationQuery.sort({ lastMessageAt: -1 })
            : conversationQuery);
        const conversations = storedConversations.map((conversation) => {
            const latestMessage = latestByConversation.get(String(conversation._id));
            return {
                _id: conversation._id,
                participants: conversation.participants,
                isGroup: conversation.isGroup,
                groupName: conversation.groupName,
                lastMessageAt: latestMessage.date,
                lastMessagePreview: latestMessage.text || '',
                lastMessageFrom: latestMessage.from.split('@')[0],
            };
        }).sort((left, right) => new Date(right.lastMessageAt) - new Date(left.lastMessageAt));
        return res.status(200).json({ success: true, conversations });
    } catch (error) {
        console.error("[email] failed to fetch conversations:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

router.get('/conversations/:conversationId/messages', authMiddleware, async (req, res) => {
    const address = getMailboxAddress(req.user.phone).toLowerCase();
    const folder = parseFolder(req.query.folder);
    try {
        const conversation = await ConversationModel.findOne({
            _id: req.params.conversationId,
            participants: req.user.phone,
        });
        if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });

        const messageQuery = MessageModel.find({ conversation: conversation._id });
        const conversationMessages = await (messageQuery.sort ? messageQuery.sort({ date: 1 }) : messageQuery);
        const messages = conversationMessages.filter((message) => isInFolder(message, req.user.phone, address, folder));
        return res.status(200).json({
            success: true,
            messages: messages.map((message) => ({
                _id: message._id,
                from: message.from,
                to: message.to,
                subject: message.subject,
                text: message.text,
                html: sanitizeEmailHtml(message.html || ''),
                date: message.date,
                folder: getUserFolder(message, req.user.phone, address),
                attachments: (message.attachments || []).map((attachment, index) => ({
                    filename: attachment.filename,
                    contentType: attachment.contentType,
                    size: attachment.size,
                    viewUrl: `/api/conversations/${conversation._id}/messages/${message._id}/attachments/${index}`,
                    downloadUrl: `/api/conversations/${conversation._id}/messages/${message._id}/attachments/${index}?download=1`,
                })),
            })),
        });
    } catch (error) {
        console.error('[email] failed to fetch conversation messages:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.patch('/messages/:messageId/folder', authMiddleware, async (req, res) => {
    const address = getMailboxAddress(req.user.phone).toLowerCase();
    const targetFolder = req.body.folder;
    if (!['inbox', 'spam', 'trash', 'restore'].includes(targetFolder)) {
        return res.status(400).json({ success: false, message: 'Choose a valid message folder' });
    }

    try {
        const message = await MessageModel.findOne({ _id: req.params.messageId });
        const ownsRecipientCopy = message?.to?.some((recipient) => recipient.toLowerCase() === address);
        const ownsSenderCopy = message?.from?.toLowerCase() === address;
        if (!message || (!ownsRecipientCopy && !ownsSenderCopy)) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }
        if (targetFolder === 'spam' && !ownsRecipientCopy) {
            return res.status(400).json({ success: false, message: 'Only received messages can be marked as spam' });
        }

        if (ownsRecipientCopy) {
            const currentState = getRecipientState(message, req.user.phone) || {};
            const folder = targetFolder === 'restore' ? 'inbox' : targetFolder;
            const nextState = { ...currentState, folder };
            if (typeof message.recipientState?.set === 'function') {
                message.recipientState.set(req.user.phone, nextState);
            } else {
                message.recipientState = { ...message.recipientState, [req.user.phone]: nextState };
            }
        }
        if (ownsSenderCopy && !ownsRecipientCopy) {
            message.senderState = {
                ...message.senderState,
                folder: targetFolder === 'restore' ? 'sent' : targetFolder,
            };
        }
        await message.save();
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('[email] failed to update message folder:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.get('/conversations/:conversationId/messages/:messageId/attachments/:attachmentIndex', authMiddleware, async (req, res) => {
    try {
        const conversation = await ConversationModel.findOne({
            _id: req.params.conversationId,
            participants: req.user.phone,
        });
        if (!conversation) return res.status(404).json({ success: false, message: 'Attachment not found' });

        const message = await MessageModel.findOne({
            _id: req.params.messageId,
            conversation: conversation._id,
        });
        const index = Number(req.params.attachmentIndex);
        const attachment = Number.isInteger(index) && index >= 0 ? message?.attachments?.[index] : null;
        if (!attachment) return res.status(404).json({ success: false, message: 'Attachment not found' });

        const filename = attachment.filename.replace(/[\r\n"\\]/g, '_');
        const disposition = req.query.download === '1' ? 'attachment' : 'inline';
        res.setHeader('Content-Type', attachment.contentType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`);
        return res.send(attachment.content);
    } catch (error) {
        console.error('[email] failed to fetch attachment:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

return router;
}

export default createEmailRouter();