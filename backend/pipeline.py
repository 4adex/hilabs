import re
import time
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
        weights = {"name":0.27, "npi":0.0, "addr":0.08, "phone":0.5, "license":0.15}
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

    df['practice_phone'] = df['practice_phone'].apply(normalize_phone)

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

def normalise_npi(x):
    if pd.isna(x):
        return None
    s = str(x).strip()
    return s if s else None

def normalize_bools(x) -> Optional[bool]:
    """Convert common representations to bool or None."""
    if pd.isna(x):
        return None
    if isinstance(x, bool):
        return x
    s = str(x).strip().lower()
    if s in {"true", "yes", "y", "1", "t"}:
        return True
    if s in {"false", "no", "n", "0", "f"}:
        return False
    return None

def normalize_datetime(x) -> Optional[pd.Timestamp]:
    """normalize datetime: safe parse to pandas Timestamp"""
    try:
        if pd.isna(x) or x == "":
            return None
        return pd.to_datetime(x, errors="coerce")
    except Exception:
        return None

def normalize_license(lic: Optional[str]) -> Optional[str]:
    """normalize_license: uppercase, strip spaces & dashes"""
    if pd.isna(lic):
        return None
    s = str(lic).strip().upper()
    s = s.replace("-", "").replace(" ", "")
    return s or None

def remove_outliers(df: pd.DataFrame, column: str = 'years_in_practice', min_val: int = 0, max_val: int = 60) -> pd.DataFrame:
    """Remove outliers from specified column"""
    if column not in df.columns:
        return df.copy()
    return df[(df[column] >= min_val) & (df[column] <= max_val)].copy()

