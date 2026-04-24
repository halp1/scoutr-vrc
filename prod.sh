#!/bin/bash

git reset HEAD --hard
git pull
npm i
npm run build-web
pm2 restart scoutr