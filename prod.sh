#!/bin/bash

git reset HEAD --hard
npm i
npm run build-web
pm2 restart scoutr