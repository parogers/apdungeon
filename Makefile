# Makefile

BUNDLE=apdungeon
BUNDLE_DIST=apdungeon-dist.js
BUNDLE_JS=apdungeon.js

.PHONY: dist

# Source generation
$(BUNDLE_JS): main.js
	browserify -t babelify -s $(BUNDLE) main.js -o $(BUNDLE_JS)

$(BUNDLE_DIST): $(BUNDLE_JS)
	uglifyjs $(BUNDLE_JS) > $(BUNDLE_DIST)

watch:
	watchify -v -t babelify -s $(BUNDLE) main.js -o $(BUNDLE_JS)

dist:
	test -d dist || mkdir dist 2> /dev/null
	cp *.js *.md dist
	cp -R contrib dist
	cp -R media dist
	@echo ""
	@echo "*** Distribution files stored in 'dist' ***"