class DataQualityAssessment:
    def __init__(self, df: pd.DataFrame):
        self.df = df.copy()
        self.total_records = len(df)

    def normalize_phone_check(self, val):
        """Normalize phone number - helper method for validation"""
        if pd.isna(val):
            return None
        digits = re.sub(r'\D+', '', str(val))
        return digits if digits else None

    def normalize_zip_check(self, val):
        """Normalize zip code - helper method for validation"""
        if pd.isna(val):
            return None
        s = str(val).strip()
        digits = re.sub(r'\D+', '', s)
        if digits == "":
            return None
        if len(digits) < 5:
            return digits.zfill(5)
        if len(digits) == 5:
            return digits
        if len(digits) == 9:
            return digits[:5] + "-" + digits[5:]
        return digits

    def to_title_case(self, val):
        """Convert to title case - helper method for consistency check"""
        if pd.isna(val):
            return None
        return str(val).strip().title()

    def assess_completeness(self) -> Dict:
        """Assess data completeness for critical fields"""
        critical_fields = [
            'first_name', 'last_name', 'npi', 'license_number', 'license_state',
            'credential', 'practice_phone', 'years_in_practice', 'practice_city',
            'practice_address_line1'
        ]

        total_critical_fields = 0
        filled_critical_fields = 0

        for field in critical_fields:
            if field in self.df.columns:
                field_count = len(self.df)
                non_null_count = self.df[field].notna().sum()

                total_critical_fields += field_count
                filled_critical_fields += non_null_count

        if total_critical_fields > 0:
            completeness_score = (filled_critical_fields / total_critical_fields) * 100
        else:
            completeness_score = 100

        return {'completeness_score': round(completeness_score, 2)}

    def assess_validity_formats(self) -> Dict:
        """Assess format validity"""
        total_valid_formats = 0
        total_format_checks = 0

        # NPI validation (should be 10 digits)
        if 'npi' in self.df.columns:
            npi_values = self.df['npi'].dropna()
            if len(npi_values) > 0:
                valid_npi = sum(1 for npi in npi_values
                              if re.match(r'^\d{10}$', str(npi).strip()))
                total_valid_formats += valid_npi
                total_format_checks += len(npi_values)

        # Phone validation (should normalize to 10 digits)
        if 'practice_phone' in self.df.columns:
            phone_values = self.df['practice_phone'].dropna()
            if len(phone_values) > 0:
                valid_phone = sum(1 for phone in phone_values
                                if self.normalize_phone_check(phone) is not None and
                                len(self.normalize_phone_check(phone)) == 10)
                total_valid_formats += valid_phone
                total_format_checks += len(phone_values)

        # Zip code validation
        zip_columns = ['practice_zip', 'mailing_zip']
        for col in zip_columns:
            if col in self.df.columns:
                zip_values = self.df[col].dropna()
                if len(zip_values) > 0:
                    valid_zip = sum(1 for zip_code in zip_values
                                  if self.normalize_zip_check(zip_code) is not None and
                                  re.match(r'^\d{5}(-\d{4})?$', self.normalize_zip_check(zip_code)))
                    total_valid_formats += valid_zip
                    total_format_checks += len(zip_values)

        if total_format_checks > 0:
            validity_score = (total_valid_formats / total_format_checks) * 100
        else:
            validity_score = 100

        return {
            'validity_score': round(validity_score, 2),
            'total_format_errors': total_format_checks - total_valid_formats
        }

    def assess_consistency(self) -> Dict:
        """Assess data consistency (proper formatting)"""
        total_consistent = 0
        total_consistency_checks = 0

        # Check title case consistency
        title_cols = [
            'first_name', 'last_name', 'practice_city', 'mailing_city',
            'practice_address_line1', 'practice_address_line2',
            'mailing_address_line1', 'mailing_address_line2',
            'medical_school', 'residency_program'
        ]

        for col in title_cols:
            if col in self.df.columns:
                col_values = self.df[col].dropna()
                if len(col_values) > 0:
                    consistent_count = sum(1 for val in col_values
                                         if str(val).strip() == self.to_title_case(val))
                    total_consistent += consistent_count
                    total_consistency_checks += len(col_values)

        # Check phone consistency (digits only)
        if 'practice_phone' in self.df.columns:
            phone_values = self.df['practice_phone'].dropna()
            if len(phone_values) > 0:
                consistent_phone = sum(1 for phone in phone_values
                                     if not re.search(r'[^\d]', str(phone)))
                total_consistent += consistent_phone
                total_consistency_checks += len(phone_values)

        if total_consistency_checks > 0:
            consistency_score = (total_consistent / total_consistency_checks) * 100
        else:
            consistency_score = 100

        return {'consistency_score': round(consistency_score, 2)}

    def assess_uniqueness(self, summary: Dict) -> Dict:
        """Assess data uniqueness"""
        unique_records = self.total_records

        # Subtract duplicate records identified
        unique_involved = summary.get('unique_involved', 0)
        unique_records -= unique_involved

        # Check for NPI duplicates within the dataset
        if 'npi' in self.df.columns:
            npi_duplicates = self.df['npi'].dropna().duplicated().sum()
            unique_records -= npi_duplicates

        # Check for license duplicates
        if 'license_number' in self.df.columns and 'license_state' in self.df.columns:
            license_combo = self.df[['license_state', 'license_number']].dropna()
            license_duplicates = license_combo.duplicated().sum()
            unique_records -= license_duplicates

        if self.total_records > 0:
            uniqueness_score = (unique_records / self.total_records) * 100
        else:
            uniqueness_score = 100

        return {'uniqueness_score': round(max(0, uniqueness_score), 2)}

    def assess_accuracy(self) -> Dict:
        """Assess data accuracy (outlier detection)"""
        total_accurate = 0
        total_accuracy_checks = 0

        # Check years_in_practice for reasonable values
        if 'years_in_practice' in self.df.columns:
            years_values = self.df['years_in_practice'].dropna()
            if len(years_values) > 0:
                accurate_years = sum(1 for years in years_values
                                   if 0 <= years <= 60)
                total_accurate += accurate_years
                total_accuracy_checks += len(years_values)

        if total_accuracy_checks > 0:
            accuracy_score = (total_accurate / total_accuracy_checks) * 100
        else:
            accuracy_score = 100

        return {'accuracy_score': round(accuracy_score, 2)}

    def assess_unknown_values(self) -> Dict:
        """Assess unknown/invalid categorical values"""
        total_known = 0
        total_categorical_checks = 0

        # Check accepting_new_patients for valid values
        if 'accepting_new_patients' in self.df.columns:
            valid_values = ['Yes', 'No', 'yes', 'no', 'YES', 'NO', 'Y', 'N', 'y', 'n',
                          'True', 'False', 'true', 'false', 'TRUE', 'FALSE']
            categorical_values = self.df['accepting_new_patients'].dropna()
            if len(categorical_values) > 0:
                known_count = sum(1 for val in categorical_values
                                if val in valid_values)
                total_known += known_count
                total_categorical_checks += len(categorical_values)

        if total_categorical_checks > 0:
            unknown_values_score = (total_known / total_categorical_checks) * 100
        else:
            unknown_values_score = 100

        return {'unknown_values_score': round(unknown_values_score, 2)}

    def calculate_overall_quality_score(self, summary: Dict = None) -> Tuple[float, Dict]:
        """Calculate overall data quality score using average of dimension scores"""
        if summary is None:
            summary = {}

        completeness = self.assess_completeness()
        validity = self.assess_validity_formats()
        consistency = self.assess_consistency()
        uniqueness = self.assess_uniqueness(summary)
        accuracy = self.assess_accuracy()
        unknown_vals = self.assess_unknown_values()

        dimension_scores = {
            'completeness': completeness['completeness_score'],
            'validity': validity['validity_score'],
            'consistency': consistency['consistency_score'],
            'uniqueness': uniqueness['uniqueness_score'],
            'accuracy': accuracy['accuracy_score'],
            'unknown_values': unknown_vals['unknown_values_score']
        }

        overall_score = sum(dimension_scores.values()) / len(dimension_scores)

        detailed_issues = {
            'completeness': completeness,
            'validity': validity,
            'consistency': consistency,
            'uniqueness': uniqueness,
            'accuracy': accuracy,
            'unknown_values': unknown_vals,
            'dimension_scores': dimension_scores,
            'overall_score': round(overall_score, 2)
        }

        return overall_score, detailed_issues

