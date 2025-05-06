import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import { QuickRepliesApp } from '../../QuickRepliesApp';
import { IHanderParams, IHandler } from '../definition/handlers/IHandler';
import { RoomInteractionStorage } from '../storage/RoomInteraction';
import { CreateReplyModal } from '../modal/createModal';
import { listReplyContextualBar } from '../modal/listContextualBar';
import { ReplyStorage } from '../storage/ReplyStorage';
import { IReply } from '../definition/reply/IReply';
import {
    sendDefaultNotification,
    sendHelperNotification,
    sendNotification,
} from '../helper/notification';
import { UserPreferenceModal } from '../modal/UserPreferenceModal';
import { Language } from '../lib/Translation/translation';
import { ReplyAIModal } from '../modal/AIreplyModal';
import { AIstorage } from '../storage/AIStorage';
import { UserPreferenceStorage } from '../storage/userPreferenceStorage';
import AIHandler from './AIHandler';
import { getSortedMessages, sendMessage } from '../helper/message';

export class Handler implements IHandler {
    public app: QuickRepliesApp;
    public sender: IUser;
    public room: IRoom;
    public read: IRead;
    public modify: IModify;
    public http: IHttp;
    public persis: IPersistence;
    public roomInteractionStorage: RoomInteractionStorage;
    public triggerId?: string;
    public threadId?: string;
    public language: Language;
    public params?: string[];

    constructor(params: IHanderParams) {
        this.app = params.app;
        this.sender = params.sender;
        this.room = params.room;
        this.read = params.read;
        this.modify = params.modify;
        this.http = params.http;
        this.persis = params.persis;
        this.triggerId = params.triggerId;
        this.threadId = params.threadId;
        this.language = params.language;
        this.params = params.params;
        const persistenceRead = params.read.getPersistenceReader();
        this.roomInteractionStorage = new RoomInteractionStorage(
            params.persis,
            persistenceRead,
            params.sender.id,
        );
    }

    public async CreateReply(): Promise<void> {
        const modal = await CreateReplyModal(
            this.app,
            this.sender,
            this.read,
            this.persis,
            this.modify,
            this.room,
            this.language,
        );

        if (modal instanceof Error) {
            this.app.getLogger().error(modal.message);
            return;
        }

        const triggerId = this.triggerId;

        if (triggerId) {
            await this.modify
                .getUiController()
                .openSurfaceView(modal, { triggerId }, this.sender);
        }
        return;
    }

    public async TalkingBot(retryCount = 0): Promise<void> {
        const MAX_RETRIES = 10; // Prevents infinite loops

        const userPreference = new UserPreferenceStorage(
            this.persis,
            this.read.getPersistenceReader(),
            this.sender.id,
        );
        const prompt = `You are an assistant assigned to the user. Reply to messages normally.
            However, if the message requires personal attention from the user (e.g., an important request, a question about personal matters, or something only the user can decide),
        then reply with: 'This message seems important. I will flag it so you can see it first when you return.'`;
        const lastMessage = await getSortedMessages(this.room.id, this.read);
        const existingPreference = await userPreference.getUserPreference();

        if (!existingPreference.isListening) {
            console.log('❌ Bot is not listening');
            return;
        }

        console.log('🤖 Bot is listening...');
        console.log('📨 Last Messages:', lastMessage.map(msg => msg.text));

        const lastUsersMessage = lastMessage.find(
            message => message.text && message.sender.username !== this.sender.username
        );

        const text = lastUsersMessage?.text || '';
        console.log('💬 Last user message:', text);

        if (!text) {
            console.log('⚠️ No valid user message found.');
            return;
        }

        const AiHandler = new AIHandler(this.app, this.http, existingPreference);

        // try {
        //     const UserPreference = await userPreference.getUserPreference();
        //     const data = await AiHandler.handleResponse(text, prompt);
        //     console.log('🤖 AI Response:', data);
        //
        //     if (data.success && !data.response.includes('<cant reply>')) {
        //         const craftedMessage = `Meet's Companion: ${data.response}`;
        //         await sendMessage(this.modify, this.sender, this.room, craftedMessage);
        //     } else {
        //         console.log('🤖 AI decided not to reply.');
        //     }
        //
        //     // 🚀 Re-run after 40 seconds if there's a new message
        //     if (retryCount < MAX_RETRIES && UserPreference.isListening) {
        //         setTimeout(async () => {
        //             try {
        //                 const newMessages = await getSortedMessages(this.room.id, this.read);
        //                 const newLastMessage = newMessages.find(
        //                     message => message.text && message.sender.username !== this.sender.username
        //                 );
        //
        //                 if (newLastMessage?.text !== lastUsersMessage?.text) {
        //                     console.log('🔄 New message detected! Re-invoking TalkingBot()...');
        //                     await this.TalkingBot(retryCount + 1);
        //                 } else {
        //                     console.log(`⏳ No new messages. Retry ${retryCount + 1}/${MAX_RETRIES}`);
        //                 }
        //             } catch (error) {
        //                 console.log('⚠️ Error during message check:', error);
        //             }
        //         }, 40000);
        //     } else {
        //         console.log('🛑 Max retries reached. Stopping auto-retry.');
        //     }
        // } catch (error) {
        //     console.log('❌ Error in TalkingBot():', error);
        // }
    }

    public async StartListning(): Promise<void> {
        const userPreference = new UserPreferenceStorage(
            this.persis,
            this.read.getPersistenceReader(),
            this.sender.id,
        )
        await userPreference.setListeningState(true);
        console.log('------------bot is now listning------------')
        await this.TalkingBot()
    }

