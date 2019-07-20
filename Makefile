# Makefile

.PHONY: chunks tiles

all: chunks tiles sprites

chunks:
	./tools/build_chunks.py > ./app/src/assets/map-chunks.json

tiles:
	./tools/build_tileset.py

sprites:
	./tools/tpack.py

# BUNDLE=apdungeon

# .PHONY: dist watch

# watch:
# 	watchify -v -t babelify -s $(BUNDLE) main.js -o $(BUNDLE).js

# dist:
# 	test -d dist || mkdir dist 2> /dev/null
# 	uglifyjs $(BUNDLE).js > dist/$(BUNDLE)-dist.js
# 	cp page.js style.css *.md dist
# 	cp -R contrib dist
# 	cp -R media dist
# 	cat index.html | sed 's/apdungeon.js/apdungeon-dist.js/' > dist/index.html
# 	@echo ""
# 	@echo "*** Distribution files stored in 'dist' ***"
