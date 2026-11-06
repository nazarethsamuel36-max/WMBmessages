with open(r'd:\alphatable testing\src\services\messageService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''export function preloadSearchIndex(): void {
  if (!USE_STATIC_DATA || cachedSearchIndex || searchIndexLoadingPromise) return;
  searchIndexLoadingPromise = fetch('/data/search_index.json')
    .then(res => {
      if (!res.ok) throw new Error(`Search index status ${res.status}`);
      return res.json();
    })
    .then(data => {
      cachedSearchIndex = data;
      console.log(`[messageService] Search index preloaded: ${data.length} paragraphs`);
    })
    .catch(err => {
      console.warn('[messageService] Search index preload failed (will retry on first search):', err);
      searchIndexLoadingPromise = null;
    });
}'''

replacement = '''export function preloadSearchIndex(): void {
  if (!USE_STATIC_DATA || cachedSearchIndex || searchIndexLoadingPromise) return;
  const shardFiles = [
    '/data/search_index_1.json',
    '/data/search_index_2.json',
    '/data/search_index_3.json',
    '/data/search_index_4.json',
    '/data/search_index_5.json',
    '/data/search_index_6.json'
  ];

  searchIndexLoadingPromise = Promise.all(
    shardFiles.map(url =>
      fetch(url).then(res => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
    )
  )
    .then(shards => {
      cachedSearchIndex = shards.flat();
      console.log(`[messageService] Search index preloaded from shards: ${cachedSearchIndex?.length} paragraphs`);
    })
    .catch(() => {
      // Fallback to monolithic index if shards are not present
      return fetch('/data/search_index.json')
        .then(res => {
          if (!res.ok) throw new Error(`Search index status ${res.status}`);
          return res.json();
        })
        .then(data => {
          cachedSearchIndex = data;
          console.log(`[messageService] Search index preloaded: ${data.length} paragraphs`);
        });
    })
    .catch(err => {
      console.warn('[messageService] Search index preload failed (will retry on first search):', err);
      searchIndexLoadingPromise = null;
    });
}'''

content = content.replace(target.replace('\r\n', '\n'), replacement)
content = content.replace(target, replacement)

with open(r'd:\alphatable testing\src\services\messageService.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated messageService.ts successfully')