    public async StopListning(): Promise<void> {
        const messages = await getSortedMessages(this.room.id, this.read);
        const prompt = `You have been given the history of messages in a chat room. Your task is to generate a structured summary for the user. Follow this format:
            Quick Summary: Provide a concise overview of the key points discussed.
            Flagged Messages: Identify messages where you responded with:
            "This message seems important. I will flag it so you can see it first when you return."
            For each flagged message, include:
            Username of the sender
            Their message content
            Replies Made by Me: Extract and list all messages where you replied with text that included "meet's Companion."
            Ensure clarity and proper formatting while maintaining brevity in the summary.`
        const aiStorage = new AIstorage(this.persis, this.read.getPersistenceReader(), this.sender.id);
        const messageHistory = await aiStorage.getMessageHistory()
        const historyString = messageHistory
            .map(msg => `${msg.sender}: ${msg.text}`)
            .join("\n");
        console.log('📨 Last Messages:', messages.map(msg => `${msg.sender.name}: ${msg.text}`).join('\n'));
        const userPreference = new UserPreferenceStorage(
            this.persis,
            this.read.getPersistenceReader(),
            this.sender.id,
        )
        await userPreference.setListeningState(false);
        const existingPreference = await userPreference.getUserPreference();
        console.log('-------------the listning state is now at false-----------the handler should not be called')
        const AiHandler = new AIHandler(this.app, this.http, existingPreference);
        try {
            const data = await AiHandler.handleResponse(historyString, prompt);
            if (data.success) {
                await sendNotification(this.read, this.modify, this.sender, this.room, {
                    message: data.response
                })
            }
        } catch (error) {
            console.log(error);
        }


    }

    public async CorrectGrammer(): Promise<void> {
        const userPreference = new UserPreferenceStorage(
            this.persis,
            this.read.getPersistenceReader(),
            this.sender.id,
        );
        const value = this.params?.slice(1).join(' ') || 'false value';
        const existingPreference = await userPreference.getUserPreference();
        const AiHandler = new AIHandler(this.app, this.http, existingPreference);
        console.log('--------------------reaching the value-------------------');
        console.log(value);
        if (value) {
            try {
                // Need to await the Promise from handleResponse
                const data = await AiHandler.handleResponse(
                    value,
                    '',
                    true
                );
                console.log(data);

                // Do something with the response
                if (data.success) {
                    // Handle successful response
                    console.log('AI response successful:', data.response);
                    await sendMessage(this.modify, this.sender, this.room, data.response)

                    // Parse JSON if needed, display results, etc./qui
                } else {
                    // Handle error
                    console.log('AI response failed:', data.response);
                }
            } catch (error) {
                // Handle any exceptions
                console.error('Error while getting AI response:', error);
            }
        }
    }
    public async ListReply(): Promise<void> {
        const replyStorage = new ReplyStorage(
            this.persis,
            this.read.getPersistenceReader(),
        );

        const userReplies: IReply[] = await replyStorage.getReplyForUser(
            this.sender,
        );

        const contextualBar = await listReplyContextualBar(
            this.app,
            this.sender,
            this.read,
            this.persis,
            this.modify,
            this.room,
            userReplies,
            this.language,
        );

        if (contextualBar instanceof Error) {
            this.app.getLogger().error(contextualBar.message);
            return;
        }
        const triggerId = this.triggerId;
        if (triggerId) {
            await this.modify
                .getUiController()
                .openSurfaceView(contextualBar, { triggerId }, this.sender);
        }
    }

    public async Help(): Promise<void> {
        await sendHelperNotification(
            this.read,
            this.modify,
            this.sender,
            this.room,
            this.language,
        );
    }
    public async sendDefault(): Promise<void> {
        await sendDefaultNotification(
            this.app,
            this.read,
            this.modify,
            this.sender,
            this.room,
            this.language,
        );
    }
    public async Configure(): Promise<void> {
        const userPreference = new UserPreferenceStorage(
            this.persis,
            this.read.getPersistenceReader(),
            this.sender.id,
        );
        const existingPreference = await userPreference.getUserPreference();

        const modal = await UserPreferenceModal({
            app: this.app,
            modify: this.modify,
            existingPreference: existingPreference,
        });

        if (modal instanceof Error) {
            this.app.getLogger().error(modal.message);
            return;
        }

        const triggerId = this.triggerId;
        if (triggerId) {
            await this.modify
                .getUiController()
                .openSurfaceView(modal, { triggerId }, this.sender);
        }
        return;
    }

    public async replyUsingAI(message?: string): Promise<void> {
        const roomId = this.room.id;
        const roomMessages = await this.read
            .getRoomReader()
            .getMessages(roomId);
        const lastMessage = roomMessages.pop();
        const Message =
            message ||
            lastMessage?.text ||
            lastMessage?.attachments?.[0]?.description ||
            '';
        const textMessage = Message.trim();

        if (textMessage) {
            const aistorage = new AIstorage(
                this.persis,
                this.read.getPersistenceReader(),
                this.sender.id,
            );
            aistorage.updateMessage(textMessage);
            const modal = await ReplyAIModal(
                this.app,
                this.sender,
                this.read,
                this.persis,
                this.modify,
                this.room,
                this.language,
                textMessage,
            );

            if (modal instanceof Error) {
                this.app.getLogger().error(modal.message);
                return;
            }

            const triggerId = this.triggerId;

            if (triggerId) {
                await this.modify
                    .getUiController()
                    .openSurfaceView(modal, { triggerId }, this.sender);
            }
            return;
        }
    }
}
