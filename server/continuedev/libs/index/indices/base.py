from abc import ABC, abstractmethod
from typing import AsyncGenerator, List

from ..chunkers import Chunk


class CodebaseIndex(ABC):
    @abstractmethod
    async def build(self, chunks: AsyncGenerator[Chunk, None]):
        """Builds the index, yielding progress as a float between 0 and 1. Chunks are yielded from the given generator."""
        raise NotImplementedError()

    @abstractmethod
    async def query(self, query: str, n: int = 4) -> List[Chunk]:
        """Queries the index, returning the top n results"""
        raise NotImplementedError()

    @abstractmethod
    async def delete_branch(self):
        """Deletes all index data for the given branch"""
        raise NotImplementedError()
