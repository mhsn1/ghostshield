#!/bin/bash
"/Users/mc/Library/Application Support/reflex/bun/bin/bun" run /Users/mc/ghostshield/src/cli.ts scan --file "$1" --model "$2" --provider "$3" -o "$4"
