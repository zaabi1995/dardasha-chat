#!/usr/bin/env python3
import xmlrpc.client, json

url = 'http://localhost:18069'
db = 'bhd_erp'
uid = 20
pwd = 'AnnBHD2025!'

m = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')
partners = m.execute_kw(db, uid, pwd, 'res.partner', 'search_read',
    [[['active', '=', True]]],
    {'fields': ['name', 'phone', 'phone_sanitized'], 'limit': 5000})

out = {}
for p in partners:
    for f in ['phone_sanitized', 'phone']:
        raw = p.get(f) or ''
        if raw:
            phone = raw.replace(' ', '').replace('-', '').replace('(', '').replace(')', '').replace('+', '')
            if phone.startswith('00968'):
                phone = phone[2:]
            if len(phone) == 8 and phone[0] in '923456789':
                phone = '968' + phone
            if phone and phone not in out:
                out[phone] = p['name']

print(json.dumps(out))
