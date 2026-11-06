import os
import json
import time

sermons_dir = r"d:\alphatable testing\public\data\sermons"
out_index = r"d:\alphatable testing\public\data\search_index.json"

print("Building search index...")
t0 = time.time()

files = [f for f in os.listdir(sermons_dir) if f.endswith(".json")]
files.sort()

index_items = []

for idx, fname in enumerate(files):
    fpath = os.path.join(sermons_dir, fname)
    with open(fpath, "r", encoding="utf-8") as f:
        doc = json.load(f)
    
    code = doc.get("messageNumber", fname.replace(".json", ""))
    
    for p in doc.get("paragraphs", []):
        p_num = p.get("paragraph", 0)
        text = p.get("text", "")
        norm = p.get("normalized_text", "")
        if not text:
            continue
            
        index_items.append({
            "b": code,
            "p": p_num,
            "t": text,
            "n": norm
        })

print(f"Total indexed paragraphs: {len(index_items):,}")
with open(out_index, "w", encoding="utf-8") as f:
    json.dump(index_items, f, ensure_ascii=False, separators=(',', ':'))

elapsed = time.time() - t0
size_mb = os.path.getsize(out_index) / (1024 * 1024)
print(f"Written {out_index} ({size_mb:.2f} MB) in {elapsed:.2f}s")
