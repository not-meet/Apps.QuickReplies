import {
	ButtonElement,
	OverflowElement,
	PlainTextInputElement,
	MultiStaticSelectElement,
} from '@rocket.chat/ui-kit';
import { ButtonParam } from './IButtonElement';
import { OverflowElementParam } from './IOverflowElement';
import { PlainTextInputParam } from './IPlainTextInputElement';

export interface MultiSelectOption {
	key: string;
	i18nLabel: string;
	selected?: boolean;
}

export interface MultiSelectParam {
	id: string;
	i18nLabel: string;
	i18nDescription?: string;
	options: MultiSelectOption[];
	required?: boolean;
	public?: boolean;
	packageValue?: string | string[];
}

export interface IElementBuilder {
	addButton(
		param: ButtonParam,
		interaction: ElementInteractionParam,
	): ButtonElement;
	addMultiSelect(
		param: MultiSelectParam,
		interaction: ElementInteractionParam,
	): MultiStaticSelectElement;
	createPlainTextInput(
		param: PlainTextInputParam,
		interaction: ElementInteractionParam,
	): PlainTextInputElement;
	createOverflow(
		param: OverflowElementParam,
		interaction: ElementInteractionParam,
	): OverflowElement;
}

export type ElementInteractionParam = { blockId: string; actionId: string };
