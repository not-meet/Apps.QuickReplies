import {
	IModify,
	IPersistence,
	IRead,
	IUIKitSurfaceViewParam,
} from '@rocket.chat/apps-engine/definition/accessors';
import { TextObjectType, InputBlock } from '@rocket.chat/ui-kit';

import { QuickRepliesApp } from '../../QuickRepliesApp';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { inputElementComponent } from './common/inputElementComponent';
import {
	ButtonStyle,
	UIKitSurfaceType,
} from '@rocket.chat/apps-engine/definition/uikit';
import { SendModalEnum } from '../enum/modals/sendModal';
import { IReply } from '../definition/reply/IReply';
import { Language, t } from '../lib/Translation/translation';
import { getReplacementValues, replacePlaceholders } from '../helper/message';
import { Receiverstorage } from '../storage/ReceiverStorage';

export async function SendReplyModal(
	app: QuickRepliesApp,
	user: IUser,
	read: IRead,
	persistence: IPersistence,
	modify: IModify,
	room: IRoom,
	reply: IReply,
	language: Language,
): Promise<IUIKitSurfaceViewParam> {
	const { elementBuilder, blockBuilder } = app.getUtils();

	const blocks: InputBlock[] = [];
	let message = reply.body;
	const labelReplyBody = t('Send_Reply_Body_Label', language);
	const placeholderReplyBody = t('Send_Reply_Body_Placeholder', language);

	const ReceiverStorage = new Receiverstorage(
		persistence,
		read.getPersistenceReader(),
		user.id,
	);

	const receiverInfo = await ReceiverStorage.getReceiverRecord();

	let Placeholders = {};
	if (receiverInfo) {
		Placeholders = receiverInfo;
	} else {
		Placeholders = await getReplacementValues(room, user, read);
	}
	message = replacePlaceholders(message, Placeholders);

	const inputReplyBody = inputElementComponent(
		{
			app,
			placeholder: placeholderReplyBody,
			label: labelReplyBody,
			optional: false,
			multiline: true,
			initialValue: message,
		},
		{
			blockId: SendModalEnum.REPLY_BODY_BLOCK_ID,
			actionId: SendModalEnum.REPLY_BODY_ACTION_ID,
		},
	);

	blocks.push(inputReplyBody);

	const submit = elementBuilder.addButton(
		{ text: t('Send_Reply_Button', language), style: ButtonStyle.PRIMARY },
		{
			actionId: SendModalEnum.SUBMIT_ACTION_ID,
			blockId: SendModalEnum.SUBMIT_BLOCK_ID,
		},
	);

	const close = elementBuilder.addButton(
		{ text: t('Close_Button', language) },
		{
			actionId: SendModalEnum.CLOSE_ACTION_ID,
			blockId: SendModalEnum.CLOSE_BLOCK_ID,
		},
	);
	return {
		id: `${SendModalEnum.VIEW_ID} --- ${reply.id}`,
		type: UIKitSurfaceType.MODAL,
		title: {
			type: TextObjectType.MRKDWN,
			text: t('Send_Reply_Modal_Title', language),
		},
		blocks,
		close,
		submit,
	};
}
