export interface SlashCommandGroupMap {
  blocks: true;
  media: true;
  data: true;
  ai: true;
}

export { DEFAULT_SLASH_COMMANDS, SlashCommandMenu } from './SlashCommandMenu';
export type {
  SlashCommandGroup,
  SlashCommandMenuProps,
  SlashCommandOption,
} from './SlashCommandMenu';
