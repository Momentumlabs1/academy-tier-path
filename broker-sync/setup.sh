#!/usr/bin/env bash
# broker-sync VPS bootstrap — run ON the fresh Ubuntu server (as root):
#   curl -fsSL https://raw.githubusercontent.com/Momentumlabs1/academy-tier-path/main/broker-sync/setup.sh | bash
set -euo pipefail

echo "==> Installing Node.js + git"
apt-get update -y
apt-get install -y nodejs npm git

echo "==> Cloning repo"
cd /root
if [ ! -d academy-tier-path ]; then
  git clone https://github.com/Momentumlabs1/academy-tier-path.git
fi
cd academy-tier-path/broker-sync
npm install --omit=dev

if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> Created .env — FILL IN THE CREDENTIALS: nano /root/academy-tier-path/broker-sync/.env"
fi

echo "==> Installing cron (every 10 min; does nothing until .env is filled)"
( crontab -l 2>/dev/null | grep -v broker-sync ; \
  echo "*/10 * * * * cd /root/academy-tier-path/broker-sync && /usr/bin/flock -n /tmp/broker-sync.lock /usr/bin/node sync.mjs >> sync.log 2>&1" ) | crontab -

echo ""
echo "============================================================"
echo " Static IP of this server (send this to the broker):"
curl -4 -s https://ifconfig.me || hostname -I
echo ""
echo "============================================================"
echo " Next steps:"
echo "  1. Send the IP above to the broker for whitelisting"
echo "  2. When credentials arrive: nano /root/academy-tier-path/broker-sync/.env"
echo "  3. First run: cd /root/academy-tier-path/broker-sync && node sync.mjs"
echo "     (cron keeps it in sync every 10 minutes after that)"
