import {
  Chunk,
  ChunkWithoutID,
  EmbeddingsProvider,
  IndexingProgressUpdate,
} from "../..";
import { MAX_CHUNK_SIZE } from "../../llm/constants";
import { markdownChunker } from "../chunk/markdown";
import { convertURLToMarkdown, crawlSubpages } from "./crawl";
import { addDocs, listDocs } from "./db";

export async function* indexDocs(
  title: string,
  baseUrl: URL,
  embeddingsProvider: EmbeddingsProvider
): AsyncGenerator<IndexingProgressUpdate> {
  const existingDocs = await listDocs();
  if (existingDocs.find((doc) => doc.title === title)) {
    yield {
      progress: 1,
      desc: "Already indexed",
    };
    return;
  }

  yield {
    progress: 0,
    desc: "Finding subpages",
  };

  const subpaths = await crawlSubpages(baseUrl);
  console.log("Found subpaths", subpaths);
  const chunks: Chunk[] = [];
  const embeddings: number[][] = [];

  const markdownForSubpaths = await Promise.all(
    subpaths.map((subpath) => convertURLToMarkdown(new URL(subpath, baseUrl)))
  );

  for (let i = 0; i < subpaths.length; i++) {
    const subpath = subpaths[i];
    yield {
      progress: 1 / (subpaths.length + 1),
      desc: `${subpath}`,
    };

    const markdown = markdownForSubpaths[i];
    const markdownChunks: ChunkWithoutID[] = [];
    for await (const chunk of markdownChunker(markdown, MAX_CHUNK_SIZE, 0)) {
      markdownChunks.push(chunk);
    }

    const subpathEmbeddings = await embeddingsProvider.embed(
      markdownChunks.map((chunk) => chunk.content)
    );

    markdownChunks.forEach((chunk, index) => {
      chunks.push({
        ...chunk,
        filepath:
          subpath +
          (chunk.otherMetadata?.fragment
            ? `#${chunk.otherMetadata.fragment}`
            : ""),
        index,
        digest: subpath,
      });
    });
    embeddings.push(...subpathEmbeddings);
  }

  await addDocs(title, baseUrl, chunks, embeddings);

  yield {
    progress: 1,
    desc: "Done",
  };
}
