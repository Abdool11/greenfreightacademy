GFA Automatic Certification Deployment Package

Repository: https://github.com/Abdool11/greenfreightacademy.git
Branch: feature/gfa-auto-certification
Commit: e1179fe feat(gfa): auto-issue certificates on verified completion

Apply this release after Releases 11-15.

Included files:
- supabase/migrations/20260916_r16_auto_certificate_issue.sql
- docs/contracts/GFA_TO_BETTERDRIVER_CERTIFICATE_CONTRACT_V2.md
- GFA_Auto_Certification_Deployment_Handover_2026-09-16.docx

Required verification:
1. npm ci
2. npm run type-check
3. npm run build
4. Apply the single Release 16 migration to the matching Preview database.
5. Configure synthetic Preview certificate fixtures and keys.
6. Run npx playwright test tests/playwright/10-certificate-contract-v2.spec.ts.
7. Prove qualifying completion -> issued PDF -> active exact-number registry result -> no duplicate certificate on replay.

Production deployment is owned by Asif. Do not place production keys, learner records or signed fixture values in the repository.
