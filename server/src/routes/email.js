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
    return ['conversations', 'sent', 'archive', 'spam', 'trash'].includes(value) ? value : 'conversations';
}

function ownsMessage(message, address) {
    return message?.to?.some((recipient) => recipient.toLowerCase() === address)
        || message?.from?.toLowerCase() === address;
}

function setMessageFolder(message, phone, address, targetFolder) {
    const ownsRecipientCopy = message.to?.some((recipient) => recipient.toLowerCase() === address);
    const ownsSenderCopy = message.from?.toLowerCase() === address;
    if (targetFolder === 'spam' && !ownsRecipientCopy) return false;

    if (ownsRecipientCopy) {
        const currentState = getRecipientState(message, phone) || {};
        const folder = targetFolder === 'restore' ? 'inbox' : targetFolder;
        const nextState = { ...currentState, folder };
        if (typeof message.recipientState?.set === 'function') {
            message.recipientState.set(phone, nextState);
        } else {
            message.recipientState = { ...message.recipientState, [phone]: nextState };
        }
    }
    if (ownsSenderCopy && !ownsRecipientCopy) {
        message.senderState = {
            ...message.senderState,
            folder: targetFolder === 'restore' ? 'sent' : targetFolder,
        };
    }
    return true;
}

function setMessageRead(message, phone, address, read) {
    if (!message.to?.some((recipient) => recipient.toLowerCase() === address)) return false;
    const currentState = getRecipientState(message, phone) || {};
    const nextState = { ...currentState, read };
    if (typeof message.recipientState?.set === 'function') {
        message.recipientState.set(phone, nextState);
    } else {
        message.recipientState = { ...message.recipientState, [phone]: nextState };
    }
    return true;
}

