
import { embedText } from "./lib/pipeline/embeddings";

embedText("warm-up")
  .then((vector) => {
    console.log(`Embedding model ready (${vector.length} dimensions).`);
  })
  .catch((err) => {
    console.error("Failed to load embedding model:", err);
    process.exit(1);
  });