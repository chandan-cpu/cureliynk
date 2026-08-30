from app.config.settings import settings


print("Embedding model:")
print(settings.EMBEDDING_MODEL)

print("\nDevice:")
print(settings.DEVICE)

print("\nPinecone index:")
print(settings.PINECONE_INDEX_NAME)

print("\nPinecone namespace:")
print(settings.PINECONE_NAMESPACE)

print("\nPinecone API key loaded:")
print(bool(settings.PINECONE_API_KEY))