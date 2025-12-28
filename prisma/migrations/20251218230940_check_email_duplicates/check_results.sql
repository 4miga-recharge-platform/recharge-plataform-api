-- Script para verificar os resultados da migration de verificação de duplicatas
-- Execute este script APÓS rodar a migration para ver os resultados

-- 1. Ver resumo geral de duplicatas encontradas
SELECT * FROM "EmailDuplicatesSummary";

-- 2. Ver detalhes de todas as duplicatas encontradas
SELECT
  id,
  table_name,
  normalized_email,
  duplicate_count,
  affected_ids,
  affected_emails,
  created_at
FROM "EmailDuplicatesReport"
ORDER BY table_name, normalized_email;

-- 3. Ver apenas duplicatas na tabela User
SELECT
  normalized_email,
  duplicate_count,
  affected_ids,
  affected_emails
FROM "EmailDuplicatesReport"
WHERE table_name = 'User'
ORDER BY normalized_email;

-- 4. Ver apenas duplicatas na tabela Store
SELECT
  normalized_email,
  duplicate_count,
  affected_ids,
  affected_emails
FROM "EmailDuplicatesReport"
WHERE table_name = 'Store'
ORDER BY normalized_email;

-- 5. Ver apenas duplicatas na tabela Influencer
SELECT
  normalized_email,
  duplicate_count,
  affected_ids,
  affected_emails
FROM "EmailDuplicatesReport"
WHERE table_name = 'Influencer'
ORDER BY normalized_email;

-- 6. Verificar se há emails que precisariam ser normalizados (não duplicados)
-- Esta query mostra emails que estão em maiúsculas mas não têm duplicatas
SELECT
  'User' as table_name,
  COUNT(*) as emails_to_normalize
FROM "User"
WHERE email != LOWER(email)
AND LOWER(email) NOT IN (
  SELECT normalized_email
  FROM "EmailDuplicatesReport"
  WHERE table_name = 'User'
)
UNION ALL
SELECT
  'Store' as table_name,
  COUNT(*) as emails_to_normalize
FROM "Store"
WHERE email IS NOT NULL
AND email != LOWER(email)
AND LOWER(email) NOT IN (
  SELECT normalized_email
  FROM "EmailDuplicatesReport"
  WHERE table_name = 'Store'
)
UNION ALL
SELECT
  'Influencer' as table_name,
  COUNT(*) as emails_to_normalize
FROM "Influencer"
WHERE email IS NOT NULL
AND email != LOWER(email)
AND LOWER(email) NOT IN (
  SELECT normalized_email
  FROM "EmailDuplicatesReport"
  WHERE table_name = 'Influencer'
);

