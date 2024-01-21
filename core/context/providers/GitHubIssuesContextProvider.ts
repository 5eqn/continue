import { BaseContextProvider } from "..";
import {
  ContextItem,
  ContextProviderDescription,
  ContextProviderExtras,
  ContextSubmenuItem,
  LoadSubmenuItemsArgs,
} from "../..";

class GitHubIssuesContextProvider extends BaseContextProvider {
  static description: ContextProviderDescription = {
    title: "github",
    displayTitle: "GitHub Issues",
    description: "Reference GitHub issues",
    type: "submenu",
  };

  async getContextItems(
    query: string,
    extras: ContextProviderExtras
  ): Promise<ContextItem[]> {
    return [];
  }

  async loadSubmenuItems(
    args: LoadSubmenuItemsArgs
  ): Promise<ContextSubmenuItem[]> {
    return [];
  }
}

export default GitHubIssuesContextProvider;
