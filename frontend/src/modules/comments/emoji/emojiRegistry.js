import { emojiFileMap } from "./emojiFileMap";

import reactionLikeIcon from "../../../assets/emojis/reactemojis/reactemojis (1).png";
import reactionDislikeIcon from "../../../assets/emojis/reactemojis/reactemojis (2).png";
import reactionHeartIcon from "../../../assets/emojis/reactemojis/reactemojis (3).png";
import reactionFireIcon from "../../../assets/emojis/reactemojis/reactemojis (4).png";
import reactionPartyIcon from "../../../assets/emojis/reactemojis/reactemojis (5).png";
import reactionClapIcon from "../../../assets/emojis/reactemojis/reactemojis (6).png";

export const COMMENT_REACTION_LIKE = "like";
export const COMMENT_REACTION_DISLIKE = "dislike";
export const COMMENT_REACTION_HEART = "heart";
export const COMMENT_REACTION_FIRE = "fire";
export const COMMENT_REACTION_PARTY = "party";
export const COMMENT_REACTION_CLAP = "clap";
export const COMMENT_REACTION_WARNING = "warning";

export const COMMENT_REACTION_TRIGGER = COMMENT_REACTION_HEART;

export const emojiRegistry = {
  [COMMENT_REACTION_LIKE]: {
    key: COMMENT_REACTION_LIKE,
    code: "1F44D",
    label: "Нравится",
    icon: reactionLikeIcon,
    category: "reactions",
    allowedInReactions: true,
  },

  [COMMENT_REACTION_DISLIKE]: {
    key: COMMENT_REACTION_DISLIKE,
    code: "1F44E",
    label: "Не нравится",
    icon: reactionDislikeIcon,
    category: "reactions",
    allowedInReactions: true,
  },

  [COMMENT_REACTION_HEART]: {
    key: COMMENT_REACTION_HEART,
    code: "2764",
    label: "Сердце",
    icon: reactionHeartIcon,
    category: "reactions",
    allowedInReactions: true,
  },

  [COMMENT_REACTION_FIRE]: {
    key: COMMENT_REACTION_FIRE,
    code: "1F525",
    label: "Важно",
    icon: reactionFireIcon,
    category: "reactions",
    allowedInReactions: true,
  },

  [COMMENT_REACTION_PARTY]: {
    key: COMMENT_REACTION_PARTY,
    code: "1F973",
    label: "Отлично",
    icon: reactionPartyIcon,
    category: "reactions",
    allowedInReactions: true,
  },

  [COMMENT_REACTION_CLAP]: {
    key: COMMENT_REACTION_CLAP,
    code: "1F44F",
    label: "Аплодисменты",
    icon: reactionClapIcon,
    category: "reactions",
    allowedInReactions: true,
  },

  [COMMENT_REACTION_WARNING]: {
    key: COMMENT_REACTION_WARNING,
    code: "26A0",
    label: "Внимание",
    icon: emojiFileMap["26A0"],
    category: "reactions",
    allowedInReactions: false,
  },

  smile: {
    key: "smile",
    code: "1F60B",
    label: "Смайлик",
    icon: emojiFileMap["1F60B"],
    category: "emoji",
    allowedInReactions: false,
  },
};

export const reactionEmojiKeys = [
  COMMENT_REACTION_LIKE,
  COMMENT_REACTION_DISLIKE,
  COMMENT_REACTION_HEART,
  COMMENT_REACTION_FIRE,
  COMMENT_REACTION_PARTY,
  COMMENT_REACTION_CLAP,
];

export function getEmojiByKey(key) {
  return emojiRegistry[key] || null;
}