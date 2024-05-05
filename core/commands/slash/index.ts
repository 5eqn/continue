import GenerateTerminalCommand from "./cmd";
import CommentSlashCommand from "./comment";
import CommitMessageCommand from "./commit";
import DraftIssueCommand from "./draftIssue";
import EditSlashCommand from "./edit";
import EditPlusSlashCommand from "./editPlus";
import HttpSlashCommand from "./http";
import ShareSlashCommand from "./share";
import StackOverflowSlashCommand from "./stackOverflow";
import ReviewMessageCommand from "./review";

export default [
  DraftIssueCommand,
  ShareSlashCommand,
  StackOverflowSlashCommand,
  GenerateTerminalCommand,
  EditSlashCommand,
  EditPlusSlashCommand,
  CommentSlashCommand,
  HttpSlashCommand,
  CommitMessageCommand,
  ReviewMessageCommand,
];
