script_dirname=$(dirname $0)

for dirname in $(find $script_dirname -maxdepth 1 -mindepth 1 -type d); do
    args="--lock=$dirname/lock.json"
    args="$args --lock-write"

    if [ -f "$dirname/import_map.json" ]; then
        args="$args --importmap $dirname/import_map.json"
    fi

    files=$(find "$dirname" -name "*.ts" -not -name "build.ts" | tr '\n' ' ')
    # echo "deno cache $args $files"
    deno cache $args $files
done
