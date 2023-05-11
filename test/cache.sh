deno cache --lock=./test/lock.json --lock-write --importmap ./test/import_map.json $(find ./test/ -mindepth 2 -name "*.ts")
