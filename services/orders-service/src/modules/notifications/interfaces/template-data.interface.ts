import { Language } from '../enums';

export interface TemplateData {
  [key: string]:
    | string
    | number
    | boolean
    | Date
    | null
    | undefined
    | Record<string, unknown>
    | Array<unknown>
    | TemplateData;
}

export interface TemplateConfig {
  name: string;
  version: string;
  language: Language;
  subject?: string;
  body: string;
}
