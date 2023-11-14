from ...plugins.context_providers.diff import DiffContextProvider
from ...plugins.context_providers.github import GitHubIssuesContextProvider
from ...plugins.context_providers.google import GoogleContextProvider
from ...plugins.context_providers.open_tabs import OpenTabsContextProvider
from ...plugins.context_providers.search import SearchContextProvider
from ...plugins.context_providers.terminal import TerminalContextProvider
from ...plugins.context_providers.url import URLContextProvider

CONTEXT_PROVIDER_NAME_TO_CLASS = {
    "diff": DiffContextProvider,
    "github": GitHubIssuesContextProvider,
    "terminal": TerminalContextProvider,
    "open": OpenTabsContextProvider,
    "google": GoogleContextProvider,
    "search": SearchContextProvider,
    "url": URLContextProvider,
}
