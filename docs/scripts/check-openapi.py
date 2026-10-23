"""Проверки контракта: разбор YAML + отсутствие удалённых полей и Keycloak."""
import json
import sys

import yaml

with open('docs/openapi.yml', encoding='utf-8') as handle:
    spec = yaml.safe_load(handle)

raw = json.dumps(spec, ensure_ascii=False)
files = 0
for path, item in spec['paths'].items():
    for method, operation in item.items():
        if method in {'get', 'post', 'put', 'patch', 'delete'}:
            files += 1

print('paths:', len(spec['paths']))
print('operations:', files)
print('schemas:', len(spec['components']['schemas']))
print('securitySchemes:', list(spec['components']['securitySchemes']))
print('global security:', spec['security'])
print('auth/telegram security:', spec['paths']['/auth/telegram']['post'].get('security'))
print('Applicant.required:', spec['components']['schemas']['Applicant']['required'])
print('UserProfile.required:', spec['components']['schemas']['UserProfile']['allOf'][1]['required'])

# Ищем именно ключи/поля, а не упоминания в прозе: в описаниях фразы вида
# «ник, email и должность не хранятся» — намеренные и допустимы.
checks = {
    'nick field': raw.count('"nick":'),
    'avatarUrl field': raw.count('"avatarUrl":'),
    'bearerAuth': raw.count('"bearerAuth"'),
    'email field': raw.count('"email":'),
    'position field': raw.count('"position":'),
    'company field': raw.count('"company":'),
    '/api/files (legacy prefix)': raw.count('"/api/files'),
}
print('legacy tokens:', checks)

failures = [name for name, count in checks.items() if count]
if failures:
    print('FAILED:', failures)
    sys.exit(1)
print('OK')
