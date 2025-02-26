export interface IAIstorage {
    updatePrompt(prompt: string): Promise<void>;
    updateResponse(response: string): Promise<void>;
    updateMessage(message: string): Promise<void>;
    getPrompt(): Promise<string>;
    getResponse(): Promise<string>;
    getMessage(): Promise<string>;
    clearAIInteraction(): Promise<void>;
    updateMessageHistory(messageHistory: Array<{ text: string; sender: string }>): Promise<void>;
    getMessageHistory(): Promise<Array<{ text: string; sender: string }>>;
}