def calculate_data_quality_score(df: pd.DataFrame, summary: Dict = None) -> Tuple[float, Dict]:
    """Calculate comprehensive data quality score for the dataset"""
    if summary is None:
        summary = {}
    assessor = DataQualityAssessment(df)
    return assessor.calculate_overall_quality_score(summary)

def merge_roster(df_clean: pd.DataFrame, base_path: str) -> pd.DataFrame:
    files = {
        "ca": os.path.join(base_path, "ca.csv"),
        "ny": os.path.join(base_path, "ny.csv"),
        "npi": os.path.join(base_path, "npi.csv")
    }

    tables = {k: pd.read_csv(p) for k, p in files.items() if os.path.exists(p)}
    ca_df = tables.get("ca", pd.DataFrame())
    ny_df = tables.get("ny", pd.DataFrame())
    npi_df = tables.get("npi", pd.DataFrame())

    df_clean['license_number_norm'] = df_clean['license_number'].apply(normalize_license)
    if not ca_df.empty:
        ca_df['license_number_norm'] = ca_df['license_number'].apply(normalize_license)
    if not ny_df.empty:
        ny_df['license_number_norm'] = ny_df['license_number'].apply(normalize_license)
        ny_df['expiration_date_norm'] = ny_df['expiration_date'].apply(normalize_datetime)
        if 'license_expiration' in df_clean.columns:
            df_clean['license_expiration_norm'] = df_clean['license_expiration'].apply(normalize_datetime)

    merged_parts = []

    if not ca_df.empty:
        ca_subset = ca_df[['license_number_norm', 'status']].drop_duplicates(subset=['license_number_norm'])
        ca_roster = df_clean[df_clean['license_state'] == 'CA'].merge(
            ca_subset, on='license_number_norm', how='left', validate='many_to_one'
        ).rename(columns={'status': 'ca_status'})
        merged_parts.append(ca_roster)

    if not ny_df.empty:
        ny_subset = ny_df[['license_number_norm', 'expiration_date_norm', 'status']].drop_duplicates(subset=['license_number_norm', 'expiration_date_norm'])
        if 'license_expiration_norm' in df_clean.columns:
            ny_roster = df_clean[df_clean['license_state'] == 'NY'].merge(
                ny_subset,
                left_on=['license_number_norm', 'license_expiration_norm'],
                right_on=['license_number_norm', 'expiration_date_norm'],
                how='left',
                validate='many_to_one'
            ).rename(columns={'status': 'ny_status'})
        else:
            ny_subset_simple = ny_subset[['license_number_norm', 'status']].drop_duplicates(subset=['license_number_norm'])
            ny_roster = df_clean[df_clean['license_state'] == 'NY'].merge(
                ny_subset_simple,
                on='license_number_norm',
                how='left',
                validate='many_to_one'
            ).rename(columns={'status': 'ny_status'})
        merged_parts.append(ny_roster)

    others = df_clean[~df_clean['license_state'].isin(['CA', 'NY'])]
    merged_parts.append(others)

    merged_df = pd.concat(merged_parts, ignore_index=True)

    # Combine ca_status and ny_status into a single status column
    if 'ca_status' in merged_df.columns and 'ny_status' in merged_df.columns:
        merged_df['status'] = merged_df['ca_status'].fillna(merged_df['ny_status'])
        merged_df.drop(columns=['ca_status', 'ny_status'], errors='ignore', inplace=True)
    elif 'ca_status' in merged_df.columns:
        merged_df['status'] = merged_df['ca_status']
        merged_df.drop(columns=['ca_status'], errors='ignore', inplace=True)
    elif 'ny_status' in merged_df.columns:
        merged_df['status'] = merged_df['ny_status']
        merged_df.drop(columns=['ny_status'], errors='ignore', inplace=True)

    # NEW LOGIC: Check if NPI exists in npi.csv and create npi_present column
    if not npi_df.empty and 'npi' in npi_df.columns:
        # Create a set of NPIs from npi.csv for fast lookup
        npi_set = set(npi_df['npi'].apply(normalise_npi).dropna())

        # Check each row in merged_df if its NPI exists in npi.csv
        merged_df['npi_present'] = merged_df['npi'].apply(
            lambda x: normalise_npi(x) in npi_set if normalise_npi(x) is not None else False
        )
    else:
        # If npi.csv doesn't exist or doesn't have 'npi' column, set all to False
        merged_df['npi_present'] = False

    merged_df.drop(columns=['license_number_norm', 'license_expiration_norm', 'expiration_date_norm'], errors='ignore', inplace=True)

    return merged_df


