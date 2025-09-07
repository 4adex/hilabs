import re
from collections import defaultdict
from itertools import combinations
from multiprocessing import Pool, cpu_count
from typing import Dict, List, Tuple, Set, Optional
import pandas as pd
import numpy as np
import os


def clean_text(s):
    if s is None or (isinstance(s, float) and pd.isna(s)):
        return ""
    s = str(s).lower()
    s = re.sub(r"[^\w\s]", " ", s)
    return " ".join(s.split())

def extract_digits(s):
    if s is None or (isinstance(s, float) and pd.isna(s)):
        return ""
    return re.sub(r"\D", "", str(s))

def ngrams(s, n=2):
    s = clean_text(s)
    if not s:
        return set()
    s2 = s.replace(" ", "_")
    if len(s2) < n:
        return {s2}
    return {s2[i:i+n] for i in range(len(s2)-n+1)}

def jaccard(a: set, b: set) -> float:
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)

def token_overlap(a, b) -> float:
    a = clean_text(a)
    b = clean_text(b)
    if a == "" and b == "":
        return 1.0
    if a == "" or b == "":
        return 0.0
    ta, tb = set(a.split()), set(b.split())
    return len(ta & tb) / len(ta | tb) if ta and tb else 0.0

def phone_match(p1, p2) -> float:
    d1, d2 = extract_digits(p1), extract_digits(p2)
    if not d1 or not d2:
        return 0.0
    if d1 == d2:
        return 1.0
    if len(d1) >= 7 and len(d2) >= 7:
        l = min(10, max(7, min(len(d1), len(d2))))
        return 1.0 if d1[-l:] == d2[-l:] else 0.0
    return 0.0

