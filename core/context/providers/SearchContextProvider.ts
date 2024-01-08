import { BaseContextProvider } from "..";
import {
  ContextItem,
  ContextProviderDescription,
  ContextProviderExtras,
} from "../..";
import { ExtensionIde } from "../../ide";

class SearchContextProvider extends BaseContextProvider {
  static description: ContextProviderDescription = {
    title: "search",
    displayTitle: "Search",
    description: "Use ripgrep to exact search the workspace",
    dynamic: true,
    requiresQuery: true,
  };

  async getContextItems(
    query: string,
    extras: ContextProviderExtras
  ): Promise<ContextItem[]> {
    const results = await new ExtensionIde().getSearchResults(query);
    return [
      {
        description: "Search results",
        content: `Results of searching codebase for "${query}":\n\n${results}`,
        name: "Search results",
      },
    ];
  }
  async load(): Promise<void> {}
}

export default SearchContextProvider;