def create_comprehensive_summary(summary: dict, df_merged: pd.DataFrame, original_df: pd.DataFrame) -> dict:
    """Create comprehensive summary with all metrics in one place"""

    # Calculate data quality score
    quality_score, quality_report = calculate_data_quality_score(original_df, summary)

    # Add basic metrics
    summary["final_records"] = len(df_merged)

    # Add expired licenses count
    if 'status' in df_merged.columns:
        status_counts = df_merged['status'].value_counts()
        expired_statuses = ['Expired', 'Suspended', 'Revoked', 'Inactive']
        expired_count = sum(status_counts.get(status, 0) for status in expired_statuses)
        summary["expired_licenses"] = int(expired_count)
    else:
        summary["expired_licenses"] = 0

    # Count missing NPI based on npi_present column
    if 'npi_present' in df_merged.columns:
        # Count records where npi_present is False (meaning NPI is missing from npi.csv)
        missing_npi = (df_merged['npi_present'] == False).sum()
        summary["missing_npi"] = int(missing_npi)
    else:
        # Fallback: count null NPIs if npi_present column doesn't exist
        if 'npi' in df_merged.columns:
            missing_npi = df_merged['npi'].isnull().sum()
            summary["missing_npi"] = int(missing_npi)
        else:
            summary["missing_npi"] = 0

    # Add providers available count
    if 'accepting_new_patients' in df_merged.columns:
        providers_available_count = df_merged[df_merged['accepting_new_patients'] == 'Yes'].shape[0]
        summary["providers_available"] = int(providers_available_count)
    else:
        summary["providers_available"] = 0

    # Add state counts
    if 'practice_state' in df_merged.columns:
        state_counts = df_merged['practice_state'].value_counts()
        summary["ca_state"] = int(state_counts.get('CA', 0))
        summary["ny_state"] = int(state_counts.get('NY', 0))
    else:
        summary["ca_state"] = 0
        summary["ny_state"] = 0

    # Add formatting issues count
    validity_issues = DataQualityAssessment(original_df).assess_validity_formats()
    summary["formatting_issues"] = validity_issues.get("total_format_errors", 0)

    # Calculate compliance rate
    final_records = summary.get("final_records", len(df_merged))
    expired_licenses = summary.get("expired_licenses", 0)
    missing_npi = summary.get("missing_npi", 0)

    if final_records > 0:
        # Compliance issues as percentage of final records
        compliance_issues = (expired_licenses + missing_npi) / final_records * 100
        # Compliance rate is 100 - issues percentage
        compliance_rate = max(0, 100 - compliance_issues)
    else:
        compliance_rate = 100.0

    summary["compliance_rate"] = round(compliance_rate, 2)

    # Add data quality score
    summary["data_quality_score"] = round(quality_score, 2)

    return summary


def preprocessing(roster_df: pd.DataFrame, base_path: str, remove_outliers_flag: bool = True) -> Tuple[pd.DataFrame, dict, dict, pd.DataFrame]:
    """
    Complete preprocessing pipeline with integrated summary creation

    Returns:
        dup_df: DataFrame with duplicate pairs information
        clusters: Dictionary with cluster information
        summary: Comprehensive summary dictionary with all metrics
        merged_df: Final processed and merged DataFrame
    """
    # Store original dataframe for quality assessment
    original_df = roster_df.copy()

    # Step 1: Remove duplicates
    dup_df, deduped_df, clusters, summary = remove_duplicates(roster_df, threshold=0.72)

    # Step 2: Standardize data
    df_clean = standardize_df(deduped_df)

    # Step 3: Merge with external data
    merged_df = merge_roster(df_clean, base_path)

    # Step 4: Remove outliers if requested
    if remove_outliers_flag:
        original_count = len(merged_df)
        merged_df = remove_outliers(merged_df)
        outliers_removed = original_count - len(merged_df)
        summary["outliers_removed"] = outliers_removed
    else:
        summary["outliers_removed"] = 0

    # Step 5: Create comprehensive summary with all metrics
    summary = create_comprehensive_summary(summary, merged_df, original_df)

    return dup_df, clusters, summary, merged_df