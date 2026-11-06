import json
import os
import math

index_path = r"d:\alphatable testing\public\data\search_index.json"
print("Reading search_index.json...")
with open(index_path, "r", encoding="utf-8") as f:
    items = json.load(f)

total = len(items)
print(f"Total items: {total}")

num_shards = 6
chunk_size = math.ceil(total / num_shards)

for i in range(num_shards):
    start = i * chunk_size
    end = min((i + 1) * chunk_size, total)
    shard_items = items[start:end]
    shard_file = rf"d:\alphatable testing\public\data\search_index_{i+1}.json"
    with open(shard_file, "w", encoding="utf-8") as f:
        json.dump(shard_items, f, ensure_ascii=False, separators=(',', ':'))
    size_mb = os.path.getsize(shard_file) / (1024 * 1024)
    print(f"Shard {i+1}: {len(shard_items)} items, {size_mb:.2f} MB -> {shard_file}")

print("Done sharding.")
