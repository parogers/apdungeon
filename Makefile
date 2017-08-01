.PHONY: dist

dist:
	test -d dist || mkdir dist 2> /dev/null
	cp *.js *.md dist
	cp -R contrib dist
	cp -R media dist
	@echo ""
	@echo "*** Distribution files stored in 'dist' ***"
