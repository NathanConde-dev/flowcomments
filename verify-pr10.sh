#!/bin/bash
set -e

echo "=== PR #10 Final Verification ==="
echo ""

echo "1. Setup admin"
curl -s -X POST http://localhost:8080/api/setup/admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","email":"admin@test.com"}'
echo -e "\n"

echo "2. Setup Meta (with webhook token) - should succeed during initial setup"
curl -s -X POST http://localhost:8080/api/setup/meta \
  -H "Content-Type: application/json" \
  -d '{"appId":"test123","appSecret":"secret456","webhookVerifyToken":"my_verify_token_789"}'
echo -e "\n"

echo "3. Webhook verify with CORRECT token → should return challenge"
curl -s "http://localhost:8080/api/webhook?hub.mode=subscribe&hub.challenge=SUCCESS_123&hub.verify_token=my_verify_token_789"
echo -e "\n"

echo "4. Webhook verify with WRONG token → should return 403"
curl -s "http://localhost:8080/api/webhook?hub.mode=subscribe&hub.challenge=FAIL&hub.verify_token=wrong"
echo -e "\n"

echo "5. Try to re-setup admin → should return 403"
curl -s -X POST http://localhost:8080/api/setup/admin \
  -H "Content-Type: application/json" \
  -d '{"username":"hacker","password":"hack","email":"hack@test.com"}'
echo -e "\n"

echo "6. Login with username"
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c /tmp/cookie.txt
echo -e "\n"

echo "7. Login with email (case-insensitive)"
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ADMIN@TEST.COM","password":"admin123"}'
echo -e "\n"

echo "8. Dashboard with valid cookie → should return 200 and page content"
curl -I -b /tmp/cookie.txt http://localhost:8080/dashboard 2>&1 | grep -E "HTTP|Cache"
echo ""

echo "9. Logout"
curl -s -X POST http://localhost:8080/api/auth/logout -b /tmp/cookie.txt
echo -e "\n"

echo "10. Dashboard after logout → should redirect to /login"
curl -I -b /tmp/cookie.txt http://localhost:8080/dashboard 2>&1 | grep -E "HTTP|location"
echo ""

echo "11. Try to update Meta WITHOUT auth → should return 403"
curl -s -X POST http://localhost:8080/api/setup/meta \
  -H "Content-Type: application/json" \
  -d '{"appId":"hacked","appSecret":"hacked","webhookVerifyToken":"hacked"}'
echo -e "\n"

echo "12. Static file with extension (robots.txt) → should be accessible"
curl -I http://localhost:8080/robots.txt 2>&1 | grep "HTTP"
echo ""

echo "=== Verification Complete ==="
