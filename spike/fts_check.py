"""D6: does SQLite FTS5 fit the search ladder? Made-up tags, in-memory only."""
import re, sqlite3

TAGS = [
    (1, "i been on the block since a youngin it has to be real"),
    (2, "has to be real with me"),
    (3, "real ones never fold when the block get hot"),
    (4, "and it was what it was and it is what it is"),
    (5, "drippin on the block in the rain"),
    (6, "youngins runnin it up"),
    (7, "ion even trip ion even care"),
]
db = sqlite3.connect(":memory:")
db.execute("create virtual table t using fts5(line, content='', tokenize=\"porter unicode61\")")
db.execute("create virtual table t_exact using fts5(line, tokenize='unicode61')")
db.execute("create virtual table v using fts5vocab(t_exact, 'row')")
db.execute("create virtual table tri using fts5(line, tokenize='trigram')")
for i, s in TAGS:
    db.execute("insert into t(rowid,line) values(?,?)", (i, s))
    db.execute("insert into t_exact(rowid,line) values(?,?)", (i, s))
    db.execute("insert into tri(rowid,line) values(?,?)", (i, s))
LINE = dict(TAGS)
TOTAL = len(TAGS)
SLANG = {"youngin": ["youngins"], "aint": ["ion"]}


def ladder(q):
    """Runs each rung and merges, best rung first. Nothing is excluded by a higher rung."""
    words = re.findall(r"[\w']+", q.lower())
    rungs = [("phrase", '"' + " ".join(words) + '"'), ("near", "NEAR(" + " ".join(words) + ", 8)"),
             ("all", " AND ".join(words)), ("any", " OR ".join(words))]
    seen, out = set(), []
    for name, m in rungs:
        for (rowid, score) in db.execute("select rowid, bm25(t_exact) from t_exact where t_exact match ? order by 2", (m,)):
            if rowid not in seen:
                seen.add(rowid)
                out.append((name, rowid, round(score, 2)))
    return out


for q in ["has to", "block real", "the block", "it is"]:
    print(q, "->", [(n, r, s) for n, r, s in ladder(q)])
print("rarity (docs containing word):", {w: d for w, d in db.execute("select term, doc from v where term in ('the','it','block','youngin')")})
print("word ending, porter 'youngin' finds:", [r[0] for r in db.execute("select rowid from t where t match 'youngin'")])
print("porter 'drip' finds drippin?:", [r[0] for r in db.execute("select rowid from t where t match 'drip'")])
print("prefix 'drip*':", [r[0] for r in db.execute("select rowid from t_exact where t_exact match 'drip*'")])
print("misspelling 'youngn' via trigram 'oun':", [r[0] for r in db.execute("select rowid from tri where tri match 'oun'")])
