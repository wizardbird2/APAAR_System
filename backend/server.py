#!/usr/bin/env python3
"""SeatSentinel prototype API (stdlib HTTP + SQLite + JWT + Ed25519). Run: python server.py"""
import os, re, json, time, hmac, hashlib, secrets, sqlite3, mimetypes, datetime
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
import jwt
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization as ser

B = os.path.dirname(os.path.abspath(__file__)); DB = os.path.join(B, 'seatsentinel.db')
WEB = os.path.normpath(os.path.join(B, '..', 'frontend')); KP = os.path.join(B, 'keys', 'ed25519.pem')
SECRET = os.environ.get('JWT_SECRET', 'dev-only-change-me'); HK = os.environ.get('HMAC_KEY', 'dev-hmac-key').encode()
PW = 'demo123'  # demo password for all seeded users

def load_key():
    os.makedirs(os.path.dirname(KP), exist_ok=True)
    if os.path.exists(KP): return ser.load_pem_private_key(open(KP, 'rb').read(), None)
    k = Ed25519PrivateKey.generate()
    open(KP, 'wb').write(k.private_bytes(ser.Encoding.PEM, ser.PrivateFormat.PKCS8, ser.NoEncryption())); return k
KEY = load_key(); PUB = KEY.public_key().public_bytes(ser.Encoding.Raw, ser.PublicFormat.Raw).hex()

def db():
    c = sqlite3.connect(DB); c.row_factory = sqlite3.Row; return c
def pwh(p, salt): return hashlib.pbkdf2_hmac('sha256', p.encode(), bytes.fromhex(salt), 100000).hex()
def hm(a): return hmac.new(HK, a.encode(), hashlib.sha256).hexdigest()   # keyed hash of APAAR ID
def sha(s): return hashlib.sha256(s.encode()).hexdigest()
def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat()

def audit(c, actor, action, detail):
    r = c.execute('select h from audit_log order by id desc limit 1').fetchone(); prev = r['h'] if r else '0' * 64
    t = now(); h = sha(prev + t + actor + action + detail)
    c.execute('insert into audit_log(t,actor,action,detail,prev,h) values(?,?,?,?,?,?)', (t, actor, action, detail, prev, h)); c.commit()

def chain_ok(c):
    p = '0' * 64
    for r in c.execute('select * from audit_log order by id'):
        if r['prev'] != p or r['h'] != sha(r['prev'] + r['t'] + r['actor'] + r['action'] + r['detail']): return r['id']
        p = r['h']
    return -1

def seed(force=False):
    if os.path.exists(DB):
        if not force: return
        os.remove(DB)
    c = db()
    c.executescript('''CREATE TABLE users(email TEXT PRIMARY KEY,name TEXT,role TEXT,inst TEXT,salt TEXT,pw TEXT);
CREATE TABLE students(n INTEGER PRIMARY KEY,apaar TEXT,apaar_hmac TEXT,name TEXT,inst TEXT,course TEXT,cat TEXT,status TEXT,"start" TEXT,"end" TEXT);
CREATE TABLE rules(key TEXT PRIMARY KEY,value TEXT,version INT,handbook_year TEXT,note TEXT);
CREATE TABLE audit_log(id INTEGER PRIMARY KEY AUTOINCREMENT,t TEXT,actor TEXT,action TEXT,detail TEXT,prev TEXT,h TEXT);
CREATE TABLE receipts(receipt TEXT PRIMARY KEY,t TEXT,purpose TEXT,apaar_masked TEXT,result TEXT,sig TEXT);''')
    for e, n, r, i in [('analyst@seatsentinel.demo', 'Anita Rao (AICTE Analyst)', 'analyst', None), ('officer@seatsentinel.demo', 'Rahul Verma (AICTE Officer)', 'officer', None),
                       ('registrar.pune@seatsentinel.demo', 'Registrar, Pune Institute', 'inst', 'I1'), ('verifier@seatsentinel.demo', 'Employer Verifier', 'ver', None)]:
        s = secrets.token_hex(8); c.execute('insert into users values(?,?,?,?,?,?)', (e, n, r, i, s, pwh(PW, s)))
    rows = json.load(open(os.path.join(B, 'students_seed.json')))
    c.executemany('insert into students values(?,?,?,?,?,?,?,?,?,?)', [(r['n'], r['apaar'], hm(r['apaar']) if re.fullmatch(r'\d{12}', r['apaar']) else '', r['name'], r['inst'], r['course'], r['cat'], r['status'], r['start'], r['end']) for r in rows])
    c.executemany('insert into rules values(?,?,?,?,?)', [('regular_seats', 'REG <= approved intake', 1, '2026 (confirm)', 'prototype assumption'), ('supernumerary_pct', '15', 1, '2026 (confirm)', 'FN/OCI/PIO/CIWGC cap, pending AICTE confirmation'),
        ('nri_treatment', 'tracked separately', 1, '2026 (confirm)', 'not stated in source; pending'), ('yoy_threshold', '1.4', 1, 'n/a', 'review signal, not proof'), ('fuzzy_distance', '1', 1, 'n/a', 'same course, different college')])
    c.commit(); audit(c, 'system', 'seed', f'{len(rows)} synthetic students, seed 26263')