//endpoint to send email using smtp server created.
router.post('/send-email', authMiddleware, async (req, res) => {
    const { to, subject, text, html, draftId } = req.body;
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

    let attachments;
    try {
        attachments = parseAttachments(req.body.attachments);
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }

    const from = getMailboxAddress(req.user.phone);

    try {
        let draft;
        if (draftId) {
            draft = await MessageModel.findOne({ _id: draftId });
            if (!draft || draft.from.toLowerCase() !== from.toLowerCase() || draft.senderState?.folder !== 'drafts') {
                return res.status(404).json({ success: false, message: 'Draft not found' });
            }
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

        const safeText = plainText || emailHtmlToText(safeHtml).trim();
        await sendMailMessage({
            from,
            to: recipients,
            subject: subject.trim(),
            text: safeText,
            html: safeHtml,
            attachments,
        });
        if (draft) await MessageModel.deleteOne({ _id: draft._id });
        return res.status(200).json({ success: true, message: "Email sent successfully" });
    } catch (error) {
        console.error("[email] failed to send email:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

router.get('/drafts', authMiddleware, async (req, res) => {
    const address = getMailboxAddress(req.user.phone).toLowerCase();
    try {
        const drafts = await MessageModel.find({ from: address });
        return res.status(200).json({
            success: true,
            drafts: drafts
                .filter((draft) => draft.from?.toLowerCase() === address && draft.senderState?.folder === 'drafts')
                .sort((left, right) => new Date(right.updatedAt || right.date) - new Date(left.updatedAt || left.date))
                .map((draft) => ({
                    _id: draft._id,
                    to: draft.to || [],
                    subject: draft.subject || '',
                    text: draft.text || '',
                    html: sanitizeEmailHtml(draft.html || ''),
                    date: draft.updatedAt || draft.date,
                    attachments: (draft.attachments || []).map((attachment) => ({
                        filename: attachment.filename,
                        contentType: attachment.contentType,
                        size: attachment.size,
                        content: Buffer.from(attachment.content).toString('base64'),
                    })),
                })),
        });
    } catch (error) {
        console.error('[email] failed to fetch drafts:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.post('/drafts', authMiddleware, async (req, res) => {
    const address = getMailboxAddress(req.user.phone);
    const recipients = (Array.isArray(req.body.to) ? req.body.to : [])
        .filter((recipient) => typeof recipient === 'string')
        .map((recipient) => recipient.trim())
        .filter(Boolean);
    const subject = typeof req.body.subject === 'string' ? req.body.subject.slice(0, 998) : '';
    const text = typeof req.body.text === 'string' ? req.body.text : '';
    const html = typeof req.body.html === 'string' ? sanitizeEmailHtml(req.body.html) : '';
    let attachments;
    try {
        attachments = parseAttachments(req.body.attachments);
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }

    try {
        let draft = req.body.draftId ? await MessageModel.findOne({ _id: req.body.draftId }) : null;
        if (req.body.draftId && (!draft || draft.from.toLowerCase() !== address.toLowerCase() || draft.senderState?.folder !== 'drafts')) {
            return res.status(404).json({ success: false, message: 'Draft not found' });
        }
        if (!draft) {
            const conversation = await ConversationModel.create({
                participants: [req.user.phone],
                isGroup: false,
            });
            draft = await MessageModel.create({
                conversation: conversation._id,
                from: address,
                to: recipients,
                subject,
                text,
                html,
                attachments,
                senderState: { folder: 'drafts' },
                date: new Date(),
            });
        } else {
            draft.to = recipients;
            draft.subject = subject;
            draft.text = text;
            draft.html = html;
            draft.attachments = attachments;
            draft.date = new Date();
            await draft.save();
        }
        return res.status(200).json({ success: true, draftId: String(draft._id) });
    } catch (error) {
        console.error('[email] failed to save draft:', error);
        return res.status(500).json({ success: false, message: 'Could not save draft' });
    }
});

router.delete('/drafts/:draftId', authMiddleware, async (req, res) => {
    const address = getMailboxAddress(req.user.phone).toLowerCase();
    try {
        const draft = await MessageModel.findOne({ _id: req.params.draftId });
        if (!draft || draft.from?.toLowerCase() !== address || draft.senderState?.folder !== 'drafts') {
            return res.status(404).json({ success: false, message: 'Draft not found' });
        }
        await MessageModel.deleteOne({ _id: draft._id });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('[email] failed to delete draft:', error);
        return res.status(500).json({ success: false, message: 'Could not delete draft' });
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
        const messageIdsByConversation = new Map();
        const unreadConversationIds = new Set();
        for (const message of visibleMessages) {
            const conversationId = String(message.conversation);
            messageIdsByConversation.set(conversationId, [...(messageIdsByConversation.get(conversationId) || []), String(message._id)]);
            if (message.to?.some((recipient) => recipient.toLowerCase() === address)
                && getRecipientState(message, phone)?.read !== true) unreadConversationIds.add(conversationId);
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
                lastMessageId: String(latestMessage._id),
                messageIds: messageIdsByConversation.get(String(conversation._id)) || [],
                unread: unreadConversationIds.has(String(conversation._id)),
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
                read: Boolean(getRecipientState(message, req.user.phone)?.read),
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
    if (!['inbox', 'archive', 'spam', 'trash', 'restore'].includes(targetFolder)) {
        return res.status(400).json({ success: false, message: 'Choose a valid message folder' });
    }

    try {
        const message = await MessageModel.findOne({ _id: req.params.messageId });
        if (!message || !ownsMessage(message, address)) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }
        if (!setMessageFolder(message, req.user.phone, address, targetFolder)) {
            return res.status(400).json({ success: false, message: 'Only received messages can be marked as spam' });
        }
        await message.save();
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('[email] failed to update message folder:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.patch('/messages/:messageId/state', authMiddleware, async (req, res) => {
    if (typeof req.body.read !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Read state must be true or false' });
    }
    const address = getMailboxAddress(req.user.phone).toLowerCase();
    try {
        const message = await MessageModel.findOne({ _id: req.params.messageId });
        if (!message || !setMessageRead(message, req.user.phone, address, req.body.read)) {
            return res.status(404).json({ success: false, message: 'Received message not found' });
        }
        await message.save();
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('[email] failed to update message read state:', error);
        return res.status(500).json({ success: false, message: 'Could not update read state' });
    }
});

router.patch('/messages/bulk', authMiddleware, async (req, res) => {
    const { messageIds, action } = req.body;
    if (!Array.isArray(messageIds) || messageIds.length === 0 || messageIds.length > 100
        || !messageIds.every((id) => typeof id === 'string')
        || !['read', 'unread', 'archive', 'trash', 'restore'].includes(action)) {
        return res.status(400).json({ success: false, message: 'Choose messages and a valid bulk action' });
    }

    const address = getMailboxAddress(req.user.phone).toLowerCase();
    try {
        let updated = 0;
        for (const messageId of new Set(messageIds)) {
            const message = await MessageModel.findOne({ _id: messageId });
            if (!message || !ownsMessage(message, address)) continue;
            const changed = action === 'read' || action === 'unread'
                ? setMessageRead(message, req.user.phone, address, action === 'read')
                : setMessageFolder(message, req.user.phone, address, action);
            if (changed) {
                await message.save();
                updated += 1;
            }
        }
        return res.status(200).json({ success: true, updated });
    } catch (error) {
        console.error('[email] failed to apply bulk message action:', error);
        return res.status(500).json({ success: false, message: 'Could not update selected messages' });
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