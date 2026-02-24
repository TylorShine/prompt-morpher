import OpenAI from "openai";
import { BaseLLMProvider, GenerateTextOptions } from "./base";

export class OpenAIProvider extends BaseLLMProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model: string, baseURL?: string) {
    super();
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model;
  }

  async generateText(options: GenerateTextOptions): Promise<string | null> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: "user", content: options.prompt }],
      temperature: options.temperature,
    });

    const text = response.choices[0].message.content?.trim();
    return text && text.length > 0 ? text : null;
  }
}