class H(BaseHTTPRequestHandler):
    def _j(s, code, obj):
        b = json.dumps(obj).encode(); s.send_response(code)
        for k, v in [('Content-Type', 'application/json'), ('Access-Control-Allow-Origin', '*'), ('Access-Control-Allow-Headers', 'Authorization,Content-Type'), ('Content-Length', str(len(b)))]: s.send_header(k, v)
        s.end_headers(); s.wfile.write(b)
    def user(s):
        try: return jwt.decode(s.headers.get('Authorization', '')[7:], SECRET, algorithms=['HS256'])
        except Exception: return None
    def body(s): return json.loads(s.rfile.read(int(s.headers.get('Content-Length', 0))) or b'{}')
    def do_OPTIONS(s): s._j(200, {})
    def do_GET(s):
        p = urlparse(s.path).path
        if p.startswith('/api/'): return s.api('GET', p)
        f = os.path.normpath(os.path.join(WEB, 'index.html' if p == '/' else p.lstrip('/')))
        if not f.startswith(WEB) or not os.path.isfile(f): return s._j(404, {'error': 'not found'})
        b = open(f, 'rb').read(); s.send_response(200); s.send_header('Content-Type', mimetypes.guess_type(f)[0] or 'application/octet-stream'); s.send_header('Content-Length', str(len(b))); s.end_headers(); s.wfile.write(b)
    def do_POST(s): s.api('POST', urlparse(s.path).path)
    def api(s, m, p):
        c = db(); u = s.user()
        if p == '/api/health': return s._j(200, {'ok': True, 'students': c.execute('select count(*) from students').fetchone()[0]})
        if p == '/api/pubkey': return s._j(200, {'alg': 'Ed25519', 'public_key': PUB})
        if p == '/api/login' and m == 'POST':
            d = s.body(); r = c.execute('select * from users where email=?', (str(d.get('email', '')).lower(),)).fetchone()
            if not r or not hmac.compare_digest(pwh(str(d.get('password', '')), r['salt']), r['pw']): return s._j(401, {'error': 'Invalid credentials'})
            usr = {k: r[k] for k in ('email', 'name', 'role', 'inst')}; audit(c, usr['name'], 'login', usr['role'])
            return s._j(200, {'token': jwt.encode({**usr, 'exp': int(time.time()) + 8 * 3600}, SECRET, algorithm='HS256'), 'user': usr})
        if not u: return s._j(401, {'error': 'Login required'})
        if p == '/api/students':
            if u['role'] == 'ver': return s._j(403, {'error': 'Verifier role cannot read student records'})
            return s._j(200, [dict(r) for r in c.execute('select * from students order by n')])
        if p == '/api/rules': return s._j(200, [dict(r) for r in c.execute('select * from rules')])
        if p == '/api/audit' and m == 'POST':
            # actor comes from the verified token, never from the request body; client-reported events are labelled as such
            d = s.body(); audit(c, u['name'], 'client:' + str(d.get('action', ''))[:110], str(d.get('detail', ''))[:300]); return s._j(200, {'ok': True})
        if p == '/api/audit/verify': return s._j(200, {'intact': chain_ok(c) < 0, 'broken_at': chain_ok(c), 'entries': c.execute('select count(*) from audit_log').fetchone()[0]})
        if p == '/api/verify' and m == 'POST':
            d = s.body(); a = str(d.get('apaar', '')); purpose = str(d.get('purpose', ''))[:80]
            if not re.fullmatch(r'\d{12}', a): return s._j(400, {'error': 'APAAR must be 12 digits'})
            mask = a[:2] + '********' + a[-2:]
            if not d.get('consent'): audit(c, u['name'], 'verify blocked', 'no consent ' + mask); return s._j(403, {'error': 'Consent receipt required'})
            ok = c.execute("select 1 from students where apaar=? and status='active'", (a,)).fetchone() is not None
            rc = 'CR-' + secrets.token_hex(4).upper(); t = now(); msg = f'{rc}|{hm(a)[:16]}|{ok}|{purpose}|{t}'; sig = KEY.sign(msg.encode()).hex()
            c.execute('insert into receipts values(?,?,?,?,?,?)', (rc, t, purpose, mask, str(ok), sig)); c.commit(); audit(c, u['name'], 'verify', f'{mask} {purpose} {rc}')
            return s._j(200, {'enrolled': ok, 'receipt': rc, 'signed_message': msg, 'signature': sig, 'alg': 'Ed25519', 'identity_data_returned': 'none'})
        s._j(404, {'error': 'unknown endpoint'})

if __name__ == '__main__':
    seed(); port = int(os.environ.get('PORT', 8000)); print(f'SeatSentinel running on http://localhost:{port}'); ThreadingHTTPServer(('0.0.0.0', port), H).serve_forever()