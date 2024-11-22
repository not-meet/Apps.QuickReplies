import {
    IModify,
    IPersistence,
    IRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { QuickRepliesApp } from '../../../QuickRepliesApp';
import { ReplyStorage } from '../../storage/ReplyStorage';
import { t } from '../../lib/Translation/translation';
import { getUserPreferredLanguage } from '../../helper/userPreference';
import { sendNotification } from '../../helper/notification';
export async function createQuickReply(
    app: QuickRepliesApp,
    sender: IUser,
    room: IRoom,
    args: string[],
    read: IRead,
    modify: IModify,
    persistence: IPersistence,
): Promise<void> {
    const language = await getUserPreferredLanguage(
        read.getPersistenceReader(),
        persistence,
        sender.id,
    );

    const replyName = args[1];
    const replyBody = args.slice(2).join(' ');

    const replyStorage = new ReplyStorage(persistence, read.getPersistenceReader());

    const result = await replyStorage.createReply(sender, replyName, replyBody, language);

    if (!result.success) {
        const errorMessage = `${t('Fail_Create_Reply', language, {
            name: sender.name,
        })} \n\n ${result.error}`;
        await sendNotification(read, modify, sender, room, { message: errorMessage });
        return;
    }

    const successMessage = `${t('Success_Create_Reply', language, {
        name: sender.name,
        replyname: replyName,
    })}`;
    await sendNotification(read, modify, sender, room, { message: successMessage });

}
