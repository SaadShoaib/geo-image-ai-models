/**
 * Known Entity IDs from the Knowledge Graph Ontology
 *
 * These are system properties and types defined in the root space.
 * See knowledge-graph-ontology.md for the full registry.
 */

// The canonical Root space — verified against SystemIds.ROOT_SPACE_ID in the SDK source.
export const ROOT_SPACE_ID = "08c4f09378584b7c9b94b82e448abcff";

// The AI knowledge graph space (previously mis-labelled as ROOT_SPACE_ID).
export const AI_SPACE_ID = "a19c345ab9866679b001d7d2138d88a1";

/**
 * Namespace prefix used to derive deterministic entity IDs via derivedUuidFromString.
 * Change this when publishing a different bounty so IDs stay isolated.
 * Format: "<project-slug>:<entity-type>:<entity-name>"
 */
export const ID_NAMESPACE = "geo-image-ai-models";

// ─── Type IDs ────────────────────────────────────────────────────────────────

export const TYPES = {
  type:       "e7d737c536764c609fa16aa64a8c90ad",  // Type — meta-type for type definitions
  property:   "808a04ceb21c4d888ad12e240613e5ca",  // Property — meta-type for property definitions
  person:     "7ed45f2bc48b419e8e4664d5ff680b0d",
  project:    "484a18c5030a499cb0f2ef588ff16d50",
  topic:      "5ef5a5860f274d8e8f6c59ae5b3e89e2",
  text_block: "76474f2f00894e77a0410b39fb17d0bf",  // Text Block — rich markdown content
  data_block: "b8803a8665de412bbb357e0c84adf473",  // Data Block — renders query or collection results
  image:      "ba4e41460010499da0a3caaa7f579d0e",  // Image — media entity with IPFS URL
};

// ─── Property IDs ────────────────────────────────────────────────────────────

export const PROPERTIES = {
  name:             "a126ca530c8e48d5b88882c734c38935",
  description:      "9b1f76ff9711404c861e59dc3fa7d037",
  types:            "8f151ba4de204e3c9cb499ddf96f48f1",
  web_url:          "eed38e74e67946bf8a42ea3e4f8fb5fb",
  birth_date:       "60f8b943d9a742109356fc108ee7212c",
  date_founded:     "41aa3d9847b64a97b7ec427e575b910e",
  topics:           "458fbc070dbf4c928f5716f3fdde7c32",
  blocks:           "beaba5cba67741a8b35377030613fc70",  // Blocks relation — attaches blocks to a parent entity
  markdown_content: "e3e363d1dd294ccb8e6ff3b76d99bc33",  // Markdown body for a text block
  data_source_type: "1f69cc9880d444abad493df6a7b15ee4",  // Declares query vs collection data source
  filter:           "14a46854bfd14b1882152785c2dab9f3",  // JSON-encoded filter for data blocks
  collection_item:  "a99f9ce12ffa4dac8c61f6310d46064a",  // Points to an entity in a collection
  view:             "1907fd1c81114a3ca378b1f353425b65",  // View preference on a Blocks relation
};

// ─── Data Source Singletons ──────────────────────────────────────────────────

export const QUERY_DATA_SOURCE      = "3b069b04adbe4728917d1283fd4ac27e";
export const COLLECTION_DATA_SOURCE = "1295037a5d9c4d09b27c5502654b9177";

// ─── View Type IDs ───────────────────────────────────────────────────────────

export const VIEWS = {
  table:   "cba271cef7c140339047614d174c69f1",  // Table view (default)
  list:    "7d497dba09c249b8968f716bcf520473",  // List view
  gallery: "ccb70fc917f04a54b86e3b4d20cc7130",  // Gallery / grid view
  bullets: "0aaac6f7c916403eaf6d2e086dc92ada",  // Bulleted list view
};
