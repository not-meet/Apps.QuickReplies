import { Language } from '../../lib/Translation/translation';

export type AIusagePreference =
	| AIusagePreferenceEnum.Personal
	| AIusagePreferenceEnum.Workspace;

export enum AIusagePreferenceEnum {
	Personal = 'Personal',
	Workspace = 'Workspace',
}

export type AIProviderType =
	| AIProviderEnum.OpenAI
	| AIProviderEnum.Gemini
	| AIProviderEnum.SelfHosted;

export enum AIProviderEnum {
	OpenAI = 'OpenAI',
	Gemini = 'Gemini',
	SelfHosted = 'Self Hosted',
}

export interface IPreference {
	userId: string;
	language: Language;
	AIusagePreference: AIusagePreference;
	AIconfiguration: {
		AIPrompt?: string;
		AIProvider: AIProviderType;
		selfHosted: {
			url: string;
		};
		openAI: {
			apiKey: string;
			model: string;
		};
		gemini: {
			apiKey: string;
		};
	};
}
