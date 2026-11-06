import os
import json
import re
import time

SOURCE_DIR = r"d:\alphatable testing\extracted from pdf"
TARGET_DIR = r"d:\alphatable testing\public\data\sermons"
DATA_DIR = r"d:\alphatable testing\public\data"

def normalize_text(text: str) -> str:
    if not text:
        return ''
    n = text.lower()
    n = re.sub(r'[\u00A0\u00AD]', ' ', n)
    n = re.sub(r'[\u2018\u2019\u201C\u201D]', '', n)
    n = re.sub(r'\u2026', '', n)
    n = re.sub(r'[\u2013\u2014]', ' ', n)
    n = re.sub(r'[.,!?;:"\'()\[\]{}\-_+=*&^%$#@~`|/\\<>]', '', n)
    n = n.strip()
    n = re.sub(r'\s+', ' ', n)
    return n

print("Step 1: Reading existing CAB files to preserve them...")
cab_entries = []
for i in range(11):
    cab_code = f"CAB-{i:02d}"
    cab_path = os.path.join(TARGET_DIR, f"{cab_code}.json")
    if os.path.exists(cab_path):
        with open(cab_path, "r", encoding="utf-8") as f:
            cab_doc = json.load(f)
        cab_entries.append({
            "id": cab_code,
            "table_id": cab_doc.get("tableId", 0),
            "date": cab_code,
            "title": cab_doc.get("title", ""),
            "type": "book",
            "is_book": True,
            "paragraphs_count": len(cab_doc.get("paragraphs", [])),
            "file": f"/data/sermons/{cab_code}.json",
            "status": "preserved"
        })
print(f"Preserved {len(cab_entries)} CAB book chapters.")

print("\nStep 2: Processing extracted from pdf files...")
all_files = [f for f in os.listdir(SOURCE_DIR) if f.endswith(".json") and not f.startswith("CAB-")]
print(f"Found {len(all_files)} sermon files.")

# Group by messageNumber to handle duplicates
by_mn = {}
for fn in all_files:
    fpath = os.path.join(SOURCE_DIR, fn)
    with open(fpath, "r", encoding="utf-8") as f:
        doc = json.load(f)
    mn = doc.get("messageNumber") or fn.split("_")[0]
    mn = mn.strip()
    if mn not in by_mn:
        by_mn[mn] = []
    by_mn[mn].append((fn, doc))

print(f"Unique message numbers: {len(by_mn)}")

sermon_entries = []
t0 = time.time()

for mn, candidates in by_mn.items():
    # Pick candidate: prefer filename without '_clean', with spaces, or max paragraphs
    def score_candidate(cand):
        fname, d = cand
        paras = len(d.get("paragraphs", []))
        score = paras
        if "_" not in fname.split(".")[0]:
            score += 10
        if "clean" not in fname:
            score += 5
        return score

    candidates.sort(key=score_candidate, reverse=True)
    best_fname, doc = candidates[0]

    raw_paras = doc.get("paragraphs", [])
    title = doc.get("title", "")
    date_field = doc.get("date", mn)

    # Clean and add normalized_text
    clean_paras = []
    for p in raw_paras:
        p_num = p.get("paragraph", len(clean_paras) + 1)
        text = p.get("text", "").strip()
        if not text:
            continue
        clean_paras.append({
            "paragraph": p_num,
            "text": text,
            "normalized_text": normalize_text(text)
        })

    safe_mn = re.sub(r'[\\/*?:"<>|]', '_', mn)
    out_file = os.path.join(TARGET_DIR, f"{safe_mn}.json")

    target_doc = {
        "messageNumber": mn,
        "title": title,
        "date": mn,
        "type": "sermon",
        "isBook": False,
        "totalParagraphs": len(clean_paras),
        "paragraphs": clean_paras
    }

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(target_doc, f, ensure_ascii=False, indent=2)

    sermon_entries.append({
        "id": mn,
        "date": mn,
        "title": title,
        "type": "sermon",
        "is_book": False,
        "paragraphs_count": len(clean_paras),
        "file": f"/data/sermons/{safe_mn}.json",
        "status": "updated_from_old_json"
    })

print(f"Processed and wrote {len(sermon_entries)} sermon files in {time.time()-t0:.2f}s.")

# Sort sermon entries chronologically
sermon_entries.sort(key=lambda x: x["date"])

# Combine CAB entries + Sermon entries
all_messages = cab_entries + sermon_entries

messages_manifest = os.path.join(DATA_DIR, "messages.json")
with open(messages_manifest, "w", encoding="utf-8") as f:
    json.dump(all_messages, f, ensure_ascii=False, indent=2)
print(f"Updated master index {messages_manifest} ({len(all_messages)} total records).")

# Step 3: Rebuild search_index.json
print("\nStep 3: Rebuilding search_index.json...")
t_idx = time.time()
search_items = []

for m in all_messages:
    fpath = os.path.join(TARGET_DIR, f"{m['id']}.json")
    if not os.path.exists(fpath):
        continue
    with open(fpath, "r", encoding="utf-8") as f:
        doc = json.load(f)
    code = doc.get("messageNumber", m["id"])
    for p in doc.get("paragraphs", []):
        search_items.append({
            "b": code,
            "p": p["paragraph"],
            "t": p["text"],
            "n": p.get("normalized_text", normalize_text(p["text"]))
        })

search_index_path = os.path.join(DATA_DIR, "search_index.json")
with open(search_index_path, "w", encoding="utf-8") as f:
    json.dump(search_items, f, ensure_ascii=False, separators=(',', ':'))

print(f"Search index built: {len(search_items):,} paragraphs in {time.time()-t_idx:.2f}s.")
print(f"Index size: {os.path.getsize(search_index_path)/(1024*1024):.2f} MB")
print("\nAll done!")
