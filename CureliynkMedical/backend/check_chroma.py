import chromadb

CHROMA_PATH = r"C:\Users\Ananta\Documents\project\backend\data\chroma_db"

client = chromadb.PersistentClient(
    path=CHROMA_PATH
)

collections = client.list_collections()

print("\nCollections found:")

for collection in collections:
    print("-", collection.name)