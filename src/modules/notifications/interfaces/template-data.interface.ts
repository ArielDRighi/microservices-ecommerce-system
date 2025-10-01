import { Language } from '../enums';

export interface TemplateData {
  [key: string]: any;
}

export interface TemplateConfig {
  name: string;
  version: string;
  language: Language;
  subject?: string;
  body: string;
}