class DuplicateDetector:
    def __init__(self, threshold=0.7, ngram_n=2, parallel=False, min_block=1, max_block=500):
        self.threshold = float(threshold)
        self.ngram_n = int(ngram_n)
        self.parallel = bool(parallel)
        self.min_block = int(min_block)
        self.max_block = int(max_block)
        self._score_cache: Dict[Tuple[int,int], Tuple[float, Dict]] = {}

    def preprocess(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy().reset_index(drop=True)
        df["_clean_name"] = df.get("full_name", "").fillna("").astype(str).apply(clean_text)
        df["_first"] = df.get("first_name", "").fillna("").astype(str).apply(clean_text)
        df["_last"] = df.get("last_name", "").fillna("").astype(str).apply(clean_text)
        df["_name_grams"] = df["_clean_name"].apply(lambda s: ngrams(s, self.ngram_n))
        df["_addr"] = (df.get("practice_address_line1","").fillna("") + " " +
                       df.get("practice_city","").fillna("") + " " +
                       df.get("practice_state","").fillna("")).astype(str).apply(clean_text)
        df["_addr_grams"] = df["_addr"].apply(lambda s: ngrams(s, self.ngram_n))
        df["_phone"] = df.get("practice_phone","").apply(extract_digits)
        df["_npi"] = df.get("npi","").fillna("").astype(str).str.strip()
        df["_license"] = (df.get("license_state","").fillna("").astype(str).str.upper() + "|" +
                          df.get("license_number","").fillna("").astype(str))
        df["_city_state"] = (df.get("practice_city","").fillna("").astype(str).apply(clean_text) + "|" +
                             df.get("practice_state","").fillna("").astype(str).apply(clean_text))
        df["_name_key"] = (df["_last"].str[:5].fillna("") + "_" + df["_first"].str[:2].fillna("")).apply(lambda s: s if s != "_" else "")
        df["_zip3"] = df.get("practice_zip","").fillna("").astype(str).str.extract(r"(\d{3})", expand=False).fillna("")
        return df

    def create_blocks(self, df: pd.DataFrame) -> Dict[str,List[int]]:
        blocks = defaultdict(set)
        for idx, row in df.iterrows():
            if row["_npi"]:
                blocks[f"npi:{row['_npi']}"].add(idx)
            if row["_phone"]:
                blocks[f"phone7:{row['_phone'][-7:]}"].add(idx)
                blocks[f"phone3:{row['_phone'][:3]}"].add(idx)
            if row["_license"] and row["_license"] != "|":
                blocks[f"lic:{row['_license']}"].add(idx)
            if row["_zip3"]:
                blocks[f"zip:{row['_zip3']}"].add(idx)
            if row["_city_state"] and row["_city_state"] != "|":
                blocks[f"cityst:{row['_city_state']}"].add(idx)
            if row["_name_key"]:
                blocks[f"namekey:{row['_name_key']}"].add(idx)
            if row["_zip3"] and row["_last"]:
                blocks[f"loose:{row['_zip3']}_{row['_last'][:3]}"].add(idx)
        sorted_idx = df.sort_values("_last").index.tolist()
        for i, idx in enumerate(sorted_idx):
            blocks[f"sn:{i//40}"].add(idx)
        return {k:list(v) for k,v in blocks.items() if self.min_block <= len(v) <= self.max_block}

    def candidate_pairs(self, blocks: Dict[str,List[int]]) -> Set[Tuple[int,int]]:
        pairs = set()
        for idxs in blocks.values():
            if len(idxs) < 2:
                continue
            for a, b in combinations(idxs,2):
                pairs.add((min(a,b), max(a,b)))
        return pairs

    def _compute_score(self, i, j, ri, rj) -> Tuple[float, Dict]:
        key = (min(i,j), max(i,j))
        if key in self._score_cache:
            return self._score_cache[key]
        name_tok = token_overlap(ri["_clean_name"], rj["_clean_name"])
        if name_tok < 0.2 and not (ri["_npi"] and rj["_npi"]) and not phone_match(ri["_phone"], rj["_phone"]):
            self._score_cache[key] = (0.0, {"name":name_tok})
            return self._score_cache[key]
        name_big = jaccard(ri["_name_grams"], rj["_name_grams"])
        name_score = max(name_tok, name_big)
        npi_score = 1.0 if (ri["_npi"] and rj["_npi"] and ri["_npi"]==rj["_npi"]) else 0.0
        addr_score = jaccard(ri["_addr_grams"], rj["_addr_grams"])
        phone_score = phone_match(ri["_phone"], rj["_phone"])
        lic_i, lic_j = ri.get("_license",""), rj.get("_license","")
        if lic_i and lic_j and lic_i==lic_j and lic_i!="|":
            lic_score = 1.0
        elif lic_i.split("|")[0] and lic_i.split("|")[0]==lic_j.split("|")[0]:
            lic_score = 0.5
        else:
            lic_score = 0.0
        weights = {"name":0.55, "npi":0.0, "addr":0.15, "phone":0.95, "license":0.30}
        scores = {"name":round(name_score,4), "npi":bool(npi_score), "addr":round(addr_score,4),
                  "phone":bool(phone_score), "license":round(lic_score,4)}
        total = name_score*weights["name"] + npi_score*weights["npi"] + addr_score*weights["addr"] + phone_score*weights["phone"] + lic_score*weights["license"]
        self._score_cache[key] = (round(total,4), scores)
        return self._score_cache[key]

    def _score_wrapper(self, args):
        i, j, ri, rj = args
        score, details = self._compute_score(i,j,ri,rj)
        return {
            "i1":i, "i2":j, "score":score,
            "name_score":details.get("name",0.0),
            "npi_match":details.get("npi",False),
            "addr_score":details.get("addr",0.0),
            "phone_match":details.get("phone",False),
            "license_score":details.get("license",0.0)
        }

    def detect(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, Dict, Dict]:
        proc = self.preprocess(df)
        blocks = self.create_blocks(proc)
        pairs = self.candidate_pairs(blocks)
        if not pairs:
            deduped = proc.drop(columns=[c for c in proc.columns if c.startswith("_")])
            summary = {"total_records":len(proc),"candidate_pairs":0,"duplicate_pairs":0,"unique_involved":0}
            return pd.DataFrame([], columns=[]), deduped, {}, summary
        args = [(i,j, proc.loc[i].to_dict(), proc.loc[j].to_dict()) for i,j in pairs]
        results = []
        if self.parallel and len(args)>200:
            workers = max(1, min(cpu_count()-1, 8))
            with Pool(workers) as p:
                for r in p.imap_unordered(self._score_wrapper, args, chunksize=256):
                    if r["score"] >= self.threshold:
                        results.append(r)
        else:
            for a in args:
                r = self._score_wrapper(a)
                if r["score"] >= self.threshold:
                    results.append(r)
        dup_df = pd.DataFrame(results)
        if dup_df.empty:
            deduped = proc.drop(columns=[c for c in proc.columns if c.startswith("_")])
            summary = {"total_records":len(proc),"candidate_pairs":len(args),"duplicate_pairs":0,"unique_involved":0}
            return dup_df, deduped, {}, summary
        dup_df = dup_df.merge(proc[["full_name","provider_id"]], left_on="i1", right_index=True).rename(columns={"full_name":"name_1","provider_id":"provider_id_1"})
        dup_df = dup_df.merge(proc[["full_name","provider_id"]], left_on="i2", right_index=True).rename(columns={"full_name":"name_2","provider_id":"provider_id_2"})
        dup_df = dup_df[["i1","i2","provider_id_1","provider_id_2","name_1","name_2","score","name_score","npi_match","addr_score","phone_match","license_score"]]

        parent = {}
        def find(x):
            parent.setdefault(x,x)
            if parent[x]!=x:
                parent[x]=find(parent[x])
            return parent[x]
        def union(a,b):
            ra,rb = find(a), find(b)
            if ra!=rb:
                parent[rb]=ra
        for _, r in dup_df.iterrows():
            union(int(r["i1"]), int(r["i2"]))
        clusters = defaultdict(list)
        for node in parent.keys():
            clusters[find(node)].append(node)
        clusters = {f"cluster_{k}": sorted(v) for k,v in clusters.items()}

        reps = {}
        for root, members in clusters.items():
            best, best_score = None, (-1,-1,None,10**9)
            for idx in members:
                row = proc.loc[idx]
                has_npi = 1 if row["_npi"] else 0
                has_lic = 1 if row["_license"] and row["_license"]!="|" else 0
                ts = 0
                try:
                    ts = pd.to_datetime(row.get("last_updated", None)).value if row.get("last_updated") not in (None,"",np.nan) else 0
                except:
                    ts = 0
                metric = (has_npi, has_lic, ts, -idx)
                if metric > best_score:
                    best_score = metric
                    best = idx
            reps[root]=best
        rep_indices = set(reps.values())
        deduped_df = proc.loc[sorted(rep_indices)].drop(columns=[c for c in proc.columns if c.startswith("_")]).reset_index(drop=True)
        summary = {"total_records":len(proc),"candidate_pairs":len(args),"duplicate_pairs":len(dup_df),"unique_involved":len(set(dup_df["i1"]).union(set(dup_df["i2"]))),"clusters":len(clusters)}
        clusters_info = {k:{"members":v,"representative":reps[k]} for k,v in clusters.items()}
        return dup_df.reset_index(drop=True), deduped_df, clusters_info, summary

def remove_duplicates(df, threshold=0.7, parallel=False):
    detector = DuplicateDetector(threshold=threshold, parallel=parallel)
    dup_df, _, clusters, summary = detector.detect(df)
    if not clusters:
        deduped_df = df.copy().reset_index(drop=True)
        return dup_df, deduped_df, clusters, summary
    rep_indices = set(cluster["representative"] for cluster in clusters.values())
    all_idxs = set(df.index)
    nondupes = all_idxs - set().union(*(c["members"] for c in clusters.values()))
    rep_indices.update(nondupes)
    deduped_df = df.loc[sorted(rep_indices)].reset_index(drop=True)
    return dup_df, deduped_df, clusters, summary


def standardize_df(df: pd.DataFrame) -> pd.DataFrame:
    """
    Standardizes the dataframe:
      - practice_phone: digits only
      - mailing_zip: normalize and zero-pad
      - title case for names, addresses, cities, schools, residency
      - rebuild full_name from first, last, credential
    """

    # --- Standardize practice_phone ---
    def normalize_phone(val):
        if pd.isna(val):
            return np.nan
        digits = re.sub(r'\D+', '', str(val))
        return digits if digits else np.nan

    df['practice_phone_standardized'] = df['practice_phone'].apply(normalize_phone)

    # --- Normalize mailing_zip ---
    def normalize_zip(val):
        if pd.isna(val):
            return np.nan
        s = str(val).strip()
        digits = re.sub(r'\D+', '', s)
        if digits == "":
            return np.nan
        if len(digits) < 5:
            return digits.zfill(5)
        if len(digits) == 5:
            return digits
        if len(digits) == 9:
            return digits[:5] + "-" + digits[5:]
        return digits

    df['mailing_zip'] = df['mailing_zip'].apply(normalize_zip)

    # --- Title case helper ---
    def to_title(val):
        if pd.isna(val):
            return np.nan
        return str(val).strip().title()

    title_cols = [
        'first_name', 'last_name',
        'practice_city', 'mailing_city',
        'practice_address_line1', 'practice_address_line2',
        'mailing_address_line1', 'mailing_address_line2',
        'medical_school', 'residency_program'
    ]
    for col in title_cols:
        if col in df.columns:
            df[col] = df[col].apply(to_title)

    # --- Rebuild full_name ---
    def build_full_name(row):
        first = row.get('first_name')
        last = row.get('last_name')
        cred = row.get('credential')
        if pd.isna(first) or pd.isna(last):
            return np.nan
        full = f"{first} {last}"
        if pd.notna(cred):
            full += f", {cred.strip()}"
        return full

    df['full_name'] = df.apply(build_full_name, axis=1)

    return df


def normalize_license(lic: Optional[str]) -> Optional[str]:
    if pd.isna(lic):
        return None
    s = str(lic).strip().upper().replace("-", "").replace(" ", "")
    return s or None

def normalize_datetime(x) -> Optional[pd.Timestamp]:
    try:
        if pd.isna(x) or x == "":
            return None
        return pd.to_datetime(x, errors="coerce")
    except:
        return None

def normalize_bools(x) -> Optional[bool]:
    if pd.isna(x):
        return None
    if isinstance(x, bool):
        return x
    s = str(x).strip().lower()
    if s in {"true","yes","y","1","t"}:
        return True
    if s in {"false","no","n","0","f"}:
        return False
    return None

def normalize_npi(x) -> Optional[str]:
    if pd.isna(x):
        return None
    s = str(x).strip()
    return s if s else None

def merge_roster(df_clean: pd.DataFrame, base_path: str) -> pd.DataFrame:
    files = {
        "ca": os.path.join(base_path, "ca.csv"),
        "ny": os.path.join(base_path, "ny.csv"),
        "npi": os.path.join(base_path, "npi.csv")
    }

    tables = {}
    for k, p in files.items():
        if os.path.exists(p):
            tables[k] = pd.read_csv(p)

    ca_df = tables.get("ca", pd.DataFrame())
    ny_df = tables.get("ny", pd.DataFrame())
    npi_df = tables.get("npi", pd.DataFrame())

    df_clean['license_number_norm'] = df_clean['license_number'].apply(normalize_license)
    if not ca_df.empty:
        ca_df['license_number_norm'] = ca_df['license_number'].apply(normalize_license)
    if not ny_df.empty:
        ny_df['license_number_norm'] = ny_df['license_number'].apply(normalize_license)
        ny_df['expiration_date_norm'] = ny_df['expiration_date'].apply(normalize_datetime)
        df_clean['license_expiration_norm'] = df_clean['license_expiration'].apply(normalize_datetime)

    ca_roster = pd.DataFrame()
    ny_roster = pd.DataFrame()

    if not ca_df.empty:
        ca_roster = df_clean[df_clean['license_state'] == 'CA'].merge(
            ca_df, left_on='license_number_norm', right_on='license_number_norm', how='left'
        )

    if not ny_df.empty:
        ny_roster = df_clean[df_clean['license_state'] == 'NY'].merge(
            ny_df,
            left_on=['license_number_norm','license_expiration_norm'],
            right_on=['license_number_norm','expiration_date_norm'],
            how='left'
        )

    merged_df = pd.concat([ca_roster, ny_roster], ignore_index=True)

    if not npi_df.empty:
        npi_df['npi_norm'] = npi_df['npi'].apply(normalize_npi)
        merged_df['npi_norm'] = merged_df['npi'].apply(normalize_npi)
        merged_df = merged_df.merge(npi_df, left_on='npi_norm', right_on='npi_norm', how='left')

    merged_df.drop(columns=['license_number_norm','license_expiration_norm','expiration_date_norm','npi_norm'], errors='ignore', inplace=True)

    return merged_df


# df = pd.read_csv('roster.csv') 
# dup_df, deduped_df, clusters, summary = remove_duplicates(df, threshold=0.72)
# df_clean = standardize_df(deduped_df)
# merged_df = merge_roster(df_clean, ".") #base path of the dataset

## We will save dup_df, clusters, merged_df in the sql engine, give its output to the 

def preprocessing(roster_df, base_path):
    dup_df, deduped_df, clusters, summary = remove_duplicates(roster_df, threshold=0.72)
    df_clean = standardize_df(deduped_df)
    merged_df = merge_roster(df_clean, base_path)
    return dup_df, clusters, summary, merged_df
