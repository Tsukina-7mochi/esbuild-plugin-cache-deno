deno cache \
    --lock=./example/lock.json --lock-write \
    --importmap ./example/import_map.json \
    ./example/main.ts \
    ./example/someDir/main2.ts
